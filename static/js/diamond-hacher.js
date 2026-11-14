(function () {
  "use strict";

  var GOAL = 10;
  var PURSE_START = 20;
  var POSES = {
    watching: "/static/img/diamond_hacher/watching.jpg",
    distracted: "/static/img/diamond_hacher/distracted.jpg",
    angry: "/static/img/diamond_hacher/angry.jpg",
    caught: "/static/img/diamond_hacher/caught.jpg"
  };
  var LINES = {
    watching: "我睇實啦！唔准偷！",
    distracted: "啦啦啦～鑽石好閃呀",
    angry: "哼！還我鑽石！",
    caught: "捉到你啦！嘿嘿！"
  };

  var statusEl = document.getElementById("dhStatus");
  var bubbleEl = document.getElementById("dhBubble");
  var girlEl = document.getElementById("dhGirl");
  var girlFrame = document.getElementById("dhGirlFrame");
  var purseLeftEl = document.getElementById("purseLeft");
  var startOverlay = document.getElementById("startOverlay");
  var resultOverlay = document.getElementById("resultOverlay");
  var resultTitle = document.getElementById("resultTitle");
  var resultMsg = document.getElementById("resultMsg");
  var countEl = document.getElementById("dhCount");
  var btnStart = document.getElementById("btnStart");
  var btnPlayAgain = document.getElementById("btnPlayAgain");
  var btnP1 = document.getElementById("btnP1");
  var btnP2 = document.getElementById("btnP2");
  var gemsP1 = document.getElementById("gemsP1");
  var gemsP2 = document.getElementById("gemsP2");
  var countP1 = document.getElementById("countP1");
  var countP2 = document.getElementById("countP2");

  var state = {
    phase: "idle",
    scores: { p1: 0, p2: 0 },
    purse: PURSE_START,
    stolenThisWindow: false,
    frozen: { p1: false, p2: false },
    timer: null,
    freezeTimers: { p1: null, p2: null },
    lastStealAt: { p1: 0, p2: 0 }
  };

  Object.keys(POSES).forEach(function (key) {
    var img = new Image();
    img.src = POSES[key];
  });

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function clearTimer() {
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  }

  function bump(el, className) {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  }

  function setPose(pose) {
    girlEl.src = POSES[pose];
    bubbleEl.textContent = LINES[pose];
  }

  function syncButtons() {
    var waiting = state.phase === "idle" || state.phase === "countdown" || state.phase === "over";
    document.body.classList.toggle("dh-can-steal", state.phase === "distracted");
    [btnP1, btnP2].forEach(function (btn) {
      var player = btn.dataset.player;
      btn.classList.toggle("is-wait", waiting);
      btn.setAttribute("aria-disabled", waiting || state.frozen[player] ? "true" : "false");
    });
  }

  function renderGems(container, score, popLast) {
    container.innerHTML = "";
    for (var i = 0; i < GOAL; i++) {
      var gem = document.createElement("span");
      gem.className = "dh-gem" + (i < score ? " filled" : "");
      if (popLast && i === score - 1) gem.className += " pop";
      container.appendChild(gem);
    }
  }

  function renderScores(popPlayer) {
    countP1.textContent = String(state.scores.p1);
    countP2.textContent = String(state.scores.p2);
    purseLeftEl.textContent = String(state.purse);
    renderGems(gemsP1, state.scores.p1, popPlayer === "p1");
    renderGems(gemsP2, state.scores.p2, popPlayer === "p2");
  }

  function setStatus(kind, text) {
    statusEl.className = "dh-status " + kind;
    statusEl.textContent = text;
  }

  function freezePlayer(player) {
    state.frozen[player] = true;
    var btn = player === "p1" ? btnP1 : btnP2;
    btn.classList.add("frozen");
    var action = btn.querySelector(".dh-steal-action");
    action.textContent = "被捉住！";
    syncButtons();
    if (state.freezeTimers[player]) clearTimeout(state.freezeTimers[player]);
    state.freezeTimers[player] = setTimeout(function () {
      state.frozen[player] = false;
      btn.classList.remove("frozen");
      action.textContent = "偷鑽石！";
      syncButtons();
    }, 1300);
  }

  function goWatching() {
    if (state.phase === "over") return;
    state.phase = "watching";
    state.stolenThisWindow = false;
    setPose("watching");
    setStatus("watching", "👀 佢睇緊！唔好撳！");
    syncButtons();
    clearTimer();
    state.timer = setTimeout(goDistracted, rand(1300, 2600));
  }

  function goDistracted() {
    if (state.phase === "over") return;
    state.phase = "distracted";
    state.stolenThisWindow = false;
    setPose("distracted");
    setStatus("distracted", "✨ 快啲偷！佢唔見！");
    bump(girlFrame, "pop");
    syncButtons();
    clearTimer();
    state.timer = setTimeout(goWatching, rand(800, 1700));
  }

  function finishGame(winner) {
    state.phase = "over";
    clearTimer();
    syncButtons();
    setPose("angry");
    setStatus("react", "🎉 " + (winner === "p1" ? "玩家 1" : "玩家 2") + " 偷夠 10 粒！");
    resultTitle.textContent = (winner === "p1" ? "玩家 1" : "玩家 2") + " 贏咗！";
    resultMsg.textContent = "玩家 1  " + state.scores.p1 + " 粒  ·  玩家 2  " + state.scores.p2 + " 粒　計分緊…";
    resultOverlay.hidden = false;

    fetch("/api/diamond-hacher/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        winner: winner,
        p1_score: state.scores.p1,
        p2_score: state.scores.p2
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var text = "玩家 1  " + state.scores.p1 + " 粒  ·  玩家 2  " + state.scores.p2 + " 粒";
        if (typeof data.points_awarded === "number") text += "　+" + data.points_awarded + " 分";
        if (data.new_badges && data.new_badges.length) text += " · 新徽章 " + data.new_badges.join(" ");
        resultMsg.textContent = text;
        var chip = document.querySelector(".points-chip");
        if (chip && typeof data.total_points === "number") chip.textContent = "⭐ " + data.total_points;
      })
      .catch(function () {
        resultMsg.textContent = "玩家 1  " + state.scores.p1 + " 粒  ·  玩家 2  " + state.scores.p2 + " 粒";
      });
  }

  function trySteal(player) {
    if (state.phase !== "watching" && state.phase !== "distracted") return;
    if (state.frozen[player]) return;
    var now = Date.now();
    if (now - state.lastStealAt[player] < 180) return;
    state.lastStealAt[player] = now;

    if (state.phase === "distracted") {
      if (state.stolenThisWindow) return;
      if (state.purse <= 0) return;
      state.stolenThisWindow = true;
      state.scores[player] += 1;
      state.purse -= 1;
      renderScores(player);
      setPose("angry");
      setStatus("react", player === "p1" ? "💎 玩家 1 偷到一粒！" : "💎 玩家 2 偷到一粒！");
      bump(girlFrame, "pop");
      if (state.scores[player] >= GOAL) {
        finishGame(player);
        return;
      }
      state.phase = "react";
      syncButtons();
      clearTimer();
      state.timer = setTimeout(goWatching, 700);
      return;
    }

    // Watching / reacting: she catches you.
    if (state.scores[player] > 0) {
      state.scores[player] -= 1;
      state.purse += 1;
    }
    renderScores();
    setPose("caught");
    setStatus("react", player === "p1" ? "😈 玩家 1 被捉住！" : "😈 玩家 2 被捉住！");
    bump(girlFrame, "shake");
    freezePlayer(player);
    state.phase = "react";
    clearTimer();
    state.timer = setTimeout(goWatching, 900);
  }

  function bindSteal(btn, player) {
    function fire(e) {
      if (e.button && e.button !== 0) return;
      trySteal(player);
    }
    btn.addEventListener("pointerdown", fire);
    btn.addEventListener("click", fire);
    btn.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  }

  function runCountdown(then) {
    state.phase = "countdown";
    syncButtons();
    var steps = ["3", "2", "1", "偷！"];
    var i = 0;
    countEl.hidden = false;
    function tick() {
      countEl.textContent = steps[i];
      bump(countEl, "pop");
      i += 1;
      if (i < steps.length) {
        setTimeout(tick, 700);
      } else {
        setTimeout(function () {
          countEl.hidden = true;
          then();
        }, 450);
      }
    }
    tick();
  }

  function resetMatch() {
    clearTimer();
    ["p1", "p2"].forEach(function (p) {
      if (state.freezeTimers[p]) clearTimeout(state.freezeTimers[p]);
      state.frozen[p] = false;
    });
    btnP1.classList.remove("frozen");
    btnP2.classList.remove("frozen");
    btnP1.querySelector(".dh-steal-action").textContent = "偷鑽石！";
    btnP2.querySelector(".dh-steal-action").textContent = "偷鑽石！";
    state.scores = { p1: 0, p2: 0 };
    state.purse = PURSE_START;
    state.stolenThisWindow = false;
    renderScores();
    setPose("watching");
    setStatus("watching", "👀 準備…");
    syncButtons();
  }

  function startMatch() {
    startOverlay.hidden = true;
    resultOverlay.hidden = true;
    resetMatch();
    runCountdown(goWatching);
  }

  bindSteal(btnP1, "p1");
  bindSteal(btnP2, "p2");

  document.addEventListener("keydown", function (e) {
    if (e.repeat) return;
    if (e.code === "KeyA" || e.code === "KeyQ") trySteal("p1");
    if (e.code === "KeyL" || e.code === "KeyP") trySteal("p2");
  });

  btnStart.addEventListener("click", startMatch);
  btnPlayAgain.addEventListener("click", startMatch);

  renderScores();
  syncButtons();
})();
