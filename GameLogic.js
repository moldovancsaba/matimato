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
        activeRow = getNextActiveRow(column);
        updateBoard();
        if (!board.hasAvailableMoves()) {
            endGame();
            return;
        }
        handleComputerMove();
    } else {
        displayMessage("Nem sikerült lépni. Próbáld újra!");
    }
}

function handleComputerMove() {
    let availableRows = [];
    for (let i = 0; i < board.rows; i++) {
        if (board.cells[i][activeRow] != null) {
            availableRows.push(i);
        }
    }

    if (availableRows.length === 0) {
        endGame();
        return;
    }

    let randomRowIndex = availableRows[Math.floor(Math.random() * availableRows.length)];
    computerPlayer.play(board, { row: randomRowIndex, column: activeRow });
    activeRow = getNextActiveRow(randomRowIndex);
    updateBoard();
}

function updateBoard() {
    createBoard(board);
    highlightActiveRow();
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
    // saveGameStats(); // Ha Firebase integrációt használsz, és implementálva van
}

function getNextActiveRow(currentColumn) {
    // Implementáld a következő aktív sor logikáját
    return currentColumn; // Ideiglenes megoldás
}

function highlightActiveRow() {
    // Kiemeli az aktív sort a táblán
    const rows = document.querySelectorAll('.cell');
    rows.forEach(row => {
        if (parseInt(row.getAttribute('data-row')) === activeRow) {
            row.classList.add('active-row');
        } else {
            row.classList.remove('active-row');
        }
    });
}

let activeRow = 4; // Kezdeti beállítás a középső sorra

// A tábla létrehozásának inicializálása
createBoard(board);