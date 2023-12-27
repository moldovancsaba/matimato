//------------------------------
// matimato-core.js
//------------------------------
// CODE STARTS HERE
//------------------------------









//------------------------------
// #MM0001 Global variables
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

let board = new Board(5, 5);
let playerScore = 0;
let aiScore = 0;
let isPlayerTurn = true; // A játékos kezdi









//------------------------------
// #MM0002 Create Gamefield
//------------------------------

function createBoard() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    boardElement.style.gridTemplateRows = `repeat(${board.rows}, 1fr)`; 

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









//------------------------------
// #MM0003 Game Logic
//------------------------------

let lastSelectedRow = null; // Utoljára választott sor
let lastSelectedColumn = null; // Utoljára választott oszlop

function handleCellClick(row, column) {
    if (isPlayerTurn && board.cells[row][column] !== '•' && (lastSelectedRow === null || lastSelectedRow === row)) {
        playerScore += board.cells[row][column];
        board.cells[row][column] = '•';
        highlightCell(row, column);
        highlightColumn(column); // Kiemeli az oszlopot, ahol a játékos lépett
        isPlayerTurn = false;
        lastSelectedColumn = column; // Frissíti az utoljára választott oszlopot
        setTimeout(computerMove, 500);
    }
    updateScoreDisplay();
}

function computerMove() {
    if (!isPlayerTurn) {
        let availableCells = getAvailableCellsInColumn(lastSelectedColumn); // Csak az utoljára választott oszlopból választhat

        if (availableCells.length > 0) {
            let maxCell = availableCells.reduce((max, cell) => board.cells[cell.row][cell.column] > board.cells[max.row][max.column] ? cell : max, availableCells[0]);
            aiScore += board.cells[maxCell.row][maxCell.column];
            board.cells[maxCell.row][maxCell.column] = '•';
            highlightCell(maxCell.row, maxCell.column);
            highlightRow(maxCell.row); // Kiemeli a sort, ahol a gép lépett
            isPlayerTurn = true;
            lastSelectedRow = maxCell.row; // Frissíti az utoljára választott sort
            updateScoreDisplay();
            checkPlayerMovePossibility(); // Ellenőrzi, hogy a játékos léphet-e
        } else {
            checkEndGame();
        }
    }
}

function checkPlayerMovePossibility() {
    if (!canPlayerMove()) {
        endGame();
    }
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

function checkEndGame() {
    if (!isPlayerTurn && !canComputerMove() || isPlayerTurn && !canPlayerMove()) {
        endGame();
    }
}

function endGame() {
    let winner;
    if (playerScore > aiScore) {
        winner = 'You win!';
    } else if (aiScore > playerScore) {
        winner = 'AI wins!';
    } else {
        winner = 'Draw!';
    }

    document.getElementById('board').style.display = 'none';
    document.getElementById('end-game-message').style.display = 'block';
    document.getElementById('winner-message').textContent = winner;
}

function canComputerMove() {
    return getAvailableCellsInColumn(lastSelectedColumn).length > 0;
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











//------------------------------
// #MM0004 UI Functions
//------------------------------

function highlightCell(row, column) {
    let cellElement = document.querySelector(`.cell[row="${row}"][column="${column}"]`);
    if (cellElement) {
        cellElement.style.backgroundColor = '#444444';
        setTimeout(() => {
            cellElement.textContent = '•';
            cellElement.style.backgroundColor = '#444444';
        }, 500);
    }
}

function highlightColumn(column) {
    clearHighlights();
    document.querySelectorAll(`.cell[column="${column}"]`).forEach(cell => {
        cell.style.border = '6px solid #8B8B8B';
        cell.style.boxSizing = 'border-box';
    });
}

function highlightRow(row) {
    clearHighlights();
    document.querySelectorAll(`.row:nth-child(${row + 1}) .cell`).forEach(cell => {
        cell.style.border = '6px solid #8B8B8B';
        cell.style.boxSizing = 'border-box';
    });
}

function clearHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.style.border = '';
        cell.style.boxSizing = '';
    });
}

function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    playerScoreElement.textContent = `You: ${playerScore}`;
    aiScoreElement.textContent = `AI: ${aiScore}`;
}









//------------------------------
// #MM0005 Initialize Game
//------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // Display the game board and score when the page loads
    resetGame();
    document.getElementById('board').style.display = 'grid';
    document.getElementById('score').style.display = 'block';

    // Event handler for the Save and Restart button
    document.getElementById('save-and-restart-button').addEventListener('click', () => {
        saveGameResult();
        resetGame();
        document.getElementById('board').style.display = 'grid';
        document.getElementById('score').style.display = 'block';
        document.getElementById('end-game-message').style.display = 'none';
    });
});

function resetGame() {
    board = new Board(5, 5);
    playerScore = 0;
    aiScore = 0;
    isPlayerTurn = true; // Player starts the game
    lastSelectedRow = null;
    lastSelectedColumn = null;
    createBoard();
    updateScoreDisplay();
}

function saveGameResult() {
    const playerNameInput = document.getElementById('player-name');
    const playerName = playerNameInput.value.trim() || generateRandomName();
    const gameResult = {
        playerName: playerName,
        timestamp: new Date().toISOString(),
        score: `Player: ${playerScore}, AI: ${aiScore}`
    };

    // Save to Firebase database
    saveToFirebase(gameResult);
    playerNameInput.value = ''; // Clear the input field
}

function generateRandomName() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let randomName = '';
    for (let i = 0; i < 3; i++) {
        randomName += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return randomName;
}

// Firebase save function (to be implemented later)
function saveToFirebase(gameResult) {
    // Firebase saving logic will be implemented here
}











//------------------------------
// #MM0006 Start & End
//------------------------------

function hideGame() {
    document.getElementById('board').style.display = 'none';
    document.getElementById('score').style.display = 'none'; // Hide the score initially
    document.getElementById('end-game-message').style.display = 'none';
    document.getElementById('start-screen').style.display = 'block';
}







//------------------------------
// END OF CODE
//------------------------------
// CREATED BY MOLDOVAN
//------------------------------
// CODE WRITTEN BY GPT
//------------------------------