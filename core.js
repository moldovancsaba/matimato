// core.js

// Globális változók
let humanPlayer = new Player(board);
let computerPlayer = new Player(board);
let currentPlayer = computerPlayer; // A számítógép kezdi
let lastPlayerColumn = null; // Az utolsó játékos által választott oszlop

// A játék indítása és a pontszámok frissítése
document.addEventListener('DOMContentLoaded', () => {
    createBoard();
    updateScoreDisplay();
});

// A játékosok váltása
function switchPlayer() {
    currentPlayer = currentPlayer === humanPlayer ? computerPlayer : humanPlayer;
    if (currentPlayer === computerPlayer) {
        setTimeout(handleAIMove, 1000); // Kis késleltetés a számítógép lépése előtt
    }
}

// A játék vége logikája
function endGame() {
    // Implementáld a játék vége logikáját
}