// Pontszám megjelenítése
function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    playerScoreElement.textContent = `You: ${humanPlayer.score}`;
    aiScoreElement.textContent = `AI: ${computerPlayer.score}`;
}

// Játéktábla létrehozása
function createBoard(board) {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    boardElement.style.gridTemplateColumns = `repeat(${board.columns}, 1fr)`; // Oszlopok beállítása
    for (let i = 0; i < board.rows; i++) {
        for (let j = 0; j < board.columns; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = board.cells[i][j]; // Szám vagy "•" megjelenítése
            cell.addEventListener('click', () => handleCellClick(i, j));
            boardElement.appendChild(cell);
        }
    }
}

// A képernyő méretének változására való reagálás
window.addEventListener('resize', function() {
    createBoard(board);
});