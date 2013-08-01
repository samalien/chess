(function () {
"use strict";

var boardModel,
    boardData,
    sideData,
    startingBoard = function () {
        var rowOfPawns = function (side) {
                return _.map(_.range(8), function () {
                    return { side: side, type: PIECE.pawn };
                });
            },

            homeRow = function (side) {
                return _.map(
                    [PIECE.rook, PIECE.knight, PIECE.bishop, PIECE.king,
                     PIECE.queen, PIECE.bishop, PIECE.knight, PIECE.rook],
                    function (type) {
                        return { side: side, type: type };
                    }
                );
            },

            emptyRow = function () {
                return _.pad(8, null);
            };

        return [
            homeRow(SIDE.black),
            rowOfPawns(SIDE.black),
            emptyRow(), emptyRow(), emptyRow(), emptyRow(),
            rowOfPawns(SIDE.white),
            homeRow(SIDE.white)
        ];
    };

module("boardModel", {
    setup: function () {
        boardData = undefined;
        sideData = undefined;
        boardModel = createBoardModel();
        boardModel.subscribe("board", function (data) {
            boardData = data;
        });
        boardModel.subscribe("side", function (data) {
            sideData = data;
        });
        boardModel.newGame();
    }
});

test("initial board piece setup", function () {
    deepEqual(boardData, startingBoard(), "pieces are set up on board");
    deepEqual(sideData, SIDE.white, "side started on white");
});

test("makeMove - ok", function () {
    ok(boardModel.makeMove({ x: 0, y: 6 }, { x: 0, y: 5}));
    deepEqual(boardData[6][0], null, "old square is empty");
    deepEqual(
        boardData[5][0],
        { side: SIDE.white, type: PIECE.pawn },
        "new square contains the moved piece"
    );
    //check that rest of pieces match original board
    boardData[6][0] = boardData[5][0];
    boardData[5][0] = null;
    deepEqual(boardData, startingBoard(), "rest of pieces in correct places");
});

test("makeMove - fail - wrong player", function () {
    ok(!boardModel.makeMove({ x: 0, y: 1}, { x: 0, y: 2 }));
    deepEqual(boardData, startingBoard(), "board unchanged");
});

test("makeMove - fail - null square", function () {
    ok(!boardModel.makeMove({ x: 0, y: 3}, { x: 0, y: 4 }));
    deepEqual(boardData, startingBoard(), "board unchanged");
});

test("makeMove - fail - break piece's move rules", function () {
    ok(!boardModel.makeMove({ x: 0, y: 6 }, { x: 0, y: 3 }));
    deepEqual(boardData, startingBoard(), "board unchanged");
});

var setupCheckTests = function (side) {
    var board = tLib.blankBoard();
    board[2][2] = createPieceModel.king({ side: SIDE.black });
    board[2][4] = createPieceModel.rook({ side: SIDE.black });
    board[2][5] = createPieceModel.rook({ side: SIDE.white });
    board[4][3] = createPieceModel.pawn({ side: SIDE.white });
    board[0][2] = createPieceModel.king({ side: SIDE.white });
    boardModel = createBoardModel({ board : board, side: side });
    boardModel.subscribe("board", function (data) {
        boardData = data;
    });
};

test("makeMove - ok - puts opponent into check", function () {
    setupCheckTests(SIDE.white);
    ok(boardModel.makeMove({ x: 5, y: 2 }, { x: 4, y: 2 }));
    deepEqual(
        boardData[2][4],
        { side: SIDE.white, type: PIECE.rook },
        "moves white rook"
    );
});

test("makeMove - fail - moves into check", function () {
    setupCheckTests(SIDE.black);
    ok(!boardModel.makeMove({ x: 4, y: 2 }, { x: 4, y: 1 }));
    deepEqual(boardData, startingBoard(), "board unchanged");
});

test("makeMove - fail - move king into check", function () {
    setupCheckTests(SIDE.black);
    ok(!boardModel.makeMove({ x: 2, y: 2 }, { x: 2, y: 3 }));
    deepEqual(boardData, startingBoard(), "board unchanged");
});

test("makeMove - fail - move king into check by other king", function () {
    setupCheckTests(SIDE.white);
    ok(!boardModel.makeMove({ x: 2, y: 0 }, { x: 2, y: 1 }));
    deepEqual(boardData, startingBoard(), "board unchanged");
});

var setupCastlingTests = function (extraSetup) {
    boardModel = undefined;
    boardData = undefined;
    var board = tLib.blankBoard();
    board[0][0] = createPieceModel.rook({ side: SIDE.black });
    board[0][7] = createPieceModel.rook({ side: SIDE.black });
    board[0][4] = createPieceModel.king({ side: SIDE.black });
    board[7][4] = createPieceModel.king({ side: SIDE.white });
    if (extraSetup) {
        extraSetup(board);
    }
    boardModel = createBoardModel({ board : board, side: SIDE.black });
    boardModel.subscribe("board", function (data) {
        boardData = data;
    });
};

test("makeMove - castle kingside", function () {
    setupCastlingTests();
    ok(boardModel.makeMove({ x: 4, y: 0 }, { x: 6, y: 0 }));
    deepEqual(boardData[0][6], {side:SIDE.black,type:PIECE.king}, "king moved");
    deepEqual(boardData[0][5], {side:SIDE.black,type:PIECE.rook}, "rook moved");
});

test("makeMove - castle queenside", function () {
    setupCastlingTests();
    ok(boardModel.makeMove({ x: 4, y: 0}, { x: 2, y: 0}));
    deepEqual(boardData[0][2], {side:SIDE.black,type:PIECE.king}, "king moved");
    deepEqual(boardData[0][3], {side:SIDE.black,type:PIECE.rook}, "rook moved");
});

test("makeMove - castling failed, not first king move", function () {
    setupCastlingTests();
    ok(boardModel.makeMove({ x: 4, y: 0 }, { x: 3, y: 0 }), "move king");
    ok(boardModel.makeMove({ x: 4, y: 7 }, { x: 3, y: 7 }), "move white piece");
    ok(boardModel.makeMove({ x: 3, y: 0 }, { x: 4, y: 0 }), "move king to start");
    ok(boardModel.makeMove({ x: 3, y: 7 }, { x: 4, y: 7 }), "move white piece");
    ok(!boardModel.makeMove({ x: 4, y: 0 }, { x: 2, y: 0 }), "failed castle");
});

test("makeMove - castling failed, rook has moved", function () {
    setupCastlingTests();
    ok(boardModel.makeMove({ x: 0, y: 0 }, { x: 1, y: 0 }), "move rook");
    ok(boardModel.makeMove({ x: 4, y: 7 }, { x: 3, y: 7 }), "move white piece");
    ok(boardModel.makeMove({ x: 1, y: 0}, { x: 0, y: 0 }), "move rook to start");
    ok(boardModel.makeMove({ x: 3, y: 7 }, { x: 4, y: 7 }), "move white piece");
    ok(!boardModel.makeMove({ x: 4, y: 0 }, { x: 2, y: 0 }), "failed castle");
});

test("makeMove - castling queenside failed, piece in the way", function () {
    setupCastlingTests(function (board) {
        board[0][1] = createPieceModel.bishop({ side: SIDE.black });
    });
    ok(!boardModel.makeMove({ x: 4, y: 0 }, { x: 2, y: 0 }), "failed castle");
});

test("makeMove - castling kingside failed, piece in the way", function () {
    setupCastlingTests(function (board) {
        board[0][5] = createPieceModel.bishop({ side: SIDE.black });
    });
    ok(!boardModel.makeMove({ x: 4, y: 0 }, { x: 6, y: 0 }), "failed castle");
});

test("makeMove - castling failed, castle into check", function () {
    setupCastlingTests(function (board) {
        board[2][4] = createPieceModel.bishop({ side: SIDE.white });
    });
    ok(!boardModel.makeMove({ x: 4, y: 0 }, { x: 2, y: 0 }), "failed castle");
});

var setupEnPassantTests = function (extraSetup) {
    boardModel = undefined;
    boardData = undefined;
    var board = tLib.blankBoard();
    board[1][1] = createPieceModel.pawn({ side: SIDE.black });
    board[2][4] = createPieceModel.pawn({ side: SIDE.black });
    board[3][2] = createPieceModel.pawn({ side: SIDE.white });
    board[3][3] = createPieceModel.pawn({ side: SIDE.white });
    board[4][5] = createPieceModel.pawn({ side: SIDE.black });
    board[6][4] = createPieceModel.pawn({ side: SIDE.white });
    if (extraSetup) {
        extraSetup(board);
    }
    boardModel = createBoardModel({ board : board, side: SIDE.black });
    boardModel.subscribe("board", function (data) {
        boardData = data;
    });
};
/*
test("makeMove - en passant - white", function () {
    setupEnPassantTests();
    ok(boardModel.makeMove({ x: 1, y: 1 }, { x: 1, y: 3 }), "setup move");
    ok(boardModel.makeMove({ x: 2, y: 3 }, { x: 1, y: 2 }), "en passant move");
    deepEqual(boardData[3][1], null, "piece is captured");
});
*/
//test("makeMove - en passant - black", function () {});
//test("makeMove - en passant - failed - only advanced one", function () {});
//test("makeMove - en passant - failed - missed opportunity", function () {});

}());
