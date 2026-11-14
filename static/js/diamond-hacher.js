(function () {
  "use strict";

  var GOAL = 10;
  var MAX_LIVE = 3;
  var POSES = {
    watching: "/static/img/diamond_hacher/watching.jpg",
    distracted: "/static/img/diamond_hacher/distracted.jpg",
    angry: "/static/img/diamond_hacher/angry.jpg",
    caught: "/static/img/diamond_hacher/caught.jpg"
  };
  var LINES = {
    idle: "啦啦啦～鑽石好閃呀",
    drop: "哎呀手袋漏咗！",
    steal: "哼！還我鑽石！",
    notice: "呢粒係我嘅！",
    grab: "嘿嘿，執返啦！"
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
    gems: [],
    noticing: null,
    nextId: 1,
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

  function liveCount() {
    var n = 0;
    for (var i = 0; i < state.gems.length; i++) if (!state.gems[i].claimed) n++;
    return n;
  }

  function placeGem(g) {
    g.el.style.left = g.x + "%";
    g.el.style.top = g.y + "%";
  }

  function spawnDiamond(now) {
    if (state.phase !== "play") return;
    if (liveCount() >= MAX_LIVE) return;
    var el = document.createElement("button");
    el.type = "button";
    el.className = "dh-gem-fall";
    el.setAttribute("aria-label", "偷呢粒鑽石");
    el.innerHTML = '<span class="dh-gem-shape"></span>';
    fallEl.appendChild(el);

    var noticeIn = rand(700, 1500);
    var g = {
      id: state.nextId++,
      el: el,
      x: rand(28, 72),
      y: 34,
      vx: rand(-10, 10),
      vy: rand(20, 32),
      wobble: rand(0, Math.PI * 2),
      born: now,
      noticeAt: now + noticeIn,
      grabAt: now + noticeIn + rand(320, 520),
      claimed: null
    };
    el.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      e.stopPropagation();
      trySteal(g);
    });
    el.addEventListener("click", function (e) {
      e.preventDefault();
      trySteal(g);
    });
    state.gems.push(g);
    placeGem(g);
    girlWrap.classList.add("dropping");
    setTimeout(function () { girlWrap.classList.remove("dropping"); }, 360);
    if (state.noticing == null) setPose("distracted", LINES.drop);
    bump(girlFrame, "pop");
  }

  function flyAway(g, toX, toY, then) {
    g.el.classList.add("claimed");
    g.el.style.left = toX;
    g.el.style.top = toY;
    g.el.style.opacity = "0";
    g.el.style.transform = "translate(-50%, -50%) scale(0.2)";
    setTimeout(function () {
      if (g.el && g.el.parentNode) g.el.parentNode.removeChild(g.el);
      if (then) then();
    }, 360);
  }

  function award(who, g) {
    if (g.claimed || state.phase !== "play") return;
    g.claimed = who;
    if (state.noticing === g) {
      state.noticing = null;
      handEl.hidden = true;
    }
    g.el.classList.remove("noticed");
    state.scores[who] += 1;
    renderScores(who);

    if (who === "player") {
      setPose("angry", LINES.steal);
      bump(girlFrame, "shake");
      flyAway(g, "8%", "8%");
    } else {
      setPose("caught", LINES.grab);
      bump(girlFrame, "pop");
      flyAway(g, "50%", "16%");
    }
    clearTimeout(state.poseTimer);
    state.poseTimer = setTimeout(function () {
      if (state.phase === "play" && !state.noticing) setPose("distracted", LINES.idle);
    }, 650);

    if (state.scores[who] >= GOAL) finishGame(who);
  }

  function trySteal(g) {
    if (state.phase !== "play" || g.claimed) return;
    award("player", g);
  }

  function girlGrab(g) {
    if (state.phase !== "play" || g.claimed) return;
    award("hacher", g);
  }

  function updateHand(g) {
    if (!g || g.claimed) {
      handEl.hidden = true;
      return;
    }
    handEl.hidden = false;
    var rect = scene.getBoundingClientRect();
    var girlRect = girlFrame.getBoundingClientRect();
    var gx = ((girlRect.left + girlRect.width / 2) - rect.left) / rect.width * 100;
    var gy = ((girlRect.bottom) - rect.top) / rect.height * 100;
    var t = 0.72;
    handEl.style.left = gx + (g.x - gx) * t + "%";
    handEl.style.top = gy + (g.y - gy) * t + "%";
  }

  function updateDiamonds(now, dt) {
    var noticing = state.noticing;
    if (noticing && noticing.claimed) {
      state.noticing = null;
      noticing = null;
      handEl.hidden = true;
    }

    for (var i = 0; i < state.gems.length; i++) {
      var g = state.gems[i];
      if (g.claimed) continue;
      g.wobble += dt * 3;
      g.x += (g.vx + Math.sin(g.wobble) * 6) * dt;
      g.y += g.vy * dt;
      if (g.x < 10) { g.x = 10; g.vx = Math.abs(g.vx); }
      if (g.x > 90) { g.x = 90; g.vx = -Math.abs(g.vx); }
      placeGem(g);

      if (!noticing && now >= g.noticeAt) {
        noticing = g;
        state.noticing = g;
        g.el.classList.add("noticed");
        setPose("watching", LINES.notice);
      }

      if (now >= g.grabAt || g.y >= 88) {
        girlGrab(g);
      }
    }

    updateHand(state.noticing && !state.noticing.claimed ? state.noticing : null);

    state.gems = state.gems.filter(function (g) {
      return !g.claimed || g.el.parentNode;
    });
  }

  function loop(ts) {
    if (state.phase !== "play") return;
    if (!state.lastTs) state.lastTs = ts;
    var dt = Math.min(0.05, (ts - state.lastTs) / 1000);
    state.lastTs = ts;
    updateDiamonds(ts, dt);
    if (state.phase !== "play") return;
    if (ts >= state.spawnAt) {
      spawnDiamond(ts);
      state.spawnAt = ts + rand(750, 1400);
    }
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
    state.gems.forEach(function (g) {
      if (g.el && g.el.parentNode) g.el.parentNode.removeChild(g.el);
    });
    state.gems = [];
    var playerWon = winner === "player";
    setPose(playerWon ? "angry" : "caught", playerWon ? LINES.steal : LINES.grab);
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
    state.gems = [];
    state.noticing = null;
    state.lastTs = 0;
    renderScores();
    setPose("watching", "我嘅鑽石～唔准偷！");
  }

  function startPlay() {
    state.phase = "play";
    setPose("distracted", LINES.idle);
    state.spawnAt = performance.now();
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
