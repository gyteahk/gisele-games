(function () {
  "use strict";

  var BACKGROUNDS = [
    "space_station", "jungle_temple", "pirate_island", "enchanted_forest",
    "desert_pyramid", "arctic_glacier", "coral_reef", "volcano_cave",
    "sky_castle", "haunted_garden", "robot_factory", "candy_kingdom"
  ];

  // short = the grid's narrower dimension, long = its longer dimension.
  // Which one maps to cols vs rows is decided at newGame() time from the
  // available space, so the maze always matches portrait or landscape.
  var DIFFICULTIES = {
    easy: { short: 7, long: 9 },
    medium: { short: 9, long: 12 },
    hard: { short: 11, long: 15 }
  };

  var INK = "#1A1235";
  var MIN_CELL = 26;
  var MAX_CELL = 140;

  var canvas = document.getElementById("mazeCanvas");
  var ctx = canvas.getContext("2d");
  var stage = document.getElementById("mazeStage");

  var playerImg = new Image();
  playerImg.src = "/static/img/art/player.png";
  var treasureImg = new Image();
  treasureImg.src = "/static/img/art/treasure.png";

  function drawFitted(img, cx, cy, maxDim) {
    if (!img.complete || !img.naturalWidth) return false;
    var scale = maxDim / Math.max(img.naturalWidth, img.naturalHeight);
    var w = img.naturalWidth * scale, h = img.naturalHeight * scale;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    return true;
  }
  var mazeCenter = document.getElementById("mazeCenter");

  var state = {
    difficulty: "medium",
    mode: "swipe",
    cols: 0, rows: 0, cellSize: 0,
    cells: null,
    start: { r: 0, c: 0 },
    goal: { r: 0, c: 0 },
    playerCell: { r: 0, c: 0 },
    playerPx: { x: 0, y: 0 },
    path: [],
    steps: 0,
    bgKey: null,
    bgImage: null,
    startTime: null,
    timerHandle: null,
    solved: false,
    drawing: false,
    dragOrigin: null
  };

  // ---------------- maze generation (recursive backtracker) ----------------
  function genMaze(cols, rows) {
    var cells = [];
    for (var r = 0; r < rows; r++) {
      var row = [];
      for (var c = 0; c < cols; c++) {
        row.push({ n: true, s: true, e: true, w: true, visited: false });
      }
      cells.push(row);
    }
    var stack = [{ r: 0, c: 0 }];
    cells[0][0].visited = true;
    while (stack.length) {
      var cur = stack[stack.length - 1];
      var neighbors = [];
      if (cur.r > 0 && !cells[cur.r - 1][cur.c].visited) neighbors.push({ r: cur.r - 1, c: cur.c, dir: "n" });
      if (cur.r < rows - 1 && !cells[cur.r + 1][cur.c].visited) neighbors.push({ r: cur.r + 1, c: cur.c, dir: "s" });
      if (cur.c > 0 && !cells[cur.r][cur.c - 1].visited) neighbors.push({ r: cur.r, c: cur.c - 1, dir: "w" });
      if (cur.c < cols - 1 && !cells[cur.r][cur.c + 1].visited) neighbors.push({ r: cur.r, c: cur.c + 1, dir: "e" });
      if (!neighbors.length) { stack.pop(); continue; }
      var pick = neighbors[Math.floor(Math.random() * neighbors.length)];
      var opp = { n: "s", s: "n", e: "w", w: "e" }[pick.dir];
      cells[cur.r][cur.c][pick.dir] = false;
      cells[pick.r][pick.c][opp] = false;
      cells[pick.r][pick.c].visited = true;
      stack.push({ r: pick.r, c: pick.c });
    }
    return cells;
  }

  function canMove(r, c, dir) {
    if (r < 0 || r >= state.rows || c < 0 || c >= state.cols) return false;
    return !state.cells[r][c][dir];
  }
  function neighborCoord(r, c, dir) {
    if (dir === "n") return { r: r - 1, c: c };
    if (dir === "s") return { r: r + 1, c: c };
    if (dir === "e") return { r: r, c: c + 1 };
    return { r: r, c: c - 1 };
  }
  function dirBetween(a, b) {
    if (b.r === a.r - 1 && b.c === a.c) return "n";
    if (b.r === a.r + 1 && b.c === a.c) return "s";
    if (b.c === a.c + 1 && b.r === a.r) return "e";
    if (b.c === a.c - 1 && b.r === a.r) return "w";
    return null;
  }
  function sameCell(a, b) { return a && b && a.r === b.r && a.c === b.c; }

  // ---------------- background ----------------
  function pickBackground() {
    var choices = BACKGROUNDS.filter(function (k) { return k !== state.bgKey; });
    return choices[Math.floor(Math.random() * choices.length)];
  }
  function loadBackground(key, cb) {
    var img = new Image();
    img.onload = function () { cb(img); };
    img.onerror = function () { cb(null); };
    img.src = "/static/img/maze_bg/" + key + ".png";
  }

  // ---------------- layout / drawing ----------------
  function cellCenterPx(cell) {
    return {
      x: cell.c * state.cellSize + state.cellSize / 2,
      y: cell.r * state.cellSize + state.cellSize / 2
    };
  }

  function availableSpace() {
    return {
      w: mazeCenter.clientWidth,
      h: window.innerHeight - stage.getBoundingClientRect().top - 20
    };
  }

  // Picks cols/rows so the grid's shape matches the available space's shape
  // (wide screen -> wide maze, tall screen -> tall maze), so the whole maze
  // is always visible without scrolling in either iPad orientation.
  function gridForOrientation(difficulty) {
    var d = DIFFICULTIES[difficulty];
    var space = availableSpace();
    // Bias toward the portrait-shaped grid on near-square leftover space
    // (common on portrait iPads once the header/toolbar chrome is subtracted)
    // so only a genuinely wide layout switches to the wide-shaped grid.
    var landscape = space.w > space.h * 1.15;
    return landscape ? { cols: d.long, rows: d.short } : { cols: d.short, rows: d.long };
  }

  function fitCanvasToSpace() {
    var space = availableSpace();
    var cellSize = Math.min(space.w / state.cols, space.h / state.rows);
    cellSize = Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor(cellSize)));
    var displayWidth = cellSize * state.cols;
    var displayHeight = cellSize * state.rows;
    var dpr = window.devicePixelRatio || 1;
    stage.style.width = displayWidth + "px";
    canvas.style.width = displayWidth + "px";
    canvas.style.height = displayHeight + "px";
    canvas.width = Math.round(displayWidth * dpr);
    canvas.height = Math.round(displayHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.cellSize = cellSize;
    state.displayWidth = displayWidth;
    state.displayHeight = displayHeight;
    var p = cellCenterPx(state.playerCell);
    state.playerPx = { x: p.x, y: p.y };
  }

  function drawCoverImage(img) {
    if (!img) {
      ctx.fillStyle = "#DCEBFF";
      ctx.fillRect(0, 0, state.displayWidth, state.displayHeight);
      return;
    }
    var scale = Math.max(state.displayWidth / img.width, state.displayHeight / img.height);
    var w = img.width * scale, h = img.height * scale;
    var dx = (state.displayWidth - w) / 2, dy = (state.displayHeight - h) / 2;
    ctx.drawImage(img, dx, dy, w, h);
  }

  function drawStar(cx, cy, r) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var ang = (Math.PI / 5) * i - Math.PI / 2;
      var rad = i % 2 === 0 ? r : r * 0.45;
      var x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function draw() {
    var w = state.displayWidth, h = state.displayHeight;
    ctx.clearRect(0, 0, w, h);
    drawCoverImage(state.bgImage);
    ctx.fillStyle = "rgba(255,255,255,0.58)";
    ctx.fillRect(0, 0, w, h);

    var cs = state.cellSize;
    var wallW = Math.max(4, cs * 0.16);
    ctx.strokeStyle = INK;
    ctx.lineCap = "round";
    ctx.lineWidth = wallW;
    ctx.beginPath();
    for (var r = 0; r < state.rows; r++) {
      for (var c = 0; c < state.cols; c++) {
        var cell = state.cells[r][c];
        var x0 = c * cs, y0 = r * cs, x1 = x0 + cs, y1 = y0 + cs;
        if (cell.n) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); }
        if (cell.w) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); }
        if (r === state.rows - 1 && cell.s) { ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); }
        if (c === state.cols - 1 && cell.e) { ctx.moveTo(x1, y0); ctx.lineTo(x1, y1); }
      }
    }
    ctx.stroke();

    ctx.lineWidth = wallW * 1.3;
    ctx.strokeRect(wallW * 0.6, wallW * 0.6, w - wallW * 1.2, h - wallW * 1.2);

    // drawn path trail (draw mode)
    if (state.mode === "draw" && state.path.length > 1) {
      ctx.strokeStyle = "#7B5CFF";
      ctx.lineWidth = cs * 0.32;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      for (var i = 0; i < state.path.length; i++) {
        var p = cellCenterPx(state.path[i]);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // start marker
    var sp = cellCenterPx(state.start);
    ctx.fillStyle = "#1FCFC0";
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(2, cs * 0.06);
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, cs * 0.22, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // goal marker (treasure chest, falls back to a star if the art hasn't loaded yet)
    var gp = cellCenterPx(state.goal);
    if (!drawFitted(treasureImg, gp.x, gp.y, cs * 0.9)) {
      ctx.fillStyle = "#FFC93C";
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(2, cs * 0.05);
      drawStar(gp.x, gp.y, cs * 0.32);
      ctx.fill(); ctx.stroke();
    }

    // player token (falls back to a plain dot if the art hasn't loaded yet)
    if (!drawFitted(playerImg, state.playerPx.x, state.playerPx.y, cs * 0.95)) {
      ctx.fillStyle = "#FF5D73";
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(2, cs * 0.07);
      ctx.beginPath();
      ctx.arc(state.playerPx.x, state.playerPx.y, cs * 0.28, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
  }

  var rafHandle = null;
  function tick() {
    var target = cellCenterPx(state.playerCell);
    state.playerPx.x += (target.x - state.playerPx.x) * 0.35;
    state.playerPx.y += (target.y - state.playerPx.y) * 0.35;
    draw();
    rafHandle = requestAnimationFrame(tick);
  }

  // ---------------- timer / hud ----------------
  var hudTime = document.getElementById("hudTime");
  var hudSteps = document.getElementById("hudSteps");

  function startTimerIfNeeded() {
    if (state.startTime) return;
    state.startTime = Date.now();
    state.timerHandle = setInterval(updateTimerDisplay, 250);
  }
  function stopTimer() {
    if (state.timerHandle) clearInterval(state.timerHandle);
    state.timerHandle = null;
  }
  function updateTimerDisplay() {
    var elapsed = state.startTime ? Date.now() - state.startTime : 0;
    var totalSec = Math.floor(elapsed / 1000);
    var mm = Math.floor(totalSec / 60);
    var ss = totalSec % 60;
    hudTime.textContent = (mm < 10 ? "0" + mm : mm) + ":" + (ss < 10 ? "0" + ss : ss);
  }
  function updateStepsDisplay() { hudSteps.textContent = state.steps; }

  // ---------------- game flow ----------------
  var winOverlay = document.getElementById("winOverlay");
  var winTime = document.getElementById("winTime");
  var winSteps = document.getElementById("winSteps");

  function buildGrid(grid) {
    state.cols = grid.cols; state.rows = grid.rows;
    state.cells = genMaze(grid.cols, grid.rows);
    state.start = { r: 0, c: 0 };
    state.goal = { r: grid.rows - 1, c: grid.cols - 1 };
    state.playerCell = { r: state.start.r, c: state.start.c };
    state.path = [{ r: state.start.r, c: state.start.c }];
    state.steps = 0;
    state.solved = false;
    state.drawing = false;
    state.dragOrigin = null;
    stopTimer();
    state.startTime = null;
    hudTime.textContent = "00:00";
    updateStepsDisplay();
    winOverlay.hidden = true;
  }

  function newGame(difficulty) {
    if (difficulty) state.difficulty = difficulty;
    buildGrid(gridForOrientation(state.difficulty));
    fitCanvasToSpace();

    var key = pickBackground();
    state.bgKey = key;
    loadBackground(key, function (img) {
      state.bgImage = img;
    });
  }

  // Rotating the iPad changes which shape (wide vs tall) best fills the
  // screen. Re-decide on every viewport change, not just at newGame(), so
  // landscape always gets a big wide maze instead of the portrait maze
  // just getting rescaled down to fit a shorter landscape height.
  var viewportDebounce = null;
  function handleViewportChange() {
    clearTimeout(viewportDebounce);
    viewportDebounce = setTimeout(function () {
      var grid = gridForOrientation(state.difficulty);
      if (grid.cols !== state.cols || grid.rows !== state.rows) {
        buildGrid(grid);
      }
      fitCanvasToSpace();
    }, 120);
  }

  function win() {
    if (state.solved) return;
    state.solved = true;
    stopTimer();
    var elapsed = state.startTime ? Date.now() - state.startTime : 0;
    var totalSec = elapsed / 1000;
    var mm = Math.floor(totalSec / 60), ss = Math.floor(totalSec % 60);
    winTime.textContent = (mm < 10 ? "0" + mm : mm) + ":" + (ss < 10 ? "0" + ss : ss);
    winSteps.textContent = state.steps;
    winOverlay.hidden = false;

    var winPoints = document.getElementById("winPoints");
    if (winPoints) winPoints.textContent = "計分緊…";
    fetch("/api/maze/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ difficulty: state.difficulty, seconds: totalSec, steps: state.steps, won: true })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!winPoints) return;
        var text = "+" + data.points_awarded + " 分";
        if (data.new_badges && data.new_badges.length) text += " · 新徽章 " + data.new_badges.join(" ");
        winPoints.textContent = text;
        var chip = document.querySelector(".points-chip");
        if (chip && typeof data.total_points === "number") chip.textContent = "⭐ " + data.total_points;
      })
      .catch(function () { if (winPoints) winPoints.textContent = ""; });
  }

  function attemptMove(dir) {
    if (state.solved) return;
    var cur = state.playerCell;
    if (!canMove(cur.r, cur.c, dir)) return;
    var next = neighborCoord(cur.r, cur.c, dir);
    state.playerCell = next;
    state.steps++;
    updateStepsDisplay();
    startTimerIfNeeded();
    if (sameCell(next, state.goal)) win();
  }

  // ---------------- input: swipe/drag move mode ----------------
  function getPos(e) {
    var rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  canvas.addEventListener("pointerdown", function (e) {
    canvas.setPointerCapture(e.pointerId);
    var p = getPos(e);
    if (state.mode === "swipe") {
      state.dragOrigin = p;
    } else {
      handleDrawStart(p);
    }
  });

  canvas.addEventListener("pointermove", function (e) {
    if (state.solved) return;
    var p = getPos(e);
    if (state.mode === "swipe") {
      if (!state.dragOrigin) return;
      var dx = p.x - state.dragOrigin.x, dy = p.y - state.dragOrigin.y;
      var threshold = state.cellSize * 0.55;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > threshold) {
        var dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "e" : "w") : (dy > 0 ? "s" : "n");
        attemptMove(dir);
        state.dragOrigin = p;
      }
    } else {
      if (!state.drawing) return;
      handleDrawMove(p);
    }
  });

  function endPointer() {
    state.dragOrigin = null;
    state.drawing = false;
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);

  function pxToCell(p) {
    var c = Math.floor(p.x / state.cellSize);
    var r = Math.floor(p.y / state.cellSize);
    c = Math.max(0, Math.min(state.cols - 1, c));
    r = Math.max(0, Math.min(state.rows - 1, r));
    return { r: r, c: c };
  }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function handleDrawStart(p) {
    var radius = state.cellSize * 0.65;
    var bestIdx = -1, bestDist = Infinity;
    for (var i = 0; i < state.path.length; i++) {
      var cp = cellCenterPx(state.path[i]);
      var d = dist(p, cp);
      if (d < radius && d < bestDist) { bestDist = d; bestIdx = i; }
    }
    if (bestIdx === -1) return;
    state.path = state.path.slice(0, bestIdx + 1);
    state.playerCell = state.path[state.path.length - 1];
    state.drawing = true;
  }

  function handleDrawMove(p) {
    var cell = pxToCell(p);
    var last = state.path[state.path.length - 1];
    if (sameCell(cell, last)) return;
    var secondLast = state.path[state.path.length - 2];
    if (sameCell(cell, secondLast)) {
      state.path.pop();
      state.playerCell = state.path[state.path.length - 1];
      state.steps = state.path.length - 1;
      updateStepsDisplay();
      return;
    }
    var dir = dirBetween(last, cell);
    if (!dir) return;
    if (!canMove(last.r, last.c, dir)) return;
    if (state.path.some(function (pc) { return sameCell(pc, cell); })) return;
    state.path.push(cell);
    state.playerCell = cell;
    state.steps = state.path.length - 1;
    updateStepsDisplay();
    startTimerIfNeeded();
    if (sameCell(cell, state.goal)) win();
  }

  // ---------------- toolbar wiring ----------------
  var modeButtons = document.querySelectorAll("[data-mode]");
  var hintSwipe = document.getElementById("hintSwipe");
  var hintDraw = document.getElementById("hintDraw");
  modeButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      modeButtons.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      state.mode = btn.getAttribute("data-mode");
      state.dragOrigin = null;
      state.drawing = false;
      hintSwipe.hidden = state.mode !== "swipe";
      hintDraw.hidden = state.mode !== "draw";
      if (state.mode === "draw") {
        state.path = [{ r: state.playerCell.r, c: state.playerCell.c }];
      }
    });
  });

  var diffButtons = document.querySelectorAll("[data-difficulty]");
  diffButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      diffButtons.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      newGame(btn.getAttribute("data-difficulty"));
    });
  });

  document.getElementById("btnNewMaze").addEventListener("click", function () {
    newGame();
  });
  document.getElementById("btnPlayAgain").addEventListener("click", function () {
    newGame();
  });

  window.addEventListener("resize", handleViewportChange);
  window.addEventListener("orientationchange", handleViewportChange);

  // ---------------- boot ----------------
  newGame("medium");
  rafHandle = requestAnimationFrame(tick);
})();
