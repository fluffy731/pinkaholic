Ball photo for the site's designer (site/assets/ball.webp)

Current source: ball-source-gemini-printed.jpg (4 November 2026)
   Made by Solomon in the Gemini app (Google's Nano Banana image model), starting from his own
   photo of a box of printed Pinkaholic balls. The ball faces the camera with its seams running
   across, and "Pinkaholic" printed in black on the wide panel between them, like real pad print.

   python brand/make_ball_photo.py takes the word off (felt cloned from just above it, matched to
   the light), cuts the ball out of the grey backdrop, crops it square and prints the numbers
   ball.js uses: the ball's radius (PHOTO_R), the lit felt's brightness (FELT_LUM) and where the
   seams sit (the print is kept between them). Re-run it and update those constants if the
   source changes; WORD in the script is the box around the printed word.

Earlier, no longer used:
   ball-source-gemini.webp: the same kind of Gemini ball with its seams running up and down,
   which only left a narrow strip for printing, so lettering came out small.
   ball-source-yellow.webp and ball-cutout-yellow.webp: an AI-generated yellow ball (FLUX.1 Krea
   [dev] on Hugging Face, seed 4242), cut out with BiRefNet and recoloured pink. Replaced because
   it read as AI-made.
