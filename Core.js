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
        let removedNumber = this.cells[row][column];
        this.cells[row][column] = '•';
        return removedNumber;
    }

    hasAvailableMoves() {
        return this.cells.some(row => row.some(cell => cell !== '•'));
    }
}

// Globális változók
const board = new Board(5, 5);
let playerScore = 0;
let aiScore = 0;

// Játéktábla létrehozása
function createBoard(board) {
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
    if (board.cells[row][column] !== '•') {
        playerScore += board.removeNumber(row, column);
        updateScoreDisplay();
        aiMove();
        createBoard(board);
    }
}

// AI lépés
function aiMove() {
    let availableCells = [];
    board.cells.forEach((row, rowIndex) => {
        row.forEach((cell, columnIndex) => {
            if (cell !== '•') {
                availableCells.push({ rowIndex, columnIndex });
            }
        });
    });

    if (availableCells.length > 0) {
        let randomCell = availableCells[Math.floor(Math.random() * availableCells.length)];
        aiScore += board.removeNumber(randomCell.rowIndex, randomCell.columnIndex);
    }
}

// Pontszám megjelenítése
function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    playerScoreElement.textContent = `You: ${playerScore}`;
    aiScoreElement.textContent = `AI: ${aiScore}`;
}

// A képernyő méretének változására való reagálás
window.addEventListener('resize', function() {
    createBoard(board);
});

// A játék indítása
createBoard(board);