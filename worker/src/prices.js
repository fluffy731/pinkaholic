// Prices in AUD cents, GST and shipping included. Keep in step with site/config.js
// (a test checks the two match).
export const SETS = {
  single: { name: "The Single", balls: 1, cents: 2495 },
  can: { name: "The Trio", balls: 3, cents: 3995 },
  six: { name: "The Six", balls: 6, cents: 6995 },
  twelve: { name: "The Dozen", balls: 12, cents: 11995 }
};

export const FONTS = { script: "Script", serif: "Serif", caps: "Capitals", modern: "Modern" };
export const INKS = { wine: "Wine", black: "Black", white: "White", gold: "Gold foil" };
export const LAYOUTS = ["none", "above", "below", "only"];
