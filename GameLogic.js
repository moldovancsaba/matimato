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
        displayMessage(resultMessage);
        animateBoardForWin();
    } else if (humanPlayer.score < computerPlayer.score) {
        resultMessage = "A számítógép nyert!";
        displayMessage(resultMessage);
    } else {
        resultMessage = "Döntetlen!";
        displayMessage(resultMessage);
    }
}

function getNextActiveRow(currentColumn) {
    // Implementáld a következő aktív sor logikáját
    return currentColumn; // Ideiglenes megoldás
}

function animateBoardForWin() {
    // Cellák eltüntetése és üzenet megjelenítése
    for (let i = 0; i < board.rows; i++) {
        for (let j = 0; j < board.columns; j++) {
            setTimeout(() => {
                const cell = document.querySelector(`.cell[row="${i}"][column="${j}"]`);
                if (cell) {
                    cell.style.visibility = 'hidden';
                }
            }, 100 * (i * board.columns + j));
        }
    }

    // Üzenet megjelenítése a táblán
    setTimeout(() => {
        displayWinMessage();
    }, board.rows * board.columns * 100 + 1000);
}

function displayWinMessage() {
    const winMessageTop = "WE HAVE A";
    const winMessageBottom = " WINNER! ";
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = ''; // Tábla törlése

    // Felső üzenet
    const messageRowTop = document.createElement('div');
    messageRowTop.className = 'message-row';
    messageRowTop.textContent = winMessageTop;
    boardElement.appendChild(messageRowTop);

    // Alsó üzenet
    const messageRowBottom = document.createElement('div');
    messageRowBottom.className = 'message-row';
    messageRowBottom.textContent = winMessageBottom;
    boardElement.appendChild(messageRowBottom);

    // Új játék indítása 5 másodperc múlva
    setTimeout(() => {
        startNewGame();
    }, 5000);
}

function startNewGame() {
    // Létrehoz egy új táblát és inicializálja a játékot
    board = new Board();
    createBoard(board);
    resetGame();
}

function resetGame() {
    humanPlayer.score = 0;
    computerPlayer.score = 0;
    activeRow = 5; // Kezdő sor visszaállítása
    displayMessage