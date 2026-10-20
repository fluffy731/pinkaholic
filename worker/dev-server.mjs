// Local test server for the checkout Worker, with Stripe faked out.
// Run: node worker/dev-server.mjs   then set config.checkout to { provider: "worker", endpoint: "http://localhost:8787" }.
// "Paying" sends you straight to the thank-you page, so you can test the whole bag flow without Stripe keys.
import http from "node:http";
import worker from "./src/index.js";

const PORT = 8787;
const memory = new Map();
const env = {
  STRIPE_SECRET_KEY: "sk_test_fake",
  STRIPE_WEBHOOK_SECRET: "whsec_fake",
  LINK_SECRET: "dev-link-secret",
  SITE_URL: "http://localhost:8765/site",
  ALLOWED_ORIGINS: "http://localhost:8765",
  BUCKET: {
    async put(key, value) { memory.set(key, value); console.log("stored", key); },
    async get(key) { return memory.has(key) ? { body: memory.get(key) } : null; }
  }
};

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith("https://api.stripe.com/")) {
    const body = new URLSearchParams(init.body);
    console.log("Stripe session for", body.get("client_reference_id"), "with", body.get("metadata[items]"), "design(s)");
    const success = body.get("success_url").replace("{CHECKOUT_SESSION_ID}", "cs_test_local");
    return new Response(JSON.stringify({ id: "cs_test_local", url: success }), { status: 200 });
  }
  return realFetch(url, init);
};

http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const request = new Request(`http://localhost:${PORT}${req.url}`, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body });
  const response = await worker.fetch(request, env, {});
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(PORT, () => console.log(`Checkout Worker (fake Stripe) on http://localhost:${PORT}`));
