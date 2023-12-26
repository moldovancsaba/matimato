// matimato-core.js

//--------------------------------------------------
//--------------------------------------------------

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

//--------------------------------------------------
//--------------------------------------------------

// #MM0002 Create Gamefield
function createBoard() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    boardElement.style.gridTemplateRows = `repeat(${board.rows}, 1fr)`; // Adjuk hozzá a sorokat

    for (let i = 0; i < board.rows; i++) {
        const rowDiv = document.createElement('div'); // Létrehozzuk a sor div-et
        rowDiv.className = 'row';
        for (let j = 0; j < board.columns; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = board.cells[i][j];
            cell.setAttribute('row', i);
            cell.setAttribute('column', j);
            cell.addEventListener('click', () => handleCellClick(i, j));
            rowDiv.appendChild(cell); // Adjuk hozzá a cellát a sor div-hez
        }
        boardElement.appendChild(rowDiv); // Adjuk hozzá a sor div-et a táblához
    }
}

//--------------------------------------------------
//--------------------------------------------------

// #MM0003 Game Logic

let lastSelectedRow = null; // Utoljára választott sor
let lastSelectedColumn = null; // Utoljára választott oszlop

function handleCellClick(row, column) {
    if (isPlayerTurn && board.cells[row][column] !== '•' && (lastSelectedColumn === null || lastSelectedColumn === column)) {
        playerScore += board.cells[row][column];
        board.cells[row][column] = '•';
        highlightCell(row, column);
        highlightRow(row); // Sor kiemelése - Megfordítva
        isPlayerTurn = false;
        updateScoreDisplay();
        lastSelectedRow = row; // Az utoljára választott sor mentése
        setTimeout(computerMove, 1000);
    }
}

function computerMove() {
    let availableCells = lastSelectedRow != null ? getAvailableCellsInRow(lastSelectedRow) : getAvailableCells();
    if (availableCells.length > 0) {
        let randomIndex = Math.floor(Math.random() * availableCells.length);
        let selectedCell = availableCells[randomIndex];
        aiScore += board.cells[selectedCell.row][selectedCell.column];
        board.cells[selectedCell.row][selectedCell.column] = '•';
        highlightCell(selectedCell.row, selectedCell.column);
        highlightColumn(selectedCell.column); // Oszlop kiemelése - Megfordítva
        isPlayerTurn = true;
        lastSelectedColumn = selectedCell.column; // Az utoljára választott oszlop mentése
        updateScoreDisplay();
    }
}

function getAvailableCellsInRow(row) {
    let availableCells = [];
    for (let j = 0; j < board.columns; j++) {
        if (board.cells[row][j] !== '•') {
            availableCells.push({ row: row, column: j });
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

//--------------------------------------------------
//--------------------------------------------------


// #MM0004 User Interface Functions

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
        cell.style.boxSizing = 'border-box'; // A border méretét beleérti a számításba
    });
}

// Sor kiemelése
function highlightRow(row) {
    clearHighlights(); // Előző kiemelések törlése
    document.querySelectorAll(`.row:nth-child(${row + 1}) .cell`).forEach(cell => {
        cell.style.border = '3px solid white';
        cell.style.boxSizing = 'border-box'; // A border méretét beleérti a számításba
    });
}

// Előző kiemelések eltávolítása
function clearHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.style.border = '';
        cell.style.boxSizing = 'content-box'; // Alapértelmezett méretek visszaállítása
    });
}

// Pontszámok megjelenítése
function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    playerScoreElement.textContent = `You: ${playerScore}`;
    aiScoreElement.textContent = `AI: ${aiScore}`;
}

// A képernyő méretének változására való reagálás
window.addEventListener('resize', createBoard);

// A játék indítása
document.addEventListener('DOMContentLoaded', createBoard);

//--------------------------------------------------
//--------------------------------------------------

// #MM0005 Initialize Game
document.addEventListener('DOMContentLoaded', () => {
    createBoard();
    updateScoreDisplay();
});