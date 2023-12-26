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
let isPlayerTurn = true;

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

function handleCellClick(row, column) {
    if (isPlayerTurn && board.cells[row][column] !== '•') {
        playerScore += board.cells[row][column];
        highlightColumn(column);
        board.cells[row][column] = '•';
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
        highlightRow(selectedCell.row);
        board.cells[selectedCell.row][selectedCell.column] = '•';
        isPlayerTurn = true;
        updateScoreDisplay();
    }
}

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

function highlightCell(row, column) {
    let cellElement = document.querySelector(`.cell[row="${row}"][column="${column}"]`);
    if (cellElement) {
        cellElement.style.backgroundColor = '#444444';
        setTimeout(() => {
            cellElement.textContent = '•';
        }, 500);
    }
}

function highlightColumn(column) {
    document.querySelectorAll(`.cell[column="${column}"]`).forEach(cell => {
        cell.style.border = '2px solid white';
    });
}

function highlightRow(row) {
    document.querySelectorAll(`.cell[row="${row}"]`).forEach(cell => {
        cell.style.border = '2px solid white';
    });
}

function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    playerScoreElement.textContent = `You: ${playerScore}`;
    aiScoreElement.textContent = `AI: ${aiScore}`;
}

document.addEventListener('DOMContentLoaded', () => {
    createBoard();
    updateScoreDisplay();
});