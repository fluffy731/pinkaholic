# Pinkaholic launch plan

Goal: a live shop at pinkaholic.com.au, hosted on GitHub Pages, selling one product: a pink tennis ball printed with the customer's own text.

## Steps

1. Copy the crumble.co style work from the lingenious worktree into this repo (`design/crumble-reference/`).
2. Research comparable products and pricing → `docs/research/market-and-pricing.md`.
3. Research ecommerce, payment, shipping and tax routes → `docs/research/ecommerce-routes.md`.
4. Logo: curvy script wordmark "pinkaholic", with a pink heart for the dot on the final i → `brand/`.
5. Website in `site/`: one-product shop with a live text preview on the ball, pack sizes, 14-day delivery promise, FAQ. Checkout links are set in one config block so the chosen platform can be added without a redesign.
6. GitHub repo `fluffy731/pinkaholic` (public), deployed to Pages via GitHub Actions from `site/`.
7. GoDaddy DNS steps for pinkaholic.com.au and www → `docs/domain-setup.md`.
8. Check the site at desktop and phone width.

## Decisions

- Repo is public so free GitHub Pages works.
- Logo fonts come from Google Fonts (OFL licence, safe for a logo), converted to vector outlines with fontTools.
- No made-up reviews, customer counts or press logos on the live site.
- The checkout is a hosted page (static site, no server). The recommended platform comes from step 3.
