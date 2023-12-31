//------------------------------
// matimato-master.js ----------
//------------------------------
// JAVASCRIPT STARTS HERE ------
//------------------------------




//--------------------------------------------------------------------
// #MM0001 Global variables ------------------------------------------
//--------------------------------------------------------------------




let playerScore = 0; // Player's score
let aiScore = 0;     // AI's score
let isPlayerTurn = true; // The player starts the game

class MasterBoard {
    constructor(size) {
        this.size = size; // Fixed size for Master level
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

let masterBoard = new MasterBoard(7); // Creating a 7x7 board for Master level






function createMasterBoard() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    boardElement.style.gridTemplateRows = `repeat(${masterBoard.size}, 1fr)`;
    boardElement.style.gridTemplateColumns = `repeat(${masterBoard.size}, 1fr)`;

    for (let i = 0; i < masterBoard.size; i++) {
        for (let j = 0; j < masterBoard.size; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = masterBoard.cells[i][j];
            cell.setAttribute('row', i);
            cell.setAttribute('column', j);
            cell.addEventListener('click', () => handleCellClick(i, j));
            boardElement.appendChild(cell);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    createMasterBoard();
    // Additional initialization code can be added here if needed
});





let lastSelectedRow = null; // Tracks the last selected row
let lastSelectedColumn = null; // Tracks the last selected column

function handleCellClick(row, column) {
    if (isPlayerTurn && masterBoard.cells[row][column] !== '•') {
        makeMove(row, column, masterBoard);
        if (!isPlayerTurn) {
            masterComputerMove();
        }
    }
}

function makeMove(row, column, board) {
    let scoreToAdd = board.cells[row][column];
    board.cells[row][column] = '•';
    highlightCell(row, column);

    if (isPlayerTurn) {
        playerScore += scoreToAdd;
        lastSelectedRow = row;
        highlightRow(lastSelectedRow);
        isPlayerTurn = false;
    } else {
        aiScore += scoreToAdd;
        lastSelectedColumn = column;
        highlightColumn(lastSelectedColumn);
        isPlayerTurn = true;
    }
    updateScoreDisplay();
}

function masterComputerMove() {
    let bestMove = calculateBestMove(masterBoard);
    if (bestMove) {
        makeMove(bestMove.row, bestMove.column, masterBoard);
    } else {
        checkEndGame();
    }
}

function calculateBestMove(board) {
    let bestScoreDiff = -Infinity;
    let bestMove = null;
    let availableCells = getAvailableCellsInRow(lastSelectedRow);

    availableCells.forEach(cell => {
        let tempScore = board.cells[cell.row][cell.column];
        board.cells[cell.row][cell.column] = '•';
        let playerBestMove = findPlayerBestMove(board, cell.column);
        let scoreDiff = tempScore - playerBestMove;
        if (scoreDiff > bestScoreDiff) {
            bestScoreDiff = scoreDiff;
            bestMove = cell;
        }
        board.cells[cell.row][cell.column] = tempScore; // Reset the cell value
    });

    return bestMove;
}

function findPlayerBestMove(board, column) {
    let bestScore = 0;
    for (let i = 0; i < board.size; i++) {
        if (board.cells[i][column] !== '•') {
            bestScore = Math.max(bestScore, board.cells[i][column]);
        }
    }
    return bestScore;
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

function checkEndGame() {
    if ((!isPlayerTurn && !canComputerMove()) || (isPlayerTurn && !canPlayerMove())) {
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



document.addEventListener('DOMContentLoaded', () => {
    startMasterGame(); // Start the Master level game immediately when the page loads
});

function startMasterGame() {
    masterResetGame();
    showGame(); // Display the game board
}

function masterResetGame() {
    masterBoard = new MasterBoard(7); // Create a new 7x7 board for Master mode
    masterBoard.cells = masterBoard.createInitialBoard(); // Generate new cell values for the board
    playerScore = 0;
    aiScore = 0;
    isPlayerTurn = true; // The player starts first in Master mode
    createMasterBoard(); // Create and display the game board
    updateScoreDisplay(); // Update the score display
}

function showGame() {
    document.getElementById('board').style.display = 'grid';
    document.getElementById('score').style.display = 'block';
    document.getElementById('end-game-message').style.display = 'none';
}


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