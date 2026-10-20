// Photo-like pink felt tennis ball, drawn on a canvas.
// The print (text and logo) is laid out flat on a texture, then wrapped onto the sphere.
(function () {
  "use strict";

  var FELT = [248, 156, 190];
  var SHEEN = [255, 214, 228];
  var SEAM = [248, 242, 239];
  var INKS = { black: [30, 22, 27], white: [255, 255, 255], wine: [92, 24, 52], gold: [128, 88, 36] };
  var FONTS = {
    script: { css: '400 {px}px "Great Vibes", cursive', scale: 1.3, upper: false, track: 0, line: 0.95 },
    serif: { css: 'italic 600 {px}px "Cormorant Garamond", Georgia, serif', scale: 1.05, upper: false, track: 0, line: 1.05 },
    caps: { css: '600 {px}px "Cinzel", Georgia, serif', scale: 0.78, upper: true, track: 0.08, line: 1.25 },
    modern: { css: '500 {px}px "Jost", system-ui, sans-serif', scale: 0.74, upper: true, track: 0.16, line: 1.3 }
  };
  var TEX = 1024;          // flat print texture size
  var THETA = 1.0;         // the texture covers ±THETA radians of the ball
  var SEAM_A = 0.8, SEAM_B = 0.2;
  var TILT = -0.1;         // slight turn so the seams aren't perfectly level

  var cache = {};          // per-size precomputed geometry
  var texCanvas = {};

  function canvas(key, w, h) {
    var c = texCanvas[key];
    if (!c) { c = texCanvas[key] = document.createElement("canvas"); }
    if (c.width !== w || c.height !== (h || w)) { c.width = w; c.height = h || w; }
    return c;
  }

  // Deterministic random so the felt looks the same on every render.
  function rng(seed) {
    return function () {   // mulberry32
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Smooth value noise on a G x G lattice, sampled over an S x S grid.
  function valueNoise(S, G, rand) {
    var lattice = new Float32Array((G + 1) * (G + 1)), out = new Float32Array(S * S);
    for (var i = 0; i < lattice.length; i++) lattice[i] = rand();
    for (var y = 0; y < S; y++) {
      var gy = y / S * G, y0 = Math.floor(gy), fy = gy - y0;
      fy = fy * fy * (3 - 2 * fy);
      for (var x = 0; x < S; x++) {
        var gx = x / S * G, x0 = Math.floor(gx), fx = gx - x0;
        fx = fx * fx * (3 - 2 * fx);
        var a = lattice[y0 * (G + 1) + x0], b = lattice[y0 * (G + 1) + x0 + 1];
        var c = lattice[(y0 + 1) * (G + 1) + x0], d = lattice[(y0 + 1) * (G + 1) + x0 + 1];
        out[y * S + x] = (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
      }
    }
    return out;
  }

  function geometry(S) {
    if (cache[S]) return cache[S];
    var R = S * 0.42, cx = S / 2, cy = S * 0.46;
    var n = S * S;
    var rand = rng(7);

    // Fine fibre grain (per pixel, lightly smoothed) and soft mottling (low frequency).
    var raw = new Float32Array(n), grain = new Float32Array(n);
    for (var i = 0; i < n; i++) raw[i] = rand();
    for (var y = 1; y < S - 1; y++) {
      for (var x = 1; x < S - 1; x++) {
        var k = y * S + x;
        grain[k] = (raw[k] * 2 + raw[k - 1] + raw[k + 1] + raw[k - S] + raw[k + S]) / 6;
      }
    }
    var mottle = valueNoise(S, 18, rand);          // soft dye variation
    var clumps = valueNoise(S, Math.round(S / 6), rand);   // fibre clumps a few pixels across

    // Seam: the classic tennis-ball curve, front-facing parts only, drawn as layers:
    // a soft groove, a cast shadow below-right, the rubber line, and a thin highlight above-left.
    var psi = Math.PI / 4 + TILT, cp = Math.cos(psi), sp = Math.sin(psi);
    var pts = [];
    for (var t = 0; t <= Math.PI * 2 + 0.001; t += Math.PI / 600) {
      var px = SEAM_A * Math.cos(t) + SEAM_B * Math.cos(3 * t);
      var py = SEAM_A * Math.sin(t) - SEAM_B * Math.sin(3 * t);
      var pz = 2 * Math.sqrt(SEAM_A * SEAM_B) * Math.sin(2 * t);
      pts.push([px * cp - py * sp, px * sp + py * cp, pz]);
    }
    function seamLayer(key, width, ox, oy, blur) {
      var c = canvas(key + S, S), ctx = c.getContext("2d");
      ctx.clearRect(0, 0, S, S);
      ctx.lineCap = "round";
      ctx.strokeStyle = "#000";
      for (var j = 1; j < pts.length; j++) {
        var p = pts[j - 1], q = pts[j];
        if (p[2] <= 0 || q[2] <= 0) continue;
        ctx.lineWidth = R * width * Math.sqrt((p[2] + q[2]) / 2);
        ctx.beginPath();
        ctx.moveTo(cx + (p[0] + ox) * R, cy + (p[1] + oy) * R);
        ctx.lineTo(cx + (q[0] + ox) * R, cy + (q[1] + oy) * R);
        ctx.stroke();
      }
      if (!blur) return ctx.getImageData(0, 0, S, S).data;
      var b = canvas(key + "Blur" + S, S), bctx = b.getContext("2d");
      bctx.clearRect(0, 0, S, S);
      bctx.filter = "blur(" + Math.max(0.6, S * blur) + "px)";
      bctx.drawImage(c, 0, 0);
      bctx.filter = "none";
      return bctx.getImageData(0, 0, S, S).data;
    }
    var grooveA = seamLayer("groove", 0.09, 0, 0, 1 / 240);
    var castA = seamLayer("cast", 0.05, 0.011, 0.015, 1 / 300);
    var seamA = seamLayer("seam", 0.042, 0, 0, 1 / 1400);
    var hiA = seamLayer("seamHi", 0.014, -0.007, -0.009, 1 / 900);

    // Per-pixel sphere data: coverage, shading, sheen, base colour, texture coordinates.
    var alpha = new Float32Array(n), shade = new Float32Array(n), sheen = new Float32Array(n);
    var shadeG = new Float32Array(n), shadeB = new Float32Array(n);
    var base = new Float32Array(n * 3), tu = new Float32Array(n), tv = new Float32Array(n), spec = new Float32Array(n);
    var L = [-0.42, -0.58, 0.7], ll = Math.hypot(L[0], L[1], L[2]);
    L = [L[0] / ll, L[1] / ll, L[2] / ll];
    var H = [L[0], L[1], L[2] + 1], hl = Math.hypot(H[0], H[1], H[2]);
    H = [H[0] / hl, H[1] / hl, H[2] / hl];
    for (y = 0; y < S; y++) {
      for (x = 0; x < S; x++) {
        k = y * S + x;
        var dx = (x + 0.5 - cx) / R, dy = (y + 0.5 - cy) / R;
        var r = Math.sqrt(dx * dx + dy * dy);
        var edge = 1 + (grain[k] - 0.5) * 0.022 + (clumps[k] - 0.5) * 0.018;   // fuzzy outline
        if (r > edge) { tu[k] = -1; continue; }
        alpha[k] = Math.min(1, (edge - r) * R / 1.4);
        var nz = r < 1 ? Math.sqrt(1 - r * r) : 0;
        var nx = r < 1 ? dx : dx / r, ny = r < 1 ? dy : dy / r;
        var diff = nx * L[0] + ny * L[1] + nz * L[2];
        // Wrap lighting gives felt its soft shadow edge; shadows lean deeper rose, not grey.
        var wrap = Math.max(0, (diff + 0.5) / 1.5);
        var sv0 = (0.3 + 0.86 * wrap) * (1 - 0.16 * Math.pow(Math.max(0, dy), 2));
        shade[k] = sv0;
        shadeG[k] = Math.pow(sv0, 1.32);
        shadeB[k] = Math.pow(sv0, 1.12);
        // Fibres catch light along the lit rim.
        sheen[k] = Math.pow(1 - nz, 2.4) * (0.12 + 0.3 * Math.max(0, -nx * 0.6 - ny * 0.8)) * (0.6 + 0.8 * grain[k]);
        spec[k] = Math.pow(Math.max(0, nx * H[0] + ny * H[1] + nz * H[2]), 24);

        var fv = 0.9 + 0.11 * grain[k] + 0.08 * (clumps[k] - 0.5) + 0.05 * (mottle[k] - 0.5);
        var cr = FELT[0] * fv, cg = FELT[1] * fv, cb = FELT[2] * fv;
        var gr = grooveA[k * 4 + 3] / 255 * 0.14 + castA[k * 4 + 3] / 255 * 0.3;
        cr *= 1 - gr; cg *= 1 - gr * 1.15; cb *= 1 - gr;
        var m = seamA[k * 4 + 3] / 255;
        if (m > 0) {
          var sv = 0.95 + 0.05 * grain[k];
          cr = cr * (1 - m) + SEAM[0] * sv * m; cg = cg * (1 - m) + SEAM[1] * sv * m; cb = cb * (1 - m) + SEAM[2] * sv * m;
          var hi = hiA[k * 4 + 3] / 255 * m * 0.5;
          cr += (255 - cr) * hi; cg += (255 - cg) * hi; cb += (255 - cb) * hi;
        }
        base[k * 3] = cr; base[k * 3 + 1] = cg; base[k * 3 + 2] = cb;

        // Where this pixel lands on the flat print texture.
        if (nz > 0) {
          var lam = Math.atan2(dx, nz), phi = Math.asin(Math.max(-1, Math.min(1, dy)));
          tu[k] = (lam / THETA + 1) / 2 * TEX;
          tv[k] = (phi / THETA + 1) / 2 * TEX;
        } else {
          tu[k] = -1;
        }
      }
    }
    // Loose fibres: faint short strands over the surface, and a fuzzy halo past the outline.
    var strands = [], fr = rng(31), unit = S / 720;
    function feltAt(px2, py2, lighten) {
      var kk = (Math.max(0, Math.min(S - 1, py2 | 0))) * S + Math.max(0, Math.min(S - 1, px2 | 0));
      var l = lighten || 1;
      return "rgb(" + Math.min(255, FELT[0] * shade[kk] * l | 0) + "," + Math.min(255, FELT[1] * shadeG[kk] * l | 0) + "," + Math.min(255, FELT[2] * shadeB[kk] * l | 0) + ")";
    }
    var count = Math.round(S * S / 200);
    for (i = 0; i < count; i++) {
      var rr = Math.sqrt(fr()) * 0.97, aa = fr() * Math.PI * 2;
      var sx = cx + Math.cos(aa) * rr * R, sy = cy + Math.sin(aa) * rr * R;
      var len = R * (0.008 + fr() * 0.018), dir = fr() * Math.PI * 2;
      strands.push([sx, sy, sx + Math.cos(dir) * len, sy + Math.sin(dir) * len, feltAt(sx, sy, 0.85 + fr() * 0.4), 0.1 + fr() * 0.16, (0.5 + fr() * 0.6) * unit]);
    }
    var halo = Math.round(S * 2.2);
    for (i = 0; i < halo; i++) {
      var ang = fr() * Math.PI * 2, r0 = 0.965 + fr() * 0.035;
      var hx = cx + Math.cos(ang) * r0 * R, hy = cy + Math.sin(ang) * r0 * R;
      var dir2 = ang + (fr() - 0.5) * 1.6, len2 = R * (0.012 + fr() * 0.03);
      var lit = Math.max(0, -Math.cos(ang) * 0.6 - Math.sin(ang) * 0.8);
      strands.push([hx, hy, hx + Math.cos(dir2) * len2, hy + Math.sin(dir2) * len2, feltAt(hx, hy, 1 + lit * 0.35), 0.18 + fr() * 0.22, (0.5 + fr() * 0.5) * unit]);
    }
    cache[S] = { R: R, cx: cx, cy: cy, alpha: alpha, shade: shade, shadeG: shadeG, shadeB: shadeB, sheen: sheen, spec: spec, base: base, tu: tu, tv: tv, grain: grain, strands: strands };
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
    var maxW = TEX * 0.6;
    var px = 120 * f.scale * (logo ? 0.82 : 1);
    lines.forEach(function (s) { px = Math.min(px, px * maxW / Math.max(1, widthOf(ictx, s, f, px))); });
    var lineH = px * f.line;
    var textH = lines.length * lineH;

    var lw = 0, lh = 0, gap = 0;
    if (logo) {
      var boxH = TEX * (only ? 0.46 : 0.26) * (design.logoSize || 1);
      var aspect = logo.width / logo.height;
      lh = boxH; lw = lh * aspect;
      if (lw > maxW * 1.08) { lw = maxW * 1.08; lh = lw / aspect; }
      gap = lines.length ? TEX * 0.03 : 0;
    }
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
    return {
      ink: ictx.getImageData(0, 0, TEX, TEX).data,
      col: logo && design.logoInk === "original" ? cctx.getImageData(0, 0, TEX, TEX).data : null
    };
  }

  function render(target, design) {
    var S = target.width;
    var g = geometry(S);
    var tex = textures(design);
    var out = canvas("out" + S, S), octx = out.getContext("2d");
    var img = octx.createImageData(S, S), px = img.data;
    var inkC = INKS[design.ink] || INKS.white, gold = design.ink === "gold";
    var inkA = tex.ink, colD = tex.col;
    var n = S * S;
    for (var k = 0; k < n; k++) {
      var a = g.alpha[k];
      if (!a) continue;
      var sh = g.shade[k], sn = g.sheen[k];
      var r = g.base[k * 3], gg = g.base[k * 3 + 1], b = g.base[k * 3 + 2];
      var ia = 0, u = g.tu[k], v = g.tv[k];
      if (u >= 0 && u < TEX - 1 && v >= 0 && v < TEX - 1) {
        var x0 = u | 0, y0 = v | 0, fx = u - x0, fy = v - y0, i0 = (y0 * TEX + x0) * 4;
        var a00 = inkA[i0 + 3], a10 = inkA[i0 + 7], a01 = inkA[i0 + TEX * 4 + 3], a11 = inkA[i0 + TEX * 4 + 7];
        ia = ((a00 * (1 - fx) + a10 * fx) * (1 - fy) + (a01 * (1 - fx) + a11 * fx) * fy) / 255;
        if (colD) {
          var ca = colD[i0 + 3] / 255 * 0.95 * (0.85 + 0.15 * g.grain[k]);
          if (ca > 0) {
            r = r * (1 - ca) + colD[i0] * ca; gg = gg * (1 - ca) + colD[i0 + 1] * ca; b = b * (1 - ca) + colD[i0 + 2] * ca;
          }
        }
      }
      // Felt and seam, lit.
      r = r * sh; gg = gg * g.shadeG[k]; b = b * g.shadeB[k];
      r += (SHEEN[0] - r) * sn; gg += (SHEEN[1] - gg) * sn; b += (SHEEN[2] - b) * sn;
      // Ink sits in the felt: fibres break it up a little.
      if (ia > 0) {
        ia *= 0.93 * (0.8 + 0.2 * g.grain[k]);
        var ir, ig, ib;
        if (gold) {
          var s = g.spec[k], lift = 0.62 + 0.55 * sh;
          ir = inkC[0] * lift + 255 * s * 0.7; ig = inkC[1] * lift + 226 * s * 0.7; ib = inkC[2] * lift + 170 * s * 0.7;
        } else {
          ir = inkC[0] * sh; ig = inkC[1] * sh; ib = inkC[2] * sh;
        }
        r = r * (1 - ia) + ir * ia; gg = gg * (1 - ia) + ig * ia; b = b * (1 - ia) + ib * ia;
      }
      var o = k * 4;
      px[o] = r; px[o + 1] = gg; px[o + 2] = b; px[o + 3] = a * 255;
    }
    octx.putImageData(img, 0, 0);

    var ctx = target.getContext("2d");
    ctx.clearRect(0, 0, S, S);
    var sy = g.cy + g.R * 1.02;
    var sg = ctx.createRadialGradient(g.cx, sy, 0, g.cx, sy, g.R * 0.95);
    sg.addColorStop(0, "rgba(92, 24, 52, 0.26)");
    sg.addColorStop(1, "rgba(92, 24, 52, 0)");
    ctx.save();
    ctx.translate(g.cx, sy); ctx.scale(1, 0.16); ctx.translate(-g.cx, -sy);
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(g.cx, sy, g.R * 0.95, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Tight contact shadow where the ball meets the surface.
    var cg2 = ctx.createRadialGradient(g.cx, g.cy + g.R * 0.99, 0, g.cx, g.cy + g.R * 0.99, g.R * 0.5);
    cg2.addColorStop(0, "rgba(70, 16, 38, 0.42)");
    cg2.addColorStop(1, "rgba(70, 16, 38, 0)");
    ctx.save();
    ctx.translate(g.cx, g.cy + g.R * 0.99); ctx.scale(1, 0.12); ctx.translate(-g.cx, -(g.cy + g.R * 0.99));
    ctx.fillStyle = cg2;
    ctx.beginPath(); ctx.arc(g.cx, g.cy + g.R * 0.99, g.R * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.drawImage(out, 0, 0);

    ctx.lineCap = "round";
    for (var f = 0; f < g.strands.length; f++) {
      var st = g.strands[f];
      ctx.globalAlpha = st[5];
      ctx.strokeStyle = st[4];
      ctx.lineWidth = st[6];
      ctx.beginPath(); ctx.moveTo(st[0], st[1]); ctx.lineTo(st[2], st[3]); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Load the print fonts before the first render so text isn't drawn in a fallback face.
  var ready = (document.fonts && document.fonts.load) ? Promise.all([
    document.fonts.load('400 60px "Great Vibes"'),
    document.fonts.load('italic 600 60px "Cormorant Garamond"'),
    document.fonts.load('600 60px "Cinzel"'),
    document.fonts.load('500 60px "Jost"')
  ]).catch(function () {}) : Promise.resolve();

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

  window.PinkBall = { render: render, ready: ready, prepareLogo: prepareLogo, inks: INKS };
})();
