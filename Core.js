// Játék tábla osztály
class Board {
    constructor() {
        this.rows = 5;
        this.columns = 5;
        this.cells = this.createInitialBoard();
    }

    // Random számok generálása a táblára
    createInitialBoard() {
        let board = [];
        for (let i = 0; i < this.rows; i++) {
            let row = [];
            for (let j = 0; j < this.columns; j++) {
                let num = Math.floor(Math.random() * 9) + 1;
                row.push(num);
            }
            board.push(row);
        }
        return board;
    }

    // Szám eltávolítása a tábláról
    removeNumber(row, column) {
        this.cells[row][column] = 0;
    }
}

// A tábla létrehozása és megjelenítése
function createBoard(board) {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';

    for (let i = 0; i < board.rows; i++) {
        for (let j = 0; j < board.columns; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            const cellContent = document.createElement('div');
            cellContent.className = 'cell-content';
            cellContent.textContent = board.cells[i][j];
            cell.appendChild(cellContent);
            cell.onclick = () => handleCellClick(i, j);
            boardElement.appendChild(cell);
        }
    }
}

// Globális változók
const board = new Board();
let totalScore = 0;

// Kattintás kezelése
function handleCellClick(row, column) {
    if (board.cells[row][column] !== 0) {
        totalScore += board.cells[row][column];
        board.removeNumber(row, column);
        updateBoard();
        displayScore();
    }
}

// Tábla frissítése
function updateBoard() {
    createBoard(board);
}

// Pontszám megjelenítése
function displayScore() {
    const scoreElement = document.getElementById('score');
    scoreElement.textContent = "Total Score: " + totalScore;
}

// Tábla és pontszám inicializálása
createBoard(board);
displayScore();
// Stílus és HTML elemek inicializálása
document.addEventListener('DOMContentLoaded', function() {
    // Fejléc stílusának beállítása
    const header = document.createElement('h1');
    header.textContent = 'Matimato Game';
    header.style.textAlign = 'center';
    header.style.backgroundColor = '#3399aa';
    header.style.color = 'white';
    header.style.padding = '10px';
    header.style.margin = '0';
    header.style.position = 'fixed';
    header.style.top = '0';
    header.style.width = '100%';
    header.style.zIndex = '1000';

    // Pontszám stílusának beállítása
    const scoreElement = document.createElement('div');
    scoreElement.id = 'score';
    scoreElement.style.textAlign = 'center';
    scoreElement.style.marginTop = '60px';

    // Elemek hozzáadása a dokumentumhoz
    document.body.insertBefore(header, document.body.firstChild);
    document.body.insertBefore(scoreElement, document.getElementById('board'));
});