document.addEventListener('DOMContentLoaded', function() {
    // Pontszámok megjelenítése frissítése
    updateScoreDisplay();

    // Játéktábla létrehozása
    createBoard(board);

    // A játék indítása a számítógép lépésével
    currentPlayer = computerPlayer;
    handleAIMove();
});

function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    playerScoreElement.textContent = `You: ${humanPlayer.score}`;
    aiScoreElement.textContent = `AI: ${computerPlayer.score}`;
}

function createBoard(board) {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    boardElement.style.gridTemplateColumns = `repeat(${board.columns}, 1fr)`;
    for (let i = 0; i < board.rows; i++) {
        for (let j = 0; j < board.columns; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = board.cells[i][j];
            cell.setAttribute('row', i);
            cell.setAttribute('column', j);
            cell.addEventListener('click', () => handleCellClick(i, j));
            boardElement.appendChild(cell);
        }
    }
}

function handleCellClick(row, column) {
    if (board.cells[row][column] !== '•' && currentPlayer === humanPlayer) {
        humanPlayer.makeMove(row, column);
        updateScoreDisplay();
        switchPlayer();
    }
}

function switchPlayer() {
    currentPlayer = currentPlayer === humanPlayer ? computerPlayer : humanPlayer;
    if (currentPlayer === computerPlayer) {
        setTimeout(handleAIMove, 1000); // Kis késleltetés a számítógép lépése előtt
    }
}

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

function endGame() {
    // Ide jön a játék vége logikája, pl. kiírni az eredményt
}