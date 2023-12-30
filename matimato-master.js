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

let lastSelectedRow = null; // Last selected row
let lastSelectedColumn = null; // Last selected column

function handleCellClick(row, column, masterBoard) {
    if (isPlayerTurn && masterBoard.cells[row][column] !== '•' && (lastSelectedColumn === null || lastSelectedColumn === column)) {
        playerScore += masterBoard.cells[row][column];
        masterBoard.cells[row][column] = '•';
        highlightCell(row, column);
        lastSelectedRow = row; // Update the last selected row
        highlightRow(lastSelectedRow); // Highlight the row
        isPlayerTurn = false;
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
            lastSelectedColumn = bestMove.column; // Update the last selected column
            highlightColumn(lastSelectedColumn); // Highlight the column
            isPlayerTurn = true;
            updateScoreDisplay();
            checkPlayerMovePossibility();
        } else {
            checkEndGame();
        }
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

function canComputerMove() {
    return getAvailableCellsInColumn(lastSelectedColumn).length > 0;
}

function canPlayerMove() {
    return getAvailableCellsInRow(lastSelectedRow).length > 0;
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