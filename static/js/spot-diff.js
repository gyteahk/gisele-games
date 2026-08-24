(function () {
  "use strict";

  var MAX_STRIKES = 3;

  var frameA = document.getElementById("frameA");
  var frameB = document.getElementById("frameB");
  var imgA = document.getElementById("imgA");
  var imgB = document.getElementById("imgB");
  var levelLabel = document.getElementById("levelLabel");
  var hudFound = document.getElementById("hudFound");
  var hudStrikes = document.getElementById("hudStrikes");
  var btnNewLevel = document.getElementById("btnNewLevel");
  var resultOverlay = document.getElementById("resultOverlay");
  var resultArt = document.getElementById("resultArt");
  var resultMsg = document.getElementById("resultMsg");
  var btnPlayAgain = document.getElementById("btnPlayAgain");

  var state = {
    level: null,
    found: [],
    strikesLeft: MAX_STRIKES,
    over: false
  };

  function pickLevel() {
    var list = (typeof SPOT_LEVELS !== "undefined" && SPOT_LEVELS.length) ? SPOT_LEVELS : [];
    if (!list.length) return null;
    var choice = list[Math.floor(Math.random() * list.length)];
    if (state.level && choice.key === state.level.key && list.length > 1) return pickLevel();
    return choice;
  }

  function updateHud() {
    hudFound.textContent = state.found.length + " / " + state.level.diffs.length;
    hudStrikes.textContent = state.strikesLeft + " / " + MAX_STRIKES;
  }

  function clearMarkers() {
    [frameA, frameB].forEach(function (frame) {
      var markers = frame.querySelectorAll(".spot-marker");
      markers.forEach(function (m) { m.remove(); });
    });
  }

  function addMarker(frame, x, y, kind, label) {
    var el = document.createElement("div");
    el.className = "spot-marker " + kind;
    el.style.left = (x * 100) + "%";
    el.style.top = (y * 100) + "%";
    if (label) el.textContent = label;
    frame.appendChild(el);
  }

  function markFound(idx) {
    var d = state.level.diffs[idx];
    addMarker(frameA, d.x, d.y, "found", "✓");
    addMarker(frameB, d.x, d.y, "found", "✓");
  }

  function newRound() {
    state.level = pickLevel();
    if (!state.level) return;
    state.found = [];
    state.strikesLeft = MAX_STRIKES;
    state.over = false;
    resultOverlay.hidden = true;
    clearMarkers();
    imgA.src = state.level.imgA;
    imgB.src = state.level.imgB;
    levelLabel.innerHTML = "本鋪主題：<b>" + state.level.label + "</b> · 揾5個唔同";
    updateHud();
  }

  function showResult(won) {
    resultOverlay.hidden = false;
    if (won) {
      resultArt.src = "/static/img/art/win.jpg";
      resultArt.alt = "揾晒喇！";
      resultMsg.textContent = "全部揾到喇！剩返 " + state.strikesLeft + " 次機會 · 計分緊…";
    } else {
      resultArt.src = "/static/img/art/lose.jpg";
      resultArt.alt = "下次一定得！";
      resultMsg.textContent = "機會用晒喇，再嚟一關！";
    }

    fetch("/api/spot-diff/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        level_key: state.level.key, strikes_left: state.strikesLeft, won: won
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!won) return;
        var text = resultMsg.textContent.replace("計分緊…", "+" + data.points_awarded + " 分");
        if (data.new_badges && data.new_badges.length) text += " · 新徽章 " + data.new_badges.join(" ");
        resultMsg.textContent = text;
        var chip = document.querySelector(".points-chip");
        if (chip && typeof data.total_points === "number") chip.textContent = "⭐ " + data.total_points;
      })
      .catch(function () {});
  }

  function handleTap(frame, evt) {
    if (state.over) return;
    var rect = frame.getBoundingClientRect();
    var clientX = evt.touches ? evt.changedTouches[0].clientX : evt.clientX;
    var clientY = evt.touches ? evt.changedTouches[0].clientY : evt.clientY;
    var nx = (clientX - rect.left) / rect.width;
    var ny = (clientY - rect.top) / rect.height;

    var diffs = state.level.diffs;
    var hitIdx = -1;
    for (var i = 0; i < diffs.length; i++) {
      if (state.found.indexOf(i) !== -1) continue;
      var d = diffs[i];
      var dist = Math.hypot(nx - d.x, ny - d.y);
      if (dist <= d.r + 0.02) { hitIdx = i; break; }
    }

    if (hitIdx !== -1) {
      state.found.push(hitIdx);
      markFound(hitIdx);
      updateHud();
      if (state.found.length >= diffs.length) {
        state.over = true;
        setTimeout(function () { showResult(true); }, 350);
      }
    } else {
      addMarker(frame, nx, ny, "miss", "✕");
      state.strikesLeft--;
      updateHud();
      frame.classList.remove("shake");
      void frame.offsetWidth;
      frame.classList.add("shake");
      if (state.strikesLeft <= 0) {
        state.over = true;
        setTimeout(function () { showResult(false); }, 350);
      }
    }
  }

  frameA.addEventListener("click", function (e) { handleTap(frameA, e); });
  frameB.addEventListener("click", function (e) { handleTap(frameB, e); });

  btnNewLevel.addEventListener("click", newRound);
  btnPlayAgain.addEventListener("click", newRound);

  newRound();
})();
