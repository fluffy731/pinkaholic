# Pinkaholic: ecommerce routes for a static site

Research date: 20 October 2026. Prices are in AUD unless marked. Fees and limits come from vendor pages fetched on that date (sources are linked inline and listed at the end). Anything I could not confirm from an official page is marked **[unconfirmed]**.

Context: Pinkaholic (pinkaholic.com.au, registered at GoDaddy) sells one product, a pink tennis ball printed with text the customer types in. A Chinese manufacturer ships orders straight to customers in Australia and New Zealand in about 14 days. The owner wants the site hosted on GitHub Pages, which is static with no server.

---

## 0. TL;DR

| | Launch fast and cheap | Grow into |
|---|---|---|
| **Route** | Static site + **Stripe Payment Link** (or Stripe Buy Button) with one required text custom field | **Shopify Basic** on `shop.pinkaholic.com.au` (or the whole domain), with a personalisation app and a fulfilment/tracking app |
| **Monthly cost** | A$0 (custom checkout domain optional, US$10/mo) | A$42/mo billed yearly, A$56/mo billed monthly, plus apps |
| **Domestic card fee** | 1.65% + A$0.30 | 1.7% + A$0.30 (Shopify Payments, Basic) |
| **Captures personalisation?** | Yes. Text field of up to 255 characters, with optional min/max length | Yes, through line item properties or a personaliser app |
| **Lives on GitHub Pages?** | Yes. The site only links out to Stripe-hosted checkout | The marketing site can stay on Pages; the store runs on Shopify |

**Important caveat:** GitHub's own terms say Pages "is not intended for or allowed to be used as a free web-hosting service to run your online business, e-commerce site, or any other website that is primarily directed at ... facilitating commercial transactions" ([GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)). A one-product shop site is arguably exactly that. The site architecture works fine on Pages. The risk is a policy one. Keep the repo on GitHub and deploy the same static files to **Cloudflare Pages** or **Netlify** if the owner wants zero policy risk (their free tiers are generally used for commercial sites; **[unconfirmed: check each provider's current terms]**). Every DNS and checkout approach below works the same way on those hosts.

---

## 1. Route comparison

### Worked example used below
One ball at **A$29.95** with free shipping included (illustrative price).

| Route | Monthly | Fee on A$29.95 (AU card) | Fee on A$29.95 (NZ/intl card) | Setup effort | On GitHub Pages? |
|---|---|---|---|---|---|
| Stripe Payment Link / Buy Button | A$0 (+US$10 custom domain, optional) | A$0.79 | A$1.35 (+2% if currency conversion) | Very low (no code) | Yes |
| Stripe Checkout Sessions (API) | A$0 | A$0.79 | A$1.35 | Medium (needs a serverless function) | Site yes; function must run elsewhere (Cloudflare Worker / Netlify Function) |
| Shopify Basic (Shopify Payments) | A$42 yearly / A$56 monthly | A$0.81 | A$1.35 | Low to medium | Store on a subdomain or the whole domain; Buy Button embed possible |
| Shopify Starter | n/a for new stores | — | — | — | — |
| Snipcart + Stripe | US$20/mo while sales < US$1,000/mo, then 2% | A$0.79 + Snipcart | A$1.35 + Snipcart | Medium (HTML attributes + crawler validation) | Yes |
| Square Payment Links / Square Online | A$0 (free plan) | A$0.66 (2.2%) | A$0.66 (2.2%) **[unconfirmed for intl cards]** | Low | Links yes; Square Online is a separate hosted site |
| PayPal (commercial transactions) | A$0 | A$1.17 (2.9% + A$0.30) | A$1.47 (3.9% + A$0.30) + 3–4% conversion | Low | Yes (buttons) |
| Ecwid Starter | US$5/mo (10 products) | Gateway fee only (Ecwid charges 0%) | Gateway fee only | Low to medium | Yes (embed widget) |
| Lemon Squeezy | — | — | — | — | **Not suitable.** Physical goods generally not approved |

### A. Stripe Payment Links / Stripe Checkout

**How it works with a static site:** create a Product + Price + Payment Link in the Stripe Dashboard. Then either link to `buy.stripe.com/...` from a "Buy" button, or paste the `<stripe-buy-button>` embed (one script tag and one element holding a button ID and the publishable key) into the static HTML ([Stripe Buy Button](https://docs.stripe.com/payment-links/buy-button)). No server is needed.

**Capturing the personalisation text: custom fields** ([Checkout custom fields](https://docs.stripe.com/payments/checkout/custom-components.md?platform=web&payment-ui=stripe-hosted), [Payment Links customise](https://docs.stripe.com/payment-links/customize)):
- **Up to 3 custom fields** per Checkout Session or Payment Link.
- Field types: **text** (up to **255 characters**), **numbers only** (up to 255 digits), **dropdown** (up to **10 options when created in the Dashboard, 200 via the API**).
- Optional **minimum_length / maximum_length** validation on text and numeric fields (documented for the Checkout Sessions API; the Payment Links API has the same `custom_fields[].text` object per Stripe's SDK classes). **[unconfirmed whether the Dashboard UI exposes min/max length; set it through the API if not]**
- Fields are required by default (`optional=true` makes them optional). Default values are supported.
- Labels aren't translated. Stripe says not to use custom fields for "personal, protected, or sensitive data".
- Values appear on the payment's page in the Dashboard, **in Dashboard payment exports**, and in the `checkout.session.completed` webhook.
- Custom text (shown near the shipping address, above or below the Pay button) can be **up to 1,200 characters**. Use it for the "made to order, about 14 days" message.

**Gotchas for personalisation**
- Custom fields belong to the **session, not each unit**. If a customer orders 3 balls with 3 different names, one field won't separate them cleanly. Options: fix quantity at 1 per order; offer a "3-pack" product with 3 text fields (the 3-field limit fits exactly); or ask for "one name per line" (fragile).
- Payment Links **cannot prefill custom fields from your site**. The only URL parameters are `prefilled_email`, `locked_prefilled_email`, `prefilled_promo_code`, `prefilled_amount`, `locale`, UTM codes and `client_reference_id` (alphanumeric, dashes or underscores only, up to 200 characters, so it can't carry free text) ([URL parameters](https://docs.stripe.com/payment-links/url-parameters)). The customer therefore types the text **on the Stripe page**. You can still show a live preview on your own site, but the customer has to type the text again at checkout. To capture the text on your site and pass it through, use **Checkout Sessions** created by a small serverless function (Cloudflare Worker, Netlify Function) and pass the text in `custom_fields[].text.default_value` or `metadata`.

**Shipping**
- Collect billing and shipping addresses, restrict the allowed countries to **AU, NZ**, and optionally add phone number collection ([Payment Links customise](https://docs.stripe.com/payment-links/customize)).
- Shipping rates: fixed-amount rates with a delivery estimate (min/max business days) can be attached to a Payment Link; only one-time prices are supported ([Charge shipping](https://docs.stripe.com/payments/no-code/charge-shipping)). **[unconfirmed: maximum number of shipping rates per link, and per-country rates.]** Payment Link shipping rates don't appear to vary by destination country. Simplest fixes: build shipping into the price (free shipping to AU and NZ), or create separate AU and NZ links.

**Payment methods in AU**
- Cards, Apple Pay and Google Pay are shown automatically through dynamic payment methods on Payment Links ([Create a payment link](https://docs.stripe.com/payment-links/create)). No domain registration is needed on the Stripe-hosted page. Domain registration only applies to embedded Elements ([PMD registration](https://docs.stripe.com/payments/payment-methods/pmd-registration)).
- **Afterpay:** available to AU and NZ Stripe accounts, supported on Payment Links and Checkout, A$1–A$4,000 per order. In general availability it is **domestic only**: an AU account can offer it to AU customers, while cross-border (AU account to NZ customer) is in private preview ([Stripe Afterpay](https://docs.stripe.com/payments/afterpay-clearpay)). Pre-orders are a prohibited category for Afterpay. Made-to-order goods are probably fine, but don't describe them as "pre-order" **[unconfirmed]**.
- **Klarna** (AU/NZ) and **Zip** are also available. See the fees below.

**Fees (Stripe AU)** ([stripe.com/au/pricing](https://stripe.com/au/pricing), [local payment methods](https://stripe.com/au/pricing/local-payment-methods))
| Item | Fee |
|---|---|
| Domestic cards and wallets | 1.65% + A$0.30 |
| International cards (e.g. NZ-issued) | 3.5% + A$0.30 (page notes "Lower pricing effective starting 1 Apr 2027") |
| Currency conversion | +2% |
| Afterpay | 6% + A$0.30 (+1.5% international, +2% conversion) |
| Zip | 5.49% + A$0.30 |
| Klarna | 4.99% + A$0.55 |
| Dispute | A$25 received + A$25 if countered (refunded if you win) |
| Payment Links custom domain | US$10/month |
| Stripe Tax Basic | 0.5% per transaction (no-code) or A$0.75 per transaction (API), only after you add a registration |

**Stripe Tax:** supports AU and NZ GST for all product tax codes ([supported countries](https://docs.stripe.com/tax/supported-countries)). Not needed until you're GST-registered. Even then, with a single tax-inclusive price, you can skip Stripe Tax and have the accountant work GST out from the exports.

**Pros:** A$0/month, the lowest domestic fee of the mainstream options, live in an afternoon, Apple Pay, Google Pay and Afterpay, and the personalisation text sits on the order record.
**Cons:** no cart; one text field per order unless you design around it; the customer types the text on the Stripe page; shipping rates are basic; no built-in order or fulfilment management (you need a sheet or automation).

### B. Shopify (Starter, Basic)

**Pricing (AU)** ([shopify.com/au/pricing](https://www.shopify.com/au/pricing))
| Plan | Monthly | Yearly (per month) | Domestic card | Amex | International card | Third-party gateway fee |
|---|---|---|---|---|---|---|
| Basic | A$56 | A$42 | 1.7% + 30c | 2.9% + 30c | 3.5% + 30c | 2% |
| Grow | A$149 | A$114 | 1.55% + 30c | 2.8% + 30c | 3.4% + 30c | 1% |

The Shopify homepage currently advertises a 3-day free trial, then A$1/month for the first months ([shopify.com/au/starter](https://www.shopify.com/au/starter)).

**Starter plan:** Shopify's Help Centre now says **"The Starter plan isn't available to new stores"** ([Starter plan](https://help.shopify.com/en/manual/intro-to-shopify/pricing-plans/plans-features/shopify-starter-plan)). When it was available it cost about A$7/month with a ~5% transaction fee (third-party sources, **[unconfirmed]**) and used a fixed "Spotlight" theme with no custom templates. Treat Basic as the entry plan.

**Using Shopify with a static site**
- **Buy Button channel:** "included in all Shopify subscription plans" ([Buy Button](https://help.shopify.com/manual/sell-online/buy-button)). You embed a JS widget in the GitHub Pages HTML. **Catch:** the stock Buy Button has no free-text personalisation field. Passing line item properties or custom attributes through Buy Button JS needs custom code, and community reports say it's unreliable, with attributes reaching the cart but not always the order ([Shopify Community](https://community.shopify.com/t/how-to-add-custom-attributes-using-buy-button-js/115405)). **Not recommended for a personalised product.**
- **Shopify-hosted store on a subdomain** (`shop.pinkaholic.com.au`): CNAME `shop` to `shops.myshopify.com`. No A record is needed for a subdomain ([Connect a subdomain](https://help.shopify.com/en/manual/domains/add-a-domain/connecting-domains/connect-subdomain)). The GitHub Pages site stays at the apex and links to the shop. This is the clean way to combine the two.
- **Whole domain on Shopify:** apex A record `23.227.38.65`, AAAA `2620:0127:f00f:5::`, and www CNAME `shops.myshopify.com.` ([Connect a domain manually](https://help.shopify.com/en/manual/domains/add-a-domain/connecting-domains/connect-domain-manual)). The site then leaves GitHub Pages.

**Capturing custom text:** use line item properties (`properties[Name on ball]` inputs on the product form), added in the theme or through apps such as Infinite Options, Globo/Easify product options, Teeinblue or Customify (live preview). Properties show on the order in Admin and flow into fulfilment apps. Watch-outs: dynamic "Buy it now" buttons can bypass required fields; properties may be missing from standard CSV exports; "Buy again" drops properties ([Shopify Community](https://community.shopify.com/t/product-pages-get-customization-information-for-products/7588), [cleancommit.io](https://cleancommit.io/blog/shopifys-buy-again-problem-preserving-line-item-properties/)). Test with a real order.

**Dropshipping / POD integrations**
- **DSers (AliExpress):** order placement, bulk orders and tracking sync. I could **not confirm** that DSers forwards line item properties or personalisation text to the AliExpress supplier. A merchant on the Shopify Community reported it didn't show up ([thread](https://community.shopify.com/t/how-do-i-get-my-customization-text-to-flow-to-supplier-which-is-dsers/268188)). It's also irrelevant if you have your own factory.
- **CJdropshipping:** has a POD "Design by buyers" flow (Shopify only), and personalised text or images are visible on the order's POD tab in the CJ Dropshipping Centre ([CJ blog](https://blog.cjdropshipping.cn/detail/how-to-use-cjs-print-on-demand-feature-to-grow-your-dropshipping-business-design-by-buyers)). CJ could act as the sourcing and printing agent if the current factory can't automate. **[unconfirmed: pricing and whether a plain text field works without an image design]**
- With **your own manufacturer**, the usual pattern is a Shopify order export (CSV with line item properties) or a fulfilment app that emails the supplier, e.g. "Order Printer" / "Auto Fulfillment by email" style apps **[unconfirmed app names; check the Shopify App Store]**.

**Pros:** real cart, order management, discount codes, abandoned-cart emails, an app ecosystem for personalisation previews and tracking, multi-currency, Shopify Payments with Apple Pay, Google Pay and Afterpay (AU).
**Cons:** A$42–56/mo before apps; the Buy Button isn't good for personalised items; to do it properly the store must live on Shopify (a subdomain is fine).

### C. Snipcart (JS cart for static sites)

- Pricing: **2% per transaction; under US$1,000/month in sales, a flat US$20/month instead**. Gateway (Stripe/PayPal) fees are extra. Billed in USD ([Snipcart pricing](https://snipcart.com/pricing)).
- Custom fields: `data-item-customX-name`, `-type` (text by default, or `textarea`, `checkbox`, `readonly`, `hidden`), `-options` (dropdown with price modifiers), `-required="true"`, `-value` (can be set by your JS before add-to-cart, so the text the customer types on your page can flow straight in), `-placeholder` ([Snipcart v3 products](https://docs.snipcart.com/v3/setup/products)). No documented maximum length, so enforce it yourself in JS and in the JSON validation.
- Crawler validation: Snipcart fetches the product page URL and checks the `snipcart-add-item` element and price. This works on GitHub Pages because the pages are public.
- **Pros:** proper cart, per-item personalisation text (each cart line keeps its own text), works on a static site. **Cons:** US$20/mo minimum is expensive at low volume; another vendor in the chain; the GitHub Pages "e-commerce" clause applies even more directly.

### D. Square, PayPal, Ecwid, Lemon Squeezy

**Square (AU):** online payments (Payment Links, Square Online, Online Checkout) are **2.2% per transaction**, no fixed fee, no monthly fee. Afterpay through Square is 6% + 30c excl. GST ([Square Payment Links AU](https://square.com/au/en/payment-links), [Square fees help](https://square.com/help/au/en/article/5068-what-are-square-s-fees)). Square Online (a separate hosted site builder, free plan) supports a **text box modifier** with a character limit and a "required" toggle, so it can capture personalisation per item (seller community reports, [thread](https://community.squareup.com/t5/Online-Store/How-to-add-a-personalisation-option-to-orders-in-Square-Online/m-p/757816), **[unconfirmed in official docs]**). Square's flat 2.2% beats Stripe on small tickets (below about A$54, Stripe's 1.65% + 30c costs more) and on international cards. Whether Square Payment Links themselves (rather than Square Online) can collect free-text personalisation is **[unconfirmed]**. A good alternative if the owner prefers Square.

**PayPal (AU):** 2.9% + A$0.30 domestic and 3.9% + A$0.30 international, with 3–4% currency conversion. Advanced card processing is 1.5% + fixed (+2.1% international) ([PayPal AU fees](https://www.paypal.com/au/business/paypal-business-fees)). Legacy HTML buttons support a text option (`on0`/`os0`) of up to **200 characters** ([PayPal HTML variables](https://developer.paypal.com/archive/paypal-payments-standard/integration-guide/Appx-websitestandard-htmlvariables)), but that's an archived product. Best used as an *extra* option (many shoppers like PayPal), not the main checkout.

**Ecwid:** Starter US$5/mo (10 products), Venture US$35 / US$29 yearly, **0% Ecwid transaction fees**, and the store can be embedded on any site ([Ecwid pricing](https://www.ecwid.com/pricing)). Product options support text input on paid plans **[unconfirmed which plan]**. A reasonable "real cart on a static site" alternative to Snipcart.

**Lemon Squeezy: not suitable.** "We typically do not approve stores selling services or goods fulfilled outside of Lemon Squeezy", and physical goods are the example given ([Lemon Squeezy activation](https://docs.lemonsqueezy.com/help/getting-started/activate-your-store)).

---

## 2. Fulfilment workflow with a Chinese manufacturer

### Order to factory
1. **Manual (launch, under ~10 orders a day):** each morning, export yesterday's payments from the Stripe Dashboard. The export includes custom field values and shipping details ([Stripe custom fields](https://docs.stripe.com/payments/checkout/custom-components.md?platform=web&payment-ui=stripe-hosted)). Paste into a shared Google Sheet or CSV template agreed with the factory (columns: order ID, name, address, phone, country, ball text, quantity, font/colour if any). Email it, or share it through WeChat/WhatsApp.
2. **Automated (Zapier or Make):** Zapier has an instant Stripe trigger, **"Checkout Session Completed"**, and templates that write each session to Google Sheets rows ([Zapier template](https://zapier.com/apps/google-sheets/integrations/stripe/1383831/create-multiple-spreadsheet-rows-in-google-sheets-for-completed-stripe-checkout-sessions)). **[unconfirmed whether Zapier exposes `custom_fields` directly; if not, add a "Stripe: find Checkout Session" or webhook step.]** Make.com's Stripe "Watch events" and webhook modules can do the same. The factory then works from the live sheet and fills in a "tracking number" column.
3. **Self-hosted webhook (later):** a Cloudflare Worker receives `checkout.session.completed`, writes to a sheet or Airtable, and emails the factory. It costs nothing at small volume.
4. **Shopify:** order export with line item properties, or a fulfilment-by-email app. Alternatively use CJdropshipping as agent (POD tab shows the customer's text).

### Personalisation guardrails
- Set a **hard character limit** that matches the print area (e.g. 12–15 characters) with `maximum_length`. Say whether emoji or non-Latin characters are allowed, and whether text is printed as typed (case, spelling).
- Publish a content policy (no trademarks, offensive text) and the right to refuse or refund.
- Ask the factory for a **photo of each finished ball before dispatch** (cheap for them, saves disputes). Keep it as evidence for chargebacks.

### Samples and QC
- Order samples of several text lengths and fonts. Test print durability (abrasion, water, and dog saliva if it will be marketed for dogs), colour match to the brand pink, felt quality, bounce, and packaging.
- Ask for material and ink safety documents (e.g. non-toxic ink declaration, EN 71 / ASTM F963 / AS/NZS ISO 8124 test reports if marketing to children; see section 4).
- Agree turnaround (e.g. print within 2 business days), a reprint policy for errors, and a carrier with end-to-end tracking. Do one test order to your own address in AU and one to NZ.

### Customer tracking
- **17TRACK:** free public tracking site covering Chinese carriers through to AusPost or NZ Post last mile. Paid API and plans available **[unconfirmed pricing]**.
- **AfterShip:** free plan with **50 shipments/month**; Essentials **US$11/mo** for 100 shipments plus US$0.08 each extra ([AfterShip help](https://tracking-helpcenter.aftership.com/en/article/understanding-aftership-pricing-models-and-plan-selection-17x7li9), [Shopify App Store](https://apps.shopify.com/aftership)). It gives a branded tracking page on your domain and email notifications, and integrates with Shopify, WooCommerce and Stripe-via-API **[Stripe integration unconfirmed]**.
- At launch: email the customer the tracking number with a 17TRACK link (Zapier can send it when the factory fills the tracking column).

---

## 3. Shipping China to AU/NZ (60–200 g parcel)

| Service | Typical AU transit | Notes | Rough cost, 60–200 g |
|---|---|---|---|
| YunExpress Standard Express | AU 4–7 business days (excl. remote) | 0–20 kg, 1 item per shipment, min billable 50 g, volumetric ÷ 8000 ([YunExpress](https://yunexpress.cn/our-solutions/b2c/standard-express)) | ~US$3–7 **[unconfirmed estimate]** |
| CJPacket (via CJ) | AU 7–13 days ([Ship24](https://ship24.com/couriers/cjpacket-tracking)) | Only if fulfilling through CJ | ~US$3–6 **[unconfirmed estimate]** |
| 4PX / special lines | 7–12 business days | ~US$13–15/kg plus per-parcel fee ([NextSmartShip](https://www.nextsmartship.com/?p=49563)) | ~US$3–6 **[unconfirmed estimate]** |
| China Post ePacket | 7–30 days, avg ~20 | 2023 table: 0.5 kg ≈ A$11.27; rates reset by China Post ([Wise](https://wise.com/au/blog/epacket-shipping-australia)) | Probably A$5–9 at 100–200 g **[unconfirmed]** |
| Yanwen economy | 15–30 days | Tracking may stop after export | Cheapest; **not compatible with a 14-day promise** |

Per-parcel handling fees outweigh weight at this size. **Get real quotes from the factory's forwarder** for 100 g and 200 g to AU metro, AU regional and NZ. NZ is usually a little dearer and slower than AU.

### Presenting the 14-day promise honestly
The ACCC has sued over missed advertised delivery windows (Mosaic Brands) ([Inside Retail](https://insideretail.com.au/business/mosaic-brands-faces-court-for-failing-to-deliver-online-orders-on-time-202403)). Suggested wording:
- "**Made to order.** We print your ball within 2 business days, then it ships to you with tracking. Most orders arrive in **10–14 days** (AU metro); allow up to **21 days** for regional AU and NZ."
- Show this on the product page **and** at checkout (Stripe custom text above the Pay button, up to 1,200 characters).
- Say clearly that it **ships from our production partner overseas**. Never imply "Australian made" (country-of-origin claims are regulated). Name the carrier and send tracking.
- Publish what happens if it's late (e.g. "not arrived by day 21? Contact us and we'll reprint or refund").

---

## 4. Tax and compliance (high level; confirm with an accountant)

- **ABN:** free; required in practice for a `.com.au` domain (auDA eligibility needs an ABN/ACN/registered trade mark, and registrars now check ABN status at renewal) ([Sprintlaw](https://sprintlaw.com.au/articles/new-com-au-domain-eligibility-rules-what-australian-businesses-need-to-know/), [CircleID](https://circleid.com/%20posts/auda-moves-to-tighten-domain-name-eligibility)). Check that the domain is held under the owner's ABN.
- **Business name:** register "Pinkaholic" with ASIC unless trading under the owner's own name. Fees are about A$47 for 1 year or A$108 for 3 years from 1 July 2026 (A$45 / A$104 in 2025-26) ([ABLIS](https://ablis.business.gov.au/service/ag/business-name-registration/370), [Sleek](https://sleek.com/au/?p=95037)) **[confirm current figures on asic.gov.au]**. Consider a trade mark later.
- **GST registration:** required once GST turnover reaches **A$75,000** (standard ATO threshold). **Drop-ship sales count** towards it ([ATO: GST and Australian businesses](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/in-detail/rules-for-specific-transactions/international-transactions/australian-business-importing-goods-and-services)).
- **Australian GST on low-value imported goods (A$1,000 or less):** per the ATO, "if you are an Australian GST registered supplier and you 'drop ship', you will have to account for GST on your sale of low value imported goods". It applies to sales to consumers, not to GST-registered businesses. The **ABN and GST amount should appear on the import/customs documents** the factory or carrier lodges ([ATO: How to charge GST](https://www.ato.gov.au/businesses-and-organisations/international-tax-for-business/gst-for-non-resident-businesses/how-to-charge-gst)). This stops GST being charged a second time at the border. Before registration, no GST is charged.
- **NZ GST (15%) on low-value imported goods (NZ$1,000 or less):** an Australian seller is an *offshore supplier* to NZ and must register and collect NZ GST once sales to NZ consumers reach **NZ$60,000** in 12 months. Below that, nothing is collected at sale, and goods of NZ$1,000 or less aren't taxed by NZ Customs at the border either ([IRD fact sheet](https://www.taxpolicy.ird.govt.nz/publications/2018/2018-other-gst-low-value-imported-goods/fact-sheet), [IRD Q&A](https://taxpolicy.ird.govt.nz/publications/2018/2018-other-gst-low-value-imported-goods/questions-and-answers)). Sources date from 2018–19. **[Confirm current IRD guidance.]**
- **Australian Consumer Law:**
  - Consumer guarantees apply to personalised goods too: a faulty or misprinted ball must be repaired, replaced or refunded. You **may refuse change-of-mind returns** for personalised items. Say "no change-of-mind returns on personalised items". Don't write "no refunds", because the ACCC flagged wording like "Made to order products cannot be returned" in its 2025 returns sweep ([ACCC sweep](https://www.accc.gov.au/media-release/accc-sweep-uncovers-concerning-online-shopping-return-policies-and-terms-and-conditions)).
  - Delivery claims must be accurate (see section 3).
  - Display the total price including any shipping (and GST once registered).
- **Product safety:**
  - If marketed **to children up to 36 months**, the mandatory *Consumer Goods (Toys for Children up to and including 36 Months of Age) Safety Standard 2023* applies (compliance through AS/NZS ISO 8124.1:2023, EN 71-1, ISO 8124-1 or ASTM F963) ([Product Safety Australia](https://www.productsafety.gov.au/node/9739), [SGS](https://www.sgs.com/en-au/news/2023/09/safeguards-11723-australia-publishes-new-requirements-for-toys)). Simplest: market it as a sports and gift item, **not a toy for children under 3**, and label it so.
  - **Dog toys:** I found no Australian mandatory standard for pet toys **[unconfirmed]**. The general ACL safety obligations and recall powers still apply. Use non-toxic ink, warn about supervising dogs and replacing worn balls, and avoid health claims.
  - NZ has similar toy rules (the under-36-months product safety standard) **[unconfirmed details]**.
- **Privacy:** under the A$3m turnover threshold the Privacy Act generally doesn't apply to a small business, but publish a simple privacy policy anyway. Stripe requires terms and a privacy URL to show them at checkout.

---

## 5. GitHub Pages + GoDaddy DNS for pinkaholic.com.au

Source: [GitHub: managing a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site), [GitHub: verifying a domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages).

### Records to create in GoDaddy (Domain > Manage DNS)

| Type | Name (GoDaddy "Host") | Value | Notes |
|---|---|---|---|
| A | `@` | `185.199.108.153` | GitHub Pages |
| A | `@` | `185.199.109.153` | |
| A | `@` | `185.199.110.153` | |
| A | `@` | `185.199.111.153` | |
| AAAA | `@` | `2606:50c0:8000::153` | Optional IPv6 (keep the A records too) |
| AAAA | `@` | `2606:50c0:8001::153` | |
| AAAA | `@` | `2606:50c0:8002::153` | |
| AAAA | `@` | `2606:50c0:8003::153` | |
| CNAME | `www` | `<user>.github.io` | Your GitHub username or org; **no repo name** |
| TXT | `_github-pages-challenge-<user>` | value shown by GitHub | Domain verification; GoDaddy appends `.pinkaholic.com.au` automatically. Keep it permanently |

**Steps**
1. **Verify first:** GitHub profile (or org) **Settings > Pages > Add a domain**, enter `pinkaholic.com.au`, add the TXT record, then click **Verify**. Check with `dig _github-pages-challenge-<user>.pinkaholic.com.au +nostats +nocomments +nocmd TXT`. Verification stops anyone else claiming the domain on Pages.
2. In GoDaddy, **delete the default "Parked" `@` A record** and any domain-forwarding rule (forwarding can silently add its own A record) ([community reports](https://answers.netlify.com/t/domain-configuration-issue/129269/2), [GitHub Community](https://github.community/t/custom-domain-https-issues-with-godaddy/10438)). Don't create a wildcard `*` record. **Don't touch MX/TXT records used for email.**
3. Add the A, AAAA and `www` CNAME records above.
4. Repo **Settings > Pages > Custom domain**: enter `pinkaholic.com.au` (apex as the main domain, so `www` redirects to it), or `www.pinkaholic.com.au` if you prefer www as canonical. GitHub redirects between apex and www automatically when both are set up. When publishing through a custom GitHub Actions workflow, the `CNAME` file is ignored; the setting lives in repo settings.
5. Tick **Enforce HTTPS** once it's available ("can take up to 24 hours"). If a CAA record exists, it must allow `letsencrypt.org`.
6. Check with `dig pinkaholic.com.au +noall +answer -t A` (should return the four 185.199.x.153 addresses).

**.com.au quirks:** nothing special technically. DNS works the same as for .com, and an apex CNAME isn't allowed at GoDaddy anyway (use the A records). The quirks are administrative: auDA eligibility (ABN) must stay valid or the domain can be suspended. Turn on auto-renew and keep the registrant contact details current.

### Checkout subdomains (optional)

| Purpose | Type | Name | Value |
|---|---|---|---|
| Stripe Payment Links / Checkout on your domain (US$10/mo) | CNAME | `pay` | `hosted-checkout.stripecdn.com` |
| Stripe TLS verification | TXT | `_acme-challenge.pay` | value from Stripe Dashboard > Settings > Custom domains |
| Shopify store | CNAME | `shop` | `shops.myshopify.com` |

Stripe allows **one custom domain per account**, which must be a subdomain (not a path), and its certificates come from Let's Encrypt ([Stripe custom domains](https://docs.stripe.com/payments/checkout/custom-domains.md?payment-ui=stripe-hosted)). Shopify subdomains need only the CNAME, no A record ([Shopify subdomain](https://help.shopify.com/en/manual/domains/add-a-domain/connecting-domains/connect-subdomain)). Both coexist with the GitHub Pages apex.

---

## 6. Recommendation

### Launch (fast and cheap): Stripe Payment Link on the static site
1. Build the one-page site (hero, live text preview, FAQ, delivery, returns, privacy and terms pages). Host it on GitHub Pages as requested, or deploy the same repo to Cloudflare Pages or Netlify to avoid the GitHub Pages commercial-use clause.
2. In Stripe (AU account under the owner's ABN): one Product "Personalised Pinkaholic Ball", one AUD price **including shipping**.
   - Create two Payment Links: **AU** (allowed country AU; Afterpay on) and **NZ** (allowed country NZ). Alternatively, one link for both with a single flat shipping rate.
   - Add one required **text custom field** ("Text on your ball", max ~12–15 characters through the API), and optionally a dropdown (e.g. font or ink colour, up to 10 options in the Dashboard).
   - Add custom text near the Pay button about made-to-order and 10–14 days delivery, require terms acceptance, and redirect after payment to a thank-you page on the site.
   - Optionally create a 2-pack or 3-pack link with 2 or 3 text fields.
3. Fulfilment: daily Dashboard export to the shared Google Sheet for the factory, then add Zapier ("Checkout Session Completed" to Sheets plus a Gmail notification) once orders are steady. Send tracking with a 17TRACK link, or AfterShip free (50 a month).
4. Cost: **A$0/month**. **1.65% + A$0.30** per AU card sale (about A$0.79 on A$29.95). NZ cards cost 3.5% + A$0.30.

### Grow into: Shopify Basic on `shop.pinkaholic.com.au` (or the whole domain)
Move when you need any of: a cart with several differently personalised balls per order, discount codes and abandoned-cart flows at scale, a live personalisation preview captured with the order, automatic fulfilment and tracking emails, or more products (colours, packs, gift boxes). Use a personaliser app (line item properties), AfterShip, and either email/CSV fulfilment to your own factory or CJdropshipping POD as agent. Cost is **A$42–56/month + 1.7% + 30c** plus apps (~A$10–30/month). Keep the GitHub/Cloudflare marketing site at the apex, or move everything to Shopify.

**Middle path, if staying static matters long-term:** keep Stripe but switch from Payment Links to **Checkout Sessions created by a free Cloudflare Worker**. The customer types and previews the text on your page, the Worker creates the session with that text prefilled (`default_value`) or in metadata, and the same Worker handles the webhook to the factory sheet. This costs nothing extra. It takes about a day of development.

---

## 7. Items to confirm before launch
- The factory's forwarder quote for 100 g and 200 g to AU and NZ, plus print turnaround.
- Whether the Stripe Dashboard UI lets you set the max length on a Payment Link text field (otherwise use the API).
- Payment Link shipping rate count and per-country behaviour (or avoid the issue by including shipping in the price).
- Whether Zapier's Stripe trigger exposes `custom_fields` (test with a test-mode Payment Link).
- Shopify Starter availability. Shopify says it isn't available to new stores; plan on Basic.
- Current ASIC business name fee, GST registration timing, and NZ offshore supplier rules with the accountant.
- Hosting choice in light of the GitHub Pages "no e-commerce" clause.

---

## Sources
- Stripe: [Custom fields (hosted Checkout)](https://docs.stripe.com/payments/checkout/custom-components.md?platform=web&payment-ui=stripe-hosted) · [Payment Links customise](https://docs.stripe.com/payment-links/customize) · [Create a payment link](https://docs.stripe.com/payment-links/create) · [Payment Links URL parameters](https://docs.stripe.com/payment-links/url-parameters) · [Charge shipping (no-code)](https://docs.stripe.com/payments/no-code/charge-shipping) · [Buy Button](https://docs.stripe.com/payment-links/buy-button) · [Afterpay](https://docs.stripe.com/payments/afterpay-clearpay) · [AU pricing](https://stripe.com/au/pricing) · [AU local payment methods pricing](https://stripe.com/au/pricing/local-payment-methods) · [Stripe Tax countries](https://docs.stripe.com/tax/supported-countries) · [Custom domains](https://docs.stripe.com/payments/checkout/custom-domains.md?payment-ui=stripe-hosted) · [Payment method domain registration](https://docs.stripe.com/payments/payment-methods/pmd-registration)
- Shopify: [AU pricing](https://www.shopify.com/au/pricing) · [Starter plan help](https://help.shopify.com/en/manual/intro-to-shopify/pricing-plans/plans-features/shopify-starter-plan) · [AU Starter page](https://www.shopify.com/au/starter) · [Buy Button](https://help.shopify.com/manual/sell-online/buy-button) · [Connect domain manually](https://help.shopify.com/en/manual/domains/add-a-domain/connecting-domains/connect-domain-manual) · [Connect subdomain](https://help.shopify.com/en/manual/domains/add-a-domain/connecting-domains/connect-subdomain) · [Community: Buy Button custom attributes](https://community.shopify.com/t/how-to-add-custom-attributes-using-buy-button-js/115405) · [Community: product customisation](https://community.shopify.com/t/product-pages-get-customization-information-for-products/7588) · [Community: DSers personalisation](https://community.shopify.com/t/how-do-i-get-my-customization-text-to-flow-to-supplier-which-is-dsers/268188)
- Snipcart: [Pricing](https://snipcart.com/pricing) · [v3 product definition](https://docs.snipcart.com/v3/setup/products)
- Square: [AU Payment Links](https://square.com/au/en/payment-links) · [AU fees](https://square.com/help/au/en/article/5068-what-are-square-s-fees) · [Community: personalisation](https://community.squareup.com/t5/Online-Store/How-to-add-a-personalisation-option-to-orders-in-Square-Online/m-p/757816)
- PayPal: [AU fees](https://www.paypal.com/au/business/paypal-business-fees) · [HTML variables (archived)](https://developer.paypal.com/archive/paypal-payments-standard/integration-guide/Appx-websitestandard-htmlvariables)
- Ecwid: [Pricing](https://www.ecwid.com/pricing) · Lemon Squeezy: [Activate your store](https://docs.lemonsqueezy.com/help/getting-started/activate-your-store)
- Fulfilment/shipping: [CJ POD blog](https://blog.cjdropshipping.cn/detail/how-to-use-cjs-print-on-demand-feature-to-grow-your-dropshipping-business-design-by-buyers) · [YunExpress Standard Express](https://yunexpress.cn/our-solutions/b2c/standard-express) · [Ship24 CJPacket](https://ship24.com/couriers/cjpacket-tracking) · [Wise ePacket AU](https://wise.com/au/blog/epacket-shipping-australia) · [NextSmartShip 4PX](https://www.nextsmartship.com/?p=49563) · [AfterShip plans](https://tracking-helpcenter.aftership.com/en/article/understanding-aftership-pricing-models-and-plan-selection-17x7li9) · [AfterShip Shopify app](https://apps.shopify.com/aftership) · [Zapier Stripe to Sheets](https://zapier.com/apps/google-sheets/integrations/stripe/1383831/create-multiple-spreadsheet-rows-in-google-sheets-for-completed-stripe-checkout-sessions)
- Tax/legal: [ATO GST and Australian businesses (drop shipping)](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/in-detail/rules-for-specific-transactions/international-transactions/australian-business-importing-goods-and-services) · [ATO how to charge GST](https://www.ato.gov.au/businesses-and-organisations/international-tax-for-business/gst-for-non-resident-businesses/how-to-charge-gst) · [IRD LVG fact sheet](https://www.taxpolicy.ird.govt.nz/publications/2018/2018-other-gst-low-value-imported-goods/fact-sheet) · [IRD Q&A](https://taxpolicy.ird.govt.nz/publications/2018/2018-other-gst-low-value-imported-goods/questions-and-answers) · [ACCC returns sweep](https://www.accc.gov.au/media-release/accc-sweep-uncovers-concerning-online-shopping-return-policies-and-terms-and-conditions) · [Mosaic delivery case](https://insideretail.com.au/business/mosaic-brands-faces-court-for-failing-to-deliver-online-orders-on-time-202403) · [Product Safety Australia toys 0–36 months](https://www.productsafety.gov.au/node/9739) · [SGS toy standard summary](https://www.sgs.com/en-au/news/2023/09/safeguards-11723-australia-publishes-new-requirements-for-toys) · [ABLIS business names](https://ablis.business.gov.au/service/ag/business-name-registration/370) · [Sleek fee update](https://sleek.com/au/?p=95037) · [Sprintlaw .com.au rules](https://sprintlaw.com.au/articles/new-com-au-domain-eligibility-rules-what-australian-businesses-need-to-know/) · [CircleID auDA](https://circleid.com/%20posts/auda-moves-to-tighten-domain-name-eligibility)
- GitHub: [Managing a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) · [Verifying a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages) · [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
