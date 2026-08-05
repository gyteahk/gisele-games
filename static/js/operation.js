(function () {
  "use strict";

  var BACKGROUNDS = [
    "space_medbay", "pirate_infirmary", "jungle_clinic", "hospital_room",
    "castle_infirmary", "submarine_medbay", "desert_camp_clinic", "arctic_station_clinic"
  ];

  var DIFFS = {
    easy: { turns: 4, jitter: 0.12, widthFrac: 0.13, points: 15 },
    medium: { turns: 7, jitter: 0.16, widthFrac: 0.10, points: 25 },
    hard: { turns: 10, jitter: 0.20, widthFrac: 0.075, points: 35 }
  };
  var MAX_LIVES = 5;
  var INK = "#1A1235";

  var canvas = document.getElementById("opCanvas");
  var ctx = canvas.getContext("2d");
  var stage = document.getElementById("opStage");
  var center = document.getElementById("opCenter");

  var hudTime = document.getElementById("hudTime");
  var hudLives = document.getElementById("hudLives");
  var resultOverlay = document.getElementById("resultOverlay");
  var resultArt = document.getElementById("resultArt");
  var resultMsg = document.getElementById("resultMsg");
  var btnPlayAgain = document.getElementById("btnPlayAgain");

  var state = {
    difficulty: "medium",
    orientation: "landscape",
    pathNorm: [],
    pathPx: [],
    pathWidthPx: 0,
    displayWidth: 0,
    displayHeight: 0,
    cursor: { x: 0, y: 0 },
    dragging: false,
    wasInside: true,
    livesLeft: MAX_LIVES,
    solved: false,
    lost: false,
    startTime: null,
    timerHandle: null,
    flashUntil: 0,
    bgKey: null,
    bgImage: null
  };

  // ---------------- path generation ----------------
  // Landscape: winds left-to-right (monotonic in x). Portrait: winds top-to-
  // bottom (monotonic in y) instead, so a tall phone/iPad screen gets a tall
  // path that actually uses the available height, rather than a wide path
  // squeezed down to fit a narrow width with empty space above/below it.
  function generatePathNorm(turns, jitter, orientation) {
    var points = [];
    var segW = 0.88 / (turns + 1);
    function jitterAt(i) {
      var v = 0.5 + (Math.random() * 2 - 1) * jitter * (i % 2 === 0 ? 1 : -1) + (Math.random() * 2 - 1) * jitter * 0.4;
      return Math.max(0.14, Math.min(0.86, v));
    }
    if (orientation === "portrait") {
      points.push({ x: 0.5, y: 0.06 });
      for (var i = 1; i <= turns; i++) {
        points.push({ x: jitterAt(i), y: 0.06 + segW * i });
      }
      points.push({ x: 0.5, y: 0.94 });
    } else {
      points.push({ x: 0.06, y: 0.5 });
      for (var j = 1; j <= turns; j++) {
        points.push({ x: 0.06 + segW * j, y: jitterAt(j) });
      }
      points.push({ x: 0.94, y: 0.5 });
    }
    return points;
  }

  function pickBackground() {
    var choices = BACKGROUNDS.filter(function (k) { return k !== state.bgKey; });
    return choices[Math.floor(Math.random() * choices.length)];
  }
  function loadBackground(key, cb) {
    var img = new Image();
    img.onload = function () { cb(img); };
    img.onerror = function () { cb(null); };
    img.src = "/static/img/operation_bg/" + key + ".jpg";
  }

  // ---------------- layout ----------------
  function availableSpace() {
    return {
      w: center.clientWidth,
      h: window.innerHeight - stage.getBoundingClientRect().top - 20
    };
  }

  // Bias toward the previously-chosen shape on near-square leftover space so
  // a tiny viewport wobble doesn't flip orientation back and forth.
  function decideOrientation() {
    var space = availableSpace();
    return space.w > space.h * 1.15 ? "landscape" : "portrait";
  }

  function fitCanvas() {
    var space = availableSpace();
    var aspect = state.orientation === "portrait" ? 2 / 3 : 3 / 2;
    var displayWidth = Math.min(space.w, space.h * aspect);
    displayWidth = Math.max(260, displayWidth);
    var displayHeight = displayWidth / aspect;
    var dpr = window.devicePixelRatio || 1;
    stage.style.width = displayWidth + "px";
    canvas.style.width = displayWidth + "px";
    canvas.style.height = displayHeight + "px";
    canvas.width = Math.round(displayWidth * dpr);
    canvas.height = Math.round(displayHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.displayWidth = displayWidth;
    state.displayHeight = displayHeight;
    recomputePathPx();
  }

  function recomputePathPx() {
    state.pathPx = state.pathNorm.map(function (p) {
      return { x: p.x * state.displayWidth, y: p.y * state.displayHeight };
    });
    var d = DIFFS[state.difficulty];
    state.pathWidthPx = d.widthFrac * state.displayHeight;
    if (!state.dragging) {
      state.cursor = { x: state.pathPx[0].x, y: state.pathPx[0].y };
    }
  }

  // ---------------- geometry ----------------
  function distToSegment(p, a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    var t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }
  function distToPath(p) {
    var min = Infinity;
    for (var i = 0; i < state.pathPx.length - 1; i++) {
      var d = distToSegment(p, state.pathPx[i], state.pathPx[i + 1]);
      if (d < min) min = d;
    }
    return min;
  }

  // ---------------- drawing ----------------
  function drawCoverImage(img) {
    var w = state.displayWidth, h = state.displayHeight;
    if (!img) { ctx.fillStyle = "#DCEBFF"; ctx.fillRect(0, 0, w, h); return; }
    var scale = Math.max(w / img.width, h / img.height);
    var dw = img.width * scale, dh = img.height * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }

  function strokePath(width, color) {
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (var i = 0; i < state.pathPx.length; i++) {
      var p = state.pathPx[i];
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  function drawCross(cx, cy, size, color) {
    ctx.fillStyle = color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(2, size * 0.12);
    var arm = size * 0.32, len = size;
    ctx.beginPath();
    ctx.rect(cx - arm / 2, cy - len / 2, arm, len);
    ctx.rect(cx - len / 2, cy - arm / 2, len, arm);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - arm / 2, cy - len / 2); ctx.lineTo(cx + arm / 2, cy - len / 2);
    ctx.lineTo(cx + arm / 2, cy - arm / 2); ctx.lineTo(cx + len / 2, cy - arm / 2);
    ctx.lineTo(cx + len / 2, cy + arm / 2); ctx.lineTo(cx + arm / 2, cy + arm / 2);
    ctx.lineTo(cx + arm / 2, cy + len / 2); ctx.lineTo(cx - arm / 2, cy + len / 2);
    ctx.lineTo(cx - arm / 2, cy + arm / 2); ctx.lineTo(cx - len / 2, cy + arm / 2);
    ctx.lineTo(cx - len / 2, cy - arm / 2); ctx.lineTo(cx - arm / 2, cy - arm / 2);
    ctx.closePath();
    ctx.stroke();
  }

  function draw() {
    var w = state.displayWidth, h = state.displayHeight;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    drawCoverImage(state.bgImage);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(0, 0, w, h);

    var ink = Math.max(3, state.pathWidthPx * 0.14);
    strokePath(state.pathWidthPx + ink * 2, INK);
    strokePath(state.pathWidthPx, "rgba(255,255,255,0.92)");

    ctx.lineWidth = ink * 0.7;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    for (var i = 0; i < state.pathPx.length; i++) {
      var p = state.pathPx[i];
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    var startPt = state.pathPx[0];
    ctx.fillStyle = "#1FCFC0";
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(2, state.pathWidthPx * 0.12);
    ctx.beginPath();
    ctx.arc(startPt.x, startPt.y, state.pathWidthPx * 0.32, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    var endPt = state.pathPx[state.pathPx.length - 1];
    drawCross(endPt.x, endPt.y, state.pathWidthPx * 0.7, "#FF5D73");

    ctx.fillStyle = "#FFC93C";
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(2, state.pathWidthPx * 0.1);
    ctx.beginPath();
    ctx.arc(state.cursor.x, state.cursor.y, state.pathWidthPx * 0.28, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    if (Date.now() < state.flashUntil) {
      ctx.fillStyle = "rgba(232,56,79,0.35)";
      ctx.fillRect(0, 0, w, h);
    }
  }

  var rafHandle = null;
  function tick() {
    draw();
    rafHandle = requestAnimationFrame(tick);
  }

  // ---------------- timer / hud ----------------
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
    var mm = Math.floor(totalSec / 60), ss = totalSec % 60;
    hudTime.textContent = (mm < 10 ? "0" + mm : mm) + ":" + (ss < 10 ? "0" + ss : ss);
  }
  function updateHud() {
    hudLives.textContent = state.livesLeft + " / " + MAX_LIVES;
  }

  // ---------------- game flow ----------------
  function newGame(difficulty) {
    if (difficulty) state.difficulty = difficulty;
    state.orientation = decideOrientation();
    var d = DIFFS[state.difficulty];
    state.pathNorm = generatePathNorm(d.turns, d.jitter, state.orientation);
    state.livesLeft = MAX_LIVES;
    state.solved = false;
    state.lost = false;
    state.dragging = false;
    state.wasInside = true;
    state.flashUntil = 0;
    stopTimer();
    state.startTime = null;
    hudTime.textContent = "00:00";
    updateHud();
    resultOverlay.hidden = true;
    fitCanvas();

    var key = pickBackground();
    state.bgKey = key;
    loadBackground(key, function (img) { state.bgImage = img; });
  }

  function loseLife() {
    state.livesLeft--;
    updateHud();
    state.flashUntil = Date.now() + 220;
    stage.classList.remove("shake");
    void stage.offsetWidth;
    stage.classList.add("shake");
    if (state.livesLeft <= 0) {
      state.lost = true;
      state.dragging = false;
      setTimeout(function () { showResult(false); }, 350);
    }
  }

  function showResult(won) {
    resultOverlay.hidden = false;
    var elapsed = state.startTime ? Date.now() - state.startTime : 0;
    var totalSec = Math.floor(elapsed / 1000);
    var mm = Math.floor(totalSec / 60), ss = totalSec % 60;
    var timeStr = (mm < 10 ? "0" + mm : mm) + ":" + (ss < 10 ? "0" + ss : ss);

    if (won) {
      resultArt.src = "/static/img/art/win.jpg";
      resultArt.alt = "成功！";
      resultMsg.textContent = "用時 " + timeStr + " · 剩 " + state.livesLeft + " 命 · 計分緊…";
    } else {
      resultArt.src = "/static/img/art/lose.jpg";
      resultArt.alt = "下次一定得！";
      resultMsg.textContent = "用時 " + timeStr;
    }

    fetch("/api/operation/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        difficulty: state.difficulty, seconds: totalSec,
        lives_left: state.livesLeft, won: won
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!won) return;
        var text = "用時 " + timeStr + " · 剩 " + state.livesLeft + " 命 · +" + data.points_awarded + " 分";
        if (data.new_badges && data.new_badges.length) text += " · 新徽章 " + data.new_badges.join(" ");
        resultMsg.textContent = text;
        var chip = document.querySelector(".points-chip");
        if (chip && typeof data.total_points === "number") chip.textContent = "⭐ " + data.total_points;
      })
      .catch(function () {});
  }

  function win() {
    if (state.solved) return;
    state.solved = true;
    state.dragging = false;
    stopTimer();
    showResult(true);
  }

  // ---------------- input ----------------
  function getPos(e) {
    var rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  canvas.addEventListener("pointerdown", function (e) {
    if (state.solved || state.lost) return;
    canvas.setPointerCapture(e.pointerId);
    var p = getPos(e);
    var grabR = state.pathWidthPx * 0.9;
    var dCursor = Math.hypot(p.x - state.cursor.x, p.y - state.cursor.y);
    if (dCursor <= grabR) {
      state.dragging = true;
    }
  });

  canvas.addEventListener("pointermove", function (e) {
    if (!state.dragging || state.solved || state.lost) return;
    var p = getPos(e);
    state.cursor = p;
    startTimerIfNeeded();

    var dist = distToPath(p);
    var half = state.pathWidthPx / 2;
    if (dist > half) {
      if (state.wasInside) {
        state.wasInside = false;
        loseLife();
      }
    } else {
      state.wasInside = true;
    }

    if (!state.lost) {
      var endPt = state.pathPx[state.pathPx.length - 1];
      if (dist <= half && Math.hypot(p.x - endPt.x, p.y - endPt.y) <= state.pathWidthPx * 0.6) {
        win();
      }
    }
  });

  function endPointer() { state.dragging = false; }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);

  // ---------------- toolbar ----------------
  document.querySelectorAll("[data-difficulty]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("[data-difficulty]").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      newGame(btn.getAttribute("data-difficulty"));
    });
  });
  document.getElementById("btnNewPath").addEventListener("click", function () { newGame(); });
  btnPlayAgain.addEventListener("click", function () { newGame(); });

  // Rotating the device changes which shape (wide vs tall) best fills the
  // screen. Re-decide on every viewport change, not just at newGame(), so
  // landscape always gets a wide path instead of the portrait path just
  // getting rescaled down to fit a shorter landscape height.
  var viewportDebounce = null;
  function handleViewportChange() {
    clearTimeout(viewportDebounce);
    viewportDebounce = setTimeout(function () {
      var orientation = decideOrientation();
      if (orientation !== state.orientation && !state.dragging) {
        state.orientation = orientation;
        var d = DIFFS[state.difficulty];
        state.pathNorm = generatePathNorm(d.turns, d.jitter, orientation);
        state.livesLeft = MAX_LIVES;
        state.solved = false;
        state.lost = false;
        state.wasInside = true;
        stopTimer();
        state.startTime = null;
        hudTime.textContent = "00:00";
        updateHud();
        resultOverlay.hidden = true;
      }
      fitCanvas();
    }, 120);
  }
  window.addEventListener("resize", handleViewportChange);
  window.addEventListener("orientationchange", handleViewportChange);

  newGame("medium");
  rafHandle = requestAnimationFrame(tick);
})();
