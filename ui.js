// Chess UI
const ChessUI = (() => {
  let game = Chess.createGame();
  let selectedSquare = null;
  let legalMovesForSelected = [];
  let flipped = false;
  let mode = 'ai'; // 'pvp' or 'ai'
  let aiDepth = 2;
  let aiThinking = false;
  let lastMove = null;
  let dragState = null;

  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const fileLabelsEl = document.getElementById('file-labels');
  const capturedBlackEl = document.getElementById('captured-black');
  const capturedWhiteEl = document.getElementById('captured-white');
  const promotionModal = document.getElementById('promotion-modal');
  const promotionChoices = document.getElementById('promotion-choices');
  const gameoverModal = document.getElementById('gameover-modal');
  const gameoverTitle = document.getElementById('gameover-title');
  const gameoverMessage = document.getElementById('gameover-message');

  let pendingPromotionMove = null;

  function init() {
    document.getElementById('new-game-btn').addEventListener('click', newGame);
    document.getElementById('undo-btn').addEventListener('click', undo);
    document.getElementById('flip-btn').addEventListener('click', flipBoard);
    document.getElementById('gameover-new-game').addEventListener('click', () => {
      gameoverModal.classList.add('hidden');
      newGame();
    });

    document.querySelectorAll('input[name="mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        mode = e.target.value;
        document.getElementById('ai-difficulty').style.display = mode === 'ai' ? '' : 'none';
        newGame();
      });
    });

    document.getElementById('depth-select').addEventListener('change', (e) => {
      aiDepth = parseInt(e.target.value);
    });

    // Drag events on document
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);

    renderBoard();
    updateStatus();
  }

  function newGame() {
    game = Chess.createGame();
    selectedSquare = null;
    legalMovesForSelected = [];
    lastMove = null;
    aiThinking = false;
    pendingPromotionMove = null;
    promotionModal.classList.add('hidden');
    gameoverModal.classList.add('hidden');
    renderBoard();
    updateStatus();
  }

  function flipBoard() {
    flipped = !flipped;
    renderBoard();
  }

  function renderBoard() {
    boardEl.innerHTML = '';
    fileLabelsEl.innerHTML = '';

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const kingPos = Chess.findKing(game.board, game.turn);
    const inCheck = Chess.isInCheck(game, game.turn);

    for (let displayR = 0; displayR < 8; displayR++) {
      for (let displayC = 0; displayC < 8; displayC++) {
        const r = flipped ? 7 - displayR : displayR;
        const c = flipped ? 7 - displayC : displayC;

        const sq = document.createElement('div');
        sq.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
        sq.dataset.row = r;
        sq.dataset.col = c;

        // Highlight last move
        if (lastMove) {
          if ((r === lastMove.from[0] && c === lastMove.from[1]) ||
              (r === lastMove.to[0] && c === lastMove.to[1])) {
            sq.classList.add('last-move');
          }
        }

        // Highlight selected
        if (selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c) {
          sq.classList.add('selected');
        }

        // Highlight legal moves
        const isLegalTarget = legalMovesForSelected.some(m => m.to[0] === r && m.to[1] === c);
        if (isLegalTarget) {
          const target = game.board[r][c];
          if (target) {
            sq.classList.add('legal-capture');
          } else {
            sq.classList.add('legal-move');
          }
        }

        // Check highlight
        if (inCheck && kingPos && kingPos[0] === r && kingPos[1] === c) {
          sq.classList.add('in-check');
        }

        // Piece
        const piece = game.board[r][c];
        if (piece) {
          const pieceEl = document.createElement('span');
          pieceEl.className = 'piece';
          pieceEl.textContent = Chess.PIECE_SYMBOLS[piece.color + piece.type];
          sq.appendChild(pieceEl);
        }

        sq.addEventListener('mousedown', (e) => onSquareMouseDown(e, r, c));
        sq.addEventListener('touchstart', (e) => onSquareTouchStart(e, r, c), { passive: false });
        sq.addEventListener('click', (e) => onSquareClick(r, c));

        boardEl.appendChild(sq);
      }
    }

    // File labels
    for (let i = 0; i < 8; i++) {
      const idx = flipped ? 7 - i : i;
      const label = document.createElement('span');
      label.textContent = files[idx];
      fileLabelsEl.appendChild(label);
    }

    renderCaptured();
  }

  function renderCaptured() {
    const renderPieces = (el, pieces, color) => {
      el.innerHTML = '';
      const sorted = [...pieces].sort((a, b) =>
        Chess.PIECE_VALUES[b] - Chess.PIECE_VALUES[a]
      );
      sorted.forEach(type => {
        const span = document.createElement('span');
        span.textContent = Chess.PIECE_SYMBOLS[color + type];
        el.appendChild(span);
      });
    };
    renderPieces(capturedWhiteEl, game.capturedPieces.w, Chess.WHITE);
    renderPieces(capturedBlackEl, game.capturedPieces.b, Chess.BLACK);
  }

  function updateStatus() {
    const status = Chess.getGameStatus(game);
    if (status.over) {
      if (status.result === 'checkmate') {
        const winner = status.winner === Chess.WHITE ? 'White' : 'Black';
        statusEl.textContent = `Checkmate! ${winner} wins!`;
        showGameOver('Checkmate!', `${winner} wins the game.`);
      } else if (status.result === 'stalemate') {
        statusEl.textContent = 'Stalemate! Draw.';
        showGameOver('Stalemate', 'The game is a draw.');
      } else {
        statusEl.textContent = `Draw: ${status.reason}`;
        showGameOver('Draw', status.reason);
      }
    } else {
      const turn = game.turn === Chess.WHITE ? 'White' : 'Black';
      const check = status.inCheck ? ' (Check!)' : '';
      statusEl.textContent = `${turn}'s turn${check}`;
      if (aiThinking) statusEl.textContent = 'AI is thinking...';
    }
  }

  function showGameOver(title, message) {
    gameoverTitle.textContent = title;
    gameoverMessage.textContent = message;
    gameoverModal.classList.remove('hidden');
  }

  function onSquareClick(row, col) {
    if (aiThinking) return;
    if (dragState && dragState.didDrag) return; // handled by drag

    const piece = game.board[row][col];

    if (selectedSquare) {
      // Try to move to clicked square
      const moveMatch = legalMovesForSelected.filter(m =>
        m.to[0] === row && m.to[1] === col
      );

      if (moveMatch.length > 0) {
        if (moveMatch.length > 1 && moveMatch[0].promotion) {
          showPromotionDialog(moveMatch);
          return;
        }
        executeMove(moveMatch[0]);
        return;
      }

      // Deselect or select new piece
      if (piece && piece.color === game.turn) {
        selectSquare(row, col);
      } else {
        deselectSquare();
      }
    } else {
      if (piece && piece.color === game.turn) {
        selectSquare(row, col);
      }
    }
  }

  function selectSquare(row, col) {
    selectedSquare = [row, col];
    legalMovesForSelected = Chess.getLegalMovesFrom(game, row, col);
    renderBoard();
  }

  function deselectSquare() {
    selectedSquare = null;
    legalMovesForSelected = [];
    renderBoard();
  }

  // Drag and drop
  function onSquareMouseDown(e, row, col) {
    if (aiThinking) return;
    const piece = game.board[row][col];
    if (!piece || piece.color !== game.turn) return;

    e.preventDefault();
    startDrag(row, col, e.clientX, e.clientY);
  }

  function onSquareTouchStart(e, row, col) {
    if (aiThinking) return;
    const piece = game.board[row][col];
    if (!piece || piece.color !== game.turn) return;

    e.preventDefault();
    const touch = e.touches[0];
    startDrag(row, col, touch.clientX, touch.clientY);
  }

  function startDrag(row, col, x, y) {
    const piece = game.board[row][col];
    selectedSquare = [row, col];
    legalMovesForSelected = Chess.getLegalMovesFrom(game, row, col);
    renderBoard();

    // Create drag ghost
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.textContent = Chess.PIECE_SYMBOLS[piece.color + piece.type];
    document.body.appendChild(ghost);
    ghost.style.left = x + 'px';
    ghost.style.top = y + 'px';

    // Mark the source square as dragging
    const sourceSquare = boardEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (sourceSquare) sourceSquare.classList.add('dragging');

    dragState = {
      fromRow: row,
      fromCol: col,
      ghost,
      didDrag: false,
    };
  }

  function onDragMove(e) {
    if (!dragState) return;
    dragState.didDrag = true;
    dragState.ghost.style.left = e.clientX + 'px';
    dragState.ghost.style.top = e.clientY + 'px';
  }

  function onTouchMove(e) {
    if (!dragState) return;
    e.preventDefault();
    dragState.didDrag = true;
    const touch = e.touches[0];
    dragState.ghost.style.left = touch.clientX + 'px';
    dragState.ghost.style.top = touch.clientY + 'px';
  }

  function onDragEnd(e) {
    if (!dragState) return;
    finishDrag(e.clientX, e.clientY);
  }

  function onTouchEnd(e) {
    if (!dragState) return;
    if (!dragState.didDrag) {
      cleanupDrag();
      return;
    }
    const touch = e.changedTouches[0];
    finishDrag(touch.clientX, touch.clientY);
  }

  function finishDrag(x, y) {
    if (!dragState) return;
    if (!dragState.didDrag) {
      cleanupDrag();
      return;
    }

    // Find the target square under the cursor
    cleanupDrag();
    const el = document.elementFromPoint(x, y);
    const sq = el?.closest?.('.square');
    if (sq) {
      const toRow = parseInt(sq.dataset.row);
      const toCol = parseInt(sq.dataset.col);
      const moveMatch = legalMovesForSelected.filter(m =>
        m.to[0] === toRow && m.to[1] === toCol
      );
      if (moveMatch.length > 0) {
        if (moveMatch.length > 1 && moveMatch[0].promotion) {
          showPromotionDialog(moveMatch);
          return;
        }
        executeMove(moveMatch[0]);
        return;
      }
    }
    deselectSquare();
  }

  function cleanupDrag() {
    if (dragState?.ghost) {
      dragState.ghost.remove();
    }
    dragState = null;
  }

  function showPromotionDialog(moves) {
    pendingPromotionMove = moves;
    promotionChoices.innerHTML = '';

    const color = game.turn;
    const promotionPieces = [Chess.QUEEN, Chess.ROOK, Chess.BISHOP, Chess.KNIGHT];

    promotionPieces.forEach(type => {
      const btn = document.createElement('span');
      btn.className = 'promo-option';
      btn.textContent = Chess.PIECE_SYMBOLS[color + type];
      btn.addEventListener('click', () => {
        promotionModal.classList.add('hidden');
        const move = pendingPromotionMove.find(m => m.promotion === type);
        if (move) executeMove(move);
        pendingPromotionMove = null;
      });
      promotionChoices.appendChild(btn);
    });

    promotionModal.classList.remove('hidden');
  }

  function executeMove(move) {
    Chess.makeMove(game, move);
    lastMove = move;
    selectedSquare = null;
    legalMovesForSelected = [];
    renderBoard();
    updateStatus();

    const status = Chess.getGameStatus(game);
    if (!status.over && mode === 'ai' && game.turn === Chess.BLACK) {
      aiThinking = true;
      updateStatus();
      setTimeout(() => {
        const aiMove = ChessAI.getBestMove(game, aiDepth);
        if (aiMove) {
          Chess.makeMove(game, aiMove);
          lastMove = aiMove;
        }
        aiThinking = false;
        renderBoard();
        updateStatus();
      }, 50);
    }
  }

  function undo() {
    if (aiThinking) return;
    // In AI mode, undo two moves (AI + player)
    if (mode === 'ai') {
      Chess.undoMove(game);
      Chess.undoMove(game);
    } else {
      Chess.undoMove(game);
    }
    selectedSquare = null;
    legalMovesForSelected = [];
    lastMove = game.history.length > 0 ? game.history[game.history.length - 1].move : null;
    renderBoard();
    updateStatus();
  }

  init();

  return { newGame, flipBoard };
})();
