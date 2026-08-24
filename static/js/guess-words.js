(function () {
  "use strict";

  var CATEGORY_LABEL = {
    animal: "動物", food: "食物", school: "校園",
    space: "太空", nature: "大自然", sport: "運動",
    clothes: "衣服", transport: "交通工具", job: "職業",
    body: "身體"
  };

  var WORDS = {
    4: [
      ["LION", "animal"], ["BEAR", "animal"], ["FROG", "animal"],
      ["DUCK", "animal"], ["FISH", "animal"], ["BIRD", "animal"],
      ["WOLF", "animal"], ["GOAT", "animal"], ["DEER", "animal"],
      ["CRAB", "animal"], ["SEAL", "animal"], ["SWAN", "animal"],
      ["HAWK", "animal"], ["CAKE", "food"], ["MILK", "food"],
      ["RICE", "food"], ["SOUP", "food"], ["TACO", "food"],
      ["BOOK", "school"], ["DESK", "school"], ["STAR", "space"],
      ["MOON", "space"], ["MARS", "space"], ["SAND", "nature"],
      ["WAVE", "nature"], ["LEAF", "nature"], ["TREE", "nature"],
      ["LAKE", "nature"], ["HILL", "nature"], ["ROCK", "nature"],
      ["WIND", "nature"], ["SNOW", "nature"], ["RAIN", "nature"],
      ["MIST", "nature"], ["BALL", "sport"], ["GOAL", "sport"],
      ["SWIM", "sport"], ["RACE", "sport"], ["GOLF", "sport"],
      ["TEAM", "sport"], ["JUDO", "sport"], ["BELT", "clothes"],
      ["COAT", "clothes"], ["SOCK", "clothes"], ["SHIP", "transport"],
      ["BOAT", "transport"], ["BIKE", "transport"], ["TAXI", "transport"],
      ["TRAM", "transport"], ["CHEF", "job"], ["HEAD", "body"],
      ["NECK", "body"], ["HAND", "body"], ["FOOT", "body"],
      ["HAIR", "body"], ["CHIN", "body"], ["NOSE", "body"],
      ["EYES", "body"]
    ],
    5: [
      ["TIGER", "animal"], ["ZEBRA", "animal"], ["PANDA", "animal"],
      ["SNAKE", "animal"], ["WHALE", "animal"], ["SHEEP", "animal"],
      ["HORSE", "animal"], ["MOUSE", "animal"], ["CAMEL", "animal"],
      ["EAGLE", "animal"], ["KOALA", "animal"], ["OTTER", "animal"],
      ["RAVEN", "animal"], ["SHARK", "animal"], ["COBRA", "animal"],
      ["LLAMA", "animal"], ["BISON", "animal"], ["MOOSE", "animal"],
      ["SLOTH", "animal"], ["BREAD", "food"], ["PIZZA", "food"],
      ["GRAPE", "food"], ["LEMON", "food"], ["HONEY", "food"],
      ["CANDY", "food"], ["APPLE", "food"], ["PEACH", "food"],
      ["MANGO", "food"], ["OLIVE", "food"], ["BACON", "food"],
      ["TOAST", "food"], ["PASTA", "food"], ["SALAD", "food"],
      ["STEAK", "food"], ["ONION", "food"], ["GRAVY", "food"],
      ["SUSHI", "food"], ["SALSA", "food"], ["BAGEL", "food"],
      ["PAPER", "school"], ["CHALK", "school"], ["RULER", "school"],
      ["GLOBE", "school"], ["CHAIR", "school"], ["EARTH", "space"],
      ["COMET", "space"], ["PLUTO", "space"], ["ORBIT", "space"],
      ["ALIEN", "space"], ["ROVER", "space"], ["OCEAN", "nature"],
      ["RIVER", "nature"], ["CLOUD", "nature"], ["STORM", "nature"],
      ["PLANT", "nature"], ["BEACH", "nature"], ["STONE", "nature"],
      ["CORAL", "nature"], ["CLIFF", "nature"], ["FIELD", "nature"],
      ["GRASS", "nature"], ["BLOOM", "nature"], ["SKATE", "sport"],
      ["RUGBY", "sport"], ["SHIRT", "clothes"], ["PANTS", "clothes"],
      ["DRESS", "clothes"], ["JEANS", "clothes"], ["SHOES", "clothes"],
      ["BOOTS", "clothes"], ["SCARF", "clothes"], ["GLOVE", "clothes"],
      ["APRON", "clothes"], ["TRUCK", "transport"], ["TRAIN", "transport"],
      ["PLANE", "transport"], ["FERRY", "transport"], ["JUDGE", "job"],
      ["BAKER", "job"], ["NURSE", "job"], ["PILOT", "job"],
      ["CLOWN", "job"], ["ACTOR", "job"], ["GUARD", "job"],
      ["ELBOW", "body"], ["ANKLE", "body"], ["CHEST", "body"],
      ["THUMB", "body"], ["WRIST", "body"], ["TOOTH", "body"],
      ["MOUTH", "body"]
    ],
    6: [
      ["RABBIT", "animal"], ["MONKEY", "animal"], ["TURTLE", "animal"],
      ["SPIDER", "animal"], ["DONKEY", "animal"], ["LIZARD", "animal"],
      ["PARROT", "animal"], ["BEAVER", "animal"], ["JAGUAR", "animal"],
      ["COYOTE", "animal"], ["MAGPIE", "animal"], ["WEASEL", "animal"],
      ["TOUCAN", "animal"], ["WALRUS", "animal"], ["BADGER", "animal"],
      ["FALCON", "animal"], ["IGUANA", "animal"], ["PYTHON", "animal"],
      ["BANANA", "food"], ["ORANGE", "food"], ["COOKIE", "food"],
      ["CARROT", "food"], ["CHERRY", "food"], ["POTATO", "food"],
      ["TOMATO", "food"], ["BUTTER", "food"], ["YOGURT", "food"],
      ["NOODLE", "food"], ["MUFFIN", "food"], ["WAFFLE", "food"],
      ["CEREAL", "food"], ["PEANUT", "food"], ["RAISIN", "food"],
      ["NACHOS", "food"], ["PENCIL", "school"], ["ERASER", "school"],
      ["SCHOOL", "school"], ["CRAYON", "school"], ["MARKER", "school"],
      ["FOLDER", "school"], ["BINDER", "school"], ["LESSON", "school"],
      ["RECESS", "school"], ["NUMBER", "school"], ["LETTER", "school"],
      ["LOCKER", "school"], ["METEOR", "space"], ["ROCKET", "space"],
      ["GALAXY", "space"], ["SATURN", "space"], ["URANUS", "space"],
      ["FOREST", "nature"], ["DESERT", "nature"], ["ISLAND", "nature"],
      ["FLOWER", "nature"], ["VALLEY", "nature"], ["STREAM", "nature"],
      ["BREEZE", "nature"], ["PEBBLE", "nature"], ["JUNGLE", "nature"],
      ["MEADOW", "nature"], ["CANYON", "nature"], ["SUNSET", "nature"],
      ["SOCCER", "sport"], ["TENNIS", "sport"], ["HOCKEY", "sport"],
      ["DIVING", "sport"], ["SKIING", "sport"], ["ROWING", "sport"],
      ["TROPHY", "sport"], ["KARATE", "sport"], ["BOXING", "sport"],
      ["PADDLE", "sport"], ["HURDLE", "sport"], ["JACKET", "clothes"],
      ["BUTTON", "clothes"], ["ZIPPER", "clothes"], ["BEANIE", "clothes"],
      ["HELMET", "clothes"], ["MITTEN", "clothes"], ["BLAZER", "clothes"],
      ["SUBWAY", "transport"], ["GLIDER", "transport"], ["DOCTOR", "job"],
      ["FARMER", "job"], ["DANCER", "job"], ["SINGER", "job"],
      ["WRITER", "job"], ["BARBER", "job"], ["WAITER", "job"],
      ["LAWYER", "job"], ["TAILOR", "job"], ["TONGUE", "body"],
      ["FINGER", "body"], ["MUSCLE", "body"]
    ],
    7: [
      ["DOLPHIN", "animal"], ["PENGUIN", "animal"], ["GIRAFFE", "animal"],
      ["HAMSTER", "animal"], ["LEOPARD", "animal"], ["CHEETAH", "animal"],
      ["OCTOPUS", "animal"], ["PEACOCK", "animal"], ["GORILLA", "animal"],
      ["BUFFALO", "animal"], ["LADYBUG", "animal"], ["MEERKAT", "animal"],
      ["OSTRICH", "animal"], ["MANATEE", "animal"], ["AVOCADO", "food"],
      ["PRETZEL", "food"], ["PANCAKE", "food"], ["CHICKEN", "food"],
      ["LASAGNA", "food"], ["BURRITO", "food"], ["SAUSAGE", "food"],
      ["PUMPKIN", "food"], ["CABBAGE", "food"], ["SPINACH", "food"],
      ["APRICOT", "food"], ["OATMEAL", "food"], ["POPCORN", "food"],
      ["CUPCAKE", "food"], ["GRANOLA", "food"], ["BROWNIE", "food"],
      ["TEACHER", "school"], ["STUDENT", "school"], ["LIBRARY", "school"],
      ["STAPLER", "school"], ["SUBJECT", "school"], ["READING", "school"],
      ["WRITING", "school"], ["SCIENCE", "school"], ["HISTORY", "school"],
      ["GRAMMAR", "school"], ["UNIFORM", "school"], ["PROJECT", "school"],
      ["HALLWAY", "school"], ["JANITOR", "school"], ["SHUTTLE", "space"],
      ["GRAVITY", "space"], ["ECLIPSE", "space"], ["SUNSPOT", "space"],
      ["CAPSULE", "space"], ["NEPTUNE", "space"], ["MERCURY", "space"],
      ["JUPITER", "space"], ["RAINBOW", "nature"], ["VOLCANO", "nature"],
      ["HORIZON", "nature"], ["SUNRISE", "nature"], ["GLACIER", "nature"],
      ["TORNADO", "nature"], ["TSUNAMI", "nature"], ["BLOSSOM", "nature"],
      ["CRYSTAL", "nature"], ["DROUGHT", "nature"], ["SEAWEED", "nature"],
      ["ARCHERY", "sport"], ["BOWLING", "sport"], ["CYCLING", "sport"],
      ["RUNNING", "sport"], ["SURFING", "sport"], ["FENCING", "sport"],
      ["CRICKET", "sport"], ["REFEREE", "sport"], ["STADIUM", "sport"],
      ["WHISTLE", "sport"], ["ATHLETE", "sport"], ["WORKOUT", "sport"],
      ["STRETCH", "sport"], ["DEFENSE", "sport"], ["OFFENSE", "sport"],
      ["SWEATER", "clothes"], ["SANDALS", "clothes"], ["PAJAMAS", "clothes"],
      ["SCOOTER", "transport"], ["BICYCLE", "transport"], ["TRAILER", "transport"],
      ["MINIVAN", "transport"], ["CARAVAN", "transport"], ["TRACTOR", "transport"],
      ["CASHIER", "job"], ["DENTIST", "job"], ["PAINTER", "job"],
      ["BUTCHER", "job"], ["PLUMBER", "job"], ["BUILDER", "job"],
      ["SURGEON", "job"], ["STOMACH", "body"], ["EYEBROW", "body"],
      ["EYELASH", "body"], ["KNUCKLE", "body"], ["KNEECAP", "body"]
    ],
    8: [
      ["ELEPHANT", "animal"], ["DINOSAUR", "animal"], ["KANGAROO", "animal"],
      ["REINDEER", "animal"], ["FLAMINGO", "animal"], ["CHIPMUNK", "animal"],
      ["ANTEATER", "animal"], ["SEAHORSE", "animal"], ["HEDGEHOG", "animal"],
      ["SQUIRREL", "animal"], ["PLATYPUS", "animal"], ["SCORPION", "animal"],
      ["STARFISH", "animal"], ["BROCCOLI", "food"], ["OMELETTE", "food"],
      ["SANDWICH", "food"], ["MEATBALL", "food"], ["DUMPLING", "food"],
      ["CINNAMON", "food"], ["MUSHROOM", "food"], ["MEATLOAF", "food"],
      ["COLESLAW", "food"], ["DOUGHNUT", "food"], ["SMOOTHIE", "food"],
      ["SCISSORS", "school"], ["NOTEBOOK", "school"], ["COMPUTER", "school"],
      ["KEYBOARD", "school"], ["ALPHABET", "school"], ["SENTENCE", "school"],
      ["TEXTBOOK", "school"], ["EXERCISE", "school"], ["ASSEMBLY", "school"],
      ["HOMEWORK", "school"], ["BACKPACK", "school"], ["ASTEROID", "space"],
      ["STARDUST", "space"], ["UNIVERSE", "space"], ["MOUNTAIN", "nature"],
      ["SUNSHINE", "nature"], ["SEASHELL", "nature"], ["DAYLIGHT", "nature"],
      ["BASEBALL", "sport"], ["FOOTBALL", "sport"], ["MARATHON", "sport"],
      ["OLYMPICS", "sport"], ["CHAMPION", "sport"], ["TRAINING", "sport"],
      ["SLIPPERS", "clothes"], ["RAINCOAT", "clothes"], ["NECKLACE", "clothes"],
      ["BRACELET", "clothes"], ["SWIMSUIT", "clothes"], ["UMBRELLA", "clothes"],
      ["LEGGINGS", "clothes"], ["OVERALLS", "clothes"], ["CARDIGAN", "clothes"],
      ["EARRINGS", "clothes"], ["HEADBAND", "clothes"], ["SAILBOAT", "transport"],
      ["AIRPLANE", "transport"], ["MONORAIL", "transport"], ["ENGINEER", "job"],
      ["MUSICIAN", "job"], ["MECHANIC", "job"], ["SHOULDER", "body"],
      ["FOREHEAD", "body"], ["SKELETON", "body"], ["BACKBONE", "body"]
    ],
    9: [
      ["CROCODILE", "animal"], ["ALLIGATOR", "animal"], ["TARANTULA", "animal"],
      ["ORANGUTAN", "animal"], ["ARMADILLO", "animal"], ["PORCUPINE", "animal"],
      ["CHAMELEON", "animal"], ["JELLYFISH", "animal"], ["WOLVERINE", "animal"],
      ["CHOCOLATE", "food"], ["HAMBURGER", "food"], ["PINEAPPLE", "food"],
      ["BLUEBERRY", "food"], ["RASPBERRY", "food"], ["VEGETABLE", "food"],
      ["ASPARAGUS", "food"], ["CASSEROLE", "food"], ["MILKSHAKE", "food"],
      ["CLASSROOM", "school"], ["CLASSMATE", "school"], ["PRINCIPAL", "school"],
      ["CAFETERIA", "school"], ["TIMETABLE", "school"], ["LIBRARIAN", "school"],
      ["GEOGRAPHY", "school"], ["CHEMISTRY", "school"], ["SATELLITE", "space"],
      ["ASTRONAUT", "space"], ["MOONLIGHT", "space"], ["ASTRONOMY", "space"],
      ["SPACESUIT", "space"], ["STARLIGHT", "space"], ["SPACEWALK", "space"],
      ["LAUNCHPAD", "space"], ["TELESCOPE", "space"], ["SPACESHIP", "space"],
      ["WATERFALL", "nature"], ["BUTTERFLY", "nature"], ["AVALANCHE", "nature"],
      ["HURRICANE", "nature"], ["LANDSCAPE", "nature"], ["LIGHTNING", "nature"],
      ["SUNFLOWER", "nature"], ["DRIFTWOOD", "nature"], ["WRESTLING", "sport"],
      ["BADMINTON", "sport"], ["TRACKSUIT", "clothes"], ["WAISTCOAT", "clothes"],
      ["SUBMARINE", "transport"], ["AMBULANCE", "transport"], ["BULLDOZER", "transport"],
      ["SPEEDBOAT", "transport"], ["CATAMARAN", "transport"], ["CARPENTER", "job"],
      ["ZOOKEEPER", "job"], ["LIFEGUARD", "job"], ["SCIENTIST", "job"],
      ["ARCHITECT", "job"], ["FINGERTIP", "body"]
    ],
    10: [
      ["RHINOCEROS", "animal"], ["CHINCHILLA", "animal"], ["WOODPECKER", "animal"],
      ["WATERMELON", "food"], ["STRAWBERRY", "food"], ["CANTALOUPE", "food"],
      ["GRAPEFRUIT", "food"], ["DICTIONARY", "school"], ["PLAYGROUND", "school"],
      ["WHITEBOARD", "school"], ["BLACKBOARD", "school"], ["CURRICULUM", "school"],
      ["GRADUATION", "school"], ["ATMOSPHERE", "space"], ["SPACECRAFT", "space"],
      ["EARTHQUAKE", "nature"], ["RAINFOREST", "nature"], ["WILDERNESS", "nature"],
      ["BASKETBALL", "sport"], ["VOLLEYBALL", "sport"], ["TOURNAMENT", "sport"],
      ["SCOREBOARD", "sport"], ["GOALKEEPER", "sport"], ["GYMNASTICS", "sport"],
      ["SUNGLASSES", "clothes"], ["SKATEBOARD", "transport"], ["WHEELCHAIR", "transport"],
      ["HELICOPTER", "transport"], ["MOTORCYCLE", "transport"], ["LOCOMOTIVE", "transport"],
      ["HOVERCRAFT", "transport"], ["JOURNALIST", "job"], ["ASTRONOMER", "job"],
      ["COLLARBONE", "body"]
    ],
    11: [
      ["GRASSHOPPER", "animal"], ["CATERPILLAR", "animal"], ["RATTLESNAKE", "animal"],
      ["HUMMINGBIRD", "animal"], ["GINGERBREAD", "food"], ["SUPERMARKET", "food"],
      ["MARSHMALLOW", "food"], ["CAULIFLOWER", "food"], ["MATHEMATICS", "school"],
      ["CONVERTIBLE", "transport"], ["FIREFIGHTER", "job"], ["ELECTRICIAN", "job"],
      ["HAIRDRESSER", "job"]
    ],
    12: [
      ["HIPPOPOTAMUS", "animal"], ["KINDERGARTEN", "school"], ["THUNDERSTORM", "nature"],
      ["CHAMPIONSHIP", "sport"], ["VETERINARIAN", "job"], ["PHOTOGRAPHER", "job"]
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
  var swPuddle = document.getElementById("swPuddle");
  var SNOWMAN_PARTS = ["swHat", "swNose", "swArmL", "swArmR", "swEyes", "swButtons", "swHead", "swBody"];
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
    updateSnowman();
  }

  function updateSnowman() {
    var meltedCount = MAX_LIVES - state.livesLeft;
    SNOWMAN_PARTS.forEach(function (id, idx) {
      var el = document.getElementById(id);
      if (!el) return;
      if (idx < meltedCount) el.classList.add("sw-hidden");
      else el.classList.remove("sw-hidden");
    });
    if (meltedCount >= SNOWMAN_PARTS.length) swPuddle.classList.add("sw-show");
    else swPuddle.classList.remove("sw-show");
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
