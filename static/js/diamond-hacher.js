(function () {
  "use strict";

  var GOAL = 10;
  var POSES = {
    watching: "/static/img/diamond_hacher/watching.png",
    distracted: "/static/img/diamond_hacher/distracted.png",
    angry: "/static/img/diamond_hacher/angry.png",
    caught: "/static/img/diamond_hacher/caught.png"
  };
  var LINES = {
    idle: "我嘅鑽石～唔准偷！",
    dropGem: "哎呀手袋漏咗一粒！",
    dropRock: "咦？跌咗啲咩出嚟…",
    steal: "哼！還我鑽石！",
    notice: "呢件係我嘅！",
    grabGem: "嘿嘿，執返啦！",
    grabRock: "哼，原來係石頭！",
    tapRock: "哈哈，你撳咗石頭！"
  };

  var scene = document.getElementById("dhScene");
  var fallEl = document.getElementById("dhFall");
  var girlEl = document.getElementById("dhGirl");
  var girlFrame = document.getElementById("dhGirlFrame");
  var girlWrap = document.getElementById("dhGirlWrap");
  var bubbleEl = document.getElementById("dhBubble");
  var handEl = document.getElementById("dhHand");
  var startOverlay = document.getElementById("startOverlay");
  var resultOverlay = document.getElementById("resultOverlay");
  var resultArt = document.getElementById("resultArt");
  var resultTitle = document.getElementById("resultTitle");
  var resultMsg = document.getElementById("resultMsg");
  var countEl = document.getElementById("dhCount");
  var gemsYou = document.getElementById("gemsYou");
  var gemsGirl = document.getElementById("gemsGirl");
  var countYou = document.getElementById("countYou");
  var countGirl = document.getElementById("countGirl");

  var state = {
    phase: "idle",
    scores: { player: 0, hacher: 0 },
    item: null,
    noticing: false,
    raf: 0,
    lastTs: 0,
    spawnAt: 0,
    poseTimer: 0
  };

  Object.keys(POSES).forEach(function (key) {
    var img = new Image();
    img.src = POSES[key];
  });

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function bump(el, className) {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  }

  function setPose(pose, line) {
    girlEl.src = POSES[pose];
    if (line) bubbleEl.textContent = line;
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

  function renderScores(who) {
    countYou.textContent = String(state.scores.player);
    countGirl.textContent = String(state.scores.hacher);
    renderGems(gemsYou, state.scores.player, who === "player");
    renderGems(gemsGirl, state.scores.hacher, who === "hacher");
  }

  function placeItem(it) {
    it.el.style.left = it.x + "%";
    it.el.style.top = it.y + "%";
  }

  function spawnItem(now) {
    if (state.phase !== "play" || state.item) return;
    var isRock = Math.random() < 0.32;
    var slow = Math.random() < 0.5;
    var el = document.createElement("button");
    el.type = "button";
    el.className = "dh-item" + (isRock ? " rock" : " gem");
    el.setAttribute("aria-label", isRock ? "石頭，唔好撳" : "偷呢粒鑽石");
    el.innerHTML = isRock
      ? '<span class="dh-rock-shape"></span>'
      : '<span class="dh-gem-shape"></span>';
    fallEl.appendChild(el);

    var noticeIn = slow ? rand(1800, 3000) : rand(800, 1400);
    var it = {
      el: el,
      kind: isRock ? "rock" : "diamond",
      x: rand(46, 62),
      y: 36,
      vx: rand(-4, 6),
      vy: rand(14, 20),
      landed: false,
      noticeAt: now + noticeIn,
      grabAt: now + noticeIn + rand(450, 750),
      claimed: false
    };
    el.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      e.stopPropagation();
      tapItem(it);
    });
    el.addEventListener("click", function (e) {
      e.preventDefault();
      tapItem(it);
    });
    state.item = it;
    state.noticing = false;
    placeItem(it);
    girlWrap.classList.add("dropping");
    setTimeout(function () { girlWrap.classList.remove("dropping"); }, 360);
    setPose("distracted", isRock ? LINES.dropRock : LINES.dropGem);
    bump(girlFrame, "pop");
  }

  function removeItem(it) {
    if (it.el && it.el.parentNode) it.el.parentNode.removeChild(it.el);
    if (state.item === it) state.item = null;
    state.noticing = false;
    handEl.hidden = true;
  }

  function afterItem(now, delay) {
    clearTimeout(state.poseTimer);
    state.poseTimer = setTimeout(function () {
      if (state.phase !== "play") return;
      setPose("watching", LINES.idle);
    }, 700);
    state.spawnAt = (now || performance.now()) + delay;
  }

  function score(who) {
    state.scores[who] += 1;
    renderScores(who);
    if (state.scores[who] >= GOAL) finishGame(who);
  }

  function flyAway(it, toX, toY) {
    it.el.classList.add("claimed");
    it.el.style.left = toX;
    it.el.style.top = toY;
    it.el.style.opacity = "0";
    it.el.style.transform = "translate(-50%, -50%) scale(0.2)";
    setTimeout(function () { removeItem(it); }, 380);
  }

  function tapItem(it) {
    if (state.phase !== "play" || !it || it.claimed) return;
    it.claimed = true;
    it.el.classList.remove("noticed");
    if (it.kind === "diamond") {
      setPose("angry", LINES.steal);
      bump(girlFrame, "shake");
      flyAway(it, "10%", "10%");
      score("player");
      afterItem(performance.now(), 1100);
      return;
    }
    setPose("caught", LINES.tapRock);
    bump(girlFrame, "pop");
    flyAway(it, "50%", "55%");
    afterItem(performance.now(), 1300);
  }

  function girlGrab(it) {
    if (state.phase !== "play" || !it || it.claimed) return;
    it.claimed = true;
    it.el.classList.remove("noticed");
    if (it.kind === "diamond") {
      setPose("caught", LINES.grabGem);
      bump(girlFrame, "pop");
      flyAway(it, "50%", "42%");
      score("hacher");
      afterItem(performance.now(), 1100);
      return;
    }
    setPose("angry", LINES.grabRock);
    bump(girlFrame, "shake");
    flyAway(it, "50%", "42%");
    afterItem(performance.now(), 1300);
  }

  function updateHand(it) {
    if (!it || it.claimed || !state.noticing) {
      handEl.hidden = true;
      return;
    }
    handEl.hidden = false;
    var rect = scene.getBoundingClientRect();
    var girlRect = girlFrame.getBoundingClientRect();
    var gx = ((girlRect.left + girlRect.width * 0.62) - rect.left) / rect.width * 100;
    var gy = ((girlRect.top + girlRect.height * 0.55) - rect.top) / rect.height * 100;
    handEl.style.left = gx + (it.x - gx) * 0.55 + "%";
    handEl.style.top = gy + (it.y - gy) * 0.55 + "%";
  }

  function updateItem(now, dt) {
    var it = state.item;
    if (!it || it.claimed) {
      handEl.hidden = true;
      return;
    }
    if (!it.landed) {
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      if (it.x < 28) { it.x = 28; it.vx = Math.abs(it.vx); }
      if (it.x > 78) { it.x = 78; it.vx = -Math.abs(it.vx); }
      if (it.y >= 78) {
        it.y = 78;
        it.landed = true;
        it.vx = 0;
        it.vy = 0;
      }
      placeItem(it);
    }
    if (!state.noticing && now >= it.noticeAt) {
      state.noticing = true;
      it.el.classList.add("noticed");
      setPose("watching", LINES.notice);
    }
    if (now >= it.grabAt) girlGrab(it);
    updateHand(it);
  }

  function loop(ts) {
    if (state.phase !== "play") return;
    if (!state.lastTs) state.lastTs = ts;
    var dt = Math.min(0.05, (ts - state.lastTs) / 1000);
    state.lastTs = ts;
    updateItem(ts, dt);
    if (state.phase !== "play") return;
    if (!state.item && ts >= state.spawnAt) spawnItem(ts);
    state.raf = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
  }

  function finishGame(winner) {
    if (state.phase === "over") return;
    state.phase = "over";
    stopLoop();
    handEl.hidden = true;
    if (state.item) removeItem(state.item);
    var playerWon = winner === "player";
    setPose(playerWon ? "angry" : "caught", playerWon ? LINES.steal : LINES.grabGem);
    resultArt.src = playerWon ? "/static/img/art/win.jpg" : "/static/img/art/lose.jpg";
    resultArt.alt = playerWon ? "贏咗！" : "下次一定得！";
    resultTitle.textContent = playerWon ? "你贏咗！" : "Hacher 贏咗！";
    resultMsg.textContent = "你  " + state.scores.player + " 粒  ·  Hacher  " + state.scores.hacher + " 粒　計分緊…";
    resultOverlay.hidden = false;

    fetch("/api/diamond-hacher/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        winner: winner,
        player_score: state.scores.player,
        hacher_score: state.scores.hacher
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var text = "你  " + state.scores.player + " 粒  ·  Hacher  " + state.scores.hacher + " 粒";
        if (typeof data.points_awarded === "number") text += "　+" + data.points_awarded + " 分";
        if (data.new_badges && data.new_badges.length) text += " · 新徽章 " + data.new_badges.join(" ");
        resultMsg.textContent = text;
        var chip = document.querySelector(".points-chip");
        if (chip && typeof data.total_points === "number") chip.textContent = "⭐ " + data.total_points;
      })
      .catch(function () {
        resultMsg.textContent = "你  " + state.scores.player + " 粒  ·  Hacher  " + state.scores.hacher + " 粒";
      });
  }

  function runCountdown(then) {
    var steps = ["3", "2", "1", "偷！"];
    var i = 0;
    countEl.hidden = false;
    function tick() {
      countEl.textContent = steps[i];
      bump(countEl, "pop");
      i += 1;
      if (i < steps.length) {
        setTimeout(tick, 650);
      } else {
        setTimeout(function () {
          countEl.hidden = true;
          then();
        }, 400);
      }
    }
    tick();
  }

  function resetMatch() {
    stopLoop();
    clearTimeout(state.poseTimer);
    handEl.hidden = true;
    fallEl.innerHTML = "";
    state.scores = { player: 0, hacher: 0 };
    state.item = null;
    state.noticing = false;
    state.lastTs = 0;
    renderScores();
    setPose("watching", LINES.idle);
  }

  function startPlay() {
    state.phase = "play";
    setPose("distracted", LINES.idle);
    state.spawnAt = performance.now() + 400;
    state.lastTs = 0;
    state.raf = requestAnimationFrame(loop);
  }

  function startMatch() {
    startOverlay.hidden = true;
    resultOverlay.hidden = true;
    resetMatch();
    state.phase = "countdown";
    runCountdown(startPlay);
  }

  document.getElementById("btnStart").addEventListener("click", startMatch);
  document.getElementById("btnPlayAgain").addEventListener("click", startMatch);

  renderScores();
})();
