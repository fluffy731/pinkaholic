(function () {
  "use strict";

  var cfg = window.PINKAHOLIC;
  var Ball = window.PinkBall;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var STORE_KEY = "pinkaholic-design";
  var ALLOWED = /^[\p{L}\p{N} .,!?'’&+\-#@:()\/♥]*$/u;
  var MAX_LOGO_BYTES = 5 * 1024 * 1024;

  function money(n) {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: cfg.currency, minimumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  }

  function addDays(days) {
    var d = new Date();
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  }

  function store(get, value) {
    try {
      if (get) return JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      localStorage.setItem(STORE_KEY, JSON.stringify(value));
    } catch (e) { return null; }
  }

  // Size a canvas's drawing buffer to its displayed size (capped, for speed on phones).
  function fitCanvas(c, cap) {
    var w = c.getBoundingClientRect().width || c.width;
    var px = Math.round(Math.min(cap, Math.max(240, w * Math.min(window.devicePixelRatio || 1, 2))));
    if (c.width !== px) { c.width = px; c.height = px; }
  }

  // ---------- Static bits from config ----------
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  $$("[data-mail]").forEach(function (el) { el.href = "mailto:" + cfg.contactEmail; });
  $$("[data-insta]").forEach(function (el) { el.href = cfg.instagram; el.rel = "noopener"; });

  // ---------- Sets ----------
  var pick = $("#pack-pick");
  var cards = $("#pack-cards");
  cfg.packs.forEach(function (p) {
    var each = money(Math.round((p.price / p.qty) * 100) / 100);

    var lab = document.createElement("label");
    lab.innerHTML = '<input type="radio" name="pack" value="' + p.id + '"' + (p.featured ? " checked" : "") + '>' +
      "<span><b>" + p.name + "</b><small>" + p.qty + (p.qty > 1 ? " balls · " : " ball · ") + money(p.price) + "</small></span>";
    pick.appendChild(lab);

    var card = document.createElement("article");
    card.className = "pack" + (p.featured ? " pack--featured" : "");
    card.innerHTML = '<span class="pack__badge">' + (p.featured ? "Most loved" : "") + "</span>" +
      "<h3>" + p.name + "</h3>" +
      '<span class="pack__qty">' + p.qty + (p.qty > 1 ? " balls" : " ball") + "</span>" +
      "<p>" + p.note + "</p>" +
      '<div class="pack__price">' + money(p.price) + "</div>" +
      '<div class="pack__each">' + (p.qty > 1 ? each + " per ball" : "Shipping included") + "</div>" +
      '<a class="btn btn--small" href="#design" data-pack="' + p.id + '" aria-label="Choose ' + p.name + '">Choose</a>';
    cards.appendChild(card);
  });

  // ---------- Designer state ----------
  var form = $("#designer");
  var line1 = $("#line1"), line2 = $("#line2");
  var preview = $("#preview");
  var maxChars = cfg.print.maxChars;
  line1.maxLength = line2.maxLength = maxChars;

  var logoSource = null;   // the uploaded image
  var logoPrint = null;    // trimmed, print-ready version
  var logoName = "";

  var saved = store(true);
  if (saved) {
    if (typeof saved.line1 === "string") line1.value = saved.line1.slice(0, maxChars);
    if (typeof saved.line2 === "string") line2.value = saved.line2.slice(0, maxChars);
    ["font", "ink", "pack", "layout"].forEach(function (k) {
      var r = saved[k] && form.querySelector('input[name="' + k + '"][value="' + saved[k] + '"]');
      if (r) r.checked = true;
    });
  }

  function value(name) { var r = form.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ""; }
  function pack() { var id = value("pack"); return cfg.packs.filter(function (p) { return p.id === id; })[0] || cfg.packs[0]; }

  function design() {
    return {
      line1: line1.value.trim(),
      line2: line2.value.trim(),
      font: value("font"),
      ink: value("ink"),
      pack: pack().id,
      layout: logoPrint ? value("layout") : "none",
      logoSize: parseFloat($("#logo-size").value),
      logoInk: $("#logo-ink").checked ? "ink" : "original",
      hasLogo: !!logoPrint
    };
  }

  function ballDesign(d) {
    return {
      lines: [d.line1, d.line2],
      font: d.font, ink: d.ink,
      logo: logoPrint, logoLayout: d.layout, logoSize: d.logoSize, logoInk: d.logoInk
    };
  }

  var pending = false;
  function render() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      var d = design();
      var b = ballDesign(d);
      if (!d.line1 && !d.line2 && !logoPrint) b.lines = ["Your words"];
      fitCanvas(preview, 760);
      Ball.render(preview, b);
      updateSummary(d);
      store(false, { line1: d.line1, line2: d.line2, font: d.font, ink: d.ink, pack: d.pack, layout: value("layout") });
    });
  }

  function updateSummary(d) {
    [line1, line2].forEach(function (el) {
      var c = $("#" + el.id + "-count");
      c.textContent = el.value.length + "/" + maxChars;
      c.classList.toggle("is-full", el.value.length >= maxChars);
    });
    var p = pack();
    var free = !cfg.delivery.shippingFee || p.price >= cfg.delivery.freeShippingFrom;
    $("#total").textContent = money(p.price);
    $("#ship-note").textContent = (free ? "Includes GST and complimentary tracked shipping" :
      "+ " + money(cfg.delivery.shippingFee) + " tracked shipping") + (d.hasLogo ? ". Logo artwork confirmed by email before printing." : ".");
    $("#eta").innerHTML = "Order today, arrives around <b>" + addDays(cfg.delivery.minDays) + " – " + addDays(cfg.delivery.maxDays) + "</b>";
  }

  // ---------- Logo upload ----------
  var fileInput = $("#logo-file");
  function prepare() {
    logoPrint = logoSource ? Ball.prepareLogo(logoSource, $("#logo-white").checked) : null;
    $("#logo-opts").hidden = !logoSource;
    $("#logo-remove").hidden = !logoSource;
    $("#logo-name").textContent = logoSource ? logoName : "Add a logo or crest";
    if (logoSource && !logoPrint) $("#logo-name").textContent = "That image looks empty. Try another file.";
    render();
  }

  function loadFile(file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) {
      $("#logo-name").textContent = "Please choose a PNG, JPG, SVG or WebP image.";
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      $("#logo-name").textContent = "That file is over 5 MB. Please choose a smaller one.";
      return;
    }
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      // SVGs without a size report 0; give them a sensible one.
      if (!img.width || !img.height) { img.width = 600; img.height = 600; }
      logoSource = img;
      logoName = file.name;
      if (file.type === "image/jpeg") $("#logo-white").checked = true;
      prepare();
      URL.revokeObjectURL(url);
    };
    img.onerror = function () {
      $("#logo-name").textContent = "We couldn't read that image. Please try another file.";
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  fileInput.addEventListener("change", function () { loadFile(fileInput.files[0]); });
  var drop = $("#upload");
  ["dragenter", "dragover"].forEach(function (t) {
    drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add("is-over"); });
  });
  ["dragleave", "drop"].forEach(function (t) {
    drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove("is-over"); });
  });
  drop.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]); });
  $("#logo-remove").addEventListener("click", function () {
    logoSource = null; logoPrint = null; logoName = ""; fileInput.value = "";
    prepare();
  });
  $("#logo-white").addEventListener("change", prepare);

  // ---------- Adding to the bag ----------
  function problem(d) {
    if (!d.line1 && !d.line2 && !d.hasLogo) return "Add some words or a logo.";
    if (!ALLOWED.test(d.line1) || !ALLOWED.test(d.line2)) return "Please use letters, numbers and simple punctuation only.";
    return "";
  }

  var editing = null;   // { id, qty } of the bag design being edited
  function setEditing(e) {
    editing = e;
    $("#editing").hidden = !e;
    $("#order-btn").textContent = e ? "Update bag" : "Add to bag";
  }
  $("#edit-cancel").addEventListener("click", function () { setEditing(null); });

  function thumbnail(d) {
    var c = document.createElement("canvas");
    c.width = c.height = 220;
    Ball.render(c, ballDesign(d));
    return c.toDataURL("image/webp", 0.86);   // browsers without WebP export fall back to PNG
  }

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var d = design();
    var err = problem(d);
    line1.setCustomValidity(err);
    if (err) { line1.reportValidity(); return; }
    if (d.layout === "only") { d.line1 = ""; d.line2 = ""; }   // logo-only designs print no words
    var item = {
      set: d.pack, qty: editing && window.PinkaholicCart.has(editing.id) ? editing.qty : 1,
      line1: d.line1, line2: d.line2, font: d.font, ink: d.ink,
      layout: d.layout, logoSize: d.logoSize, logoInk: d.logoInk,
      logo: logoPrint ? logoPrint.toDataURL("image/png") : null, logoName: logoPrint ? logoName : "",
      thumb: thumbnail(d)
    };
    window.PinkaholicCart.save(item, editing && editing.id);
    setEditing(null);
  });
  line1.addEventListener("input", function () { line1.setCustomValidity(""); });

  // Load a bag design back into the designer to change it.
  window.PinkaholicDesigner = {
    load: function (it) {
      line1.value = it.line1 || ""; line2.value = it.line2 || "";
      [["font", it.font], ["ink", it.ink], ["pack", it.set], ["layout", it.layout === "none" ? "above" : it.layout]].forEach(function (p) {
        var r = form.querySelector('input[name="' + p[0] + '"][value="' + p[1] + '"]');
        if (r) r.checked = true;
      });
      $("#logo-size").value = it.logoSize || 1;
      $("#logo-ink").checked = it.logoInk !== "original";
      $("#logo-white").checked = false;   // the saved logo is already cleaned up
      setEditing({ id: it.id, qty: it.qty });
      if (it.logo) {
        var img = new Image();
        img.onload = function () { logoSource = img; logoName = it.logoName || "Your logo"; prepare(); };
        img.src = it.logo;
      } else {
        logoSource = null; logoPrint = null; logoName = ""; fileInput.value = "";
        prepare();
      }
      $("#design").scrollIntoView({ behavior: "smooth" });
    }
  };

  // Set buttons pick a set; occasion buttons load a sample design.
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-pack]");
    if (t) {
      var r = form.querySelector('input[name="pack"][value="' + t.dataset.pack + '"]');
      if (r) r.checked = true;
      render();
    }
    var occ = e.target.closest(".occ .link");
    if (occ) {
      var s = JSON.parse(occ.closest(".occ").dataset.sample);
      line1.value = s.line1; line2.value = s.line2;
      ["font", "ink"].forEach(function (k) {
        var r2 = form.querySelector('input[name="' + k + '"][value="' + s[k] + '"]');
        if (r2) r2.checked = true;
      });
      $("#design").scrollIntoView({ behavior: "smooth" });
      render();
    }
  });

  // ---------- Hero and occasion balls ----------
  var hero = $("#hero-ball");
  var heroSamples = [
    { lines: ["Chloe & Jack", "12.03.27"], font: "script", ink: "wine" },
    { lines: ["Champion", "2026"], font: "caps", ink: "gold" },
    { lines: ["Love all", ""], font: "serif", ink: "white" }
  ];
  var heroIndex = 0;
  function drawHero() { fitCanvas(hero, 680); Ball.render(hero, heroSamples[heroIndex]); }
  function drawOccasions() {
    $$(".occ").forEach(function (o) {
      var s = JSON.parse(o.dataset.sample);
      var c = $("canvas", o);
      fitCanvas(c, 420);
      Ball.render(c, { lines: [s.line1, s.line2], font: s.font, ink: s.ink });
    });
  }

  // ---------- Start ----------
  Ball.ready.then(function () {
    render();
    drawHero();
    // Render the smaller balls after the main ones so the page settles quickly.
    setTimeout(drawOccasions, 60);
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      setInterval(function () {
        if (document.hidden) return;
        heroIndex = (heroIndex + 1) % heroSamples.length;
        drawHero();
      }, 4200);
    }
  });

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { render(); drawHero(); drawOccasions(); }, 200);
  });
})();
