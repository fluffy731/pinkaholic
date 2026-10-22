# Pinkaholic

Personalised pink tennis balls, delivered across Australia and New Zealand.

- Live site: https://pinkaholic.com.au (GitHub Pages; DNS notes in [docs/domain-setup.md](docs/domain-setup.md))
- Every push to `main` that changes `site/` deploys to GitHub Pages.

## Where things are

| Path | What it is |
|---|---|
| `site/` | The website. Plain HTML, CSS and JS, with no build step |
| `site/config.js` | Prices, sets, delivery estimate and checkout settings. Edit this to change the shop |
| `site/ball.js` | Draws the realistic pink ball, with the customer's text and logo wrapped onto it |
| `site/cart.js` | The bag: saved designs, the slide-out drawer and checkout |
| `worker/` | Checkout Worker (Cloudflare): creates Stripe Checkout sessions and hands paid orders to the factory |
| `brand/sticker/` | The current logo (rose script), heart can stickers and the rose icon, built by `brand/make_sticker.py` |
| `brand/` | Earlier logo options and the scripts that build them (`make_logo*.py`, needs `pip install fonttools`) |
| `design/crumble-reference/` | The crumble.co-inspired style guide and first mockup |
| `docs/research/` | Market, pricing, supplier and ecommerce research |
| `docs/plans/` | Plans for each piece of work |
| `tools/decode.html` | Only for the old Payment Link codes; the cart doesn't need it |

## Checkout

Until the Worker is live, the bag's Checkout button builds an email order. To take card payments:

1. **Cloudflare (free account):**
   - From `worker/`, run `npx wrangler login`, then `npx wrangler r2 bucket create pinkaholic-orders`, then `npx wrangler deploy`.
   - Note the Worker's address, e.g. `https://pinkaholic-checkout.<you>.workers.dev`.
2. **Secrets (never commit them):** set each one with `npx wrangler secret put NAME`:
   - `STRIPE_SECRET_KEY` (use `sk_test_…` first);
   - `LINK_SECRET` (any long random string);
   - optionally `ORDER_WEBHOOK_URL` (Zapier, Make or Google Apps Script) to receive each order.
3. **Stripe webhook:**
   - In Stripe → Developers → Webhooks, add `https://<worker>/webhook` for the `checkout.session.completed` event.
   - Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
4. **Point the site at the Worker:** in `site/config.js`, set `checkout: { provider: "worker", endpoint: "https://<worker>" }` and push.
5. **Test, then go live:** pay with Stripe's test card 4242 4242 4242 4242 and check the order arrives. Then switch to live keys.
6. **Clean-up rule:** in R2, add a lifecycle rule to delete `logos/` after 60 days, so logos from abandoned checkouts don't pile up.

Each paid order is saved as `orders/<ref>.json` in R2 and posted to `ORDER_WEBHOOK_URL`. The order record holds:
- customer and shipping details;
- each design's text, lettering, ink and set;
- a signed link to the logo.

## Tests

```bash
node --test worker/test/*.test.js
```

## Preview locally

```bash
python -m http.server 8765
```

Then open http://localhost:8765/site/.

To try the whole checkout without Stripe keys, also run the Worker with a fake Stripe:

```bash
node worker/dev-server.mjs
```

Then, in the browser console, set `PINKAHOLIC.checkout = { provider: "worker", endpoint: "http://localhost:8787" }`.
