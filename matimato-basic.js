//------------------------------
// matimato-basic.js -----------
//------------------------------
// JAVASCRIPT STARTS HERE ------
//------------------------------









//--------------------------------------------------------------------
// #MM0001 Global variables
//--------------------------------------------------------------------

class Board {
    constructor(rows, columns) {
        this.rows = rows;        // Rows of the grid
        this.columns = columns;  // Columns of the grid
        this.cells = this.createInitialBoard();
    }

    createInitialBoard() {
        let board = [];
        for (let i = 0; i < this.rows; i++) {
            let row = [];
            for (let j = 0; j < this.columns; j++) {
                // Random number between 1 and 9 for each cell
                row.push(Math.floor(Math.random() * 9) + 1);
            }
            board.push(row);
        }
        return board;
    }
}

// Initializing the game board with 4 rows and 4 columns for Basic mode
let board = new Board(4, 4);
let playerScore = 0; // Player's score
let aiScore = 0;     // AI's score
let isPlayerTurn = true; // Flag to check if it's player's turn









//--------------------------------------------------------------------
// #MM0002 Create Gamefield ------------------------------------------
//--------------------------------------------------------------------

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










//--------------------------------------------------------------------
// #MM0003 Game Logic ------------------------------------------------
//--------------------------------------------------------------------

let lastSelectedRow = null; // Last selected row
let lastSelectedColumn = null; // Last selected column

function handleCellClick(row, column, masterBoard) {
    if (isPlayerTurn && masterBoard.cells[row][column] !== '•' && (lastSelectedColumn === null || lastSelectedColumn === column)) {
        playerScore += masterBoard.cells[row][column];
        masterBoard.cells[row][column] = '•';
        highlightCell(row, column);
        highlightColumn(column); // Highlight the column where the player moved
        isPlayerTurn = false;
        lastSelectedColumn = column; // Update the last selected column
        setTimeout(masterComputerMove, 500);
    }
    updateScoreDisplay();
}

function masterComputerMove() {
    if (!isPlayerTurn) {
        let bestMove = calculateBestMove(masterBoard);
        if (bestMove) {
            aiScore += masterBoard.cells[bestMove.row][bestMove.column];
            masterBoard.cells[bestMove.row][bestMove.column] = '•';
            highlightCell(bestMove.row, bestMove.column);
            highlightRow(bestMove.row); // Highlight the row where the AI moved
            isPlayerTurn = true;
            lastSelectedRow = bestMove.row; // Update the last selected row
            updateScoreDisplay();
            checkPlayerMovePossibility(); // Check if the player can move
        } else {
            checkEndGame();
        }
    }
}

function calculateBestMove(board) {
    // Implement AI logic to calculate the best move
    // Ensure it considers the last selected row by the player
}

function checkPlayerMovePossibility() {
    if (!canPlayerMove()) {
        endGame();
    }
}

function getAvailableCellsInColumn(column) {
    let availableCells = [];
    for (let i = 0; i < masterBoard.size; i++) {
        if (masterBoard.cells[i][column] !== '•') {
            availableCells.push({ row: i, column: column });
        }
    }
    return availableCells;
}

function checkEndGame() {
    // Implement logic to check if the game has ended
}

function endGame() {
    // Implement logic to handle the end of the game
}

function canPlayerMove() {
    // Implement logic to check if the player can make a move
    // Consider only the last selected column by the AI
}

function getAvailableCellsInRow(row) {
    let availableCells = [];
    for (let j = 0; j < masterBoard.size; j++) {
        if (masterBoard.cells[row][j] !== '•') {
            availableCells.push({ row: row, column: j });
        }
    }
    return availableCells;
}

// Other necessary functions















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
// #MM0005 Initialize Game and Firebase Logic
//--------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    startGame(); // Start the game immediately when the page loads
});

function startGame() {
    resetGame();
    document.getElementById('board').style.display = 'grid';
    document.getElementById('score').style.display = 'block';
    document.getElementById('start-screen').style.display = 'none';
}

function resetGame() {
    board = new Board(4, 4); // Create a new 4x4 board
    board.cells = board.createInitialBoard(); // Generate new cell values
    playerScore = 0;
    aiScore = 0;
    isPlayerTurn = true;
    lastSelectedRow = null;
    lastSelectedColumn = null;
    createBoard();
    updateScoreDisplay();
}









//--------------------------------------------------------------------
// #MM0006 Start & End -----------------------------------------------
//--------------------------------------------------------------------

function hideGame() {
    document.getElementById('board').style.display = 'none';
    document.getElementById('score').style.display = 'none';
    document.getElementById('end-game-message').style.display = 'none';
    document.getElementById('start-screen').style.display = 'block';
}

// Event handler for the Restart button
document.getElementById('restart-button').addEventListener('click', () => {
    resetGame();
    startGame();
});









//------------------------------
// END OF CODE -----------------
//------------------------------
// CREATED BY MOLDOVAN ---------
//------------------------------
// JAVASCRIPT WRITTEN BY GPT ---
//------------------------------