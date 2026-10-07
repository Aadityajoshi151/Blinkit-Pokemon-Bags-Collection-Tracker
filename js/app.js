(function () {
  "use strict";

  /* ------------------------------------------------------------------
     Settings

     VISITOR COUNT: make a free account at goatcounter.com, pick a code
     (the part before .goatcounter.com), put it between the quotes below,
     and in GoatCounter's Settings turn on
     "Allow adding visitor counts on your website".
     Leave it empty and no counter is loaded or shown.
     ------------------------------------------------------------------ */
  var GOATCOUNTER_CODE = "";

  var STORAGE_KEY = "blinkit-pokemon-bag-tracker:v1";

  /* MON and SPRITES come from data.js */

  var TOTAL = MON.length;
  var TILTS = [-2.2, 1.4, -0.9, 2.1, -1.5, 0.8, 1.8, -1.2];
  var CHECK =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var $ = function (id) {
    return document.getElementById(id);
  };
  var sheet = $("sheet"),
    strip = $("strip"),
    tally = $("tally");
  var got = new Set();
  var filter = "all";
  var saveWarned = false;
  var slots = [],
    segs = [];

  /* ---------- Saving ---------- */

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(raw)) {
        raw.forEach(function (d) {
          if (
            MON.some(function (m) {
              return m.d === d;
            })
          )
            got.add(d);
        });
      }
    } catch (e) {
      /* nothing saved, or storage is blocked */
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(got)));
    } catch (e) {
      if (!saveWarned) {
        saveWarned = true;
        toast(
          "This browser is blocking saves. Use the share link to keep your collection.",
        );
      }
    }
  }

  /* ---------- Share links: 30 bits, written in base 36 ---------- */

  function encode(set) {
    var bits = 0;
    MON.forEach(function (m, i) {
      if (set.has(m.d)) bits += Math.pow(2, i);
    });
    return bits.toString(36);
  }

  function decode(str) {
    if (!/^[0-9a-z]{1,7}$/.test(str)) return null;
    var bits = parseInt(str, 36);
    if (!(bits >= 0) || bits >= Math.pow(2, TOTAL)) return null;
    var set = new Set();
    MON.forEach(function (m, i) {
      if (Math.floor(bits / Math.pow(2, i)) % 2 === 1) set.add(m.d);
    });
    return set;
  }

  function shareUrl() {
    return location.href.split("#")[0] + "#c=" + encode(got);
  }

  /* ---------- Building the page ---------- */

  function build() {
    MON.forEach(function (m, i) {
      var li = document.createElement("li");
      var label = document.createElement("label");
      label.className = "slot";
      label.style.setProperty("--type", "var(--t-" + m.t + ")");
      label.style.setProperty("--tilt", TILTS[i % TILTS.length] + "deg");

      var input = document.createElement("input");
      input.type = "checkbox";
      input.className = "sr";
      input.setAttribute("aria-label", m.n);
      input.addEventListener("change", function () {
        toggle(i, input.checked);
      });

      var art = document.createElement("span");
      art.className = "art";
      var img = document.createElement("img");
      img.src = SPRITES[m.d] || "";
      img.alt = "";
      img.width = 96;
      img.height = 96;
      img.draggable = false;
      art.appendChild(img);

      var dex = document.createElement("span");
      dex.className = "dex";
      dex.textContent = "#" + ("00" + m.d).slice(-3);

      var tick = document.createElement("span");
      tick.className = "tick";
      tick.innerHTML = CHECK;

      var name = document.createElement("span");
      name.className = "name";
      name.textContent = m.n;

      label.append(input, dex, tick, art, name);
      label.addEventListener("animationend", function () {
        label.classList.remove("just-got");
      });
      li.appendChild(label);
      sheet.appendChild(li);
      slots.push({ li: li, label: label, input: input });

      var seg = document.createElement("i");
      seg.style.setProperty("--type", "var(--t-" + m.t + ")");
      strip.appendChild(seg);
      segs.push(seg);
    });
  }

  function paint() {
    var n = got.size;
    var shown = 0;

    MON.forEach(function (m, i) {
      var has = got.has(m.d);
      var s = slots[i];
      s.input.checked = has;
      s.label.classList.toggle("is-got", has);
      segs[i].classList.toggle("on", has);
      var visible = filter === "all" || (filter === "got") === has;
      s.li.hidden = !visible;
      if (visible) shown++;
    });

    $("count").textContent = n === TOTAL ? "All " + TOTAL : n;
    $("countLabel").textContent =
      n === TOTAL ? "bagged!" : "of " + TOTAL + " bagged";
    tally.classList.toggle("is-full", n === TOTAL);
    $("gotN").textContent = n;
    $("needN").textContent = TOTAL - n;

    var empty = $("empty");
    empty.hidden = shown > 0;
    if (shown === 0) {
      empty.textContent =
        filter === "got"
          ? "Nothing bagged yet. Switch to All 30 and tap the first one you find."
          : "Every one is bagged. Nothing left to hunt.";
    }
  }

  function toggle(i, on) {
    var d = MON[i].d;
    var wasFull = got.size === TOTAL;
    if (on) got.add(d);
    else got.delete(d);
    save();
    paint();
    if (on) {
      slots[i].label.classList.add("just-got");
      tally.classList.remove("bump");
      void tally.offsetWidth;
      tally.classList.add("bump");
      if (!wasFull && got.size === TOTAL) celebrate();
    }
  }

  /* ---------- Small pieces ---------- */

  var toastTimer;
  function toast(msg) {
    var el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("show");
    }, 3200);
  }

  function celebrate() {
    toast("All " + TOTAL + " bagged. Sheet complete!");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    var box = document.createElement("div");
    box.className = "confetti";
    var colours = [
      "--sun",
      "--pop",
      "--paper",
      "--t-water",
      "--t-grass",
      "--t-psychic",
    ];
    for (var k = 0; k < 70; k++) {
      var bit = document.createElement("i");
      bit.style.left = Math.random() * 100 + "%";
      bit.style.background = "var(" + colours[k % colours.length] + ")";
      bit.style.animationDuration = 1.6 + Math.random() * 1.8 + "s";
      bit.style.animationDelay = Math.random() * 0.6 + "s";
      if (k % 3 === 0) bit.style.borderRadius = "50%";
      box.appendChild(bit);
    }
    document.body.appendChild(box);
    setTimeout(function () {
      box.remove();
    }, 4500);
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (e) {}
      ta.remove();
      ok ? resolve() : reject();
    });
  }

  $("share").addEventListener("click", function () {
    var url = shareUrl();
    var text =
      "I've bagged " +
      got.size +
      " of " +
      TOTAL +
      " Blinkit bag Pokémon.";
    if (navigator.share) {
      navigator
        .share({ title: document.title, text: text, url: url })
        .catch(function () {});
      return;
    }
    copy(url).then(
      function () {
        toast(
          "Link copied. It carries your " +
            got.size +
            " of " +
            TOTAL +
            ".",
        );
      },
      function () {
        window.prompt("Copy this link:", url);
      },
    );
  });

  $("reset").addEventListener("click", function () {
    if (!got.size) {
      toast("Nothing to clear yet.");
      return;
    }
    if (
      window.confirm(
        "Clear all " + got.size + " bagged Pokémon from this device?",
      )
    ) {
      got.clear();
      save();
      paint();
      toast("Collection cleared.");
    }
  });

  document.querySelectorAll(".filters button").forEach(function (b) {
    b.addEventListener("click", function () {
      filter = b.dataset.filter;
      document.querySelectorAll(".filters button").forEach(function (o) {
        o.setAttribute("aria-pressed", String(o === b));
      });
      paint();
    });
  });

  /* ---------- A link that carries someone's collection ---------- */

  function clearHash() {
    try {
      history.replaceState(null, "", location.pathname + location.search);
    } catch (e) {}
  }

  function checkIncoming() {
    var match = /^#c=([0-9a-z]+)$/.exec(location.hash);
    if (!match) return;
    var incoming = decode(match[1]);
    if (!incoming) {
      clearHash();
      return;
    }
    if (encode(incoming) === encode(got)) {
      clearHash();
      return;
    }

    $("incomingText").textContent =
      "This link carries a collection with " +
      incoming.size +
      " of " +
      TOTAL +
      " bagged. " +
      (got.size
        ? "Using it replaces the " + got.size + " saved on this device."
        : "Nothing is saved on this device yet.");
    $("incoming").hidden = false;

    $("useIncoming").onclick = function () {
      got = incoming;
      save();
      paint();
      $("incoming").hidden = true;
      clearHash();
      toast("Collection loaded: " + got.size + " of " + TOTAL + ".");
    };
    $("keepMine").onclick = function () {
      $("incoming").hidden = true;
      clearHash();
    };
  }

  /* ---------- Visitor count (only if a code is set above) ---------- */

  function visitors() {
    if (!GOATCOUNTER_CODE) return;
    var base = "https://" + GOATCOUNTER_CODE + ".goatcounter.com";
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://gc.zgo.at/count.js";
    s.setAttribute("data-goatcounter", base + "/count");
    document.head.appendChild(s);

    fetch(
      base +
        "/counter/" +
        encodeURIComponent(location.pathname) +
        ".json",
    )
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (j) {
        if (!j || !j.count) return;
        var el = $("visits");
        el.textContent =
          j.count + " visits from fellow bag hunters so far.";
        el.hidden = false;
      })
      .catch(function () {});
  }

  load();
  build();
  paint();
  checkIncoming();
  visitors();
})();
