(function () {
  "use strict";

  var OPP_INFO = {
    easy: { name: "傻兔仔", avatar: "/static/img/ttt_avatars/easy_bunny.png" },
    medium: { name: "聰明狐狸", avatar: "/static/img/ttt_avatars/medium_fox.png" },
    hard: { name: "神級小龍", avatar: "/static/img/ttt_avatars/hard_dragon.png" }
  };

  var WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  var chooser = document.getElementById("tttChooser");
  var play = document.getElementById("tttPlay");
  var board = document.getElementById("tttBoard");
  var oppAvatar = document.getElementById("tttOppAvatar");
  var oppName = document.getElementById("tttOppName");
  var btnChangeOpp = document.getElementById("btnChangeOpp");
  var resultOverlay = document.getElementById("resultOverlay");
  var resultArt = document.getElementById("resultArt");
  var resultMsg = document.getElementById("resultMsg");
  var btnPlayAgain = document.getElementById("btnPlayAgain");

  var state = {
    difficulty: null,
    cells: new Array(9).fill(null),
    turn: "X",
    over: false,
    moves: 0
  };

  function checkWinner(cells) {
    for (var i = 0; i < WIN_LINES.length; i++) {
      var line = WIN_LINES[i];
      var a = cells[line[0]], b = cells[line[1]], c = cells[line[2]];
      if (a && a === b && a === c) return a;
    }
    return null;
  }

  function isFull(cells) {
    for (var i = 0; i < cells.length; i++) if (!cells[i]) return false;
    return true;
  }

  function emptyIndexes(cells) {
    var out = [];
    for (var i = 0; i < cells.length; i++) if (!cells[i]) out.push(i);
    return out;
  }

  function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Full-depth minimax — the board only has 9 cells so this is instant, and
  // it makes the "hard" opponent provably unbeatable (best case is a draw).
  function minimax(cells, isMax) {
    var winner = checkWinner(cells);
    if (winner === "O") return 10;
    if (winner === "X") return -10;
    if (isFull(cells)) return 0;

    var empties = emptyIndexes(cells);
    if (isMax) {
      var best = -Infinity;
      for (var i = 0; i < empties.length; i++) {
        cells[empties[i]] = "O";
        best = Math.max(best, minimax(cells, false));
        cells[empties[i]] = null;
      }
      return best;
    } else {
      var best2 = Infinity;
      for (var j = 0; j < empties.length; j++) {
        cells[empties[j]] = "X";
        best2 = Math.min(best2, minimax(cells, true));
        cells[empties[j]] = null;
      }
      return best2;
    }
  }

  function aiMoveHard(cells) {
    var bestScore = -Infinity, move = -1;
    var empties = emptyIndexes(cells);
    for (var i = 0; i < empties.length; i++) {
      cells[empties[i]] = "O";
      var score = minimax(cells, false);
      cells[empties[i]] = null;
      if (score > bestScore) { bestScore = score; move = empties[i]; }
    }
    return move;
  }

  function aiMoveMedium(cells) {
    var empties = emptyIndexes(cells);
    for (var i = 0; i < empties.length; i++) {
      cells[empties[i]] = "O";
      var winsHere = checkWinner(cells) === "O";
      cells[empties[i]] = null;
      if (winsHere) return empties[i];
    }
    for (var j = 0; j < empties.length; j++) {
      cells[empties[j]] = "X";
      var blocksHere = checkWinner(cells) === "X";
      cells[empties[j]] = null;
      if (blocksHere) return empties[j];
    }
    return randomChoice(empties);
  }

  function aiMoveEasy(cells) {
    return randomChoice(emptyIndexes(cells));
  }

  function aiMove() {
    var idx;
    if (state.difficulty === "hard") idx = aiMoveHard(state.cells);
    else if (state.difficulty === "medium") idx = aiMoveMedium(state.cells);
    else idx = aiMoveEasy(state.cells);
    if (idx === undefined || idx === -1) return;
    state.cells[idx] = "O";
    renderCell(idx);
    afterMove();
  }

  function renderBoard() {
    board.innerHTML = "";
    for (var i = 0; i < 9; i++) {
      var cell = document.createElement("button");
      cell.type = "button";
      cell.className = "ttt-cell";
      cell.dataset.idx = i;
      cell.addEventListener("click", function () {
        handleCellClick(parseInt(this.dataset.idx, 10));
      });
      board.appendChild(cell);
    }
  }

  function renderCell(idx) {
    var cell = board.querySelector('[data-idx="' + idx + '"]');
    var val = state.cells[idx];
    cell.textContent = val === "X" ? "✕" : val === "O" ? "◯" : "";
    cell.classList.remove("x", "o", "pop");
    if (val) {
      cell.classList.add(val.toLowerCase(), "disabled");
      void cell.offsetWidth;
      cell.classList.add("pop");
    }
  }

  function handleCellClick(idx) {
    if (state.over || state.turn !== "X" || state.cells[idx]) return;
    state.cells[idx] = "X";
    state.moves++;
    renderCell(idx);
    afterMove();
  }

  function afterMove() {
    var winner = checkWinner(state.cells);
    if (winner) {
      state.over = true;
      setTimeout(function () { finishGame(winner === "X" ? "win" : "lose"); }, 350);
      return;
    }
    if (isFull(state.cells)) {
      state.over = true;
      setTimeout(function () { finishGame("draw"); }, 350);
      return;
    }
    if (state.turn === "X") {
      state.turn = "O";
      setTimeout(aiMove, 450);
    } else {
      state.turn = "X";
    }
  }

  function finishGame(outcome) {
    resultOverlay.hidden = false;
    var oppLabel = OPP_INFO[state.difficulty].name;
    if (outcome === "win") {
      resultArt.src = "/static/img/art/win.jpg";
      resultArt.alt = "贏咗！";
      resultMsg.textContent = "你打贏咗" + oppLabel + "！計分緊…";
    } else if (outcome === "draw") {
      resultArt.src = "/static/img/art/win.jpg";
      resultArt.alt = "打成和局！";
      resultMsg.textContent = state.difficulty === "hard"
        ? "同神級小龍打成和局，呢個已經係最勁嘅結果！計分緊…"
        : "打成和局！好接近喇，計分緊…";
    } else {
      resultArt.src = "/static/img/art/lose.jpg";
      resultArt.alt = "下次一定得！";
      resultMsg.textContent = "俾" + oppLabel + "贏咗，再嚟一局！";
    }

    fetch("/api/tictactoe/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ difficulty: state.difficulty, outcome: outcome, moves: state.moves })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (outcome === "lose") return;
        var text = resultMsg.textContent.replace("計分緊…", "+" + data.points_awarded + " 分");
        if (data.new_badges && data.new_badges.length) text += " · 新徽章 " + data.new_badges.join(" ");
        resultMsg.textContent = text;
        var chip = document.querySelector(".points-chip");
        if (chip && typeof data.total_points === "number") chip.textContent = "⭐ " + data.total_points;
      })
      .catch(function () {});
  }

  function startGame(difficulty) {
    state.difficulty = difficulty;
    state.cells = new Array(9).fill(null);
    state.turn = "X";
    state.over = false;
    state.moves = 0;
    oppAvatar.src = OPP_INFO[difficulty].avatar;
    oppAvatar.alt = OPP_INFO[difficulty].name;
    oppName.textContent = "對戰中：" + OPP_INFO[difficulty].name;
    chooser.hidden = true;
    play.hidden = false;
    resultOverlay.hidden = true;
    renderBoard();
  }

  function backToChooser() {
    play.hidden = true;
    chooser.hidden = false;
  }

  Array.prototype.slice.call(document.querySelectorAll(".ttt-opp-card")).forEach(function (btn) {
    btn.addEventListener("click", function () { startGame(this.dataset.difficulty); });
  });
  btnChangeOpp.addEventListener("click", backToChooser);
  btnPlayAgain.addEventListener("click", function () { startGame(state.difficulty); });
})();
