//------------------------------
// matimato-master.js ----------
//------------------------------
// JAVASCRIPT STARTS HERE ------
//------------------------------











//--------------------------------------------------------------------
// #MM0001 Global variables ------------------------------------------
//--------------------------------------------------------------------

class MasterBoard {
    constructor(size) {
        this.size = size; // Board size, always 7x7 for Master level
        this.cells = this.createInitialBoard();
    }

    createInitialBoard() {
        let board = [];
        for (let i = 0; i < this.size; i++) {
            let row = [];
            for (let j = 0; j < this.size; j++) {
                row.push(Math.floor(Math.random() * 9) + 1);
            }
            board.push(row);
        }
        return board;
    }
}

// Initializing the Master game board with 7x7 size
let masterBoard = new MasterBoard(7);
let playerScore = 0; // Player's score
let aiScore = 0;     // AI's score
let isPlayerTurn = true; // Flag to check if it's player's turn













//--------------------------------------------------------------------
// #MM0002 Create Gamefield ------------------------------------------
//--------------------------------------------------------------------

function createMasterBoard() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    boardElement.style.gridTemplateRows = `repeat(${masterBoard.size}, 1fr)`;
    boardElement.style.gridTemplateColumns = `repeat(${masterBoard.size}, 1fr)`;

    for (let i = 0; i < masterBoard.size; i++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';
        for (let j = 0; j < masterBoard.size; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = masterBoard.cells[i][j];
            cell.setAttribute('row', i);
            cell.setAttribute('column', j);
            cell.addEventListener('click', () => handleCellClick(i, j, masterBoard));
            rowDiv.appendChild(cell);
        }
        boardElement.appendChild(rowDiv);
    }
}














//--------------------------------------------------------------------
// #MM0003 Game Logic ------------------------------------------------
//--------------------------------------------------------------------

function handleCellClick(row, column, masterBoard) {
    if (isPlayerTurn && masterBoard.cells[row][column] !== '•') {
        playerScore += masterBoard.cells[row][column];
        masterBoard.cells[row][column] = '•';
        highlightCell(row, column);
        highlightRow(row); // Highlight the row where the player moved
        isPlayerTurn = false;
        lastSelectedRow = row; // Update the last selected row
        lastSelectedColumn = null; // Clear the last selected column for AI
        setTimeout(masterComputerMove, 500);
    }
    updateScoreDisplay();
}

function masterComputerMove() {
    if (!isPlayerTurn) {
        let bestMove = calculateBestMove(masterBoard, lastSelectedRow);
        if (bestMove) {
            aiScore += masterBoard.cells[bestMove.row][bestMove.column];
            masterBoard.cells[bestMove.row][bestMove.column] = '•';
            highlightCell(bestMove.row, bestMove.column);
            highlightColumn(bestMove.column); // Highlight the column where the AI moved
            isPlayerTurn = true;
            lastSelectedColumn = bestMove.column; // Update the last selected column
            lastSelectedRow = null; // Clear the last selected row for player
            updateScoreDisplay();
        } else {
            checkEndGame();
        }
    }
}

function calculateBestMove(board, lastRow) {
    let bestScoreDiff = -Infinity;
    let bestMove = null;

    // Iterate through all available cells in the last selected row by the player
    for (let j = 0; j < board.size; j++) {
        if (board.cells[lastRow][j] !== '•') {
            let tempScore = board.cells[lastRow][j];
            board.cells[lastRow][j] = '•';
            let playerBestMove = findPlayerBestMove(board, j);
            let scoreDiff = tempScore - playerBestMove;
            if (scoreDiff > bestScoreDiff) {
                bestScoreDiff = scoreDiff;
                bestMove = { row: lastRow, column: j };
            }
            board.cells[lastRow][j] = tempScore; // Reset the cell value
        }
    }

    return bestMove;
}

function findPlayerBestMove(board, lastColumn) {
    let bestScore = 0;
    // Iterate through all available cells in the last selected column by the AI
    for (let i = 0; i < board.size; i++) {
        if (board.cells[i][lastColumn] !== '•') {
            bestScore = Math.max(bestScore, board.cells[i][lastColumn]);
        }
    }
    return bestScore;
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
    startMasterGame(); // Start the Master mode game immediately when the page loads
});

function startMasterGame() {
    masterResetGame();
    showGame(); // Make sure to show the game board
}

function masterResetGame() {
    masterBoard = new MasterBoard(7); // Create a new 7x7 board for Master mode
    masterBoard.cells = masterBoard.createInitialBoard(); // Generate new cell values for the board
    playerScore = 0;
    aiScore = 0;
    isPlayerTurn = true;
    lastSelectedRow = null;
    lastSelectedColumn = null;
    createMasterBoard();
    updateScoreDisplay();
}

function showGame() {
    document.getElementById('board').style.display = 'grid';
    document.getElementById('score').style.display = 'block';
    document.getElementById('end-game-message').style.display = 'none';
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

// Event handler for the Restart button
document.getElementById('restart-button').addEventListener('click', () => {
    masterResetGame();
    startMasterGame();
});















//------------------------------
// END OF CODE -----------------
//------------------------------
// CREATED BY MOLDOVAN ---------
//------------------------------
// JAVASCRIPT WRITTEN BY GPT ---
//------------------------------