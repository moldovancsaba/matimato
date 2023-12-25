// Core.js
class Board {
    constructor(rows, columns) {
        this.rows = rows;
        this.columns = columns;
        this.cells = this.createInitialBoard();
    }

    createInitialBoard() {
        let board = [];
        for (let i = 0; i < this.rows; i++) {
            let row = [];
            for (let j = 0; j < this.columns; j++) {
                row.push(Math.floor(Math.random() * 9) + 1);
            }
            board.push(row);
        }
        return board;
    }

    removeNumber(row, column) {
        this.cells[row][column] = '•';
    }

    hasAvailableMoves() {
        return this.cells.some(row => row.some(cell => cell !== '•'));
    }
}

class Player {
    constructor(board) {
        this.board = board;
        this.score = 0;
    }

    makeMove(row, column) {
        if (this.board.cells[row][column] !== '•') {
            this.score += this.board.cells[row][column];
            this.board.removeNumber(row, column);
            return true;
        }
        return false;
    }
}

// Globális változók
const board = new Board(5, 5);
let humanPlayer = new Player(board);
let computerPlayer = new Player(board);
let currentPlayer = computerPlayer;

// Játéktábla létrehozása
function createBoard() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    for (let i = 0; i < board.rows; i++) {
        for (let j = 0; j < board.columns; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = board.cells[i][j];
            cell.setAttribute('data-row', i);
            cell.setAttribute('data-column', j);
            cell.addEventListener('click', () => handleCellClick(i, j));
            boardElement.appendChild(cell);
        }
    }
}

// Cellákra kattintás kezelése
function handleCellClick(row, column) {
    if (board.cells[row][column] !== '•' && currentPlayer === humanPlayer) {
        humanPlayer.makeMove(row, column);
        updateScoreDisplay();
        updateCellAppearance(row, column);
        switchPlayer();
    }
}

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
    updateCellAppearance(selectedCell.row, selectedCell.column);
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
function updateCellAppearance(row, column) {
    let cellElement = document.querySelector(`.cell[data-row="${row}"][data-column="${column}"]`);
    if (cellElement) {
        cellElement.textContent = '•';
    }
}

// A játék vége logikája
function endGame() {
    // Implementáld a játék vége logikáját
}

// Játékosok váltása
function switchPlayer() {
    currentPlayer = currentPlayer === humanPlayer ? computerPlayer : humanPlayer;
    if (currentPlayer === computerPlayer) {
        setTimeout(handleAIMove, 1000); // Kis késleltetés a számítógép lépése előtt
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

// A játék indítása
document.addEventListener('DOMContentLoaded', function() {
    currentPlayer = computerPlayer; // A számítógép kezdi
    createBoard(board);
    handleAIMove();
});