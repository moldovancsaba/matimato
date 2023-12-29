//------------------------------
// matimato-expert.js ----------
//------------------------------
// JAVASCRIPT STARTS HERE ------
//------------------------------








//--------------------------------------------------------------------
// #MM0001 Global variables ------------------------------------------
//--------------------------------------------------------------------

let currentLevel = 2;  // Jelenlegi szint, kezdetben 2x2-es tábla
let gameWon = false;   // Jelzi, ha a játékos megnyerte az összes szintet

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

let board = new Board(currentLevel, currentLevel);
let playerScore = 0;
let aiScore = 0;
let isPlayerTurn = true;










//--------------------------------------------------------------------
// #MM0002 Create Gamefield ------------------------------------------
//--------------------------------------------------------------------

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










//--------------------------------------------------------------------
// #MM0003 Game Logic ------------------------------------------------
//--------------------------------------------------------------------

let lastSelectedRow = null; // Last selected row
let lastSelectedColumn = null; // Last selected column

function handleCellClick(row, column) {
    if (isPlayerTurn && board.cells[row][column] !== '•' && (lastSelectedRow === null || lastSelectedRow === row)) {
        playerScore += board.cells[row][column];
        board.cells[row][column] = '•';
        highlightCell(row, column);
        highlightColumn(column); // Highlight the column where the player moved
        isPlayerTurn = false;
        lastSelectedColumn = column; // Update the last selected column
        setTimeout(computerMove, 500);
    }
    updateScoreDisplay();
}

function computerMove() {
    if (!isPlayerTurn) {
        let availableCells = getAvailableCellsInColumn(lastSelectedColumn); // Choose only from the last selected column
        if (availableCells.length > 0) {
            let maxCell = availableCells.reduce((max, cell) => board.cells[cell.row][cell.column] > board.cells[max.row][max.column] ? cell : max, availableCells[0]);
            aiScore += board.cells[maxCell.row][maxCell.column];
            board.cells[maxCell.row][maxCell.column] = '•';
            highlightCell(maxCell.row, maxCell.column);
            highlightRow(maxCell.row); // Highlight the row where the AI moved
            isPlayerTurn = true;
            lastSelectedRow = maxCell.row; // Update the last selected row
            updateScoreDisplay();
            checkPlayerMovePossibility(); // Check if the player can move
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
    if ((!isPlayerTurn && !canComputerMove()) || (isPlayerTurn && !canPlayerMove())) {
        endGame();
    }
}



function endGame() {
    let winner;
    if (playerScore > aiScore) {
        if (currentLevel < maxLevel) {
            winner = 'You win this round! Moving to next level...';
            currentLevel++;
        } else {
            winner = 'Congratulations! You have won the game!';
            gameWon = true;
        }
    } else {
        winner = aiScore > playerScore ? 'AI wins!' : 'Draw!';
        gameWon = false; // Reset gameWon for a new start
        currentLevel = 2; // Reset to the initial level for a new game
    }

    resetGame(); // Call resetGame here to apply the level changes
    document.getElementById('board').style.display = 'none';
    document.getElementById('end-game-message').style.display = 'block';
    document.getElementById('winner-message').textContent = winner;
}

function resetGame() {
    board = new Board(currentLevel, currentLevel);
    playerScore = 0;
    aiScore = 0;
    isPlayerTurn = true;
    lastSelectedRow = null;
    lastSelectedColumn = null;
    createBoard();
    updateScoreDisplay();
    showGame(); // Make sure to show the game board
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













//--------------------------------------------------------------------
// #MM0004 UI Functions ----------------------------------------------
//--------------------------------------------------------------------

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
        cell.style.border = '4px solid #DDDDDD';
        cell.style.boxSizing = 'border-box';
    });
}

function highlightRow(row) {
    clearHighlights();
    document.querySelectorAll(`.row:nth-child(${row + 1}) .cell`).forEach(cell => {
        cell.style.border = '4px solid #DDDDDD';
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










//--------------------------------------------------------------------
// #MM0005 Initialize Game and Firebase Logic ------------------------
//--------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // Display the game board and score when the page loads
    resetGame();
    document.getElementById('board').style.display = 'grid';
    document.getElementById('score').style.display = 'block';

    // Event handler for the Restart button
    document.getElementById('restart-button').addEventListener('click', () => {
        resetGame();
        document.getElementById('board').style.display = 'grid';
        document.getElementById('score').style.display = 'block';
        document.getElementById('end-game-message').style.display = 'none';
    });
});

function resetGame() {
    // If the player wins, increase the level, otherwise reset to level 2
    if (gameWon) {
        currentLevel = Math.min(currentLevel + 1, maxLevel);
    } else {
        currentLevel = 2; // Always start from 2x2 board on reset
    }
    
    // Create a new board based on the current level
    board = new Board(currentLevel, currentLevel);
    playerScore = 0;
    aiScore = 0;
    isPlayerTurn = true; // Player starts the game
    lastSelectedRow = null;
    lastSelectedColumn = null;
    createBoard();
    updateScoreDisplay();
}

function showGame() {
    // Display the game board and score
    document.getElementById('board').style.display = 'grid';
    document.getElementById('score').style.display = 'block';
    document.getElementById('start-screen').style.display = 'none';
}













//--------------------------------------------------------------------
// #MM0006 Start & End -----------------------------------------------
//--------------------------------------------------------------------

function hideGame() {
    document.getElementById('board').style.display = 'none';
    document.getElementById('score').style.display = 'none'; // Hide the score initially
    document.getElementById('end-game-message').style.display = 'none';
    document.getElementById('start-screen').style.display = 'block';
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
// END OF CODE -----------------
//------------------------------
// CREATED BY MOLDOVAN ---------
//------------------------------
// JAVASCRIPT WRITTEN BY GPT ---
//------------------------------