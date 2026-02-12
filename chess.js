// Chess game engine
const Chess = (() => {
  const WHITE = 'w';
  const BLACK = 'b';

  const PAWN = 'p';
  const KNIGHT = 'n';
  const BISHOP = 'b';
  const ROOK = 'r';
  const QUEEN = 'q';
  const KING = 'k';

  const PIECE_SYMBOLS = {
    wp: '\u2659', wn: '\u2658', wb: '\u2657', wr: '\u2656', wq: '\u2655', wk: '\u2654',
    bp: '\u265F', bn: '\u265E', bb: '\u265D', br: '\u265C', bq: '\u265B', bk: '\u265A',
  };

  // Piece values for AI evaluation
  const PIECE_VALUES = {
    [PAWN]: 100,
    [KNIGHT]: 320,
    [BISHOP]: 330,
    [ROOK]: 500,
    [QUEEN]: 900,
    [KING]: 20000,
  };

  // Piece-square tables for positional evaluation
  const PST = {
    p: [
       0,  0,  0,  0,  0,  0,  0,  0,
      50, 50, 50, 50, 50, 50, 50, 50,
      10, 10, 20, 30, 30, 20, 10, 10,
       5,  5, 10, 25, 25, 10,  5,  5,
       0,  0,  0, 20, 20,  0,  0,  0,
       5, -5,-10,  0,  0,-10, -5,  5,
       5, 10, 10,-20,-20, 10, 10,  5,
       0,  0,  0,  0,  0,  0,  0,  0,
    ],
    n: [
      -50,-40,-30,-30,-30,-30,-40,-50,
      -40,-20,  0,  0,  0,  0,-20,-40,
      -30,  0, 10, 15, 15, 10,  0,-30,
      -30,  5, 15, 20, 20, 15,  5,-30,
      -30,  0, 15, 20, 20, 15,  0,-30,
      -30,  5, 10, 15, 15, 10,  5,-30,
      -40,-20,  0,  5,  5,  0,-20,-40,
      -50,-40,-30,-30,-30,-30,-40,-50,
    ],
    b: [
      -20,-10,-10,-10,-10,-10,-10,-20,
      -10,  0,  0,  0,  0,  0,  0,-10,
      -10,  0, 10, 10, 10, 10,  0,-10,
      -10,  5,  5, 10, 10,  5,  5,-10,
      -10,  0,  5, 10, 10,  5,  0,-10,
      -10, 10,  5, 10, 10,  5, 10,-10,
      -10,  5,  0,  0,  0,  0,  5,-10,
      -20,-10,-10,-10,-10,-10,-10,-20,
    ],
    r: [
       0,  0,  0,  0,  0,  0,  0,  0,
       5, 10, 10, 10, 10, 10, 10,  5,
      -5,  0,  0,  0,  0,  0,  0, -5,
      -5,  0,  0,  0,  0,  0,  0, -5,
      -5,  0,  0,  0,  0,  0,  0, -5,
      -5,  0,  0,  0,  0,  0,  0, -5,
      -5,  0,  0,  0,  0,  0,  0, -5,
       0,  0,  0,  5,  5,  0,  0,  0,
    ],
    q: [
      -20,-10,-10, -5, -5,-10,-10,-20,
      -10,  0,  0,  0,  0,  0,  0,-10,
      -10,  0,  5,  5,  5,  5,  0,-10,
       -5,  0,  5,  5,  5,  5,  0, -5,
        0,  0,  5,  5,  5,  5,  0, -5,
      -10,  5,  5,  5,  5,  5,  0,-10,
      -10,  0,  5,  0,  0,  0,  0,-10,
      -20,-10,-10, -5, -5,-10,-10,-20,
    ],
    k: [
      -30,-40,-40,-50,-50,-40,-40,-30,
      -30,-40,-40,-50,-50,-40,-40,-30,
      -30,-40,-40,-50,-50,-40,-40,-30,
      -30,-40,-40,-50,-50,-40,-40,-30,
      -20,-30,-30,-40,-40,-30,-30,-20,
      -10,-20,-20,-20,-20,-20,-20,-10,
       20, 20,  0,  0,  0,  0, 20, 20,
       20, 30, 10,  0,  0, 10, 30, 20,
    ],
    k_end: [
      -50,-40,-30,-20,-20,-30,-40,-50,
      -30,-20,-10,  0,  0,-10,-20,-30,
      -30,-10, 20, 30, 30, 20,-10,-30,
      -30,-10, 30, 40, 40, 30,-10,-30,
      -30,-10, 30, 40, 40, 30,-10,-30,
      -30,-10, 20, 30, 30, 20,-10,-30,
      -30,-30,  0,  0,  0,  0,-30,-30,
      -50,-30,-30,-30,-30,-30,-30,-50,
    ],
  };

  function createGame() {
    return {
      board: createInitialBoard(),
      turn: WHITE,
      castling: { wk: true, wq: true, bk: true, bq: true },
      enPassant: null, // target square [row, col] or null
      halfMoveClock: 0,
      fullMoveNumber: 1,
      history: [],
      capturedPieces: { w: [], b: [] },
    };
  }

  function createInitialBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    const backRank = [ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK];

    for (let c = 0; c < 8; c++) {
      board[0][c] = { color: BLACK, type: backRank[c] };
      board[1][c] = { color: BLACK, type: PAWN };
      board[6][c] = { color: WHITE, type: PAWN };
      board[7][c] = { color: WHITE, type: backRank[c] };
    }
    return board;
  }

  function cloneGame(game) {
    return {
      board: game.board.map(row => row.map(sq => sq ? { ...sq } : null)),
      turn: game.turn,
      castling: { ...game.castling },
      enPassant: game.enPassant ? [...game.enPassant] : null,
      halfMoveClock: game.halfMoveClock,
      fullMoveNumber: game.fullMoveNumber,
      history: [...game.history],
      capturedPieces: {
        w: [...game.capturedPieces.w],
        b: [...game.capturedPieces.b],
      },
    };
  }

  function getPiece(board, row, col) {
    if (row < 0 || row > 7 || col < 0 || col > 7) return null;
    return board[row][col];
  }

  function inBounds(r, c) {
    return r >= 0 && r <= 7 && c >= 0 && c <= 7;
  }

  // Generate pseudo-legal moves for a piece at (row, col)
  function generatePieceMoves(game, row, col) {
    const piece = game.board[row][col];
    if (!piece) return [];
    const moves = [];
    const { color, type } = piece;
    const enemy = color === WHITE ? BLACK : WHITE;
    const dir = color === WHITE ? -1 : 1;

    const addMove = (toR, toC, flags = {}) => {
      moves.push({ from: [row, col], to: [toR, toC], piece, ...flags });
    };

    if (type === PAWN) {
      // Forward
      const fwd1 = row + dir;
      if (inBounds(fwd1, col) && !game.board[fwd1][col]) {
        if (fwd1 === 0 || fwd1 === 7) {
          [QUEEN, ROOK, BISHOP, KNIGHT].forEach(p => addMove(fwd1, col, { promotion: p }));
        } else {
          addMove(fwd1, col);
        }
        // Double push from starting rank
        const startRank = color === WHITE ? 6 : 1;
        const fwd2 = row + 2 * dir;
        if (row === startRank && !game.board[fwd2][col]) {
          addMove(fwd2, col, { doublePush: true });
        }
      }
      // Captures
      for (const dc of [-1, 1]) {
        const toC = col + dc;
        if (!inBounds(fwd1, toC)) continue;
        const target = game.board[fwd1][toC];
        if (target && target.color === enemy) {
          if (fwd1 === 0 || fwd1 === 7) {
            [QUEEN, ROOK, BISHOP, KNIGHT].forEach(p => addMove(fwd1, toC, { promotion: p, capture: target }));
          } else {
            addMove(fwd1, toC, { capture: target });
          }
        }
        // En passant
        if (game.enPassant && game.enPassant[0] === fwd1 && game.enPassant[1] === toC) {
          addMove(fwd1, toC, { enPassant: true, capture: game.board[row][toC] });
        }
      }
    } else if (type === KNIGHT) {
      const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for (const [dr, dc] of offsets) {
        const r = row + dr, c = col + dc;
        if (!inBounds(r, c)) continue;
        const target = game.board[r][c];
        if (!target) addMove(r, c);
        else if (target.color === enemy) addMove(r, c, { capture: target });
      }
    } else if (type === BISHOP || type === ROOK || type === QUEEN) {
      const directions = [];
      if (type === BISHOP || type === QUEEN) directions.push([-1,-1],[-1,1],[1,-1],[1,1]);
      if (type === ROOK || type === QUEEN) directions.push([-1,0],[1,0],[0,-1],[0,1]);
      for (const [dr, dc] of directions) {
        let r = row + dr, c = col + dc;
        while (inBounds(r, c)) {
          const target = game.board[r][c];
          if (!target) {
            addMove(r, c);
          } else {
            if (target.color === enemy) addMove(r, c, { capture: target });
            break;
          }
          r += dr;
          c += dc;
        }
      }
    } else if (type === KING) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const r = row + dr, c = col + dc;
          if (!inBounds(r, c)) continue;
          const target = game.board[r][c];
          if (!target) addMove(r, c);
          else if (target.color === enemy) addMove(r, c, { capture: target });
        }
      }
      // Castling
      const rank = color === WHITE ? 7 : 0;
      if (row === rank && col === 4) {
        // Kingside
        const ckKey = color + 'k';
        if (game.castling[ckKey] && !game.board[rank][5] && !game.board[rank][6]) {
          const rook = game.board[rank][7];
          if (rook && rook.type === ROOK && rook.color === color) {
            if (!isSquareAttacked(game, rank, 4, enemy) &&
                !isSquareAttacked(game, rank, 5, enemy) &&
                !isSquareAttacked(game, rank, 6, enemy)) {
              addMove(rank, 6, { castling: 'k' });
            }
          }
        }
        // Queenside
        const cqKey = color + 'q';
        if (game.castling[cqKey] && !game.board[rank][3] && !game.board[rank][2] && !game.board[rank][1]) {
          const rook = game.board[rank][0];
          if (rook && rook.type === ROOK && rook.color === color) {
            if (!isSquareAttacked(game, rank, 4, enemy) &&
                !isSquareAttacked(game, rank, 3, enemy) &&
                !isSquareAttacked(game, rank, 2, enemy)) {
              addMove(rank, 2, { castling: 'q' });
            }
          }
        }
      }
    }
    return moves;
  }

  // Check if a square is attacked by a given color
  function isSquareAttacked(game, row, col, byColor) {
    const dir = byColor === WHITE ? -1 : 1;
    // Pawn attacks
    for (const dc of [-1, 1]) {
      const r = row - dir, c = col + dc;
      if (inBounds(r, c)) {
        const p = game.board[r][c];
        if (p && p.color === byColor && p.type === PAWN) return true;
      }
    }
    // Knight attacks
    const knightOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, dc] of knightOffsets) {
      const r = row + dr, c = col + dc;
      if (inBounds(r, c)) {
        const p = game.board[r][c];
        if (p && p.color === byColor && p.type === KNIGHT) return true;
      }
    }
    // King attacks
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr, c = col + dc;
        if (inBounds(r, c)) {
          const p = game.board[r][c];
          if (p && p.color === byColor && p.type === KING) return true;
        }
      }
    }
    // Sliding pieces (bishop/rook/queen)
    const diag = [[-1,-1],[-1,1],[1,-1],[1,1]];
    const straight = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dr, dc] of diag) {
      let r = row + dr, c = col + dc;
      while (inBounds(r, c)) {
        const p = game.board[r][c];
        if (p) {
          if (p.color === byColor && (p.type === BISHOP || p.type === QUEEN)) return true;
          break;
        }
        r += dr; c += dc;
      }
    }
    for (const [dr, dc] of straight) {
      let r = row + dr, c = col + dc;
      while (inBounds(r, c)) {
        const p = game.board[r][c];
        if (p) {
          if (p.color === byColor && (p.type === ROOK || p.type === QUEEN)) return true;
          break;
        }
        r += dr; c += dc;
      }
    }
    return false;
  }

  function findKing(board, color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.color === color && p.type === KING) return [r, c];
      }
    }
    return null;
  }

  function isInCheck(game, color) {
    const kingPos = findKing(game.board, color);
    if (!kingPos) return false;
    const enemy = color === WHITE ? BLACK : WHITE;
    return isSquareAttacked(game, kingPos[0], kingPos[1], enemy);
  }

  // Generate all legal moves for the current turn
  function generateAllLegalMoves(game) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = game.board[r][c];
        if (p && p.color === game.turn) {
          const pieceMoves = generatePieceMoves(game, r, c);
          for (const move of pieceMoves) {
            if (isLegalMove(game, move)) {
              moves.push(move);
            }
          }
        }
      }
    }
    return moves;
  }

  // Check if a move is legal (doesn't leave own king in check)
  function isLegalMove(game, move) {
    const testGame = cloneGame(game);
    applyMoveRaw(testGame, move);
    return !isInCheck(testGame, game.turn);
  }

  // Apply a move without legality checking (for internal use)
  function applyMoveRaw(game, move) {
    const [fromR, fromC] = move.from;
    const [toR, toC] = move.to;
    const piece = game.board[fromR][fromC];

    game.board[fromR][fromC] = null;

    // En passant capture
    if (move.enPassant) {
      game.board[fromR][toC] = null;
    }

    // Place piece (possibly promoted)
    if (move.promotion) {
      game.board[toR][toC] = { color: piece.color, type: move.promotion };
    } else {
      game.board[toR][toC] = piece;
    }

    // Castling rook move
    if (move.castling) {
      const rank = toR;
      if (move.castling === 'k') {
        game.board[rank][5] = game.board[rank][7];
        game.board[rank][7] = null;
      } else {
        game.board[rank][3] = game.board[rank][0];
        game.board[rank][0] = null;
      }
    }

    // Update castling rights
    if (piece.type === KING) {
      game.castling[piece.color + 'k'] = false;
      game.castling[piece.color + 'q'] = false;
    }
    if (piece.type === ROOK) {
      if (fromC === 0) game.castling[piece.color + 'q'] = false;
      if (fromC === 7) game.castling[piece.color + 'k'] = false;
    }
    // If a rook is captured
    if (move.capture && move.capture.type === ROOK) {
      if (toC === 0) game.castling[move.capture.color + 'q'] = false;
      if (toC === 7) game.castling[move.capture.color + 'k'] = false;
    }

    // En passant target
    if (move.doublePush) {
      game.enPassant = [(fromR + toR) / 2, fromC];
    } else {
      game.enPassant = null;
    }

    // Half-move clock
    if (piece.type === PAWN || move.capture) {
      game.halfMoveClock = 0;
    } else {
      game.halfMoveClock++;
    }

    // Full move number
    if (game.turn === BLACK) {
      game.fullMoveNumber++;
    }

    game.turn = game.turn === WHITE ? BLACK : WHITE;
  }

  // Make a move (full, with history)
  function makeMove(game, move) {
    // Save state for undo
    const historyEntry = {
      board: game.board.map(row => row.map(sq => sq ? { ...sq } : null)),
      turn: game.turn,
      castling: { ...game.castling },
      enPassant: game.enPassant ? [...game.enPassant] : null,
      halfMoveClock: game.halfMoveClock,
      fullMoveNumber: game.fullMoveNumber,
      capturedPieces: {
        w: [...game.capturedPieces.w],
        b: [...game.capturedPieces.b],
      },
      move,
    };
    game.history.push(historyEntry);

    // Track captured pieces
    if (move.capture) {
      game.capturedPieces[move.capture.color].push(move.capture.type);
    }

    applyMoveRaw(game, move);
    return game;
  }

  function undoMove(game) {
    if (game.history.length === 0) return false;
    const entry = game.history.pop();
    game.board = entry.board;
    game.turn = entry.turn;
    game.castling = entry.castling;
    game.enPassant = entry.enPassant;
    game.halfMoveClock = entry.halfMoveClock;
    game.fullMoveNumber = entry.fullMoveNumber;
    game.capturedPieces = entry.capturedPieces;
    return true;
  }

  // Get game status
  function getGameStatus(game) {
    const legalMoves = generateAllLegalMoves(game);
    const inCheck = isInCheck(game, game.turn);

    if (legalMoves.length === 0) {
      if (inCheck) {
        return { over: true, result: 'checkmate', winner: game.turn === WHITE ? BLACK : WHITE };
      }
      return { over: true, result: 'stalemate' };
    }

    if (game.halfMoveClock >= 100) {
      return { over: true, result: 'draw', reason: '50-move rule' };
    }

    // Insufficient material
    if (isInsufficientMaterial(game)) {
      return { over: true, result: 'draw', reason: 'insufficient material' };
    }

    return { over: false, inCheck, legalMoves };
  }

  function isInsufficientMaterial(game) {
    const pieces = { w: [], b: [] };
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = game.board[r][c];
        if (p && p.type !== KING) {
          pieces[p.color].push(p.type);
        }
      }
    }
    const wp = pieces.w, bp = pieces.b;
    // K vs K
    if (wp.length === 0 && bp.length === 0) return true;
    // K+B vs K or K+N vs K
    if (wp.length === 0 && bp.length === 1 && (bp[0] === BISHOP || bp[0] === KNIGHT)) return true;
    if (bp.length === 0 && wp.length === 1 && (wp[0] === BISHOP || wp[0] === KNIGHT)) return true;
    return false;
  }

  // Evaluation function for AI
  function evaluate(game) {
    let score = 0;
    let totalMaterial = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = game.board[r][c];
        if (!p) continue;
        totalMaterial += (p.type !== KING) ? PIECE_VALUES[p.type] : 0;
      }
    }

    const isEndgame = totalMaterial < 2600;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = game.board[r][c];
        if (!p) continue;
        const val = PIECE_VALUES[p.type];
        // PST index: for white, use (r * 8 + c), for black, mirror vertically
        let pstKey = p.type;
        if (p.type === KING && isEndgame) pstKey = 'k_end';
        const pstTable = PST[pstKey];
        const idx = p.color === WHITE ? (r * 8 + c) : ((7 - r) * 8 + c);
        const positional = pstTable ? pstTable[idx] : 0;
        const sign = p.color === WHITE ? 1 : -1;
        score += sign * (val + positional);
      }
    }
    return score;
  }

  // Get legal moves for a specific square
  function getLegalMovesFrom(game, row, col) {
    const piece = game.board[row][col];
    if (!piece || piece.color !== game.turn) return [];
    const pieceMoves = generatePieceMoves(game, row, col);
    return pieceMoves.filter(m => isLegalMove(game, m));
  }

  return {
    WHITE, BLACK, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING,
    PIECE_SYMBOLS, PIECE_VALUES, PST,
    createGame, cloneGame, makeMove, undoMove,
    generateAllLegalMoves, getLegalMovesFrom,
    getGameStatus, isInCheck, evaluate, findKing,
    applyMoveRaw,
  };
})();
