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
}

// Globális változók
const board = new Board(5, 5);
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
    if (isPlayerTurn) {
        highlightCell(row, column);
        isPlayerTurn = false;
        setTimeout(() => computerMove(), 1000);
    }
}

// A számítógép lépése
function computerMove() {
    // Véletlenszerűen választ egy cellát
    let availableCells = [];
    document.querySelectorAll('.cell').forEach((cell, index) => {
        if (cell.textContent !== '•') {
            availableCells.push(cell);
        }
    });

    if (availableCells.length > 0) {
        let randomCell = availableCells[Math.floor(Math.random() * availableCells.length)];
        randomCell.click();
    }

    isPlayerTurn = true;
}

// A cella kiemelése
function highlightCell(row, column) {
    let cellElement = document.querySelector(`.cell[row="${row}"][column="${column}"]`);
    if (cellElement) {
        cellElement.style.backgroundColor = '#444444';
        setTimeout(() => {
            cellElement.textContent = '•';
        }, 500);
    }
}

// A játék indítása
document.addEventListener('DOMContentLoaded', createBoard);