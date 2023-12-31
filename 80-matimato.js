//------------------------------
// matimato-basic.js -----------
//------------------------------
// JAVASCRIPT STARTS HERE ------
//------------------------------






//--------------------------------------------------------------------
// #MM0001 Global Variables
//--------------------------------------------------------------------


// 1.1. Setup variables
let board;
let playerScore = 0; // Player's score
let aiScore = 0;     // AI's score
let isPlayerTurn = true; // Flag to indicate if it's the player's turn
let lastSelectedRow = null; // Last selected row index
let lastSelectedColumn = null; // Last selected column index





//--------------------------------------------------------------------
// #MM0002 Board Class
//--------------------------------------------------------------------


// 2.1. Class definition for the game board
class Board {
    constructor(rows, columns) {
        this.rows = rows;        // Number of rows in the board
        this.columns = columns;  // Number of columns in the board
        this.cells = this.createInitialBoard(); // Initializing the board cells
    }

    // Method to create the initial board with random values
    createInitialBoard() {
        let board = [];
        for (let i = 0; i < this.rows; i++) {
            let row = [];
            for (let j = 0; j < this.columns; j++) {
                // Assigning a random number between 1 and 9 for each cell
                row.push(Math.floor(Math.random() * 9) + 1);
            }
            board.push(row);
        }
        return board;
    }
}







//--------------------------------------------------------------------
// #MM0003 Board Creation Function
//--------------------------------------------------------------------


// 3.1. Function to create and display the game board in the UI
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
// #MM0004 Gameplay Logic
//--------------------------------------------------------------------


// 4.1. Function to handle the player's click on a cell
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


// 4.2. Function for the AI's move
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





//--------------------------------------------------------------------
// #MM0005 End Game Logic
//--------------------------------------------------------------------

// 5.1. Function to check if the player can make a move
function checkPlayerMovePossibility() {
    if (!canPlayerMove()) {
        endGame();
    }
}


// 5.2. Function to determine if there are any available moves in a column
function getAvailableCellsInColumn(column) {
    let availableCells = [];
    for (let i = 0; i < board.rows; i++) {
        if (board.cells[i][column] !== '•') {
            availableCells.push({ row: i, column: column });
        }
    }
    return availableCells;
}


// 5.3. Function to check if the game has ended
function checkEndGame() {
    if ((!isPlayerTurn && !canComputerMove()) || (isPlayerTurn && !canPlayerMove())) {
        endGame();
    }
}


// 5.4. Function to end the game and display the winner
function endGame() {
    let winner;
    if (playerScore > aiScore) {
        winner = 'Player wins!';
    } else if (aiScore > playerScore) {
        winner = 'AI wins!';
    } else {
        winner = 'Draw!';
    }
    document.getElementById('board').style.display = 'none';
    document.getElementById('end-game-message').style.display = 'block';
    document.getElementById('winner-message').textContent = winner;
}


// 5.5. Function to check if the AI can make a move
function canComputerMove() {
    return getAvailableCellsInColumn(lastSelectedColumn).length > 0;
}


// 5.6 Function to check if the player can make a move
function canPlayerMove() {
    return getAvailableCellsInRow(lastSelectedRow).length > 0;
}


// 5.7 Function to determine if there are any available moves in a row
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
// #MM0006 Score Display Update
//--------------------------------------------------------------------


// 6.1 Function to update the score display on the UI
function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    playerScoreElement.textContent = `You: ${playerScore}`;
    aiScoreElement.textContent = `AI: ${aiScore}`;
}





//--------------------------------------------------------------------
// #MM0007 Game Initialization
//--------------------------------------------------------------------


// 7.1. Function to start the game
document.addEventListener('DOMContentLoaded', () => {
    board = new Board(4, 4); // Initialize the board with 4 rows and 4 columns
    createBoard(); // Create and display the game board
    resetGame(); // Reset the game settings
});


// 7.2. Function to reset the game settings
function resetGame() {
    playerScore = 0;
    aiScore = 0;
    isPlayerTurn = true;
    lastSelectedRow = null;
    lastSelectedColumn = null;
    updateScoreDisplay(); // Update the score display
}



//------------------------------
// END OF CODE -----------------
//------------------------------
// CREATED BY MOLDOVAN ---------
//------------------------------
// JAVASCRIPT BY GPT -----------
//------------------------------