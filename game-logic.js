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
}

const board = new Board(5, 5);
let playerScore = 0;
let aiScore = 0;
let isPlayerTurn = true;

function handleCellClick(row, column) {
    if (isPlayerTurn && board.cells[row][column] !== '•') {
        playerScore += board.cells[row][column];
        board.removeNumber(row, column);
        highlightColumn(column); // Kiemeli az oszlopot
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
        board.removeNumber(selectedCell.row, selectedCell.column);
        highlightRow(selectedCell.row); // Kiemeli a sort
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

function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    playerScoreElement.textContent = `You: ${playerScore}`;
    aiScoreElement.textContent = `AI: ${aiScore}`;
}

function highlightRow(row) {
    // Implementálja a sor kiemelését
}

function highlightColumn(column) {
    // Implementálja az oszlop kiemelését
}