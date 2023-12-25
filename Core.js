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
                row.push(Math.floor(Math.random() * 9) + 1); // Véletlenszerű számok 1 és 9 között
            }
            board.push(row);
        }
        return board;
    }

    removeNumber(row, column) {
        this.cells[row][column] = '•'; // Központi pont megjelenítése eltávolításkor
    }

    hasAvailableMoves() {
        return this.cells.some(row => row.some(cell => cell !== '•'));
    }
}

// Globális változók
const board = new Board(5, 5); // 5x5-ös tábla
let playerScore = 0; // Játékos pontszáma
let aiScore = 0; // AI pontszáma

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

// A játék indítása
createBoard(board);