// Chess AI using minimax with alpha-beta pruning
const ChessAI = (() => {
  let nodesSearched = 0;

  // Move ordering heuristic for better alpha-beta pruning
  function scoreMove(move) {
    let score = 0;
    if (move.capture) {
      // MVV-LVA: Most Valuable Victim - Least Valuable Attacker
      score += Chess.PIECE_VALUES[move.capture.type] * 10 - Chess.PIECE_VALUES[move.piece.type];
    }
    if (move.promotion) {
      score += Chess.PIECE_VALUES[move.promotion];
    }
    if (move.castling) {
      score += 50;
    }
    return score;
  }

  function orderMoves(moves) {
    return moves.sort((a, b) => scoreMove(b) - scoreMove(a));
  }

  function minimax(game, depth, alpha, beta, maximizing) {
    nodesSearched++;

    if (depth === 0) {
      return quiescence(game, alpha, beta, maximizing, 4);
    }

    const status = Chess.getGameStatus(game);
    if (status.over) {
      if (status.result === 'checkmate') {
        return maximizing ? -100000 - depth : 100000 + depth;
      }
      return 0; // draw
    }

    const moves = orderMoves(status.legalMoves);

    if (maximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        Chess.makeMove(game, move);
        const eval_ = minimax(game, depth - 1, alpha, beta, false);
        Chess.undoMove(game);
        maxEval = Math.max(maxEval, eval_);
        alpha = Math.max(alpha, eval_);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        Chess.makeMove(game, move);
        const eval_ = minimax(game, depth - 1, alpha, beta, true);
        Chess.undoMove(game);
        minEval = Math.min(minEval, eval_);
        beta = Math.min(beta, eval_);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  // Quiescence search: only evaluate captures to avoid horizon effect
  function quiescence(game, alpha, beta, maximizing, maxDepth) {
    const standPat = Chess.evaluate(game);
    nodesSearched++;

    if (maxDepth <= 0) return standPat;

    if (maximizing) {
      if (standPat >= beta) return beta;
      if (standPat > alpha) alpha = standPat;
    } else {
      if (standPat <= alpha) return alpha;
      if (standPat < beta) beta = standPat;
    }

    const allMoves = Chess.generateAllLegalMoves(game);
    const captures = orderMoves(allMoves.filter(m => m.capture));

    if (maximizing) {
      for (const move of captures) {
        Chess.makeMove(game, move);
        const eval_ = quiescence(game, alpha, beta, false, maxDepth - 1);
        Chess.undoMove(game);
        if (eval_ >= beta) return beta;
        if (eval_ > alpha) alpha = eval_;
      }
      return alpha;
    } else {
      for (const move of captures) {
        Chess.makeMove(game, move);
        const eval_ = quiescence(game, alpha, beta, true, maxDepth - 1);
        Chess.undoMove(game);
        if (eval_ <= alpha) return alpha;
        if (eval_ < beta) beta = eval_;
      }
      return beta;
    }
  }

  function getBestMove(game, depth = 2) {
    nodesSearched = 0;
    const moves = orderMoves(Chess.generateAllLegalMoves(game));
    if (moves.length === 0) return null;

    const maximizing = game.turn === Chess.WHITE;
    let bestMove = moves[0];
    let bestEval = maximizing ? -Infinity : Infinity;

    for (const move of moves) {
      Chess.makeMove(game, move);
      const eval_ = minimax(game, depth - 1, -Infinity, Infinity, !maximizing);
      Chess.undoMove(game);

      if (maximizing ? eval_ > bestEval : eval_ < bestEval) {
        bestEval = eval_;
        bestMove = move;
      }
    }

    console.log(`AI searched ${nodesSearched} nodes, eval: ${bestEval}`);
    return bestMove;
  }

  return { getBestMove };
})();
