// The bag: designs saved in the browser, a slide-out drawer, and checkout.
(function () {
  "use strict";

  var cfg = window.PINKAHOLIC;
  var KEY = "pinkaholic-bag";
  var MAX_QTY = 20;
  var $ = function (id) { return document.getElementById(id); };
  var FONT_NAMES = { script: "Script", serif: "Serif", caps: "Capitals", modern: "Modern" };
  var INK_NAMES = { wine: "Wine", black: "Black", white: "White", gold: "Gold foil" };

  var items = load();
  var memoryOnly = false;
  var lastFocus = null;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]") || []; } catch (e) { return []; }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
      memoryOnly = false;
    } catch (e) {
      // Usually a full browser store (large logos). The bag still works until the page closes.
      memoryOnly = true;
    }
  }

  function setOf(id) { return cfg.packs.filter(function (p) { return p.id === id; })[0] || cfg.packs[0]; }

  function money(n) {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: cfg.currency, minimumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  }

  function addDays(days) {
    var d = new Date();
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  }

  function summary(it) {
    var words = [it.line1, it.line2].filter(Boolean).map(function (s) { return "“" + s + "”"; }).join(" / ");
    var bits = [];
    if (words) bits.push(words);
    bits.push(FONT_NAMES[it.font] + " · " + INK_NAMES[it.ink] + " ink");
    if (it.logo) bits.push(it.layout === "only" ? "Logo only" : "Logo " + it.layout + " the words");
    return bits;
  }

  function count() { return items.reduce(function (n, it) { return n + it.qty; }, 0); }
  function subtotal() { return items.reduce(function (n, it) { return n + setOf(it.set).price * it.qty; }, 0); }

  // ---------- Drawer ----------
  var bag = $("bag");

  function open() {
    lastFocus = document.activeElement;
    render();
    bag.hidden = false;
    document.documentElement.classList.add("bag-open");
    requestAnimationFrame(function () { bag.classList.add("is-open"); });
    bag.querySelector(".bag__close").focus();
  }

  function close() {
    bag.classList.remove("is-open");
    document.documentElement.classList.remove("bag-open");
    setTimeout(function () { bag.hidden = true; }, 280);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function render() {
    var n = count();
    $("bag-count").textContent = n;
    $("bag-count").setAttribute("aria-label", n + (n === 1 ? " set" : " sets") + " in your bag");
    $("bag-count").classList.toggle("is-empty", !n);
    $("bag-n").textContent = n ? n + (n === 1 ? " set" : " sets") : "";

    var list = $("bag-items");
    list.textContent = "";
    items.forEach(function (it) {
      var set = setOf(it.set);
      var li = document.createElement("li");
      li.className = "bag-item";

      var img = document.createElement("img");
      img.className = "bag-item__img";
      img.alt = "";
      img.src = it.thumb || "assets/favicon.svg";

      var body = document.createElement("div");
      body.className = "bag-item__body";
      var name = document.createElement("p");
      name.className = "bag-item__name";
      name.textContent = set.name;
      var meta = document.createElement("p");
      meta.className = "bag-item__meta";
      meta.textContent = set.qty + (set.qty > 1 ? " balls" : " ball") + " per set";
      body.append(name, meta);
      summary(it).forEach(function (line) {
        var p = document.createElement("p");
        p.className = "bag-item__detail";
        p.textContent = line;
        body.appendChild(p);
      });

      var row = document.createElement("div");
      row.className = "bag-item__row";
      var stepper = document.createElement("div");
      stepper.className = "stepper";
      var minus = document.createElement("button");
      minus.type = "button"; minus.textContent = "−"; minus.setAttribute("aria-label", "One fewer " + set.name);
      minus.disabled = it.qty <= 1;
      minus.addEventListener("click", function () { setQty(it.id, it.qty - 1); });
      var q = document.createElement("span");
      q.textContent = it.qty; q.setAttribute("aria-live", "polite");
      var plus = document.createElement("button");
      plus.type = "button"; plus.textContent = "+"; plus.setAttribute("aria-label", "One more " + set.name);
      plus.disabled = it.qty >= MAX_QTY;
      plus.addEventListener("click", function () { setQty(it.id, it.qty + 1); });
      stepper.append(minus, q, plus);
      var price = document.createElement("strong");
      price.className = "bag-item__price";
      price.textContent = money(set.price * it.qty);
      row.append(stepper, price);

      var actions = document.createElement("div");
      actions.className = "bag-item__actions";
      var edit = document.createElement("button");
      edit.type = "button"; edit.className = "link"; edit.textContent = "Edit";
      edit.addEventListener("click", function () {
        close();
        if (window.PinkaholicDesigner) window.PinkaholicDesigner.load(it);
      });
      var remove = document.createElement("button");
      remove.type = "button"; remove.className = "link"; remove.textContent = "Remove";
      remove.addEventListener("click", function () { removeItem(it.id); });
      actions.append(edit, remove);

      body.append(row, actions);
      li.append(img, body);
      list.appendChild(li);
    });

    var empty = !items.length;
    $("bag-empty").hidden = !empty;
    $("bag-foot").hidden = empty;
    $("bag-subtotal").textContent = money(subtotal());
    $("bag-eta").innerHTML = "Arrives around <b>" + addDays(cfg.delivery.minDays) + " – " + addDays(cfg.delivery.maxDays) + "</b>";
    $("bag-error").hidden = !memoryOnly;
    if (memoryOnly) $("bag-error").textContent = "Your browser's storage is full, so this bag will be lost if you close the page. Check out before leaving.";
    $("bag-fallback").hidden = true;
    bag.querySelector(".bag__secure").hidden = !workerReady();
  }

  function setQty(id, qty) {
    items.forEach(function (it) { if (it.id === id) it.qty = Math.max(1, Math.min(MAX_QTY, qty)); });
    save(); render();
  }

  function removeItem(id) {
    items = items.filter(function (it) { return it.id !== id; });
    save(); render();
    var first = bag.querySelector(".bag-item button, .bag__empty .btn");
    if (first) first.focus();
  }

  // ---------- Checkout ----------
  function workerReady() { return cfg.checkout.provider === "worker" && !!cfg.checkout.endpoint; }

  function emailOrder() {
    var lines = ["Hi Pinkaholic, I'd like to order:", ""];
    items.forEach(function (it, i) {
      var set = setOf(it.set);
      lines.push((i + 1) + ". " + set.name + " × " + it.qty + " (" + money(set.price * it.qty) + ")");
      summary(it).forEach(function (s) { lines.push("   " + s); });
      if (it.logo) lines.push("   Logo printed in " + (it.logoInk === "original" ? "its original colours" : "the ink colour") + " (file attached)");
      lines.push("");
    });
    lines.push("Subtotal: " + money(subtotal()), "", "Deliver to (name, address, phone):", "");
    return "mailto:" + cfg.contactEmail + "?subject=" + encodeURIComponent("Pinkaholic order (" + count() + (count() === 1 ? " set)" : " sets)")) + "&body=" + encodeURIComponent(lines.join("\n"));
  }

  function checkout() {
    var btn = $("bag-checkout"), err = $("bag-error");
    err.hidden = true;
    if (!workerReady()) {
      $("bag-email").href = emailOrder();
      $("bag-email-logo").hidden = !items.some(function (it) { return it.logo; });
      $("bag-fallback").hidden = false;
      return;
    }
    btn.disabled = true;
    btn.textContent = "Opening secure checkout…";
    var payload = { items: items.map(function (it) {
      return { set: it.set, qty: it.qty, line1: it.line1, line2: it.line2, font: it.font, ink: it.ink,
        layout: it.layout, logoSize: it.logoSize, logoInk: it.logoInk, logo: it.logo || null };
    }) };
    fetch(cfg.checkout.endpoint.replace(/\/$/, "") + "/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok || !data.url) throw new Error(data.error || "We couldn't start checkout. Please try again.");
        window.location.href = data.url;
      });
    }).catch(function (e) {
      err.textContent = e.message || "We couldn't reach checkout. Check your connection and try again.";
      err.hidden = false;
      btn.disabled = false;
      btn.textContent = "Checkout";
    });
  }

  // ---------- Wiring ----------
  $("bag-open").addEventListener("click", open);
  $("bag-checkout").addEventListener("click", checkout);
  bag.addEventListener("click", function (e) {
    if (e.target.closest("[data-bag-close]")) close();
  });
  document.addEventListener("keydown", function (e) {
    if (bag.hidden) return;
    if (e.key === "Escape") { close(); return; }
    if (e.key !== "Tab") return;
    // Keep keyboard focus inside the open drawer.
    var f = bag.querySelectorAll(".bag__panel button:not([disabled]), .bag__panel a[href]");
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  });
  if (location.hash === "#bag") { history.replaceState(null, "", location.pathname); setTimeout(open, 300); }

  render();

  window.PinkaholicCart = {
    // Add a new design, or replace the one being edited. Opens the drawer.
    save: function (item, editingId) {
      if (editingId && items.some(function (it) { return it.id === editingId; })) {
        item.id = editingId;
        items = items.map(function (it) { return it.id === editingId ? item : it; });
      } else {
        item.id = "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        items.push(item);
      }
      save();
      open();
    },
    has: function (id) { return items.some(function (it) { return it.id === id; }); },
    open: open
  };
})();
