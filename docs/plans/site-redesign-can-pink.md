# Site redesign: the can-pink shop

Owner's brief (4 Nov 2026), after an `impeccable` critique that scored the current site 24/40:
- **Goal:** a launch-ready shop. The new look must also fix what costs sales.
- **Scope:** every page in full: home, bag, policies, thanks.
- **Look:** pink-led and playful but luxe, matched to the can mockup: soft can-pink, raspberry ink, wine, a touch of leaf green.
- **Brand:** the new logo pack V1.1 (12-petal rose with three leaves). Nothing else must stay.

## Brand assets

- Put the V1.1 pack (from `Pinkaholic-Logo-V1.1.zip`) in `brand/logo-v1.1/`.
- New `brand/make_web_logos.py` writes light web copies to `site/assets/`. It strips the embedded metadata and rounds the coordinates. The copies are:
  - wordmark;
  - wordmark on dark;
  - rose with leaves;
  - rose only;
  - favicon.
- No can image was in the zip. Draw the can (clear tube, pink lid, frosted label with a heart) as an SVG for now, and swap in the photo when it arrives.

## Direction contract

- **THESIS:** the site is the can. It's a soft-pink gift world where the personalised ball is the hero, and typing a name is the first thing a visitor does. It refuses the ivory stationer page: small labels over italic headings, centred heads and rows of equal cards.
- **OWN-WORLD:**
  - Grounds are can-pink (#F9D5DF) and blush (#FFEAF0). Panels are the frosted label (#FFF6F8), each edged with a 1.5px raspberry line.
  - Raspberry (#E2306F) is for display type, the rose and outlines. Deep raspberry (#B8164E) is for small links. Wine (#5C1834) is for body text and the dark bands. Leaf (#2E9E5B) appears only in the logo and the tiny "done" ticks.
  - Shapes come from the can: pill buttons like the lid, and tall capsule frames like the tube. The heart outline from the label and the rose recur.
  - Type: Bodoni Moda (heavy, large) for display, Hanken Grotesk for everything else.
- **STORY:**
  1. The visitor sees a pink ball with a name on it and types their own.
  2. They watch it print, then pick a set they can see as balls and cans.
  3. They add it to the bag and understand honestly how ordering works.
- **FIRST VIEWPORT:**
  - On a can-pink field, a large Bodoni headline sits on the left. Under it are a name input, the price line ("From A$24.95, tracked delivery included") and a pill "Design yours" button.
  - On the right, a large live ball (about 560px) stands inside a frosted capsule, with a raspberry heart outline behind it. Typing in the hero prints on that ball.
  - On a phone the order is headline, ball (about 300px), input, then button, all above 812px.
- **FORM:** code-led, with no comp (no image generation here). This is my own direction, pinned by the owner's answers and the can mockup. seed: none (unavailable).
- **FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Page structure

1. **Notice:** a wine strip, one line on phones.
2. **Header:**
   - Logo and bag on every width.
   - Nav links on desktop.
   - On phones, a Menu button that opens a short panel.
   - The bag button keeps its accessible name at every width.
3. **Hero:** as the first viewport above. The hero name feeds the designer's first line.
4. **Designer:**
   - The preview sits in the can capsule and stays in view: sticky on desktop; on phones, a sticky mini ball with a sticky price and Add to bag bar.
   - "Start from an idea" chips (Wedding, Hens, Club, Keepsake) fill the form, with an Undo.
   - No step numbers.
   - The set picker shows A$ and the price per ball.
5. **Sets:** four tiles that show the quantity as balls. The Trio shows the can.
6. **Occasions:** a staggered gallery of large rendered balls, each with "Use this design".
7. **How it works and promises:** one band with three steps (the order matters, so they are numbered) and the four promises.
8. **Questions:** the heading sits on the left and the answers on the right.
9. **Footer:** wine background, with the blush logo and rose. Links are at least 44px tall.
10. **Policies and thanks:** the same header and footer, and a document layout in the new type. The draft banner on the policies page stays; it is the owner's call.

## Behaviour fixes (from the critique)

- **Email ordering:** while `checkout.provider` is "none", the bag button says "Email my order". It explains the steps before the click, and the Stripe line is hidden.
- **Long text:** drop `maxlength`. Show an over-limit message with a suggestion, and block Add to bag until the text fits. Report errors on the line that has the problem.
- **"Logo only":** say plainly that the typed words won't print.
- **Bag:**
  - The focus trap skips hidden buttons.
  - The quantity reads "sets", e.g. "2 sets (6 balls)".
  - Remove offers Undo.
- **Touch targets:** at least 44px for links, the stepper, the segmented control and the footer.
- **Contrast:** at least 4.5:1 for small text. Drop the rose-gold.
- **Prices:** shown as A$.
- **Ball:**
  - Recolour the felt to the can's soft pink.
  - Lettering stays Script (Great Vibes), Serif, Capitals (Cinzel) and Modern. Serif now previews in Bodoni Moda italic and Modern in Hanken Grotesk, so the site loads 4 font families, down from 4 families plus 2 extra.

## Check

- `node --test worker/test/*.test.js`.
- Preview at 375px and 1440px for:
  - typing in the hero;
  - every lettering and ink;
  - a long name;
  - a logo upload;
  - adding to the bag, editing and removing;
  - email order;
  - the menu;
  - the keyboard path through the bag;
  - the policies and thanks pages.
- No console errors.
- Screenshots sent to the owner.
- Nothing is pushed to `main` or deployed without asking.
