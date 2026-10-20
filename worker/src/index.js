// Pinkaholic checkout: turns a bag from the website into a Stripe Checkout Session,
// and turns a paid session into an order for the factory.
//
// Routes
//   POST /checkout        bag JSON -> { url } of a Stripe Checkout page
//   POST /webhook         Stripe events (signature checked) -> order record + hand-off
//   GET  /logo/:key?sig=  a stored logo, for links in the order hand-off
//
// Env (wrangler.toml vars and secrets)
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, LINK_SECRET   secrets
//   ORDER_WEBHOOK_URL                                       secret, optional (Zapier / Make / Apps Script)
//   SITE_URL, ALLOWED_ORIGINS                               vars
//   BUCKET                                                  R2 bucket binding (logos and orders)

import { SETS, FONTS, INKS, LAYOUTS } from "./prices.js";

const MAX_ITEMS = 20;
const MAX_QTY = 20;
const MAX_CHARS = 14;
const MAX_LOGO_CHARS = 1_500_000; // base64 data URL length (about 1.1 MB of PNG)
const TEXT_OK = /^[\p{L}\p{N} .,!?'’&+\-#@:()\/♥]*$/u;
const STRIPE_API = "https://api.stripe.com/v1";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (request.method === "OPTIONS") return preflight(request, env);
      if (url.pathname === "/checkout" && request.method === "POST") return await checkout(request, env);
      if (url.pathname === "/webhook" && request.method === "POST") return await webhook(request, env);
      if (url.pathname.startsWith("/logo/") && request.method === "GET") return await logo(url, env);
      return text("Not found", 404);
    } catch (err) {
      console.error(err);
      return text("Something went wrong", 500);
    }
  }
};

// ---------- helpers ----------

function text(body, status = 200, headers = {}) {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", ...headers } });
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
}

function cors(request, env) {
  const origin = request.headers.get("Origin") || "";
  if (!allowedOrigins(env).includes(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

function preflight(request, env) {
  const h = cors(request, env);
  return h ? new Response(null, { status: 204, headers: h }) : text("Forbidden", 403);
}

// Stripe's API takes nested form fields: a[b][0][c]=value
export function formEncode(obj, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item !== null && typeof item === "object") formEncode(item, `${key}[${i}]`, out);
        else out.append(`${key}[${i}]`, String(item));
      });
    } else if (typeof v === "object") {
      formEncode(v, key, out);
    } else {
      out.append(key, String(v));
    }
  }
  return out;
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Spreadsheets run text that starts with these as a formula. Prefix with ' so it stays text.
export function sheetSafe(value) {
  const s = String(value ?? "");
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function orderRef() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const r = crypto.getRandomValues(new Uint8Array(3));
  return `PK-${d}-${[...r].map((b) => b.toString(36).padStart(2, "0")).join("").toUpperCase().slice(0, 5)}`;
}

// ---------- validation ----------

export function validateBag(body) {
  const items = body && Array.isArray(body.items) ? body.items : null;
  if (!items || !items.length) return { error: "Your bag is empty." };
  if (items.length > MAX_ITEMS) return { error: `Please keep it to ${MAX_ITEMS} designs per order.` };
  const clean = [];
  for (const [i, it] of items.entries()) {
    const n = i + 1;
    if (!it || typeof it !== "object") return { error: `Item ${n} is not valid.` };
    const set = SETS[it.set];
    if (!set) return { error: `Item ${n} has an unknown set.` };
    const qty = Number(it.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return { error: `Item ${n} needs a quantity from 1 to ${MAX_QTY}.` };
    let line1 = String(it.line1 ?? "").trim();
    let line2 = String(it.line2 ?? "").trim();
    for (const line of [line1, line2]) {
      if ([...line].length > MAX_CHARS) return { error: `Item ${n}: each line can be up to ${MAX_CHARS} characters.` };
      if (!TEXT_OK.test(line)) return { error: `Item ${n}: please use letters, numbers and simple punctuation only.` };
    }
    if (!FONTS[it.font]) return { error: `Item ${n} has an unknown lettering.` };
    if (!INKS[it.ink]) return { error: `Item ${n} has an unknown ink.` };
    let logo = null;
    if (it.logo) {
      if (typeof it.logo !== "string" || !it.logo.startsWith("data:image/png;base64,")) return { error: `Item ${n}: the logo must be a PNG.` };
      if (it.logo.length > MAX_LOGO_CHARS) return { error: `Item ${n}: the logo file is too large.` };
      logo = it.logo;
    }
    const layout = logo ? (LAYOUTS.includes(it.layout) && it.layout !== "none" ? it.layout : "above") : "none";
    if (layout === "only") { line1 = ""; line2 = ""; }   // logo-only designs print no words
    if (!line1 && !line2 && !logo) return { error: `Item ${n} needs some words or a logo.` };
    const logoSize = Math.min(1.4, Math.max(0.5, Number(it.logoSize) || 1));
    const logoInk = it.logoInk === "original" ? "original" : "ink";
    clean.push({ set: it.set, qty, line1, line2, font: it.font, ink: it.ink, layout, logoSize, logoInk, logo });
  }
  return { items: clean };
}

function decodePng(dataUrl) {
  const bin = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!sig.every((b, i) => bytes[i] === b)) return null;
  return bytes;
}

export function describe(it) {
  const words = [it.line1, it.line2].filter(Boolean).map((s) => `"${s}"`).join(" / ");
  const parts = [];
  if (words) parts.push(words);
  parts.push(`${FONTS[it.font]} lettering`, `${INKS[it.ink]} ink`);
  if (it.layout !== "none") {
    parts.push(it.layout === "only" ? "logo only" : `logo ${it.layout} the words`);
    parts.push(it.logoInk === "original" ? "logo in original colours" : "logo in ink colour");
  }
  return parts.join(" · ");
}

// ---------- POST /checkout ----------

async function checkout(request, env) {
  const headers = cors(request, env);
  if (!headers) return text("Forbidden", 403);
  if (!env.STRIPE_SECRET_KEY) return json({ error: "Checkout isn't set up yet." }, 503, headers);

  let body;
  try { body = await request.json(); } catch { return json({ error: "That request wasn't valid." }, 400, headers); }
  const v = validateBag(body);
  if (v.error) return json({ error: v.error }, 400, headers);

  const ref = orderRef();
  const metadata = { order_ref: ref, items: String(v.items.length) };
  for (const [i, it] of v.items.entries()) {
    let logoKey = "";
    if (it.logo) {
      if (!env.BUCKET) return json({ error: "Logo uploads aren't set up yet. Please remove the logo or email us." }, 503, headers);
      const bytes = decodePng(it.logo);
      if (!bytes) return json({ error: `Item ${i + 1}: the logo must be a PNG.` }, 400, headers);
      logoKey = `logos/${ref}/${i + 1}.png`;
      await env.BUCKET.put(logoKey, bytes, { httpMetadata: { contentType: "image/png" } });
    }
    // Stripe metadata values are limited to 500 characters; this stays well under.
    metadata[`item_${i + 1}`] = JSON.stringify({
      s: it.set, q: it.qty, l1: it.line1, l2: it.line2, f: it.font, i: it.ink,
      lo: it.layout, ls: it.logoSize, li: it.logoInk, k: logoKey
    });
  }

  const site = (env.SITE_URL || "https://pinkaholic.com.au").replace(/\/$/, "");
  const params = {
    mode: "payment",
    client_reference_id: ref,
    line_items: v.items.map((it) => {
      const set = SETS[it.set];
      return {
        quantity: it.qty,
        price_data: {
          currency: "aud",
          unit_amount: set.cents,
          product_data: {
            name: `${set.name}: ${set.balls} personalised pink tennis ${set.balls > 1 ? "balls" : "ball"}`,
            description: describe(it)
          }
        }
      };
    }),
    shipping_address_collection: { allowed_countries: ["AU", "NZ"] },
    phone_number_collection: { enabled: true },
    shipping_options: [{
      shipping_rate_data: {
        type: "fixed_amount",
        display_name: "Complimentary tracked shipping",
        fixed_amount: { amount: 0, currency: "aud" },
        delivery_estimate: { minimum: { unit: "business_day", value: 9 }, maximum: { unit: "business_day", value: 14 } }
      }
    }],
    custom_text: { submit: { message: "Printed to order. Most orders arrive in about 14 days, with tracking." } },
    metadata,
    payment_intent_data: { metadata: { order_ref: ref } },
    success_url: `${site}/thanks.html?order=${ref}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/#bag`
  };

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: formEncode(params).toString()
  });
  const session = await res.json();
  if (!res.ok || !session.url) {
    console.error("Stripe error", res.status, session && session.error);
    return json({ error: "We couldn't start checkout. Please try again in a moment." }, 502, headers);
  }
  return json({ url: session.url, ref }, 200, headers);
}

// ---------- POST /webhook ----------

export async function verifyStripeSignature(payload, header, secret, toleranceSec = 300, now = Date.now()) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=").map((s) => s.trim())).filter((p) => p.length === 2 && p[0] !== "v1"));
  const sigs = header.split(",").map((p) => p.trim()).filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  const t = Number(parts.t);
  if (!t || !sigs.length) return false;
  if (Math.abs(now / 1000 - t) > toleranceSec) return false;
  const expected = await hmacHex(secret, `${t}.${payload}`);
  return sigs.some((s) => safeEqual(s, expected));
}

async function webhook(request, env) {
  const payload = await request.text();
  const ok = await verifyStripeSignature(payload, request.headers.get("Stripe-Signature"), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return text("Bad signature", 400);

  const event = JSON.parse(payload);
  if (event.type !== "checkout.session.completed") return text("Ignored");
  const s = event.data.object;
  if (s.payment_status !== "paid") return text("Not paid yet");

  const origin = new URL(request.url).origin;
  const order = await buildOrder(s, origin, env);
  if (env.BUCKET) {
    await env.BUCKET.put(`orders/${order.order_ref}.json`, JSON.stringify(order, null, 2), { httpMetadata: { contentType: "application/json" } });
  }
  if (env.ORDER_WEBHOOK_URL) {
    const res = await fetch(env.ORDER_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(order) });
    // A failed hand-off returns 500 so Stripe retries the event later.
    if (!res.ok) return text("Order hand-off failed", 500);
  }
  return text("OK");
}

export async function buildOrder(s, origin, env) {
  const md = s.metadata || {};
  const count = Number(md.items) || 0;
  const items = [];
  for (let i = 1; i <= count; i++) {
    let it;
    try { it = JSON.parse(md[`item_${i}`] || "{}"); } catch { it = {}; }
    const set = SETS[it.s] || { name: it.s, balls: 0 };
    let logo_url = "";
    if (it.k) logo_url = `${origin}/logo/${encodeURIComponent(it.k)}?sig=${await hmacHex(env.LINK_SECRET || "", it.k)}`;
    items.push({
      set: set.name,
      sets_ordered: it.q,
      balls_total: (set.balls || 0) * (it.q || 0),
      line1: sheetSafe(it.l1),
      line2: sheetSafe(it.l2),
      lettering: FONTS[it.f] || it.f,
      ink: INKS[it.i] || it.i,
      logo_position: it.lo,
      logo_size: it.ls,
      logo_colours: it.li === "original" ? "original colours" : "ink colour",
      logo_url
    });
  }
  const ship = (s.collected_information && s.collected_information.shipping_details) || s.shipping_details || {};
  const addr = ship.address || {};
  const cust = s.customer_details || {};
  return {
    order_ref: md.order_ref || s.client_reference_id,
    stripe_session: s.id,
    paid_at: new Date((s.created || Date.now() / 1000) * 1000).toISOString(),
    amount_aud: (s.amount_total || 0) / 100,
    email: sheetSafe(cust.email),
    phone: sheetSafe(cust.phone),
    ship_to: {
      name: sheetSafe(ship.name || cust.name),
      line1: sheetSafe(addr.line1), line2: sheetSafe(addr.line2),
      city: sheetSafe(addr.city), state: sheetSafe(addr.state),
      postcode: sheetSafe(addr.postal_code), country: sheetSafe(addr.country)
    },
    items
  };
}

// ---------- GET /logo/:key ----------

async function logo(url, env) {
  const key = decodeURIComponent(url.pathname.slice("/logo/".length));
  const sig = url.searchParams.get("sig") || "";
  if (!env.LINK_SECRET || !key.startsWith("logos/")) return text("Not found", 404);
  const expected = await hmacHex(env.LINK_SECRET, key);
  if (!safeEqual(sig, expected)) return text("Forbidden", 403);
  const obj = env.BUCKET && (await env.BUCKET.get(key));
  if (!obj) return text("Not found", 404);
  return new Response(obj.body, { headers: { "content-type": "image/png", "cache-control": "private, max-age=3600" } });
}
