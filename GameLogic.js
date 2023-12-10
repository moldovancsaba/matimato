function displayMessage(message) {
    const messageElement = document.getElementById('message');
    messageElement.textContent = message;
}

function handleCellClick(row, column) {
    displayMessage(`Cell clicked at row ${row}, column ${column}`);
    handleHumanMove(row, column);
}

function handleHumanMove(row, column) {
    if (row !== activeRow) {
        displayMessage("Nem a megengedett sorból választottál. Próbáld újra!");
        return;
    }
    if (humanPlayer.play(board, { row, column })) {
        activeRow = getNextActiveRow(column); // Frissíti az aktív sort
        updateBoard();
        if (!board.hasAvailableMoves(column, row)) {
            endGame('human');
            return;
        }
        handleComputerMove(column);
    } else {
        displayMessage("Nem sikerült lépni. Próbáld újra!");
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
        endGame('computer');
        return;
    }

    let randomRowIndex = availableRows[Math.floor(Math.random() * availableRows.length)];
    computerPlayer.play(board, { row: randomRowIndex, column });
    activeRow = getNextActiveRow(randomRowIndex);
    updateBoard();
    if (!board.hasAvailableMoves(randomRowIndex, column)) {
        endGame('computer');
        return;
    }
}

function updateBoard() {
    createBoard(board);
}

function endGame(lastPlayer) {
    let resultMessage = "";
    if (humanPlayer.score > computerPlayer.score) {
        resultMessage = "Az emberi játékos nyert!";
        animateBoardForWin();
    } else if (humanPlayer.score < computerPlayer.score) {
        resultMessage = "A számítógép nyert!";
    } else {
        // Pontegyenlőség esetén az utoljára lépő játékos nyer
        resultMessage = lastPlayer === 'human' ? "Az emberi játékos nyert!" : "A számítógép nyert!";
    }
    displayMessage(resultMessage);
    setTimeout(startNewGame, 5000);
}

function getNextActiveRow(currentColumn) {
    // Implementáld a következő aktív sor logikáját
    return currentColumn;
}

// További funkciók: animateBoardForWin, startNewGame, stb.

let activeRow = 4; // Kezdeti beállítás a középső sorra

// Játék indítása
startNewGame();