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
            endGame();
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
        endGame();
        return;
    }

    let randomRowIndex = availableRows[Math.floor(Math.random() * availableRows.length)];
    computerPlayer.play(board, { row: randomRowIndex, column });
    activeRow = getNextActiveRow(randomRowIndex); // Frissíti az aktív sort
    updateBoard();
}

function updateBoard() {
    createBoard(board); // Újrarajzolja a táblát az aktuális állapottal
}

function endGame() {
    let resultMessage = "";
    if (humanPlayer.score > computerPlayer.score) {
        resultMessage = "Az emberi játékos nyert!";
    } else if (humanPlayer.score < computerPlayer.score) {
        resultMessage = "A számítógép nyert!";
    } else {
        resultMessage = "Döntetlen!";
    }
    displayMessage(resultMessage);
    saveGameStats(); // Ha Firebase integrációt használsz
}

function getNextActiveRow(currentColumn) {
    // Itt valósítsd meg a logikát, hogy meghatározd a következő aktív sort a játék szabályai szerint
    return currentColumn; // Példa, szükség szerint módosítsd
}

let activeRow = 4; // Kezdeti beállítás a középső sorra