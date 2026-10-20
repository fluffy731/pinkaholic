import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import worker, { validateBag, sheetSafe, verifyStripeSignature, formEncode, buildOrder } from "../src/index.js";
import { SETS } from "../src/prices.js";

const ORIGIN = "https://pinkaholic.com.au";
// A 1x1 transparent PNG.
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

function memoryBucket() {
  const store = new Map();
  return {
    store,
    async put(key, value) { store.set(key, value); },
    async get(key) { return store.has(key) ? { body: store.get(key) } : null; }
  };
}

let env, calls;
beforeEach(() => {
  calls = [];
  env = {
    STRIPE_SECRET_KEY: "sk_test_123",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
    LINK_SECRET: "link-secret",
    ORDER_WEBHOOK_URL: "https://hooks.example/orders",
    SITE_URL: ORIGIN,
    ALLOWED_ORIGINS: ORIGIN,
    BUCKET: memoryBucket()
  };
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).includes("api.stripe.com")) {
      return new Response(JSON.stringify({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" }), { status: 200 });
    }
    return new Response("ok", { status: 200 });
  };
});

function checkoutRequest(body, origin = ORIGIN) {
  return new Request("https://worker.example/checkout", {
    method: "POST",
    headers: { "content-type": "application/json", Origin: origin },
    body: JSON.stringify(body)
  });
}

const item = (over = {}) => ({ set: "can", qty: 1, line1: "Chloe & Jack", line2: "", font: "script", ink: "wine", ...over });

test("rejects requests from other websites", async () => {
  const res = await worker.fetch(checkoutRequest({ items: [item()] }, "https://evil.example"), env);
  assert.equal(res.status, 403);
  assert.equal(calls.length, 0);
});

test("uses its own prices, not the browser's", async () => {
  const res = await worker.fetch(checkoutRequest({ items: [item({ price: 0.01, unit_amount: 1 })] }), env);
  assert.equal(res.status, 200);
  const body = new URLSearchParams(calls[0].init.body);
  assert.equal(body.get("line_items[0][price_data][unit_amount]"), "3995");
  assert.equal(body.get("line_items[0][price_data][currency]"), "aud");
  assert.equal(body.get("line_items[0][quantity]"), "1");
});

test("sends AU/NZ shipping, free shipping, the design text and metadata to Stripe", async () => {
  const res = await worker.fetch(checkoutRequest({ items: [item({ line2: "12.03.27", qty: 2 })] }), env);
  const out = await res.json();
  assert.equal(out.url, "https://checkout.stripe.com/c/pay/cs_test_1");
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  const body = new URLSearchParams(calls[0].init.body);
  assert.equal(calls[0].init.headers.Authorization, "Bearer sk_test_123");
  assert.deepEqual(body.getAll("shipping_address_collection[allowed_countries][0]"), ["AU"]);
  assert.deepEqual(body.getAll("shipping_address_collection[allowed_countries][1]"), ["NZ"]);
  assert.equal(body.get("shipping_options[0][shipping_rate_data][fixed_amount][amount]"), "0");
  assert.match(body.get("line_items[0][price_data][product_data][description]"), /"Chloe & Jack" \/ "12.03.27" · Script lettering · Wine ink/);
  assert.equal(body.get("line_items[0][quantity]"), "2");
  const meta = JSON.parse(body.get("metadata[item_1]"));
  assert.equal(meta.l1, "Chloe & Jack");
  assert.match(body.get("success_url"), /^https:\/\/pinkaholic\.com\.au\/thanks\.html\?order=PK-\d{8}-/);
});

test("validates text, sets, quantities and empty designs", () => {
  assert.match(validateBag({ items: [] }).error, /empty/);
  assert.match(validateBag({ items: [item({ set: "gold-bar" })] }).error, /unknown set/);
  assert.match(validateBag({ items: [item({ qty: 0 })] }).error, /quantity/);
  assert.match(validateBag({ items: [item({ qty: 2.5 })] }).error, /quantity/);
  assert.match(validateBag({ items: [item({ line1: "This line is far too long" })] }).error, /up to 14/);
  assert.match(validateBag({ items: [item({ line1: "<script>" })] }).error, /simple punctuation/);
  assert.match(validateBag({ items: [item({ line1: "", line2: "" })] }).error, /words or a logo/);
  assert.match(validateBag({ items: [item({ font: "comic" })] }).error, /lettering/);
  assert.match(validateBag({ items: Array.from({ length: 21 }, () => item()) }).error, /20 designs/);
  assert.equal(validateBag({ items: [item()] }).items.length, 1);
  const only = validateBag({ items: [item({ logo: PNG, layout: "only", line1: "Ignored" })] }).items[0];
  assert.equal(only.line1, "");
});

test("stores PNG logos and rejects other files", async () => {
  const ok = await worker.fetch(checkoutRequest({ items: [item({ logo: PNG, layout: "below" })] }), env);
  assert.equal(ok.status, 200);
  const keys = [...env.BUCKET.store.keys()];
  assert.equal(keys.length, 1);
  assert.match(keys[0], /^logos\/PK-\d{8}-[A-Z0-9]+\/1\.png$/);
  const body = new URLSearchParams(calls[0].init.body);
  assert.match(body.get("line_items[0][price_data][product_data][description]"), /logo below the words/);

  const fake = "data:image/png;base64," + btoa("not really a png");
  const bad = await worker.fetch(checkoutRequest({ items: [item({ logo: fake })] }), env);
  assert.equal(bad.status, 400);
  const jpg = validateBag({ items: [item({ logo: "data:image/jpeg;base64,AAAA" })] });
  assert.match(jpg.error, /PNG/);
});

test("escapes text that a spreadsheet would run as a formula", () => {
  assert.equal(sheetSafe("=HYPERLINK(\"x\")"), "'=HYPERLINK(\"x\")");
  assert.equal(sheetSafe("+61 400 000 000"), "'+61 400 000 000");
  assert.equal(sheetSafe("@home"), "'@home");
  assert.equal(sheetSafe("Chloe & Jack"), "Chloe & Jack");
});

test("form encoding nests objects and arrays the way Stripe expects", () => {
  const p = formEncode({ a: { b: [{ c: 1 }, "x"] }, d: true, e: null });
  assert.equal(p.get("a[b][0][c]"), "1");
  assert.equal(p.get("a[b][1]"), "x");
  assert.equal(p.get("d"), "true");
  assert.equal(p.has("e"), false);
});

async function stripeHeader(payload, secret, t = Math.floor(Date.now() / 1000)) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  return `t=${t},v1=${[...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function paidEvent() {
  return {
    type: "checkout.session.completed",
    data: { object: {
      id: "cs_test_1", payment_status: "paid", amount_total: 3995, created: 1792500000,
      client_reference_id: "PK-20261020-ABCDE",
      customer_details: { email: "buyer@example.com", phone: "+61400000000", name: "Sam Buyer" },
      collected_information: { shipping_details: { name: "Sam Buyer", address: { line1: "1 Court St", city: "Melbourne", state: "VIC", postal_code: "3000", country: "AU" } } },
      metadata: {
        order_ref: "PK-20261020-ABCDE", items: "1",
        item_1: JSON.stringify({ s: "can", q: 1, l1: "=SUM(A1)", l2: "", f: "caps", i: "gold", lo: "above", ls: 1, li: "ink", k: "logos/PK-20261020-ABCDE/1.png" })
      }
    } }
  };
}

test("webhook rejects a bad or stale signature", async () => {
  const payload = JSON.stringify(paidEvent());
  const bad = new Request("https://worker.example/webhook", { method: "POST", headers: { "Stripe-Signature": "t=1,v1=deadbeef" }, body: payload });
  assert.equal((await worker.fetch(bad, env)).status, 400);
  const stale = await stripeHeader(payload, env.STRIPE_WEBHOOK_SECRET, Math.floor(Date.now() / 1000) - 3600);
  assert.equal(await verifyStripeSignature(payload, stale, env.STRIPE_WEBHOOK_SECRET), false);
  assert.equal(calls.length, 0);
});

test("a paid order is stored and handed off with escaped text and a working logo link", async () => {
  await env.BUCKET.put("logos/PK-20261020-ABCDE/1.png", new Uint8Array([1, 2, 3]));
  const payload = JSON.stringify(paidEvent());
  const req = new Request("https://worker.example/webhook", {
    method: "POST", headers: { "Stripe-Signature": await stripeHeader(payload, env.STRIPE_WEBHOOK_SECRET) }, body: payload
  });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);

  const saved = JSON.parse(env.BUCKET.store.get("orders/PK-20261020-ABCDE.json"));
  assert.equal(saved.items[0].line1, "'=SUM(A1)");
  assert.equal(saved.items[0].balls_total, 3);
  assert.equal(saved.items[0].ink, "Gold foil");
  assert.equal(saved.ship_to.postcode, "3000");

  const handoff = calls.find((c) => c.url === env.ORDER_WEBHOOK_URL);
  assert.ok(handoff, "order was posted to the hand-off URL");
  const logoUrl = JSON.parse(handoff.init.body).items[0].logo_url;
  const good = await worker.fetch(new Request(logoUrl), env);
  assert.equal(good.status, 200);
  const forged = await worker.fetch(new Request(logoUrl.replace(/sig=[0-9a-f]+/, "sig=" + "0".repeat(64))), env);
  assert.equal(forged.status, 403);
});

test("a failed hand-off asks Stripe to retry", async () => {
  globalThis.fetch = async () => new Response("down", { status: 500 });
  const payload = JSON.stringify(paidEvent());
  const req = new Request("https://worker.example/webhook", {
    method: "POST", headers: { "Stripe-Signature": await stripeHeader(payload, env.STRIPE_WEBHOOK_SECRET) }, body: payload
  });
  assert.equal((await worker.fetch(req, env)).status, 500);
});

test("Worker prices match the website's config", () => {
  const src = readFileSync(new URL("../../site/config.js", import.meta.url), "utf8");
  const ctx = { window: {} };
  vm.runInNewContext(src, ctx);
  for (const p of ctx.window.PINKAHOLIC.packs) {
    assert.ok(SETS[p.id], `set ${p.id} exists in the Worker`);
    assert.equal(SETS[p.id].cents, Math.round(p.price * 100), `${p.id} price`);
    assert.equal(SETS[p.id].balls, p.qty, `${p.id} ball count`);
    assert.equal(SETS[p.id].name, p.name, `${p.id} name`);
  }
});

test("order records fall back to older Stripe shipping fields", async () => {
  const s = paidEvent().data.object;
  delete s.collected_information;
  s.shipping_details = { name: "Old Field", address: { postal_code: "6011", country: "NZ" } };
  const o = await buildOrder(s, "https://worker.example", env);
  assert.equal(o.ship_to.name, "Old Field");
  assert.equal(o.ship_to.country, "NZ");
});
