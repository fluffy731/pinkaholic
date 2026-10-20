# Realistic ball designer and elegant restyle

Owner's feedback (20 Oct 2026): the designer should look like a real printed ball, take a logo as well as text, and the ball is pink. The overall style feels too cartoon; it should be more elegant and posh.

## Designer

- New `site/ball.js` renders a photo-like pink felt ball on a canvas:
  - lighting and felt grain, with a fuzzy edge;
  - a real tennis-ball seam curve (white rubber line);
  - the print wrapped onto the sphere, so text and logos curve like they would on the ball.
- Inputs:
  - up to 2 lines of text;
  - 4 print styles (Script, Serif italic, Capitals, Modern);
  - 4 inks (Black, White, Wine, Gold foil);
  - an optional logo upload (PNG/JPG/SVG/WebP), with these settings:
    - position: above text, below text, or logo only;
    - size;
    - print the logo in the ink colour or in its original colours;
    - remove a white background.
- A logo can't travel through a payment link. Logo orders say "we'll email you to confirm your artwork before printing" until the cart and checkout function exist.

## Restyle

- Palette: ivory page, blush panels, wine text, rose-gold accent.
- Type: Cormorant Garamond headings, Jost body.
- Layout and details:
  - thin lines and generous space;
  - no stickers, gingham, chunky shadows or marquee;
  - pack names "The Single / The Trio / The Six / The Dozen", with prices unchanged.
- The occasion cards use small renders of the real ball.
- Keep the class names `policies.html` and `thanks.html` depend on (`.top`, `.foot`, `.doc`, `.btn`, `.lede`, `.order__soon`).

## Check

- Desktop and phone width in the browser, with no console errors.
- Logo upload, all layouts, every ink and font, and the email-order fallback.
