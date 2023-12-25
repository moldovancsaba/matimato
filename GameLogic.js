// GameLogic.js

// Cellákra kattintás kezelése
function handleCellClick(row, column) {
    if (board.cells[row][column] !== '•') {
        playerScore += isNaN(board.cells[row][column]) ? 0 : parseInt(board.cells[row][column]);
        board.removeNumber(row, column);
        updateScoreDisplay();
        createBoard(board);
        handleAiMove(); // Az AI lépése a játékos után
    }
}

// AI lépése
function handleAiMove() {
    let availableMoves = [];
    for (let i = 0; i < board.rows; i++) {
        for (let j = 0; j < board.columns; j++) {
            if (board.cells[i][j] !== '•') {
                availableMoves.push({ row: i, column: j });
            }
        }
    }

    if (availableMoves.length > 0) {
        let randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        aiScore += parseInt(board.cells[randomMove.row][randomMove.column]);
        board.removeNumber(randomMove.row, randomMove.column);
        setTimeout(() => {
            updateScoreDisplay();
            createBoard(board);
        }, 800); // Késleltetés a vizuális hatás miatt
    }
}

// Pontszámok frissítése
function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    playerScoreElement.textContent = `You: ${playerScore}`;
    aiScoreElement.textContent = `AI: ${aiScore}`;
}

// A képernyő méretének változására való reagálás
window.addEventListener('resize', function() {
    createBoard(board);
});