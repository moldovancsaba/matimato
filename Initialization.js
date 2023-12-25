// Initialization.js

// Globális változók
const board = new Board(5, 5); // 5x5-ös tábla
let playerScore = 0; // Játékos pontszáma
let aiScore = 0; // AI pontszáma

// Játék indítása
function startGame() {
    createBoard(board);
    updateScoreDisplay();
    handleAIMove(); // AI kezdi a játékot
}

// Pontszámok megjelenítése
function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    playerScoreElement.textContent = `You: ${playerScore}`;
    const aiScoreElement = document.getElementById('ai-score');
    aiScoreElement.textContent = `AI: ${aiScore}`;
}

// A játék indítása az oldal betöltődésekor
document.addEventListener('DOMContentLoaded', startGame);