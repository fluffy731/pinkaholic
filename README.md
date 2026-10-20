# Pinkaholic

Personalised pink tennis balls, delivered across Australia and New Zealand.

- Live site: https://fluffy731.github.io/pinkaholic/ (moving to https://pinkaholic.com.au, see [docs/domain-setup.md](docs/domain-setup.md))
- Every push to `main` that changes `site/` deploys to GitHub Pages.

## Where things are

| Path | What it is |
|---|---|
| `site/` | The website. Plain HTML, CSS and JS, with no build step |
| `site/config.js` | Prices, packs, shipping, delivery estimate and checkout links. Edit this to change the shop |
| `brand/logo.svg`, `brand/logo-white.svg` | The logo (Great Vibes script with a heart for the dot on the last i) |
| `brand/logo-alt-*.svg`, `brand/drafts/` | Other logo fonts that were tried |
| `brand/make_logo.py` | Rebuilds the logo SVGs from a font file (needs `pip install fonttools`) |
| `design/crumble-reference/` | The crumble.co-inspired style guide and first mockup |
| `docs/research/` | Market, pricing and ecommerce research |
| `docs/domain-setup.md` | How to connect the GoDaddy domain |
| `tools/decode.html` | Turns a Stripe `client_reference_id` back into the customer's ball text |

## Turning on checkout

1. In Stripe, create one Payment Link per pack (see `docs/research/ecommerce-routes.md`), with shipping address collection on and the success URL set to `https://pinkaholic.com.au/thanks.html`.
2. Paste each link into that pack's `link` in `site/config.js`, and set `checkout: { provider: "stripe" }`.
3. Push to `main`. Each order's `client_reference_id` holds the customer's text, which `tools/decode.html` reads.

## Preview locally

```bash
python -m http.server 8765 --directory site
```

Then open http://localhost:8765.
