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
}

class Player {
    constructor() {
        this.score = 0;
    }

    addScore(value) {
        this.score += value;
    }
}

// Globális változók
const board = new Board(5, 5);
const humanPlayer = new Player();
const computerPlayer = new Player();
let isPlayerTurn = true; // A játékos kezdi

// Játéktábla létrehozása
function createBoard() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    for (let i = 0; i < board.rows; i++) {
        for (let j = 0; j < board.columns; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = board.cells[i][j];
            cell.addEventListener('click', () => handleCellClick(i, j));
            boardElement.appendChild(cell);
        }
    }
}

// Cellákra kattintás kezelése
function handleCellClick(row, column) {
    if (isPlayerTurn && board.cells[row][column] !== '•') {
        humanPlayer.addScore(board.cells[row][column]);
        updateCell(row, column);
        updateScoreDisplay();
        isPlayerTurn = false;
        setTimeout(() => computerMove(), 1000);
    }
}

// A számítógép lépése
function computerMove() {
    let availableCells = getAvailableCells();
    if (availableCells.length > 0) {
        let randomIndex = Math.floor(Math.random() * availableCells.length);
        let selectedCell = availableCells[randomIndex];
        computerPlayer.addScore(board.cells[selectedCell.row][selectedCell.column]);
        updateCell(selectedCell.row, selectedCell.column);
        updateScoreDisplay();
        isPlayerTurn = true;
    }
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

// Cella frissítése
function updateCell(row, column) {
    highlightCell(row, column);
    board.cells[row][column] = '•';
}

// Cella kiemelése
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
window.addEventListener('resize', createBoard);

// A játék indítása
document.addEventListener('DOMContentLoaded', () => {
    createBoard();
    if (isPlayerTurn) {
        // A játékos kezdi a játékot
    } else {
        setTimeout(computerMove, 1000); // A számítógép kezdi
    }
});