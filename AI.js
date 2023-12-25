function handleAIMove() {
    let availableCells = getAvailableCells();

    if (availableCells.length === 0) {
        endGame();
        return;
    }

    let randomCellIndex = Math.floor(Math.random() * availableCells.length);
    let selectedCell = availableCells[randomCellIndex];
    
    aiScore += board.cells[selectedCell.row][selectedCell.column];
    board.removeNumber(selectedCell.row, selectedCell.column);
    updateScoreDisplay();
    updateBoardAppearance(selectedCell.row, selectedCell.column);
}

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

function updateBoardAppearance(row, column) {
    let cellElement = document.querySelector(`.cell[row="${row}"][column="${column}"]`);
    cellElement.style.backgroundColor = 'white';
    setTimeout(() => {
        cellElement.textContent = '•';
        cellElement.style.backgroundColor = '#063b5f';
    }, 400);
}

// Az AI lépésének indítása
handleAIMove();