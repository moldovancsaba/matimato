// user-interface.js

// Játéktábla létrehozása
function createBoard() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
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

// Cellákra kattintás kezelése
function handleCellClick(row, column) {
    if (board.cells[row][column] !== '•' && currentPlayer === humanPlayer) {
        humanPlayer.makeMove(row, column);
        highlightCell(row, column);
        switchPlayer();
    }
}

// A cella kiemelése a lépésekor
function highlightCell(row, column) {
    let cellElement = document.querySelector(`.cell[row="${row}"][column="${column}"]`);
    if (cellElement) {
        cellElement.style.backgroundColor = '#444444';
        setTimeout(() => {
            cellElement.textContent = '•';
            cellElement.style.backgroundColor = '';
        }, 500);
    }
}

// Pontszámok megjelenítése
function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    playerScoreElement.textContent = `You: ${humanPlayer.score}`;
    aiScoreElement.textContent = `AI: ${computerPlayer.score}`;
}

// A képernyő méretének változására való reagálás
window.addEventListener('resize', function() {
    createBoard();
});

// A játék indítása
document.addEventListener('DOMContentLoaded', createBoard);