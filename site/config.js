// Shop settings. Change prices, packs and the checkout here; nothing else needs editing.
window.PINKAHOLIC = {
  currency: "AUD",
  contactEmail: "hello@pinkaholic.com.au",
  instagram: "https://www.instagram.com/pinkaholic.au",

  // Delivery promise shown under the order button (calendar days from today).
  // Prices include shipping. To charge shipping on small orders, set shippingFee and freeShippingFrom (AUD).
  delivery: { minDays: 12, maxDays: 18, shippingFee: 0, freeShippingFrom: 0 },

  // Print limits for the ball's face.
  print: { maxLines: 2, maxChars: 14 },

  // Prices are AUD and include GST and tracked shipping (see docs/research/market-and-pricing.md). "link" is the checkout URL for that pack (e.g. a Stripe Payment Link).
  packs: [
    { id: "single", name: "The Single", qty: 1, price: 24.95, note: "One ball, ready to gift", link: "" },
    { id: "can", name: "The Trio", qty: 3, price: 39.95, note: "Three balls in a gift can", link: "", featured: true },
    { id: "six", name: "The Six", qty: 6, price: 69.95, note: "For hens, birthdays and doubles teams", link: "" },
    { id: "twelve", name: "The Dozen", qty: 12, price: 119.95, note: "For clubs, events and favours", link: "" }
  ],

  // "none" shows "Checkout opens soon" and lets people email their design.
  // "stripe" sends people to the pack's link, carrying their design in client_reference_id.
  checkout: { provider: "none" }
};
