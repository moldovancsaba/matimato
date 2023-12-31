//------------------------------
// matimato-expert.js -----------
//------------------------------
// JAVASCRIPT STARTS HERE ------
//------------------------------












//--------------------------------------------------------------------
// #MM0001 Global variables ------------------------------------------
//--------------------------------------------------------------------

let currentLevel = 2; // Current level, starting with a 2x2 board
let maxLevel = 9; // Maximum level, up to a 9x9 board
let gameWon = false; // Indicates if the player has won all levels

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
        lastSelectedColumn = column; // Update the last selected column
        isPlayerTurn = false;
        updateScoreDisplay();

        // Check if the player has any more possible moves
        if (!canPlayerMove()) {
            checkEndGame();
        } else {
            setTimeout(computerMove, 500);
        }
    }
}

function computerMove() {
    if (!isPlayerTurn) {
        let availableCells = getAvailableCellsInColumn(lastSelectedColumn);
        if (availableCells.length > 0) {
            let maxCell = availableCells.reduce((max, cell) => board.cells[cell.row][cell.column] > board.cells[max.row][max.column] ? cell : max, availableCells[0]);
            aiScore += board.cells[maxCell.row][maxCell.column];
            board.cells[maxCell.row][maxCell.column] = '•';
            highlightCell(maxCell.row, maxCell.column);
            highlightRow(maxCell.row); // Highlight the row where the AI moved
            isPlayerTurn = true;
            lastSelectedRow = maxCell.row; // Update the last selected row
            updateScoreDisplay();
        }
        checkEndGame(); // Always check for end game after AI's move
    }
}

function checkEndGame() {
    if ((!isPlayerTurn && !canComputerMove()) || (isPlayerTurn && !canPlayerMove())) {
        endGame();
    }
}


function canComputerMove() {
    // Implement logic to check if the computer can make a move
    return getAvailableCellsInColumn(lastSelectedColumn).length > 0;
}

function canPlayerMove() {
    // Implement logic to check if the player can make a move
    return getAvailableCellsInRow(lastSelectedRow).length > 0;
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

function getAvailableCellsInRow(row) {
    let availableCells = [];
    for (let j = 0; j < board.columns; j++) {
        if (board.cells[row][j] !== '•') {
            availableCells.push({ row: row, column: j });
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
    // Create a new board based on the current level
    board = new Board(currentLevel, currentLevel);
    playerScore = 0;
    aiScore = 0;
    isPlayerTurn = true; // Player starts the game
    lastSelectedRow = null;
    lastSelectedColumn = null;
    createBoard();
    updateScoreDisplay();
    showGame(); // Make sure to show the game board
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
    document.getElementById('score').style.display = 'none';
    document.getElementById('end-game-message').style.display = 'none';
    document.getElementById('start-screen').style.display = 'block';
}

function endGame() {
    let winnerMessageElement = document.getElementById('winner-message');
    let restartButtonElement = document.getElementById('restart-button');
    let nextLevelButtonElement = document.getElementById('next-level-button');
    let mainMenuButtonElement = document.getElementById('main-menu-button');

    if (playerScore > aiScore) {
        if (currentLevel < maxLevel) {
            winnerMessageElement.textContent = 'You win this round! Moving to next level...';
            nextLevelButtonElement.style.display = 'block';
            restartButtonElement.style.display = 'none';
            mainMenuButtonElement.style.display = 'none';
            currentLevel++;
        } else {
            winnerMessageElement.textContent = 'Congratulations! You have won the game!';
            nextLevelButtonElement.style.display = 'none';
            restartButtonElement.style.display = 'block';
            mainMenuButtonElement.style.display = 'block';
            gameWon = true;
        }
    } else {
        winnerMessageElement.textContent = aiScore > playerScore ? 'AI wins!' : 'Draw!';
        nextLevelButtonElement.style.display = 'none';
        restartButtonElement.style.display = 'block';
        mainMenuButtonElement.style.display = 'block';
        gameWon = false;
        currentLevel = 2;
    }

    document.getElementById('board').style.display = 'none';
    document.getElementById('end-game-message').style.display = 'block';
}

// Event handler for the Restart and Next Level buttons
document.getElementById('restart-button').addEventListener('click', () => {
    resetGame();
    startGame();
});
document.getElementById('next-level-button').addEventListener('click', () => {
    resetGame();
    startGame();
});

// Event handler for the Main Menu button (assuming there is one)
document.getElementById('main-menu-button').addEventListener('click', () => {
    // Logic to return to the main menu
});

// Other necessary functions...












//------------------------------
// END OF CODE -----------------
//------------------------------
// CREATED BY MOLDOVAN ---------
//------------------------------
// JAVASCRIPT WRITTEN BY GPT ---
//------------------------------