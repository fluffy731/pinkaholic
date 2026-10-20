# Cart and checkout

The owner wants a cart on the site (crumble.co's cart drawer as the reference), checkout through Stripe, and automatic order hand-off to the factory. They also want the ball render to look more real.

## Ball realism (site/ball.js)

- **Felt:** wrap lighting for a softer shadow edge; shadows tinted deeper rose instead of grey; a broad soft sheen on the lit side.
- **Fibres:** thousands of short, faint strands over the surface and a fuzzy halo past the outline.
- **Seams:** embossed, with a shadow on one side, a thin highlight on the other, and a glossy rubber line.
- **Shadow:** a tight contact shadow under the ball as well as the soft one.

## Cart (site/cart.js)

- **Saving the design:** "Add to bag" saves the full design, including a print-ready logo and a small rendered preview. The bag lives in the browser (localStorage).
- **Bag icon:** in the header, with a count.
- **Drawer, after crumble.co:**
  - a right-side panel with a wine header bar, the title, a close button and a blurred page behind;
  - an empty state with a button back to the designer.
- **Each line:** preview, set name, design summary, quantity stepper, Edit and Remove.
- **Footer:** subtotal, complimentary shipping note, estimated arrival and a Checkout button.
- **Checkout:**
  - `config.checkout.provider = "worker"` posts the bag to the checkout Worker and goes to Stripe;
  - until the Worker is live, `"none"` builds an email order listing every item.
- **Thank-you page:** clears the bag after a paid order.

## Checkout Worker (worker/)

A Cloudflare Worker, free tier, on its workers.dev address. The site itself stays on GitHub Pages.

- **`POST /checkout`:**
  - checks the Origin and validates every item: known set, quantity 1–20, text rules, logo under 1.5 MB;
  - takes prices from its own list, never from the browser;
  - stores each logo in R2;
  - creates a Stripe Checkout Session: AUD, one line per design with the text in the description, AU/NZ shipping address, phone, complimentary shipping with a delivery estimate, and the design details in metadata;
  - returns the Stripe URL.
- **`POST /webhook`:**
  - verifies the Stripe signature (HMAC-SHA256, 5-minute tolerance);
  - on `checkout.session.completed`, builds an order record: customer, shipping address, each item's text, lettering, ink and set, plus a signed logo link;
  - saves the record to R2 and posts it to `ORDER_WEBHOOK_URL` (Zapier, Make or a Google Apps Script that writes the factory sheet and emails them).
- **`GET /logo/:key?sig=`:** serves a stored logo when the HMAC signature matches, so the factory link works without exposing the bucket.
- Text sent to sheets is escaped so it can't run as a formula (`=`, `+`, `-`, `@`).
- **Secrets:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `LINK_SECRET`, `ORDER_WEBHOOK_URL`. All are set with `wrangler secret put`; none go in the repo.

## Tests

- `node --test worker/` (no dependencies), covering:
  - price tampering;
  - text and logo validation;
  - the Stripe request body;
  - webhook signature pass and fail;
  - formula escaping;
  - the order hand-off.
- The browser checks:
  - add to bag, edit, quantity and remove;
  - the email fallback;
  - phone width and no console errors.

## Owner steps to go live

1. Create a Cloudflare account, an R2 bucket and the Worker (`npx wrangler deploy` from `worker/`).
2. Set the Stripe test keys as secrets, add the webhook endpoint in Stripe and copy its signing secret.
3. Point `config.checkout.endpoint` at the Worker and set `provider: "worker"`.
4. Place a test order with Stripe's test card, check the order lands, then switch to live keys.
