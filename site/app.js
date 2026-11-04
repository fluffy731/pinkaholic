(function () {
  "use strict";

  var cfg = window.PINKAHOLIC;
  var Ball = window.PinkBall;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var STORE_KEY = "pinkaholic-design";
  var ALLOWED = /^[\p{L}\p{N} .,!?'’&+\-#@:()\/♥]*$/u;
  var MAX_LOGO_BYTES = 5 * 1024 * 1024;

  // Prices always show the currency, so buyers in New Zealand know what they're paying.
  function money(n) {
    return "A$" + new Intl.NumberFormat("en-AU", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(n);
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

  // ---------- Header: phone menu, and a hairline once the page scrolls ----------
  var top = $(".top"), menu = $("#menu"), menuBtn = $("#menu-btn");
  function setMenu(open) {
    menu.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    menuBtn.textContent = open ? "Close" : "Menu";
  }
  menuBtn.addEventListener("click", function () { setMenu(!menu.classList.contains("is-open")); });
  menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menu.classList.contains("is-open")) { setMenu(false); menuBtn.focus(); }
  });
  function onScroll() { top.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---------- Sets ----------
  var pick = $("#pack-pick");
  var cards = $("#pack-cards");
  function balls(n) { return n + " balls"; }
  function each(p) { return money(Math.round((p.price / p.qty) * 100) / 100) + " a ball"; }
  cfg.packs.forEach(function (p) {
    var lab = document.createElement("label");
    lab.innerHTML = '<input type="radio" name="pack" value="' + p.id + '"' + (p.featured ? " checked" : "") + ">" +
      "<span><b>" + p.name + "</b><small>" + balls(p.qty) + " · " + money(p.price) + "</small>" +
      (p.featured ? "<em>Gift can</em>" : "") + "</span>";
    pick.appendChild(lab);

    // The tile shows what arrives: the gift can, or a row of balls.
    var look;
    if (p.id === "can") {
      look = '<svg class="pack__can" viewBox="0 0 200 612" aria-hidden="true"><use href="#can"/></svg>';
    } else {
      look = '<span class="pack__balls" style="--cols:' + Math.min(p.qty, 6) + '" aria-hidden="true">' +
        new Array(p.qty + 1).join("<i></i>") + "</span>";
    }
    var card = document.createElement("article");
    card.className = "pack" + (p.featured ? " pack--featured" : "");
    card.innerHTML = (p.featured ? '<span class="pack__badge">Gift can</span>' : "") +
      '<div class="pack__look">' + look + "</div>" +
      "<h3>" + p.name + "</h3>" +
      '<span class="pack__qty">' + balls(p.qty) + "</span>" +
      "<p>" + p.note + "</p>" +
      '<div class="pack__price">' + money(p.price) + "</div>" +
      '<div class="pack__each">' + (p.qty > 1 ? each(p) : "Tracked delivery included") + "</div>" +
      '<a class="btn" href="#design" data-pack="' + p.id + '">Choose ' + p.name.replace(/^The /, "the ") + "</a>";
    cards.appendChild(card);
  });

  // ---------- Designer state ----------
  var form = $("#designer");
  var line1 = $("#line1"), line2 = $("#line2");
  var preview = $("#preview");
  var maxChars = cfg.print.maxChars;

  var logoSource = null;   // the uploaded image
  var logoPrint = null;    // trimmed, print-ready version
  var logoName = "";

  var saved = store(true);
  if (saved) {
    if (typeof saved.line1 === "string") line1.value = saved.line1;
    if (typeof saved.line2 === "string") line2.value = saved.line2;
    ["font", "ink", "pack", "layout"].forEach(function (k) {
      var r = saved[k] && form.querySelector('input[name="' + k + '"][value="' + saved[k] + '"]');
      if (r) r.checked = true;
    });
  }

  function value(name) { var r = form.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ""; }
  function check(name, v) { var r = form.querySelector('input[name="' + name + '"][value="' + v + '"]'); if (r) r.checked = true; }
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
      lines: d.layout === "only" ? ["", ""] : [d.line1, d.line2],
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

  // ---------- Words: count, and say plainly when a line won't fit ----------
  // A shorter version to suggest, e.g. "Margaret Thompson" -> "M. Thompson".
  function suggest(text) {
    var words = text.trim().split(/\s+/);
    if (words.length < 2) return "";
    var s = words.slice(0, -1).map(function (w) { return w.charAt(0) + "."; }).join(" ") + " " + words[words.length - 1];
    return s.length <= maxChars ? s : "";
  }

  function lineProblem(el) {
    var v = el.value.trim();
    if (v.length > maxChars) {
      var over = v.length - maxChars, s = suggest(v);
      return "That's " + over + (over === 1 ? " character" : " characters") + " too long. " + maxChars + " fit on a line" +
        (s ? ". Try “" + s + "”." : ". Try a shorter version.");
    }
    if (!ALLOWED.test(v)) return "Please use letters, numbers and simple punctuation only.";
    return "";
  }

  function showLine(el, msg) {
    var err = $("#" + el.id + "-error");
    err.textContent = msg;
    err.hidden = !msg;
    if (msg) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid");
  }

  function updateSummary(d) {
    [line1, line2].forEach(function (el) {
      var c = $("#" + el.id + "-count"), n = el.value.trim().length;
      c.textContent = n + "/" + maxChars;
      c.classList.toggle("is-over", n > maxChars);
      // Show length problems as you type; other problems wait for Add to bag.
      if (n > maxChars) showLine(el, lineProblem(el));
      else if (el.getAttribute("aria-invalid") && !lineProblem(el)) showLine(el, "");
    });
    $("#only-note").hidden = !(d.layout === "only" && (d.line1 || d.line2));
    var p = pack();
    var free = !cfg.delivery.shippingFee || p.price >= cfg.delivery.freeShippingFrom;
    $("#total").textContent = money(p.price);
    $("#ship-note").textContent = balls(p.qty) + ". " + (free ? "Includes GST and tracked delivery" :
      "+ " + money(cfg.delivery.shippingFee) + " tracked delivery") + (d.hasLogo ? ". Logo artwork confirmed by email before printing." : ".");
    $("#eta").innerHTML = "Order today, arrives around <b>" + addDays(cfg.delivery.minDays) + " – " + addDays(cfg.delivery.maxDays) + "</b>";
    $("#buybar-set").textContent = p.name + ", " + balls(p.qty);
    $("#buybar-total").textContent = money(p.price);
  }

  // ---------- Logo upload ----------
  var fileInput = $("#logo-file");
  function logoMessage(msg) { $("#logo-msg").textContent = msg; $("#logo-msg").hidden = !msg; }
  function prepare() {
    logoPrint = logoSource ? Ball.prepareLogo(logoSource, $("#logo-white").checked) : null;
    $("#logo-opts").hidden = !logoSource;
    $("#logo-remove").hidden = !logoSource;
    $("#logo-name").textContent = logoSource ? logoName : "Add a logo or crest";
    logoMessage(logoSource && !logoPrint ? "That image looks empty. Try another file." : "");
    render();
  }

  function loadFile(file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) { logoMessage("Please choose a PNG, JPG, SVG or WebP image."); return; }
    if (file.size > MAX_LOGO_BYTES) { logoMessage("That file is over 5 MB. Please choose a smaller one."); return; }
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
      logoMessage("We couldn't read that image. Please try another file.");
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
    fileInput.focus();
  });
  $("#logo-white").addEventListener("change", prepare);

  // ---------- Adding to the bag ----------
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
    var wordsPrint = d.layout !== "only";
    if (!d.hasLogo && !d.line1 && !d.line2) {
      showLine(line1, "Add some words or a logo.");
      line1.focus();
      return;
    }
    var bad = null;
    if (wordsPrint) {
      [line1, line2].forEach(function (el) {
        var msg = lineProblem(el);
        showLine(el, msg);
        if (msg && !bad) bad = el;
      });
    }
    if (bad) { bad.focus(); return; }
    if (!wordsPrint) { d.line1 = ""; d.line2 = ""; }   // logo-only designs print no words
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

  // ---------- Filling the form: ideas, occasions, bag edits ----------
  function snapshot() {
    return { line1: line1.value, line2: line2.value, font: value("font"), ink: value("ink") };
  }
  function apply(s) {
    line1.value = s.line1; line2.value = s.line2;
    check("font", s.font); check("ink", s.ink);
    showLine(line1, ""); showLine(line2, "");
    render();
  }

  // Replacing what someone typed can be undone.
  var undoState = null;
  function useIdea(s) {
    var before = snapshot();
    var changed = before.line1.trim() || before.line2.trim();
    apply(s);
    undoState = changed ? before : null;
    $("#idea-undo").hidden = !undoState;
  }
  $("#idea-undo-btn").addEventListener("click", function () {
    if (undoState) apply(undoState);
    undoState = null;
    $("#idea-undo").hidden = true;
    line1.focus();
  });

  window.PinkaholicDesigner = {
    load: function (it) {
      apply({ line1: it.line1 || "", line2: it.line2 || "", font: it.font, ink: it.ink });
      check("pack", it.set);
      check("layout", it.layout === "none" ? "above" : it.layout);
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

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-pack]");
    if (t) { check("pack", t.dataset.pack); render(); }
    var chip = e.target.closest("[data-idea]");
    if (chip) useIdea(JSON.parse(chip.dataset.idea));
    var occ = e.target.closest(".occ .link");
    if (occ) {
      useIdea(JSON.parse(occ.closest(".occ").dataset.sample));
      $("#design").scrollIntoView({ behavior: "smooth" });
    }
  });

  // ---------- Hero: type a name, see it printed ----------
  var hero = $("#hero-ball");
  var tryName = $("#try-name");
  var heroSamples = [
    { lines: ["Chloe & Jack", "12.03.27"], font: "script", ink: "wine" },
    { lines: ["Bride Squad", ""], font: "serif", ink: "wine" },
    { lines: ["Champion", "2026"], font: "caps", ink: "black" }
  ];
  var heroIndex = 0;
  function drawHero() {
    fitCanvas(hero, 680);
    var name = tryName.value.trim();
    Ball.render(hero, name ? { lines: [name.slice(0, 24), ""], font: "script", ink: "wine" } : heroSamples[heroIndex]);
  }
  tryName.addEventListener("input", drawHero);
  $("#try").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = tryName.value.trim();
    if (name) apply({ line1: name, line2: "", font: "script", ink: "wine" });
    $("#design").scrollIntoView({ behavior: "smooth" });
  });

  function drawOccasions() {
    $$(".occ").forEach(function (o) {
      var s = JSON.parse(o.dataset.sample);
      var c = $("canvas", o);
      fitCanvas(c, 460);
      Ball.render(c, { lines: [s.line1, s.line2], font: s.font, ink: s.ink });
    });
  }

  // ---------- Phone price bar: shown while the form is on screen but its button isn't ----------
  var buybar = $("#buybar");
  if ("IntersectionObserver" in window) {
    var inDesigner = false, orderVisible = false;
    var sync = function () {
      var show = inDesigner && !orderVisible;
      buybar.classList.toggle("is-visible", show);
      buybar.setAttribute("aria-hidden", show ? "false" : "true");
      $(".btn", buybar).tabIndex = show ? 0 : -1;
    };
    new IntersectionObserver(function (en) { inDesigner = en[0].isIntersecting; sync(); }, { rootMargin: "0px 0px -40% 0px" }).observe(form);
    new IntersectionObserver(function (en) { orderVisible = en[0].isIntersecting; sync(); }).observe($("#order"));
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
        if (document.hidden || tryName.value.trim()) return;
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
