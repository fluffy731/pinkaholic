Ball photo for the site's designer (site/assets/ball.webp)

Current source: ball-source-gemini.webp (4 November 2026)
   Made by Solomon in the Gemini app (Google's Nano Banana image model) from his own photo of a
   box of printed Pinkaholic balls: the printing was removed, the ball shown front-on and the box
   replaced with a plain grey backdrop. Prompt, roughly:
   "Edit this photo. Show only the pink tennis ball ... front-on, centred ... Remove all the
   printed black text so the felt is plain. Keep the real felt texture, the white seams, the soft
   pastel pink colour and the daylight exactly as they are. Replace the box and straw with a plain
   light grey background. Photorealistic, highest resolution, no new text or logos."

   python brand/make_ball_photo.py cuts it out, crops it square and prints the numbers ball.js
   uses: the ball's radius (PHOTO_R), the lit felt's brightness (FELT_LUM) and where the seams
   cross the middle (LAM0 centres the print between them). Re-run it and update those three
   constants if the source changes.

Earlier, no longer used: ball-source-yellow.webp and ball-cutout-yellow.webp
   An AI-generated yellow ball (FLUX.1 Krea [dev] on Hugging Face, seed 4242), cut out with
   BiRefNet and recoloured pink. Replaced because it read as AI-made.
