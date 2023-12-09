function handleCellClick(row, column) {
    handleHumanMove(row, column);
}

function handleHumanMove(row, column) {
    if (row !== activeRow) {
        console.log("Nem a megengedett sorból választottál. Próbáld újra!");
        return;
    }
    if (humanPlayer.play(board, { row, column })) {
        activeRow = column; // Frissíti az aktív sort a kiválasztott oszlop alapján
        updateBoard();
        if (!board.hasAvailableMoves(column, row)) {
            endGame();
            return;
        }
        handleComputerMove(column);
    } else {
        console.log("Nem sikerült lépni. Próbáld újra!");
    }
}

function handleComputerMove(column) {
    let availableRows = [];
    for (let i = 0; i < board.rows; i++) {
        if (board.cells[i][column] != null) {
            availableRows.push(i);
        }
    }

    if (availableRows.length === 0) {
        endGame();
        return;
    }

    let randomRowIndex = availableRows[Math.floor(Math.random() * availableRows.length)];
    computerPlayer.play(board, { row: randomRowIndex, column });
    activeRow = randomRowIndex; // Frissíti az aktív sort a számítógép választása alapján
    updateBoard();
}

function updateBoard() {
    createBoard(board);
}

function endGame() {
    if (humanPlayer.score > computerPlayer.score) {
        console.log("Az emberi játékos nyert!");
    } else if (humanPlayer.score < computerPlayer.score) {
        console.log("A számítógép nyert!");
    } else {
        console.log("Döntetlen!");
    }
}

// Az activeRow változót és a board példányt a Board.js fájlból kell importálni vagy globálisan elérhetővé tenni.
let activeRow = 4; // Kezdeti beállítás a középső sorra