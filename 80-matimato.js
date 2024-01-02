//------------------------------
// 80-matimato.js --------------
//------------------------------
// JAVASCRIPT STARTS HERE ------
//------------------------------


//--------------------------------------------------------------------
// #MM0001 Global Variables and Board Class
//--------------------------------------------------------------------

// 1.1. Define the Board class
class Board {
    constructor(rows, columns) {
        this.rows = rows;        // Number of rows
        this.columns = columns;  // Number of columns
        this.cells = this.createInitialBoard();
    }

    // Creates an initial board with random numbers in each cell
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

// 1.2. Global variables
let board = new Board(4, 4); // Initialize the board with 4 rows and 4 columns
let playerScore = 0;         // Player's score
let aiScore = 0;             // AI's score
let isPlayerTurn = true;     // Flag to determine if it's the player's turn
let lastSelectedRow = null;  // Last selected row, null initially
let lastSelectedColumn = null; // Last selected column, null initially



//--------------------------------------------------------------------
// #MM0002 Create Gamefield Function
//--------------------------------------------------------------------

// 2.1. Function to create and display the game board in the UI
function createBoard() {
    const boardElement = document.getElementById('board');
    if (!boardElement) {
        console.error('Board element not found!');
        return;
    }
    boardElement.innerHTML = '';
    boardElement.style.gridTemplateRows = `repeat(${board.rows}, 1fr)`;
    boardElement.style.gridTemplateColumns = `repeat(${board.columns}, 1fr)`;

    for (let i = 0; i < board.rows; i++) {
        for (let j = 0; j < board.columns; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = board.cells[i][j];
            cell.setAttribute('row', i);
            cell.setAttribute('column', j);
            cell.addEventListener('click', () => handleCellClick(i, j));
            boardElement.appendChild(cell);
        }
    }
}

// 2.2. Event listener for cell clicks
function handleCellClick(row, column) {
    if (isPlayerTurn && board.cells[row][column] !== '•' && (lastSelectedRow === null || lastSelectedRow === row)) {
        playerScore += board.cells[row][column];
        board.cells[row][column] = '•';
        highlightCell(row, column);
        updateScoreDisplay();
        isPlayerTurn = false;
        setTimeout(computerMove, 200);
    }
}




//--------------------------------------------------------------------
// #MM0003 Game Logic
//--------------------------------------------------------------------

// 3.1. Function for the AI's move
function computerMove() {
    if (!isPlayerTurn) {
        let availableCells = getAvailableCellsInColumn(lastSelectedColumn);
        if (availableCells.length > 0) {
            let maxCell = availableCells.reduce((max, cell) => board.cells[cell.row][cell.column] > board.cells[max.row][max.column] ? cell : max, availableCells[0]);
            aiScore += board.cells[maxCell.row][maxCell.column];
            board.cells[maxCell.row][maxCell.column] = '•';
            highlightCell(maxCell.row, maxCell.column);
            updateScoreDisplay();
            isPlayerTurn = true;
            lastSelectedRow = maxCell.row;
            checkEndGame();
        }
    }
}

// 3.2. Function to check if the game has ended
function checkEndGame() {
    if ((!isPlayerTurn && !canComputerMove()) || (isPlayerTurn && !canPlayerMove())) {
        endGame();
    }
}

// 3.3. Function to determine if there are any available moves in a column
function getAvailableCellsInColumn(column) {
    let availableCells = [];
    for (let i = 0; i < board.rows; i++) {
        if (board.cells[i][column] !== '•') {
            availableCells.push({ row: i, column: column });
        }
    }
    return availableCells;
}

// 3.4. Function to check if the AI can make a move
function canComputerMove() {
    return getAvailableCellsInColumn(lastSelectedColumn).length > 0;
}

// 3.5. Function to check if the player can make a move
function canPlayerMove() {
    return getAvailableCellsInRow(lastSelectedRow).length > 0;
}

// 3.6. Function to determine if there are any available moves in a row
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
// #MM0004 UI Functions
//--------------------------------------------------------------------

// 4.1. Function to highlight a cell when selected
function highlightCell(row, column) {
    let cellElement = document.querySelector(`.cell[row="${row}"][column="${column}"]`);
    if (cellElement) {
        cellElement.classList.add('highlight');
    }
}

// 4.2. Function to clear all highlights
function clearHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('highlight');
    });
}

// 4.3. Function to update the score display
function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    if (!playerScoreElement || !aiScoreElement) {
        console.error('Score elements not found!');
        return;
    }
    playerScoreElement.textContent = `Player: ${playerScore}`;
    aiScoreElement.textContent = `AI: ${aiScore}`;
}



//--------------------------------------------------------------------
// #MM0005 Game Initialization and Reset
//--------------------------------------------------------------------

// 5.1. Event listener for DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
});

// 5.2. Initialize the game settings and create the board
function initializeGame() {
    board = new Board(4, 4); // Initialize the board with 4 rows and 4 columns
    createBoard();           // Create and display the game board
    resetGame();             // Reset the game settings
}

// 5.3. Reset the game to initial state
function resetGame() {
    playerScore = 0;
    aiScore = 0;
    isPlayerTurn = true;
    lastSelectedRow = null;
    lastSelectedColumn = null;
    clearHighlights();       // Clear any highlighted cells
    updateScoreDisplay();    // Update the score display
}


//--------------------------------------------------------------------
// #MM0006 UI Interaction Functions
//--------------------------------------------------------------------

// 6.1. Function to highlight a selected cell
function highlightCell(row, column) {
    let cellElement = document.querySelector(`.cell[row="${row}"][column="${column}"]`);
    if (cellElement) {
        cellElement.classList.add('highlighted');
    }
}

// 6.2. Function to highlight all cells in a selected row
function highlightRow(row) {
    document.querySelectorAll(`.row:nth-child(${row + 1}) .cell`).forEach(cell => {
        cell.classList.add('highlighted-row');
    });
}

// 6.3. Function to highlight all cells in a selected column
function highlightColumn(column) {
    document.querySelectorAll(`.cell[column="${column}"]`).forEach(cell => {
        cell.classList.add('highlighted-column');
    });
}

// 6.4. Function to clear all highlighted cells
function clearHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('highlighted', 'highlighted-row', 'highlighted-column');
    });
}



//--------------------------------------------------------------------
// #MM0007 Game Initialization and Reset
//--------------------------------------------------------------------

// 7.1. Event listener for DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
});

// 7.2. Initialize the game settings and create the board
function initializeGame() {
    board = new Board(4, 4); // Initialize the board with 4 rows and 4 columns
    createBoard();           // Create and display the game board
    resetGame();             // Reset the game settings
}

// 7.3. Reset the game to initial state
function resetGame() {
    playerScore = 0;
    aiScore = 0;
    isPlayerTurn = true;
    lastSelectedRow = null;
    lastSelectedColumn = null;
    clearHighlights();       // Clear any highlighted cells
    updateScoreDisplay();    // Update the score display
}


//--------------------------------------------------------------------
// #MM0008 UI Interaction Functions
//--------------------------------------------------------------------

// 8.1. Function to highlight a selected cell
function highlightCell(row, column) {
    let cellElement = document.querySelector(`.cell[row="${row}"][column="${column}"]`);
    if (cellElement) {
        cellElement.classList.add('highlighted');
    }
}

// 8.2. Function to highlight the entire column
function highlightColumn(column) {
    clearHighlights();
    document.querySelectorAll(`.cell[column="${column}"]`).forEach(cell => {
        cell.classList.add('highlighted-column');
    });
}

// 8.3. Function to highlight the entire row
function highlightRow(row) {
    clearHighlights();
    document.querySelectorAll(`.row:nth-child(${row + 1}) .cell`).forEach(cell => {
        cell.classList.add('highlighted-row');
    });
}

// 8.4. Function to clear all highlights
function clearHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('highlighted', 'highlighted-row', 'highlighted-column');
    });
}



//--------------------------------------------------------------------
// #MM0009 Game Initialization and Restart Logic
//--------------------------------------------------------------------

// 9.1. Function to initialize and start the game
document.addEventListener('DOMContentLoaded', () => {
    startGame(); // Start the game immediately when the page loads
});

// 9.2. Function to reset the game settings and restart the game
function resetGame() {
    board = new Board(4, 4); // Create a new 4x4 board
    board.cells = board.createInitialBoard(); // Generate new cell values
    playerScore = 0;
    aiScore = 0;
    isPlayerTurn = true;
    lastSelectedRow = null;
    lastSelectedColumn = null;
    createBoard(); // Recreate the board with new values
    updateScoreDisplay(); // Update the score display
    clearHighlights(); // Clear any existing highlights
}

// 9.3. Event listener for the Restart button
document.getElementById('restart-button').addEventListener('click', resetGame);

// 9.4. Define the startGame function to handle starting or restarting the game
function startGame() {
    resetGame(); // Reset the game to its initial state
    document.getElementById('board').style.display = 'grid'; // Display the game board
    document.getElementById('score').style.display = 'block'; // Display the score
    document.getElementById('start-screen').style.display = 'none'; // Hide the start screen
    document.getElementById('end-game-message').style.display = 'none'; // Hide the end game message
}


//--------------------------------------------------------------------
// #MM0010 Additional Gameplay Features
//--------------------------------------------------------------------

// 10.1. Function to highlight the selected cell
function highlightCell(row, column) {
    let cellElement = document.querySelector(`.cell[row="${row}"][column="${column}"]`);
    if (cellElement) {
        cellElement.classList.add('highlighted'); // Add 'highlighted' class for styling
    }
}

// 10.2. Function to highlight the entire column
function highlightColumn(column) {
    clearHighlights();
    document.querySelectorAll(`.cell[column="${column}"]`).forEach(cell => {
        cell.classList.add('highlighted-column'); // Add 'highlighted-column' class for styling
    });
}

// 10.3. Function to highlight the entire row
function highlightRow(row) {
    clearHighlights();
    document.querySelectorAll(`.row:nth-child(${row + 1}) .cell`).forEach(cell => {
        cell.classList.add('highlighted-row'); // Add 'highlighted-row' class for styling
    });
}

// 10.4. Function to clear all highlights
function clearHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('highlighted', 'highlighted-row', 'highlighted-column');
    });
}

// 10.5. Function to update the score display
function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    playerScoreElement.textContent = `Player: ${playerScore}`;
    aiScoreElement.textContent = `AI: ${aiScore}`;
}

// 10.6. Additional functions and logic can be added here if needed


//--------------------------------------------------------------------
// #MM0011 Game Initialization and Reset
//--------------------------------------------------------------------

// 11.1. Function to initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeGame(); // Call the function to initialize the game
});

// 11.2. Function to set up and start the game
function initializeGame() {
    board = new Board(4, 4); // Initialize the board with 4 rows and 4 columns
    createBoard();           // Create and display the game board
    resetGame();             // Reset game settings
}

// 11.3. Function to reset the game settings
function resetGame() {
    playerScore = 0;
    aiScore = 0;
    isPlayerTurn = true;
    lastSelectedRow = null;
    lastSelectedColumn = null;
    updateScoreDisplay();    // Update the score display
    clearHighlights();       // Clear any existing highlights
}

// 11.4. Add any additional initialization logic if needed


//--------------------------------------------------------------------
// #MM0012 Additional Functions
//--------------------------------------------------------------------

// 12.1. Function to check if the computer can make a move
function canComputerMove() {
    // Logic to determine if there are any available moves for the AI
    return getAvailableCellsInColumn(lastSelectedColumn).length > 0;
}

// 12.2. Function to check if the player can make a move
function canPlayerMove() {
    // Logic to determine if there are any available moves for the player
    return getAvailableCellsInRow(lastSelectedRow).length > 0;
}

// 12.3. Function to determine available cells in a specific row
function getAvailableCellsInRow(row) {
    let availableCells = [];
    for (let j = 0; j < board.columns; j++) {
        if (board.cells[row][j] !== '•') {
            availableCells.push({ row: row, column: j });
        }
    }
    return availableCells;
}

// 12.4. Function to determine available cells in a specific column
function getAvailableCellsInColumn(column) {
    let availableCells = [];
    for (let i = 0; i < board.rows; i++) {
        if (board.cells[i][column] !== '•') {
            availableCells.push({ row: i, column: column });
        }
    }
    return availableCells;
}

// 12.5. Add any additional utility functions as needed



//--------------------------------------------------------------------
// #MM0013 Game Initialization and Restart Logic
//--------------------------------------------------------------------

// 13.1. Function to initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    startGame(); // Start the game immediately when the page loads
});

// 13.2. Function to start or restart the game
function startGame() {
    resetGame(); // Reset the game to its initial state
    document.getElementById('board').style.display = 'grid'; // Display the game board
    document.getElementById('score').style.display = 'block'; // Display the score
    document.getElementById('start-screen').style.display = 'none'; // Hide the start screen
    document.getElementById('end-game-message').style.display = 'none'; // Hide the end game message
}

// 13.3. Function to reset the game to its initial state
function resetGame() {
    board = new Board(4, 4); // Initialize the board with 4 rows and 4 columns
    createBoard(); // Create and display the game board
    playerScore = 0; // Reset player's score
    aiScore = 0;     // Reset AI's score
    isPlayerTurn = true; // Set the turn to player
    lastSelectedRow = null; // Reset last selected row
    lastSelectedColumn = null; // Reset last selected column
    updateScoreDisplay(); // Update the score display
}

// 13.4. Event handler for the Restart button
document.getElementById('restart-button').addEventListener('click', startGame);




//--------------------------------------------------------------------
// #MM0014 Helper Functions
//--------------------------------------------------------------------

// 14.1. Function to check if the player can make a move
function canPlayerMove() {
    // Check for available moves in the last selected row
    return getAvailableCellsInRow(lastSelectedRow).length > 0;
}

// 14.2. Function to check if the AI can make a move
function canComputerMove() {
    // Check for available moves in the last selected column
    return getAvailableCellsInColumn(lastSelectedColumn).length > 0;
}

// 14.3. Function to get available cells in a specific row
function getAvailableCellsInRow(row) {
    let availableCells = [];
    for (let j = 0; j < board.columns; j++) {
        if (board.cells[row][j] !== '•') {
            availableCells.push({ row: row, column: j });
        }
    }
    return availableCells;
}

// 14.4. Function to get available cells in a specific column
function getAvailableCellsInColumn(column) {
    let availableCells = [];
    for (let i = 0; i < board.rows; i++) {
        if (board.cells[i][column] !== '•') {
            availableCells.push({ row: i, column: column });
        }
    }
    return availableCells;
}




//--------------------------------------------------------------------
// #MM0015 Game Initialization
//--------------------------------------------------------------------

// 15.1. Function to start the game
document.addEventListener('DOMContentLoaded', () => {
    board = new Board(4, 4); // Initialize the board with 4 rows and 4 columns
    createBoard(); // Create and display the game board
    resetGame(); // Reset the game settings
});

// 15.2. Function to reset the game settings
function resetGame() {
    playerScore = 0;
    aiScore = 0;
    isPlayerTurn = true;
    lastSelectedRow = null;
    lastSelectedColumn = null;
    updateScoreDisplay(); // Update the score display
}

// 15.3. Event handler for the Restart button
document.getElementById('restart-button').addEventListener('click', () => {
    resetGame();
    startGame();
});

// 15.4. Define the startGame function to handle starting or restarting the game
function startGame() {
    resetGame();
    document.getElementById('board').style.display = 'grid';
    document.getElementById('score').style.display = 'block';
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('end-game-message').style.display = 'none';
}




//--------------------------------------------------------------------
// #MM0016 Finalize and Export
//--------------------------------------------------------------------

// 16.1. Finalize the code
// (Add any final touches or clean up if needed)

// 16.2. Export the necessary components if this module is used in a larger application
// (Only if relevant. For example: export { startGame, resetGame };)

//------------------------------
// END OF CODE -----------------
//------------------------------
// CREATED BY MOLDOVAN ---------
//------------------------------
// JAVASCRIPT BY GPT -----------
//------------------------------