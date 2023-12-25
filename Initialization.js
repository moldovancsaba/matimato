// Initialization.js

document.addEventListener('DOMContentLoaded', function() {
    // Globális változók
    const board = new Board(5, 5); // 5x5-ös tábla
    let humanPlayer = new HumanPlayer(board);
    let computerPlayer = new ComputerPlayer(board);
    let currentPlayer;

    // Pontszámok megjelenítése
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
        for (let i = 0; i < board.rows; i++) {
            for (let j = 0; j < board.columns; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.textContent = board.cells[i][j]; // Szám vagy "•" megjelenítése
                cell.addEventListener('click', () => handleCellClick(i, j, humanPlayer, computerPlayer));
                boardElement.appendChild(cell);
            }
        }
    }

    // Cellákra kattintás kezelése
    function handleCellClick(row, column, humanPlayer, computerPlayer) {
        if (currentPlayer === humanPlayer && humanPlayer.makeMove(row, column)) {
            updateScoreDisplay();
            switchPlayer(computerPlayer);
        }
    }

    // Játékosok váltása
    function switchPlayer(computerPlayer) {
        currentPlayer = computerPlayer;
        handleAIMove(computerPlayer);
    }

    // A játék indítása
    currentPlayer = computerPlayer; // A számítógép kezdi
    createBoard(board);
    handleAIMove(computerPlayer);
});