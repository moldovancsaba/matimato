// GameLogic.js

// A számítógép lépésének kezelése
function handleAIMove() {
    let availableCells = getAvailableCells();

    if (availableCells.length === 0) {
        endGame();
        return;
    }

    let randomCellIndex = Math.floor(Math.random() * availableCells.length);
    let selectedCell = availableCells[randomCellIndex];
    
    computerPlayer.makeMove(selectedCell.row, selectedCell.column);
    updateScoreDisplay();
    highlightCell(selectedCell.row, selectedCell.column);
    switchPlayer();
}

// Elérhető cellák lekérdezése
function getAvailableCells() {
    let availableCells = [];
    for (let i = 0; i < board.rows; i++) {
        for (let j = 0; j < board.columns; j++) {
            if (board.cells[i][j] !== '•') {
                availableCells.push({ row: i, column: j });
            }
        }
    }
    return availableCells;
}

// A cella kiemelése a számítógép lépésekor
function highlightCell(row, column) {
    let cellElement = document.querySelector(`.cell[row="${row}"][column="${column}"]`);
    if (cellElement) {
        cellElement.style.backgroundColor = 'white';
        setTimeout(() => {
            cellElement.textContent = '•';
            cellElement.style.backgroundColor = '#063b5f';
        }, 400);
    }
}

// A játék vége logikája
function endGame() {
    // Ide jön a játék vége logikája, pl. kiírni az eredményt
}

// Játékosok váltása
function switchPlayer() {
    currentPlayer = currentPlayer === humanPlayer ? computerPlayer : humanPlayer;
    if (currentPlayer === computerPlayer) {
        setTimeout(handleAIMove, 1000); // Kis késleltetés a számítógép lépése előtt
    }
}