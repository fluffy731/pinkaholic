Ball photo for the site's designer (site/assets/ball.webp)

AI-generated, 4 November 2026, through Hugging Face Spaces:

1. ball-source-yellow.webp
   Space: mcp-tools/FLUX.1-Krea-dev (FLUX.1 Krea [dev], Black Forest Labs)
   Seed 4242, 1024x1024, guidance 4.0, 30 steps. Prompt:
   "Studio product photo of one brand new fluorescent yellow tennis ball, a perfect sphere with
   a crisp clean round silhouette, camera straight on at ball height, centred, filling 70 percent
   of the frame. Short, tightly trimmed, dense felt with a smooth even surface and almost no loose
   fibres. The white rubber seam curves gently near the left and right edges, wide smooth felt
   panel facing the camera. No logo, no text. Soft even front-left studio light, plain pale grey
   background. 100mm macro, f/11."
   Yellow, because the model draws real tennis balls far better than pink ones.

2. ball-cutout-yellow.webp
   Space: not-lain/background-removal (BiRefNet), from the image above.

3. site/assets/ball.webp
   python brand/make_ball_photo.py: recolours the felt to the can's pink, keeps the seam white,
   trims stray fibres, crops square and prints the ball's radius and seam positions used in site/ball.js.

Licence: FLUX.1 [dev] weights are under Black Forest Labs' non-commercial licence, which as
written lets you use the images it outputs commercially. Worth a read before launch. To swap
in a real product photo later: cut it out with the same framing (ball centred, radius about
0.45 of the width), save it as ball-cutout-yellow.webp or point SRC at it, and re-run the script.
