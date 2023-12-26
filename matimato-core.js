// matimato-core.js - Rész 1

// #MM0001 Global variables
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

const board = new Board(5, 5);
let playerScore = 0;
let aiScore = 0;
let isPlayerTurn = true; // A játékos kezdi

// #MM0002 Create Gamefield
function createBoard() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    for (let i = 0; i < board.rows; i++) {
        for (let j = 0; j < board.columns; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = board.cells[i][j];
            cell.setAttribute('row', i);
            cell.setAttribute('column', j);
            cell.addEventListener('click', () => handleCellClick(i, j));
            boardElement.appendChild(cell);
        }
    }
}

// matimato-core.js - Rész 2

// #MM0003 Game Logic

function handleCellClick(row, column) {
    if (isPlayerTurn && board.cells[row][column] !== '•') {
        playerScore += board.cells[row][column];
        board.cells[row][column] = '•';
        highlightCell(row, column);
        highlightColumn(column); // Oszlop kiemelése
        isPlayerTurn = false;
        updateScoreDisplay();
        setTimeout(computerMove, 1000);
    }
}

function computerMove() {
    let availableCells = getAvailableCells();
    if (availableCells.length > 0) {
        let randomIndex = Math.floor(Math.random() * availableCells.length);
        let selectedCell = availableCells[randomIndex];
        aiScore += board.cells[selectedCell.row][selectedCell.column];
        board.cells[selectedCell.row][selectedCell.column] = '•';
        highlightCell(selectedCell.row, selectedCell.column);
        highlightRow(selectedCell.row); // Sor kiemelése
        isPlayerTurn = true;
        updateScoreDisplay();
    }
}

// ...

// #MM0004 User Interface Functions

// ...

// A cella kiemelése
function highlightCell(row, column) {
    let cellElement = document.querySelector(`.cell[row="${row}"][column="${column}"]`);
    if (cellElement) {
        cellElement.style.backgroundColor = '#444444';
        setTimeout(() => {
            cellElement.textContent = '•';
            cellElement.style.backgroundColor = ''; // Háttérszín visszaállítása
        }, 500);
    }
}

// Oszlop kiemelése
function highlightColumn(column) {
    clearHighlights(); // Előző kiemelések törlése
    document.querySelectorAll(`.cell[column="${column}"]`).forEach(cell => {
        cell.style.border = '3px solid white';
    });
}

// Sor kiemelése
function highlightRow(row) {
    clearHighlights(); // Előző kiemelések törlése
    document.querySelector(`.row:nth-child(${row + 1})`).style.border = '3px solid white';
}

// Előző kiemelések eltávolítása
function clearHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.style.border = '';
    });
    document.querySelectorAll('.row').forEach(row => {
        row.style.border = '';
    });
}

// ...

// #MM0005 Initialize Game
// ...


// #MM0005 Initialize Game
document.addEventListener('DOMContentLoaded', () => {
    createBoard();
    updateScoreDisplay();
});