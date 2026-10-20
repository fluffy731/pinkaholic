# Pinkaholic: style direction

Inspired by crumble.co. Crumble sells cookware like a friend's kitchen: warm cream paper, a muted signature colour, a soft italic serif, pill buttons, rounded "pebble" photo frames, gingham dividers and tilted stickers. Pinkaholic keeps that warmth and playfulness, and swaps the kitchen for a wardrobe and olive for pink.

Mockup: [index.html](index.html)

## 1. What we took from Crumble

| Crumble | What it does | Pinkaholic version |
|---|---|---|
| Cream page (`#FEFAF0`), never pure white | Warm, homely, lets colourful product pop | "Milk" `#FFF8F3` page, "Shell" `#FFEFEA` panels |
| Olive ink (`#323A0B`) instead of black | Brand colour carries every word | Deep berry ink `#4A1230` for all text |
| Lavender + coral + butter + sage accents | Each section gets its own pastel band | Lilac, butter, pistachio bands; cherry for sale |
| Reckless serif, italic display headings | Soft, editorial, a bit retro | Fraunces (Google), italic 500 for display |
| Poppins body, nav, prices | Friendly geometric sans | Poppins, unchanged |
| Pebble-shaped image masks | Nothing feels like a hard rectangle | Pebble radius on product shots, arch frames on categories |
| Scrolling deals marquee | Urgency without shouting | Lilac marquee: drops, codes, free shipping |
| "SAVE $150" pill on every card | Price anchor up front | Cherry "SAVE $40" pill, strike-through RRP |
| Named colour swatches (Pink Sand, Matcha…) | Colour *is* the product | Named pink shades: Ballet, Bubblegum, Raspberry, Cherry Gingham |
| Gingham strips between sections | Picnic-table charm | Pink gingham strips |
| Tilted stickers ("100% non-toxic") | Hand-made, playful | "100% pink-certified", "Made to twirl" stickers |
| Trust strip with line icons | Removes purchase doubt | Free shipping, 30-day returns, Afterpay, ethically made |
| "Which cookware is best for you?" tabs | Guided choosing | "Which pink are you?" shade-finder tabs |
| "Why Crumble?" accordion + photo | Objection handling | "Why Pinkaholic?" accordion |
| Shoppable UGC video strip | Real kitchens, real proof | #PinkaholicIRL shoppable strip |

## 2. Colour tokens

| Token | Hex | Use |
|---|---|---|
| `--milk` | `#FFF8F3` | Page background |
| `--shell` | `#FFEFEA` | Cards, soft panels |
| `--ink` | `#4A1230` | All text, icons, outlines |
| `--ink-soft` | `#7A4A5E` | Secondary text |
| `--ballet` | `#F9D3DE` | Nav strip, hero tints, gingham |
| `--bubblegum` | `#FF8FB8` | Primary buttons, highlights |
| `--raspberry` | `#D63A6E` | Accent words in large headings, focus rings (not small text) |
| `--cherry` | `#D42A47` | Sale pills only (white text, AA) |
| `--lilac` | `#D9C8F2` | Marquee, UGC band |
| `--butter` | `#FFEDB0` | Reviews band, sticker fills |
| `--pistachio` | `#D6E6C3` | "Real wardrobes" band, eco messages |

Rules
- Text is always `--ink` on light bands; never pure black.
- One pastel band per section, alternating so neighbours never match.
- Cherry is reserved for money (sale pills, discounts) so it keeps meaning.
- Primary button: `--bubblegum` fill, `--ink` text (passes AA). Never white text on bubblegum.

## 3. Type

| Role | Font | Size (desktop / phone) | Notes |
|---|---|---|---|
| Display (H1) | Fraunces italic 500 | 64 / 40 px | Line-height 1.05, one accent word in raspberry |
| Section heading (H2) | Fraunces italic 500 | 44 / 30 px | Centred, like Crumble's "Foodie Favourites" |
| Card title (H3) | Fraunces 500 | 20 / 17 px | Upright, not italic |
| Wordmark | Poppins 500 | 22 px | Uppercase, letter-spacing 0.4em |
| Body | Poppins 400 | 16 px | Line-height 1.6 |
| Nav, labels | Poppins 500 | 14 px | |
| Price | Poppins 600 | 16 px | RRP in `--ink-soft`, struck through |

## 4. Shape and motif

- **Pills everywhere**: buttons, tags, badges, tabs use `border-radius: 999px`.
- **Pebble frames** for product images: `border-radius: 34px 40px 30px 44px / 40px 30px 44px 34px`. Slightly irregular, never a perfect rectangle.
- **Arch frames** for category tiles (fashion nod to boutique windows): `border-radius: 999px 999px 28px 28px`.
- **Gingham strip**: 28 px tall, two overlaid 50 % ballet stripes on milk, between major sections.
- **Stickers**: rotated −8° to 6°, solid fill (butter, ballet, lilac, pistachio), 1.5 px ink outline, Fraunces italic text.
- **Line icons**: 1.75 px stroke, round caps, ink colour, drawn not filled.

## 5. Components

- **Announcement marquee**: lilac, 40 px tall, bold label + regular detail, infinite scroll, pauses on hover.
- **Header**: thin utility row (About, Reviews, Lookbook) + centred wordmark + icons; category row on a ballet strip below.
- **Product card**: pebble image on shell, cherry "SAVE $X" pill top right, optional "NEW" tag, serif title, price row, named swatches (dot + name on hover).
- **Trust strip**: four icon + two-line label items, centred, on milk.
- **Review card**: white card on butter band, star row, bold title, quote, product link with tiny thumbnail.
- **Shade finder**: pill tabs with circular thumbnails; active tab gets a ballet fill.
- **Accordion**: ink hairlines between rows, Fraunces question, plus/minus on the right.
- **Newsletter**: bubblegum panel, serif headline "Get 15% off your first pink", email field + pill button, a small, polite "No thanks" link (Crumble's guilt-trip "I like to pay full price" is not carried over).

## 6. Voice

Crumble: warm, foodie, "Cookware too pretty to hide". Pinkaholic: warm, a little cheeky, unapologetically pink.

- Headlines: "Pink is a personality", "Pink Picks", "Which pink are you?", "Why Pinkaholic?", "Made for real wardrobes".
- Microcopy stays plain: "Add to bag", "Free returns within 30 days".
- Australian English throughout (colour, favourite, jewellery).

## 7. Next steps

- Real photography: soft daylight, cream or blush backdrops, product in a lived-in setting (Crumble shoots pots in real kitchens; shoot clothes in real bedrooms and cafés).
- Logo: a wordmark in the spaced Poppins style above is enough to start; a sticker-style secondary mark ("P" in a heart) for favicons and packaging.
- If the store is on Shopify, these tokens map straight onto theme settings (colours, fonts, button radius).
