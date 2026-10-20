(function () {
  "use strict";

  var cfg = window.PINKAHOLIC;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var STORE_KEY = "pinkaholic-design";
  var ALLOWED = /^[\p{L}\p{N} .,!?'’&+\-#@:()\/♥]*$/u;
  var INK = { white: "#FFFFFF", berry: "#4A1230" };

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

  // ---------- Static bits from config ----------
  $$("[data-free-from]").forEach(function (el) { el.textContent = money(cfg.delivery.freeShippingFrom); });
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  $$("[data-mail]").forEach(function (el) { el.href = "mailto:" + cfg.contactEmail; });
  $$("[data-insta]").forEach(function (el) { el.href = cfg.instagram; el.rel = "noopener"; });

  // ---------- Packs ----------
  var pick = $("#pack-pick");
  var cards = $("#pack-cards");
  cfg.packs.forEach(function (p) {
    var each = money(Math.round((p.price / p.qty) * 100) / 100);

    var lab = document.createElement("label");
    lab.className = "chip";
    lab.innerHTML = '<input type="radio" name="pack" value="' + p.id + '"' + (p.featured ? " checked" : "") + '>' +
      '<span class="chip__face"><b>' + p.name + '</b><small>' + money(p.price) + (p.qty > 1 ? " · " + each + " each" : "") + '</small></span>';
    pick.appendChild(lab);

    var balls = "";
    for (var i = 0; i < Math.min(p.qty, 4); i++) balls += "<i></i>";
    if (p.qty > 4) balls += "<em>×" + p.qty + "</em>";
    var card = document.createElement("article");
    card.className = "pack" + (p.featured ? " pack--featured" : "");
    card.innerHTML = (p.featured ? '<span class="pack__badge">Most loved</span>' : "") +
      '<div class="pack__balls" aria-hidden="true">' + balls + "</div>" +
      "<h3>" + p.name + "</h3><p>" + p.note + "</p>" +
      '<div class="pack__price">' + money(p.price) + "</div>" +
      '<div class="pack__each">' + (p.qty > 1 ? each + " per ball" : "One ball") + "</div>" +
      '<a class="btn btn--small" href="#design" data-pack="' + p.id + '" aria-label="Choose ' + p.name.toLowerCase() + '">Choose</a>';
    cards.appendChild(card);
  });

  // ---------- Designer ----------
  var form = $("#designer");
  var line1 = $("#line1"), line2 = $("#line2");
  var pv1 = $("#pv1"), pv2 = $("#pv2");
  var maxChars = cfg.print.maxChars;
  line1.maxLength = line2.maxLength = maxChars;

  var saved = store(true);
  if (saved) {
    if (typeof saved.line1 === "string") line1.value = saved.line1.slice(0, maxChars);
    if (typeof saved.line2 === "string") line2.value = saved.line2.slice(0, maxChars);
    ["font", "ink", "pack"].forEach(function (k) {
      var r = saved[k] && form.querySelector('input[name="' + k + '"][value="' + saved[k] + '"]');
      if (r) r.checked = true;
    });
  }

  function value(name) { var r = form.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ""; }
  function pack() { var id = value("pack"); return cfg.packs.filter(function (p) { return p.id === id; })[0] || cfg.packs[0]; }

  function design() {
    return { line1: line1.value.trim(), line2: line2.value.trim(), font: value("font"), ink: value("ink"), pack: pack().id };
  }

  // Shrink text so it always fits between the seams.
  function fit(el, maxWidth, base) {
    el.style.fontSize = base + "px";
    if (!el.textContent) return;
    var w = el.getComputedTextLength();
    if (w > maxWidth) el.style.fontSize = Math.max(14, Math.floor(base * maxWidth / w)) + "px";
  }

  function render() {
    var d = design();
    var two = !!d.line2;
    var base = d.font === "bold" ? 36 : d.font === "classic" ? 40 : 36;
    [pv1, pv2].forEach(function (el) {
      el.setAttribute("class", "ball__text f-" + d.font);
      el.style.fill = INK[d.ink];
    });
    pv1.textContent = d.line1 || "Your words";
    pv1.style.opacity = d.line1 ? 1 : .55;
    pv2.textContent = d.line2;
    pv1.setAttribute("y", two ? 150 : 172);
    pv2.setAttribute("y", 200);
    fit(pv1, 156, base);
    fit(pv2, 156, base);
    // Both lines share the smaller size so they read as one design.
    if (two) {
      var size = Math.min(parseFloat(pv1.style.fontSize), parseFloat(pv2.style.fontSize)) + "px";
      pv1.style.fontSize = pv2.style.fontSize = size;
    }

    [line1, line2].forEach(function (el) {
      var c = $("#" + el.id + "-count");
      c.textContent = el.value.length + "/" + maxChars;
      c.classList.toggle("is-full", el.value.length >= maxChars);
    });

    var p = pack();
    var free = !cfg.delivery.shippingFee || p.price >= cfg.delivery.freeShippingFrom;
    $("#total").textContent = money(p.price);
    $("#ship-note").textContent = free
      ? "Includes GST and free tracked shipping to AU & NZ"
      : "+ " + money(cfg.delivery.shippingFee) + " tracked shipping. Free over " + money(cfg.delivery.freeShippingFrom);
    $("#eta").innerHTML = "Order today, arrives around <b>" + addDays(cfg.delivery.minDays) + " – " + addDays(cfg.delivery.maxDays) + "</b>";

    store(false, d);
  }

  function problem(d) {
    if (!d.line1) return "Add some text for line 1.";
    if (!ALLOWED.test(d.line1) || !ALLOWED.test(d.line2)) return "Please use letters, numbers and simple punctuation only.";
    return "";
  }

  // Compact, URL-safe design code that fits Stripe's client_reference_id (letters, numbers, - and _ only).
  function designCode(d) {
    var raw = ["PK1", d.line1, d.line2, d.font, d.ink, d.pack].join("|");
    var b64 = btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return b64;
  }

  function emailLink(d) {
    var p = pack();
    var body = [
      "Hi Pinkaholic, I'd like to order:",
      "",
      "Pack: " + p.name + " (" + money(p.price) + ")",
      "Line 1: " + d.line1,
      "Line 2: " + (d.line2 || "-"),
      "Print style: " + d.font,
      "Ink: " + d.ink,
      "",
      "Deliver to (name, address, phone):",
      ""
    ].join("\n");
    return "mailto:" + cfg.contactEmail + "?subject=" + encodeURIComponent("Pinkaholic order: " + d.line1) + "&body=" + encodeURIComponent(body);
  }

  var btn = $("#order-btn");
  var soon = $("#soon");
  var live = cfg.checkout.provider === "stripe";
  if (!live) btn.textContent = "Checkout opens soon";

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var d = design();
    var err = problem(d);
    line1.setCustomValidity(err);
    if (err) { line1.reportValidity(); return; }

    var p = pack();
    if (live && p.link) {
      var sep = p.link.indexOf("?") === -1 ? "?" : "&";
      window.location.href = p.link + sep + "client_reference_id=" + designCode(d);
      return;
    }
    $("#email-order").href = emailLink(d);
    soon.hidden = false;
  });
  line1.addEventListener("input", function () { line1.setCustomValidity(""); });

  // Pack buttons and "Try" buttons fill the designer.
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-pack], [data-try]");
    if (!t) return;
    if (t.dataset.pack) {
      var r = form.querySelector('input[name="pack"][value="' + t.dataset.pack + '"]');
      if (r) r.checked = true;
    }
    if (t.dataset.try) {
      line1.value = t.dataset.try.slice(0, maxChars);
      line2.value = "";
      $("#design").scrollIntoView({ behavior: "smooth" });
    }
    render();
  });

  // ---------- Gift idea tabs ----------
  var tabs = $$('[role="tab"]');
  function select(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      $("#" + t.getAttribute("aria-controls")).hidden = !on;
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { select(t); });
    t.addEventListener("keydown", function (e) {
      var n = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!n) return;
      var next = tabs[(i + n + tabs.length) % tabs.length];
      select(next);
      next.focus();
    });
  });

  // ---------- Hero ball cycles sample text ----------
  var cycle = $("[data-cycle]");
  var samples = ["Ace Mum", "Bride Squad", "Coach Kim", "Love all", "Net Queen"];
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (cycle && !reduce) {
    var n = 0;
    setInterval(function () {
      n = (n + 1) % samples.length;
      cycle.textContent = samples[n];
      fit(cycle, 150, 36);
    }, 2600);
  }

  // Fonts change text widths, so fit again once they've loaded.
  render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { render(); if (cycle) fit(cycle, 150, 36); });
})();
