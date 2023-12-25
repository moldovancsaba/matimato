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
        playerScore += isNaN(board.cells[row][column]) ? 0 : board.cells[row][column];
        board.removeNumber(row, column);
        updateScoreDisplay();
        aiMove();
        createBoard(board);
    }
}

// AI lépése
function aiMove() {
    // Itt implementáld az AI logikáját
    // Példa: véletlenszerű lépés
    const availableCells = [];
    board.cells.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            if (cell !== '•') {
                availableCells.push({row: rowIndex, col: colIndex});
            }
        });
    });

    if (availableCells.length > 0) {
        const randomCell = availableCells[Math.floor(Math.random() * availableCells.length)];
        aiScore += isNaN(board.cells[randomCell.row][randomCell.col]) ? 0 : board.cells[randomCell.row][randomCell.col];
        board.removeNumber(randomCell.row, randomCell.col);
        updateScoreDisplay();
    }
}

// Pontszám megjelenítése
function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    playerScoreElement.textContent = `You: ${playerScore}`;
    aiScoreElement.textContent = `AI: ${aiScore}`;
}

// A játék indítása
createBoard(board);