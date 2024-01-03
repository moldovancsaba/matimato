//------------------------------
// 80-matimato.js --------------
//------------------------------
// JAVASCRIPT STARTS HERE ------
//------------------------------

//--------------------------------------------------------------------
// #MM0001 - Class definition for the game board.
//--------------------------------------------------------------------

// 1.1. Class Definition
class Board {
    constructor(rows, columns) {
        this.rows = rows; // Number of rows in the board.
        this.columns = columns; // Number of columns in the board.
        this.cells = this.createInitialBoard(); // Initializing the board cells.
    }

// 1.2. Function to Create the Initial Board Setup with Random Numbers
    createInitialBoard() {
        let board = []; // Initialize an empty array for the board.
        for (let i = 0; i < this.rows; i++) { // Loop through each row.
            let row = []; // Initialize an empty array for the row.
            for (let j = 0; j < this.columns; j++) { // Loop through each column.
                // Push a random number between 1 and 9 into the row array.
                row.push(Math.floor(Math.random() * 9) + 1);
            }
            board.push(row); // Add the completed row to the board.
        }
        return board; // Return the fully populated board.
    }
}

// 1.3. Global Variables Initialization
let board = new Board(4, 4); // Create a new game board instance with 4 rows and 4 columns.
let playerScore = 0; // Initialize player's score.
let aiScore = 0; // Initialize AI's score.
let isPlayerTurn = true; // Flag to track whose turn it is, starting with the player.

//--------------------------------------------------------------------
// #MM0002 - Function to Create and Display the Game Board
//--------------------------------------------------------------------

// 2.1. Function to Create and Display the Game Board
function createBoard() {
    const boardElement = document.getElementById('board'); // Access the board element in the HTML.
    boardElement.innerHTML = ''; // Clear any existing content in the board element.
    // Set the grid layout based on the number of rows and columns.
    boardElement.style.gridTemplateRows = `repeat(${board.rows}, 1fr)`;
    boardElement.style.gridTemplateColumns = `repeat(${board.columns}, 1fr)`;

    for (let i = 0; i < board.rows; i++) { // Loop through each row.
        const rowDiv = document.createElement('div'); // Create a new div for the row.
        rowDiv.className = 'row'; // Assign 'row' class for styling.
        for (let j = 0; j < board.columns; j++) { // Loop through each column in the row.
            const cell = document.createElement('div'); // Create a new div for the cell.
            cell.className = 'cell'; // Assign 'cell' class for styling.
            cell.textContent = board.cells[i][j]; // Set the cell's content to the board's value.
            cell.setAttribute('row', i); // Set row attribute for the cell.
            cell.setAttribute('column', j); // Set column attribute for the cell.
            cell.addEventListener('click', () => handleCellClick(i, j)); // Add click event listener.
            rowDiv.appendChild(cell); // Add the cell to the row div.
        }
        boardElement.appendChild(rowDiv); // Add the completed row div to the board element.
    }
}

// 2.2. Global Variables for Tracking Last Selected Cell
let lastSelectedRow = null; // Track the last selected row.
let lastSelectedColumn = null; // Track the last selected column.

//--------------------------------------------------------------------
// #MM0003 - Cell Click Handling and Game Logic
//--------------------------------------------------------------------

// 3.1. Function to Handle Cell Clicks by the Player
function handleCellClick(row, column) {
    // Check if it's player's turn, and the cell is not already marked.
    if (isPlayerTurn && board.cells[row][column] !== '•' && 
        (lastSelectedRow === null || lastSelectedRow === row)) {
        playerScore += board.cells[row][column]; // Add the cell value to the player's score.
        board.cells[row][column] = '•'; // Mark the cell as taken.
        highlightCell(row, column); // Highlight the clicked cell.
        highlightColumn(column); // Highlight the entire column for AI's next move.
        isPlayerTurn = false; // Switch the turn to AI.
        lastSelectedColumn = column; // Remember the last selected column for AI's logic.
        setTimeout(computerMove, 500); // Initiate AI's move after a delay.
    }
    updateScoreDisplay(); // Update the score display after each click.
}

// 3.2. Function for AI's Move Logic
function computerMove() {
    if (!isPlayerTurn) {
        let availableCells = getAvailableCellsInColumn(lastSelectedColumn); // Get available cells in the last selected column.
        if (availableCells.length > 0) {
            // Select the cell with the maximum value in the column.
            let maxCell = availableCells.reduce((max, cell) => 
                board.cells[cell.row][cell.column] > board.cells[max.row][max.column] ? cell : max, 
                availableCells[0]);
            aiScore += board.cells[maxCell.row][maxCell.column]; // Add the selected cell's value to the AI's score.
            board.cells[maxCell.row][maxCell.column] = '•'; // Mark the selected cell as taken.
            highlightCell(maxCell.row, maxCell.column); // Highlight the selected cell.
            highlightRow(maxCell.row); // Highlight the entire row for the player's next move.
            isPlayerTurn = true; // Switch the turn back to the player.
            lastSelectedRow = maxCell.row; // Remember the last selected row for the player's logic.
            updateScoreDisplay(); // Update the score display after AI's move.
            checkPlayerMovePossibility(); // Check if the player can make a move next.
        } else {
            checkEndGame(); // Check if the game has ended if no moves are available.
        }
    }
}

// 3.3. Global Variables for Scoring
let playerScore = 0; // Player's score.
let aiScore = 0; // AI's score.
let isPlayerTurn = true; // Flag to track whose turn it is.

//--------------------------------------------------------------------
// #MM0004 - Game Utility Functions
//--------------------------------------------------------------------

// 4.1. Function to Check Player Move Possibility
function checkPlayerMovePossibility() {
    if (!canPlayerMove()) {
        endGame(); // End the game if the player has no moves.
    }
}

// 4.2. Function to Get Available Cells in a Given Column
function getAvailableCellsInColumn(column) {
    let availableCells = [];
    for (let i = 0; i < board.rows; i++) {
        if (board.cells[i][column] !== '•') {
            availableCells.push({ row: i, column: column });
        }
    }
    return availableCells;
}

// 4.3. Function to Check End Game Conditions
function checkEndGame() {
    if ((!isPlayerTurn && !canComputerMove()) || (isPlayerTurn && !canPlayerMove())) {
        endGame(); // End the game if no moves are available.
    }
}

// 4.4. Function to Handle End Game
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

// 4.5. Functions to Check if Computer or Player Can Move
function canComputerMove() {
    return getAvailableCellsInColumn(lastSelectedColumn).length > 0;
}
function canPlayerMove() {
    return getAvailableCellsInRow(lastSelectedRow).length > 0;
}

// 4.6. Function to Get Available Cells in a Given Row
function getAvailableCellsInRow(row) {
    let availableCells = [];
    for (let j = 0; j < board.columns; j++) {
        if (board.cells[row][j] !== '•') {
            availableCells.push({ row: row, column: j });
        }
    }
    return availableCells;
}

// 4.7. Functions for Cell Highlighting and Clearing Highlights
function highlightCell(row, column) {
    let cellElement = document.querySelector(`.cell[row="${row}"][column="${column}"]`);
    if (cellElement) {
        cellElement.style.backgroundColor = '#BBB';
        setTimeout(() => {
            cellElement.textContent = '•';
            cellElement.style.backgroundColor = '#BBB';
        }, 500);
    }
}
function highlightColumn(column) {
    clearHighlights();
    document.querySelectorAll(`.cell[column="${column}"]`).forEach(cell => {
        cell.style.border = '4px solid #111199';
        cell.style.boxSizing = 'border-box';
    });
}
function highlightRow(row) {
    clearHighlights();
    document.querySelectorAll(`.row:nth-child(${row + 1}) .cell`).forEach(cell => {
        cell.style.border = '4px solid #111199';
        cell.style.boxSizing = 'border-box';
    });
}
function clearHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.style.border = '';
        cell.style.boxSizing = '';
    });
}

//--------------------------------------------------------------------
// #MM0005 - Score Display and Game Restart Functions
//--------------------------------------------------------------------

// 5.1. Function to Update Score Display
function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    playerScoreElement.textContent = `You: ${playerScore}`;
    aiScoreElement.textContent = `AI: ${aiScore}`;
}

// 5.2. Restart Game Function
function restartGame() {
    // Reset game board and scores
    board = new Board(4, 4); 
    board.cells = board.createInitialBoard();
    playerScore = 0;
    aiScore = 0;
    isPlayerTurn = true;
    lastSelectedRow = null;
    lastSelectedColumn = null;
    // Recreate game board and update display
    createBoard();
    updateScoreDisplay();
    // Show game board, hide end game message
    document.getElementById('board').style.display = 'grid';
    document.getElementById('end-game-message').style.display = 'none';
}

// 5.3. Event Listener for Restart Button
document.getElementById('restart-button').addEventListener('click', restartGame);

// 5.3. Event Listener for Restart Button
document.getElementById('restart-button').addEventListener('click', restartGame);

// 5.4. Starting the Game Automatically on Page Load
document.addEventListener('DOMContentLoaded', restartGame);

//--------------------------------------------------------------------
// #MM0006 - Cell Interaction and Game Logic Functions
//--------------------------------------------------------------------

// 6.1. Function to Handle Cell Clicks by Player
function handleCellClick(row, column) {
    if (isPlayerTurn && board.cells[row][column] !== '•' && 
       (lastSelectedRow === null || lastSelectedRow === row)) {
        playerScore += board.cells[row][column];
        board.cells[row][column] = '•';
        highlightCell(row, column);
        isPlayerTurn = false;
        lastSelectedColumn = column;
        setTimeout(computerMove, 500);
    }
}

// 6.2. AI's Move Logic
function computerMove() {
    if (!isPlayerTurn) {
        let availableCells = getAvailableCellsInColumn(lastSelectedColumn);
        if (availableCells.length > 0) {
            let maxCell = availableCells.reduce(
                (max, cell) => board.cells[cell.row][cell.column] > board.cells[max.row][max.column] ? cell : max, availableCells[0]);
            aiScore += board.cells[maxCell.row][maxCell.column];
            board.cells[maxCell.row][maxCell.column] = '•';
            highlightCell(maxCell.row, maxCell.column);
            isPlayerTurn = true;
            lastSelectedRow = maxCell.row;
            updateScoreDisplay();
            checkPlayerMovePossibility();
        } else {
            checkEndGame();
        }
    }
}

// 6.3. Function to Check Player's Move Possibility
function checkPlayerMovePossibility() {
    if (!canPlayerMove()) {
        endGame();
    }
}

// 6.4. Function to Check if Game Should End
function checkEndGame() {
    if ((!isPlayerTurn && !canComputerMove()) || (isPlayerTurn && !canPlayerMove())) {
        endGame();
    }
}

// 6.5. Function to Handle End of Game
function endGame() {
    let winner = (playerScore > aiScore) ? 'Player wins!' : 
                 (aiScore > playerScore) ? 'AI wins!' : 'Draw!';
    document.getElementById('end-game-message').style.display = 'block';
    document.getElementById('winner-message').textContent = winner;
}

//--------------------------------------------------------------------
// #MM0007 - Utility Functions for Game Mechanics
//--------------------------------------------------------------------

// 7.1. Function to Get Available Cells in a Column
function getAvailableCellsInColumn(column) {
    let availableCells = [];
    for (let i = 0; i < board.rows; i++) {
        if (board.cells[i][column] !== '•') {
            availableCells.push({ row: i, column: column });
        }
    }
    return availableCells;
}

// 7.2. Function to Check if Computer Can Make a Move
function canComputerMove() {
    return getAvailableCellsInColumn(lastSelectedColumn).length > 0;
}

// 7.3. Function to Get Available Cells in a Row
function getAvailableCellsInRow(row) {
    let availableCells = [];
    for (let j = 0; j < board.columns; j++) {
        if (board.cells[row][j] !== '•') {
            availableCells.push({ row: row, column: j });
        }
    }
    return availableCells;
}

// 7.4. Function to Check if Player Can Make a Move
function canPlayerMove() {
    return getAvailableCellsInRow(lastSelectedRow).length > 0;
}

//--------------------------------------------------------------------
// #MM0008 - Visual Highlighting Functions
//--------------------------------------------------------------------

// 8.1. Function to Highlight a Selected Cell
function highlightCell(row, column) {
    let cellElement = document.querySelector(`.cell[row="${row}"][column="${column}"]`);
    if (cellElement) {
        cellElement.style.backgroundColor = '#BBB';
        setTimeout(() => {
            cellElement.textContent = '•';
            cellElement.style.backgroundColor = '#BBB';
        }, 500);
    }
}

// 8.2. Function to Clear All Highlights
function clearHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.style.border = '';
        cell.style.boxSizing = '';
    });
}

// 8.3. Function to Update Score Display
function updateScoreDisplay() {
    document.getElementById('player-score').textContent = `You: ${playerScore}`;
    document.getElementById('ai-score').textContent = `AI: ${aiScore}`;
}

//--------------------------------------------------------------------
// #MM0009 - Game Initialization and Reset Logic
//--------------------------------------------------------------------

// 9.1. Function to Reset and Start the Game
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

// 9.2. Event Listener for Restart Button
document.getElementById('restart-button').addEventListener('click', restartGame);

// 9.3. Start Game on Page Load
document.addEventListener('DOMContentLoaded', resetGame);

//--------------------------------------------------------------------
// #MM0010 - Final Comments
//--------------------------------------------------------------------

// The code above provides the necessary functionality for the game '80-matimato'.
// It initializes a 4x4 board with random numbers, handles player and AI moves, 
// checks for available moves, updates scores, and allows restarting the game.
// The game automatically starts on page load and can be restarted using the restart button.


//------------------------------
// END OF CODE -----------------
//------------------------------
// CREATED BY MOLDOVAN ---------
//------------------------------
// JAVASCRIPT BY GPT -----------
//------------------------------