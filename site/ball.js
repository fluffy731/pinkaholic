// Pink felt tennis ball: a real photo (assets/ball.webp) with the print wrapped onto it.
// The print (text and logo) is laid out flat on a texture, mapped onto the sphere,
// then shaded by the photo's light so it reads as ink printed on the felt.
(function () {
  "use strict";

  var INKS = { black: [30, 22, 27], white: [255, 255, 255], wine: [92, 24, 52], gold: [128, 88, 36] };
  var FONTS = {
    script: { css: '400 {px}px "Great Vibes", cursive', scale: 1.3, upper: false, track: 0, line: 0.95 },
    serif: { css: 'italic 600 {px}px "Bodoni Moda", Georgia, serif', scale: 0.9, upper: false, track: 0, line: 1.05 },
    caps: { css: '600 {px}px "Cinzel", Georgia, serif', scale: 0.78, upper: true, track: 0.08, line: 1.25 },
    modern: { css: '700 {px}px "Hanken Grotesk", system-ui, sans-serif', scale: 0.74, upper: true, track: 0.1, line: 1.25 }
  };
  var TEX = 1024;          // flat print texture size
  var THETA = 0.92;        // the texture covers ±THETA radians of the ball
  // The photo: ball radius as a share of the image width (brand/make_ball_photo.py prints it),
  // and the turn that centres the print on the felt panel between the two seams.
  var PHOTO = "assets/ball.webp", PHOTO_R = 0.4464, LAM0 = 0;
  var FELT_LUM = 187;      // brightness of the lit felt, where ink shows at its true colour

  var cache = {};          // per-size photo pixels and sphere mapping
  var texCanvas = {};
  var photo = new Image();
  photo.decoding = "async";
  var photoReady = new Promise(function (done) {
    photo.onload = photo.onerror = function () { done(); };
    photo.src = PHOTO;
  });

  function canvas(key, w, h) {
    var c = texCanvas[key];
    if (!c) { c = texCanvas[key] = document.createElement("canvas"); }
    if (c.width !== w || c.height !== (h || w)) { c.width = w; c.height = h || w; }
    return c;
  }

  // The photo drawn at this size, plus where each of its pixels lands on the print texture.
  function geometry(S) {
    if (cache[S]) return cache[S];
    var R = S * 0.41, cx = S / 2, cy = S * 0.47;
    var c = canvas("photo" + S, S), ctx = c.getContext("2d");
    ctx.clearRect(0, 0, S, S);
    var ok = photo.complete && photo.naturalWidth > 0;
    if (ok) {
      var w = R / PHOTO_R;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(photo, cx - w / 2, cy - w / 2, w, w);
    } else {
      // Photo missing: a plain shaded pink disc so the print still shows.
      var gr = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
      gr.addColorStop(0, "#FAD2DE"); gr.addColorStop(0.7, "#EEA0B8"); gr.addColorStop(1, "#C8668A");
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    }
    var base = ctx.getImageData(0, 0, S, S).data;
    // A softened copy of the photo's brightness: the difference from it is the fibre detail.
    var soft = canvas("photoSoft" + S, S), sctx = soft.getContext("2d");
    sctx.clearRect(0, 0, S, S);
    sctx.filter = "blur(" + Math.max(1, S / 160).toFixed(1) + "px)";
    sctx.drawImage(c, 0, 0);
    sctx.filter = "none";
    var blur = sctx.getImageData(0, 0, S, S).data;

    var n = S * S;
    var lum = new Float32Array(n), detail = new Float32Array(n), tu = new Float32Array(n), tv = new Float32Array(n);
    for (var y = 0; y < S; y++) {
      for (var x = 0; x < S; x++) {
        var k = y * S + x, o = k * 4;
        lum[k] = 0.299 * base[o] + 0.587 * base[o + 1] + 0.114 * base[o + 2];
        detail[k] = lum[k] - (0.299 * blur[o] + 0.587 * blur[o + 1] + 0.114 * blur[o + 2]);
        tu[k] = -1;
        var dx = (x + 0.5 - cx) / R, dy = (y + 0.5 - cy) / R, rr = dx * dx + dy * dy;
        if (rr >= 0.97 || base[o + 3] < 250) continue;
        var nz = Math.sqrt(1 - rr);
        var lam = Math.atan2(dx, nz) - LAM0, phi = Math.asin(dy);
        tu[k] = (lam / THETA + 1) / 2 * TEX;
        tv[k] = (phi / THETA + 1) / 2 * TEX;
      }
    }
    cache[S] = { R: R, cx: cx, cy: cy, base: base, lum: lum, detail: detail, tu: tu, tv: tv };
    return cache[S];
  }

  function fontCss(f, px) { return f.css.replace("{px}", px.toFixed(1)); }

  function widthOf(ctx, text, f, px) {
    ctx.font = fontCss(f, px);
    var w = ctx.measureText(text).width;
    return w + Math.max(0, text.length - 1) * f.track * px;
  }

  function drawLine(ctx, text, f, px, cx, cy) {
    ctx.font = fontCss(f, px);
    ctx.textBaseline = "middle";
    if (!f.track) { ctx.textAlign = "center"; ctx.fillText(text, cx, cy); return; }
    ctx.textAlign = "left";
    var x = cx - widthOf(ctx, text, f, px) / 2;
    for (var i = 0; i < text.length; i++) {
      ctx.fillText(text[i], x, cy);
      x += ctx.measureText(text[i]).width + f.track * px;
    }
  }

  // Lay the design out flat. Ink-coloured marks go on one texture, full-colour logos on another.
  function textures(design) {
    var ink = canvas("ink", TEX), col = canvas("col", TEX);
    var ictx = ink.getContext("2d"), cctx = col.getContext("2d");
    ictx.clearRect(0, 0, TEX, TEX); cctx.clearRect(0, 0, TEX, TEX);
    ictx.fillStyle = "#000";

    var f = FONTS[design.font] || FONTS.script;
    var logo = design.logo && design.logoLayout !== "none" ? design.logo : null;
    var only = logo && design.logoLayout === "only";
    var lines = only ? [] : (design.lines || []).filter(Boolean).map(function (s) { return f.upper ? s.toUpperCase() : s; });
    // The seams run across the ball, so the print gets the wide felt panel between them,
    // set large like real pad printing, and is kept clear of the seams above and below.
    var maxW = TEX * 0.84, maxH = TEX * 0.56;
    var px = 170 * f.scale * (logo ? 0.82 : 1);
    lines.forEach(function (s) { px = Math.min(px, px * maxW / Math.max(1, widthOf(ictx, s, f, px))); });

    var lw = 0, lh = 0, gap = 0;
    if (logo) {
      var boxH = TEX * (only ? 0.46 : 0.26) * (design.logoSize || 1);
      var aspect = logo.width / logo.height;
      lh = boxH; lw = lh * aspect;
      if (lw > maxW) { lw = maxW; lh = lw / aspect; }
      gap = lines.length ? TEX * 0.03 : 0;
    }
    var fit = Math.min(1, maxH / (lines.length * px * f.line + lh + gap));
    px *= fit; lw *= fit; lh *= fit; gap *= fit;
    var lineH = px * f.line;
    var textH = lines.length * lineH;
    var total = textH + lh + gap;
    var y = TEX / 2 - total / 2;
    var parts = design.logoLayout === "below" ? ["text", "logo"] : ["logo", "text"];
    parts.forEach(function (p) {
      if (p === "logo" && logo) {
        var target = design.logoInk === "original" ? cctx : ictx;
        target.drawImage(logo, TEX / 2 - lw / 2, y, lw, lh);
        y += lh + gap;
      }
      if (p === "text" && lines.length) {
        lines.forEach(function (s, i) { drawLine(ictx, s, f, px, TEX / 2, y + lineH * (i + 0.5)); });
        y += textH + gap;
      }
    });
    // A slight blur: ink printed on felt never has a razor edge.
    function softened(src, key) {
      var c = canvas(key, TEX), ctx = c.getContext("2d");
      ctx.clearRect(0, 0, TEX, TEX);
      ctx.filter = "blur(1.1px)";
      ctx.drawImage(src, 0, 0);
      ctx.filter = "none";
      return ctx.getImageData(0, 0, TEX, TEX).data;
    }
    return {
      ink: softened(ink, "inkSoft"),
      col: logo && design.logoInk === "original" ? softened(col, "colSoft") : null
    };
  }

  function render(target, design) {
    var S = target.width;
    var g = geometry(S);
    var tex = textures(design);
    var out = canvas("out" + S, S), octx = out.getContext("2d");
    var img = octx.createImageData(S, S), px = img.data;
    px.set(g.base);
    var inkC = INKS[design.ink] || INKS.white, gold = design.ink === "gold", white = design.ink === "white";
    var inkA = tex.ink, colD = tex.col;
    var n = S * S;
    for (var k = 0; k < n; k++) {
      var u = g.tu[k], v = g.tv[k];
      if (u < 0 || u >= TEX - 1 || v < 0 || v >= TEX - 1) continue;
      var x0 = u | 0, y0 = v | 0, fx = u - x0, fy = v - y0, i0 = (y0 * TEX + x0) * 4;
      var a00 = inkA[i0 + 3], a10 = inkA[i0 + 7], a01 = inkA[i0 + TEX * 4 + 3], a11 = inkA[i0 + TEX * 4 + 7];
      var ia = ((a00 * (1 - fx) + a10 * fx) * (1 - fy) + (a01 * (1 - fx) + a11 * fx) * fy) / 255;
      var ca = colD ? colD[i0 + 3] / 255 : 0;
      if (ia <= 0 && ca <= 0) continue;
      var o = k * 4;
      var r = px[o], gg = px[o + 1], b = px[o + 2];
      // Printed ink is a layer on top of the felt: it follows the ball's broad light (the softened
      // photo, not each fibre), keeps a faint felt texture, and has a slight sheen where it's lit.
      var dt = g.detail[k];
      var sh = Math.max(0.4, Math.min(1.1, (g.lum[k] - dt) / FELT_LUM));
      var tex2 = dt * 0.22;
      var gloss = Math.pow(Math.max(0, sh - 0.92) / 0.18, 2) * 26;
      var cover = Math.max(0.86, Math.min(1, 1 - Math.max(0, dt) / 160));
      if (ca > 0) {
        ca *= 0.97 * cover;
        r = r * (1 - ca) + (colD[i0] * sh + tex2 + gloss) * ca;
        gg = gg * (1 - ca) + (colD[i0 + 1] * sh + tex2 + gloss) * ca;
        b = b * (1 - ca) + (colD[i0 + 2] * sh + tex2 + gloss) * ca;
      }
      if (ia > 0) {
        ia *= 0.97 * cover;
        var ir, ig, ib;
        if (gold) {
          var sp = Math.pow(Math.max(0, sh - 0.8) / 0.3, 3), lift = 0.66 + 0.46 * sh;
          ir = inkC[0] * lift + 255 * sp * 0.6; ig = inkC[1] * lift + 226 * sp * 0.6; ib = inkC[2] * lift + 170 * sp * 0.6;
        } else if (white) {
          // White ink is opaque on the pink: shaded by the ball's light, never grey.
          ir = 255 * (0.3 + 0.7 * sh); ig = 248 * (0.3 + 0.7 * sh); ib = 250 * (0.3 + 0.7 * sh);
        } else {
          ir = inkC[0] * sh; ig = inkC[1] * sh; ib = inkC[2] * sh;
        }
        ir += tex2 + gloss; ig += tex2 + gloss; ib += tex2 + gloss;
        r = r * (1 - ia) + ir * ia; gg = gg * (1 - ia) + ig * ia; b = b * (1 - ia) + ib * ia;
      }
      px[o] = r; px[o + 1] = gg; px[o + 2] = b;
    }
    octx.putImageData(img, 0, 0);

    stage(target, g, out, false);
  }

  // Clear the canvas, lay the ball's shadows on the floor, then draw the ball over them.
  function stage(target, g, ball, framed) {
    var ctx = target.getContext("2d");
    var S = target.width;
    ctx.clearRect(0, 0, S, S);
    // Soft floor shadow, then a tight contact shadow where the ball meets the surface.
    var sy = g.cy + g.R * 1.02;
    var sg = ctx.createRadialGradient(g.cx, sy, 0, g.cx, sy, g.R * 0.95);
    sg.addColorStop(0, "rgba(92, 24, 52, 0.26)");
    sg.addColorStop(1, "rgba(92, 24, 52, 0)");
    ctx.save();
    ctx.translate(g.cx, sy); ctx.scale(1, 0.16); ctx.translate(-g.cx, -sy);
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(g.cx, sy, g.R * 0.95, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    var cy2 = g.cy + g.R * 0.99;
    var cg2 = ctx.createRadialGradient(g.cx, cy2, 0, g.cx, cy2, g.R * 0.5);
    cg2.addColorStop(0, "rgba(70, 16, 38, 0.42)");
    cg2.addColorStop(1, "rgba(70, 16, 38, 0)");
    ctx.save();
    ctx.translate(g.cx, cy2); ctx.scale(1, 0.12); ctx.translate(-g.cx, -cy2);
    ctx.fillStyle = cg2;
    ctx.beginPath(); ctx.arc(g.cx, cy2, g.R * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (!framed) { ctx.drawImage(ball, 0, 0); return; }
    // A photo framed like assets/ball.webp: the same ball radius, centred on the ball.
    var w = g.R / PHOTO_R;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(ball, g.cx - w / 2, g.cy - w / 2, w, w);
  }

  // Show a printed sample photo (cut out by brand/make_ball_photo.py) in the same spot and light.
  function showPhoto(target, img) {
    stage(target, geometry(target.width), img, true);
  }

  // Load the print fonts and the photo before the first render, so nothing is drawn in a fallback.
  var fontsReady = (document.fonts && document.fonts.load) ? Promise.all([
    document.fonts.load('400 60px "Great Vibes"'),
    document.fonts.load('italic 600 60px "Bodoni Moda"'),
    document.fonts.load('600 60px "Cinzel"'),
    document.fonts.load('700 60px "Hanken Grotesk"')
  ]).catch(function () {}) : Promise.resolve();
  var ready = Promise.all([fontsReady, photoReady]);

  // Turn an uploaded image into a print-ready logo: trimmed, optionally without its white background.
  function prepareLogo(img, removeWhite) {
    var max = 800, sc = Math.min(1, max / Math.max(img.width, img.height));
    var w = Math.max(1, Math.round(img.width * sc)), h = Math.max(1, Math.round(img.height * sc));
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    var d = ctx.getImageData(0, 0, w, h), p = d.data;
    var minX = w, minY = h, maxX = -1, maxY = -1;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        if (removeWhite) {
          var lum = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
          var keep = Math.max(0, Math.min(1, (245 - lum) / 40));
          p[i + 3] = p[i + 3] * keep;
        }
        if (p[i + 3] > 16) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    ctx.putImageData(d, 0, 0);
    if (maxX < 0) return null;
    var t = document.createElement("canvas");
    t.width = maxX - minX + 1; t.height = maxY - minY + 1;
    t.getContext("2d").drawImage(c, minX, minY, t.width, t.height, 0, 0, t.width, t.height);
    return t;
  }

  window.PinkBall = { render: render, photo: showPhoto, ready: ready, prepareLogo: prepareLogo, inks: INKS };
})();
