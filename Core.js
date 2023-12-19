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
        this.cells[row][column] = 0; // Nulla értékre állítás eltávolításkor
    }

    hasAvailableMoves() {
        return this.cells.some(row => row.some(cell => cell !== 0));
    }
}

// Globális változók
const board = new Board(5, 5); // 5x5-ös tábla
let totalScore = 0; // Összpontszám

// Játéktábla létrehozása
function createBoard(board) {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    boardElement.style.gridTemplateColumns = `repeat(${board.columns}, 1fr)`; // Oszlopok beállítása
    for (let i = 0; i < board.rows; i++) {
        for (let j = 0; j < board.columns; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = board.cells[i][j] !== 0 ? board.cells[i][j] : ''; // Üres cella kezelése
            cell.addEventListener('click', () => handleCellClick(i, j));
            boardElement.appendChild(cell);
        }
    }
}

// Cellákra kattintás kezelése
function handleCellClick(row, column) {
    if (board.cells[row][column] !== 0) {
        totalScore += board.cells[row][column];
        board.removeNumber(row, column);
        updateScoreDisplay();
        createBoard(board);
    }
}

// Pontszám megjelenítése
function updateScoreDisplay() {
    const scoreElement = document.getElementById('score');
    scoreElement.textContent = `Összpontszám: ${totalScore}`;
}

// A képernyő méretének változására való reagálás
window.addEventListener('resize', function() {
    createBoard(board);
});

// A játék indítása
createBoard(board);