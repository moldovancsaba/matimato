//------------------------------
// 80-matimato.js --------------
//------------------------------
// JAVASCRIPT STARTS HERE ------
//------------------------------

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

let board = new Board(4, 4);
let playerScore = 0; 
let aiScore = 0;
let isPlayerTurn = true;

function createBoard() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    boardElement.style.gridTemplateRows = `repeat(${board.rows}, 1fr)`;
    boardElement.style.gridTemplateColumns = `repeat(${board.columns}, 1fr)`;

    for (let i = 0; i < board.rows; i++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';
        for (let j = 0; j < board.columns; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = board.cells[i][j];
            cell.setAttribute('row', i);
            cell.setAttribute('column', j);
            cell.addEventListener('click', () => handleCellClick(i, j));
            rowDiv.appendChild(cell);
        }
        boardElement.appendChild(rowDiv);
    }
}

let lastSelectedRow = null; 
let lastSelectedColumn = null; 

function handleCellClick(row, column) {
    if (isPlayerTurn && board.cells[row][column] !== '•' && (lastSelectedRow === null || lastSelectedRow === row)) {
        playerScore += board.cells[row][column];
        markCell(document.querySelector(`.cell[row="${row}"][column="${column}"]`));
        board.cells[row][column] = '•';
        highlightColumn(column);
        isPlayerTurn = false;
        lastSelectedColumn = column; 
        setTimeout(computerMove, 500);
    }
    updateScoreDisplay();
}

function computerMove() {
    if (!isPlayerTurn) {
        let availableCells = getAvailableCellsInColumn(lastSelectedColumn);
        if (availableCells.length > 0) {
            let maxCell = availableCells.reduce((max, cell) => 
                board.cells[cell.row][cell.column] > board.cells[max.row][max.column] ? cell : max, availableCells[0]);
            aiScore += board.cells[maxCell.row][maxCell.column];
            markCell(document.querySelector(`.cell[row="${maxCell.row}"][column="${maxCell.column}"]`));
            board.cells[maxCell.row][maxCell.column] = '•';
            highlightRow(maxCell.row);
            isPlayerTurn = true;
            lastSelectedRow = maxCell.row;
            updateScoreDisplay();
            checkPlayerMovePossibility();
        } else {
            checkEndGame();
        }
    }
}

function markCell(cell) {
    cell.classList.add('cell-marked');
    setTimeout(() => cell.classList.remove('cell-marked'), 500);
}

function highlightColumn(column) {
    clearHighlights();
    document.querySelectorAll(`.cell[column="${column}"]`).forEach(cell => {
        cell.classList.add('cell-highlighted-column');
    });
}

function highlightRow(row) {
    clearHighlights();
    document.querySelectorAll(`.row:nth-child(${row + 1}) .cell`).forEach(cell => {
        cell.classList.add('cell-highlighted-row');
    });
}

function clearHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('cell-highlighted-column', 'cell-highlighted-row');
    });
}

function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    playerScoreElement.textContent = `You: ${playerScore}`;
    aiScoreElement.textContent = `AI: ${aiScore}`;
}

function checkPlayerMovePossibility() {
    if (!canPlayerMove()) {
        endGame();
    }
}

function canPlayerMove() {
    return getAvailableCellsInRow(lastSelectedRow).length > 0;
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

function checkEndGame() {
    if ((!isPlayerTurn && !canComputerMove()) || (isPlayerTurn && !canPlayerMove())) {
        endGame();
    }
}

function canComputerMove() {
    return getAvailableCellsInColumn(lastSelectedColumn).length > 0;
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

function endGame() {
    let winner;
    if (playerScore > aiScore) {
        winner = 'Player wins!';
    } else if (aiScore > playerScore) {
        winner = 'AI wins!';
    } else {
        winner = 'Draw!';
    }
    document.getElementById('end-game-message').style.display = 'block';
    document.getElementById('winner-message').textContent = winner;
}

document.addEventListener('DOMContentLoaded', () => {
    resetGame();
});

function resetGame() {
    board = new Board(4, 4); 
    board.cells = board.createInitialBoard();
    playerScore = 0;
    aiScore = 0;
    isPlayerTurn = true;
    lastSelectedRow = null;
    lastSelectedColumn = null;
    createBoard();
    updateScoreDisplay();
    document.getElementById('end-game-message').style.display = 'none';
}

document.getElementById('restart-button').addEventListener('click', resetGame);

//------------------------------
// END OF CODE -----------------
//------------------------------
// CREATED BY MOLDOVAN ---------
//------------------------------
// JAVASCRIPT BY GPT -----------
//------------------------------