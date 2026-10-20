// Shop settings. Change prices, packs and the checkout here; nothing else needs editing.
window.PINKAHOLIC = {
  currency: "AUD",
  contactEmail: "hello@pinkaholic.com.au",
  instagram: "https://www.instagram.com/pinkaholic.au",

  // Delivery promise shown under the order button (calendar days from today).
  // shippingFee applies below freeShippingFrom (AUD).
  delivery: { minDays: 12, maxDays: 18, shippingFee: 7.95, freeShippingFrom: 39 },

  // Print limits for the ball's face.
  print: { maxLines: 2, maxChars: 14 },

  // Prices are GST-inclusive AUD. "link" is the checkout URL for that pack (e.g. a Stripe Payment Link).
  packs: [
    { id: "single", name: "Single ball", qty: 1, price: 14, note: "A little pink gift", link: "" },
    { id: "can", name: "Can of 3", qty: 3, price: 29, note: "Our favourite. Comes in a gift can", link: "", featured: true },
    { id: "six", name: "Half dozen", qty: 6, price: 49, note: "Hens, birthdays, doubles teams", link: "" },
    { id: "twelve", name: "Club dozen", qty: 12, price: 85, note: "Clubs, events, party favours", link: "" }
  ],

  // "none" shows "Checkout opens soon" and lets people email their design.
  // "stripe" sends people to the pack's link, carrying their design in client_reference_id.
  checkout: { provider: "none" }
};
