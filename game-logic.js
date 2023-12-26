// game-logic.js

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
let currentPlayer = computerPlayer; // A számítógép kezdi
let lastPlayerColumn = null; // Az utolsó játékos által választott oszlop

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

function getAvailableCellsInColumn(column) {
    let availableCells = [];
    for (let i = 0; i < board.rows; i++) {
        if (board.cells[i][column] !== '•') {
            availableCells.push({ row: i, column: column });
        }
    }
    return availableCells;
}

// A számítógép lépésének kezelése
function handleAIMove() {
    let availableCells = lastPlayerColumn === null ? getAvailableCells() : getAvailableCellsInColumn(lastPlayerColumn);

    if (availableCells.length === 0) {
        endGame();
        return;
    }

    let randomCellIndex = Math.floor(Math.random() * availableCells.length);
    let selectedCell = availableCells[randomCellIndex];
    
    computerPlayer.makeMove(selectedCell.row, selectedCell.column);
    lastPlayerColumn = null; // Az utolsó oszlop törlése, hogy a következő körben újra szabadon választhasson
}

function endGame() {
    // Játék vége logikája
}

function switchPlayer() {
    currentPlayer = currentPlayer === humanPlayer ? computerPlayer : humanPlayer;
}