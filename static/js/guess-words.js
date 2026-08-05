(function () {
  "use strict";

  var CATEGORY_LABEL = {
    animal: "動物", food: "食物", school: "校園",
    space: "太空", nature: "大自然", sport: "運動"
  };

  var WORDS = {
    4: [
      ["LION", "animal"], ["BEAR", "animal"], ["FROG", "animal"], ["DUCK", "animal"],
      ["FISH", "animal"], ["BIRD", "animal"], ["CAKE", "food"], ["MILK", "food"],
      ["RICE", "food"], ["SOUP", "food"], ["BOOK", "school"], ["DESK", "school"],
      ["STAR", "space"], ["MOON", "space"], ["SAND", "nature"], ["WAVE", "nature"],
      ["LEAF", "nature"], ["TREE", "nature"], ["BALL", "sport"], ["GOAL", "sport"]
    ],
    5: [
      ["TIGER", "animal"], ["ZEBRA", "animal"], ["PANDA", "animal"], ["SNAKE", "animal"],
      ["WHALE", "animal"], ["SHEEP", "animal"], ["HORSE", "animal"], ["MOUSE", "animal"],
      ["BREAD", "food"], ["PIZZA", "food"], ["GRAPE", "food"], ["LEMON", "food"],
      ["HONEY", "food"], ["CANDY", "food"], ["PAPER", "school"], ["CHALK", "school"],
      ["EARTH", "space"], ["COMET", "space"], ["OCEAN", "nature"], ["RIVER", "nature"],
      ["CLOUD", "nature"], ["STORM", "nature"], ["PLANT", "nature"]
    ],
    6: [
      ["RABBIT", "animal"], ["MONKEY", "animal"], ["TURTLE", "animal"], ["SPIDER", "animal"],
      ["DONKEY", "animal"], ["BANANA", "food"], ["ORANGE", "food"], ["COOKIE", "food"],
      ["CARROT", "food"], ["PENCIL", "school"], ["ERASER", "school"], ["SCHOOL", "school"],
      ["CRAYON", "school"], ["METEOR", "space"], ["ROCKET", "space"], ["GALAXY", "space"],
      ["FOREST", "nature"], ["DESERT", "nature"], ["ISLAND", "nature"], ["FLOWER", "nature"],
      ["SOCCER", "sport"], ["TENNIS", "sport"], ["HOCKEY", "sport"]
    ],
    7: [
      ["DOLPHIN", "animal"], ["PENGUIN", "animal"], ["GIRAFFE", "animal"], ["HAMSTER", "animal"],
      ["LEOPARD", "animal"], ["AVOCADO", "food"], ["PRETZEL", "food"], ["PANCAKE", "food"],
      ["TEACHER", "school"], ["STUDENT", "school"], ["LIBRARY", "school"],
      ["SHUTTLE", "space"], ["RAINBOW", "nature"], ["VOLCANO", "nature"]
    ],
    8: [
      ["ELEPHANT", "animal"], ["DINOSAUR", "animal"], ["KANGAROO", "animal"],
      ["BROCCOLI", "food"],
      ["SCISSORS", "school"], ["NOTEBOOK", "school"],
      ["ASTEROID", "space"],
      ["MOUNTAIN", "nature"], ["SUNSHINE", "nature"],
      ["BASEBALL", "sport"], ["FOOTBALL", "sport"]
    ],
    9: [
      ["CROCODILE", "animal"], ["ALLIGATOR", "animal"],
      ["CHOCOLATE", "food"], ["HAMBURGER", "food"], ["PINEAPPLE", "food"],
      ["CLASSROOM", "school"],
      ["SATELLITE", "space"], ["ASTRONAUT", "space"],
      ["WATERFALL", "nature"], ["BUTTERFLY", "nature"]
    ],
    10: [
      ["RHINOCEROS", "animal"],
      ["WATERMELON", "food"], ["STRAWBERRY", "food"],
      ["DICTIONARY", "school"], ["PLAYGROUND", "school"],
      ["ATMOSPHERE", "space"],
      ["EARTHQUAKE", "nature"], ["RAINFOREST", "nature"],
      ["BASKETBALL", "sport"], ["VOLLEYBALL", "sport"]
    ],
    11: [
      ["GRASSHOPPER", "animal"], ["CATERPILLAR", "animal"],
      ["GINGERBREAD", "food"], ["SUPERMARKET", "food"]
    ],
    12: [
      ["HIPPOPOTAMUS", "animal"],
      ["KINDERGARTEN", "school"]
    ]
  };
  var MIN_LEN = 4, MAX_LEN = 12;

  var MAX_LIVES = 8;
  var MAX_HINTS = 3;
  var MIN_TILE = 30, MAX_TILE = 80;

  var gwPlay = document.getElementById("gwPlay");
  var gwGrid = document.getElementById("gwGrid");
  var keyboard = document.getElementById("keyboard");
  var categoryLabel = document.getElementById("categoryLabel");
  var hudGuesses = document.getElementById("hudGuesses");
  var resultOverlay = document.getElementById("resultOverlay");
  var resultArt = document.getElementById("resultArt");
  var resultMsg = document.getElementById("resultMsg");
  var btnPlayAgain = document.getElementById("btnPlayAgain");
  var btnHint = document.getElementById("btnHint");

  var state = {
    length: 5,
    target: "",
    category: "",
    revealed: {},   // letter -> true, once guessed correctly or hinted
    wrongLetters: {}, // letter -> true, guessed and not in the word
    livesLeft: MAX_LIVES,
    hintsLeft: MAX_HINTS,
    solved: false,
    lost: false
  };

  var KB_ROWS = [
    "QWERTYUIOP".split(""),
    "ASDFGHJKL".split(""),
    "ZXCVBNM".split("")
  ];

  function pickWord(length) {
    var list = WORDS[length];
    var choice = list[Math.floor(Math.random() * list.length)];
    if (choice[0] === state.target && list.length > 1) return pickWord(length);
    return choice;
  }

  function randomLength() {
    return MIN_LEN + Math.floor(Math.random() * (MAX_LEN - MIN_LEN + 1));
  }

  function isWordComplete() {
    for (var i = 0; i < state.target.length; i++) {
      if (!state.revealed[state.target[i]]) return false;
    }
    return true;
  }

  // ---------------- hints ----------------
  function useHint() {
    if (state.hintsLeft <= 0 || state.solved || state.lost) return;
    var candidates = [];
    for (var i = 0; i < state.target.length; i++) {
      var ch = state.target[i];
      if (!state.revealed[ch] && candidates.indexOf(ch) === -1) candidates.push(ch);
    }
    if (!candidates.length) { updateHintButton(); return; }
    var letter = candidates[Math.floor(Math.random() * candidates.length)];
    state.revealed[letter] = true;
    state.hintsLeft--;
    renderTiles(true);
    syncKeyboardColors();
    updateHintButton();
    checkWin();
  }

  function updateHintButton() {
    btnHint.textContent = "💡 提示 (" + state.hintsLeft + ")";
    btnHint.disabled = state.hintsLeft <= 0 || state.solved || state.lost;
  }

  // ---------------- layout ----------------
  function fitLayout() {
    var center = document.getElementById("gwCenter");
    var availW = center.clientWidth;
    var availH = window.innerHeight - gwPlay.getBoundingClientRect().top - 20;

    var gridGap = 8, kbRowGap = 7, sectionGap = 18;
    var maxByWidth = (availW - gridGap * (state.length - 1)) / state.length;

    // vertical budget: one tile row + keyboard (3 rows * keyH + 2*kbRowGap)
    var keyRatio = 0.62;
    var denom = 1 + 3 * keyRatio;
    var fixed = sectionGap + kbRowGap * 2;
    var maxByHeight = (availH - fixed) / denom;

    var tile = Math.floor(Math.min(maxByWidth, maxByHeight));
    tile = Math.max(MIN_TILE, Math.min(MAX_TILE, tile));

    var root = document.documentElement;
    root.style.setProperty("--tile", tile + "px");
    root.style.setProperty("--key-h", Math.round(tile * keyRatio) + "px");
    root.style.setProperty("--rows", 1);
    root.style.setProperty("--cols", state.length);
  }

  // ---------------- rendering ----------------
  function renderGrid() {
    gwGrid.innerHTML = "";
    var row = document.createElement("div");
    row.className = "gw-row";
    row.id = "gwRow0";
    for (var c = 0; c < state.length; c++) {
      var tile = document.createElement("div");
      tile.className = "tile";
      tile.id = "tile-0-" + c;
      row.appendChild(tile);
    }
    gwGrid.appendChild(row);
  }

  function renderTiles(animateNew) {
    for (var c = 0; c < state.length; c++) {
      var tile = document.getElementById("tile-0-" + c);
      var ch = state.target[c];
      if (state.revealed[ch]) {
        var wasEmpty = tile.textContent === "" || tile.textContent === "_";
        tile.textContent = ch;
        tile.classList.add("correct", "filled");
        if (animateNew && wasEmpty) {
          tile.classList.remove("pop");
          void tile.offsetWidth;
          tile.classList.add("pop");
        }
      } else {
        tile.textContent = "_";
        tile.classList.remove("correct", "filled", "pop");
      }
    }
  }

  function renderKeyboard() {
    keyboard.innerHTML = "";
    KB_ROWS.forEach(function (row) {
      var rowEl = document.createElement("div");
      rowEl.className = "kb-row";
      row.forEach(function (k) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "key";
        btn.textContent = k;
        btn.dataset.key = k;
        btn.addEventListener("click", function () { handleKey(this.dataset.key); });
        rowEl.appendChild(btn);
      });
      keyboard.appendChild(rowEl);
    });
    syncKeyboardColors();
  }

  function syncKeyboardColors() {
    var keys = keyboard.querySelectorAll(".key");
    keys.forEach(function (btn) {
      var k = btn.dataset.key;
      btn.classList.remove("correct", "absent");
      btn.disabled = false;
      if (state.revealed[k]) { btn.classList.add("correct"); btn.disabled = true; }
      else if (state.wrongLetters[k]) { btn.classList.add("absent"); btn.disabled = true; }
    });
  }

  function updateHud() {
    hudGuesses.textContent = state.livesLeft + " / " + MAX_LIVES;
  }

  // ---------------- game flow ----------------
  function newRound() {
    state.length = randomLength();
    var picked = pickWord(state.length);
    state.target = picked[0];
    state.category = picked[1];
    state.revealed = {};
    state.wrongLetters = {};
    state.livesLeft = MAX_LIVES;
    state.hintsLeft = MAX_HINTS;
    state.solved = false;
    state.lost = false;
    resultOverlay.hidden = true;
    categoryLabel.innerHTML = "本鋪主題：<b>" + CATEGORY_LABEL[state.category] + "</b> · " + state.length + " 個字母";
    updateHintButton();
    updateHud();
    fitLayout();
    renderGrid();
    renderTiles(false);
    renderKeyboard();
  }

  function showResult(won) {
    resultOverlay.hidden = false;
    if (won) {
      resultArt.src = "/static/img/art/win.jpg";
      resultArt.alt = "估到喇！";
      resultMsg.textContent = "答案係 " + state.target + " · 用剩 " + state.livesLeft + " 次機會 · 計分緊…";
    } else {
      resultArt.src = "/static/img/art/lose.jpg";
      resultArt.alt = "下次一定得！";
      resultMsg.textContent = "答案係 " + state.target;
    }

    var hintsUsed = MAX_HINTS - state.hintsLeft;
    fetch("/api/guess-word/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        length: state.length, lives_left: state.livesLeft, hints_used: hintsUsed, won: won
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!won) return;
        var text = "答案係 " + state.target + " · 用剩 " + state.livesLeft + " 次機會 · +" + data.points_awarded + " 分";
        if (data.new_badges && data.new_badges.length) text += " · 新徽章 " + data.new_badges.join(" ");
        resultMsg.textContent = text;
        var chip = document.querySelector(".points-chip");
        if (chip && typeof data.total_points === "number") chip.textContent = "⭐ " + data.total_points;
      })
      .catch(function () {});
  }

  function checkWin() {
    if (isWordComplete()) {
      state.solved = true;
      updateHintButton();
      setTimeout(function () { showResult(true); }, 350);
    }
  }

  function handleKey(letter) {
    if (state.solved || state.lost) return;
    if (state.revealed[letter] || state.wrongLetters[letter]) return;

    if (state.target.indexOf(letter) !== -1) {
      state.revealed[letter] = true;
      renderTiles(true);
      syncKeyboardColors();
      checkWin();
    } else {
      state.wrongLetters[letter] = true;
      state.livesLeft--;
      syncKeyboardColors();
      updateHud();
      var row = document.getElementById("gwRow0");
      row.classList.remove("shake");
      void row.offsetWidth;
      row.classList.add("shake");
      if (state.livesLeft <= 0) {
        state.lost = true;
        updateHintButton();
        setTimeout(function () { showResult(false); }, 350);
      }
    }
  }

  window.addEventListener("keydown", function (e) {
    if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
  });

  document.getElementById("btnNewWord").addEventListener("click", function () {
    newRound();
  });
  btnHint.addEventListener("click", useHint);
  btnPlayAgain.addEventListener("click", function () {
    newRound();
  });

  window.addEventListener("resize", fitLayout);
  window.addEventListener("orientationchange", function () { setTimeout(fitLayout, 50); });

  newRound();
})();
