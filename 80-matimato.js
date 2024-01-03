//------------------------------
// 80-matimato.js --------------
//------------------------------
// JAVASCRIPT STARTS HERE ------
//------------------------------

//--------------------------------------------------------------------
// #MM0001 Global Variables and Board Class Definition
//--------------------------------------------------------------------

// 1.1. Class to represent the game board
class Board {
    constructor(rows, columns) {
        this.rows = rows;        // Number of rows in the board
        this.columns = columns;  // Number of columns in the board
        this.cells = this.createInitialBoard(); // Create the initial board
    }

    // Initializes the board with random numbers in each cell
    createInitialBoard() {
        let board = [];
        for (let i = 0; i < this.rows; i++) {
            let row = [];
            for (let j = 0; j < this.columns; j++) {
                row.push(Math.floor(Math.random() * 9) + 1); // Random number between 1 and 9
            }
            board.push(row);
        }
        return board;
    }
}

// 1.2. Initialize the game board with 4 rows and 4 columns
let board = new Board(4, 4);

// 1.3. Initialize scores and game state variables
let playerScore = 0; // Player's score
let aiScore = 0;     // AI's score
let isPlayerTurn = true; // Flag to determine if it's the player's turn


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
            isPlayerTurn = true;
            lastSelectedRow = maxCell.row; // Update the last selected row
            updateScoreDisplay();
            checkPlayerMovePossibility();
        } else {
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
        cellElement.style.backgroundColor = '#BBB';
        setTimeout(() => {
            cellElement.textContent = '•';
            cellElement.style.backgroundColor = '#BBB';
        }, 500);
    }
}

// 4.2. Function to highlight the entire column
function highlightColumn(column) {
    clearHighlights();
    document.querySelectorAll(`.cell[column="${column}"]`).forEach(cell => {
        cell.style.border = '4px solid #111199';
        cell.style.boxSizing = 'border-box';
    });
}

// 4.3. Function to highlight the entire row
function highlightRow(row) {
    clearHighlights();
    document.querySelectorAll(`.row:nth-child(${row + 1}) .cell`).forEach(cell => {
        cell.style.border = '4px solid #111199';
        cell.style.boxSizing = 'border-box';
    });
}

// 4.4. Function to clear all highlights
function clearHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.style.border = '';
        cell.style.boxSizing = '';
    });
}

// 4.5. Function to update the score display
function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    playerScoreElement.textContent = `You: ${playerScore}`;
    aiScoreElement.textContent = `AI: ${aiScore}`;
}

//--------------------------------------------------------------------
// #MM0005 Game Initialization and Reset
//--------------------------------------------------------------------

// 5.1. Event listener for DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    initializeGame(); // Call the function to initialize the game
});

// 5.2. Function to initialize game settings and create the board
function initializeGame() {
    board = new Board(4, 4); // Initialize the board with 4 rows and 4 columns
    createBoard();           // Create and display the game board
    resetGame();             // Reset game settings
}

// 5.3. Function to reset the game to its initial state
function resetGame() {
    playerScore = 0;         // Reset player's score
    aiScore = 0;             // Reset AI's score
    isPlayerTurn = true;     // Set the turn to the player
    lastSelectedRow = null;  // Reset the last selected row
    lastSelectedColumn = null; // Reset the last selected column
    updateScoreDisplay();    // Update the score display
    clearHighlights();       // Clear any existing highlights
}

//--------------------------------------------------------------------
// #MM0006 UI Interaction Functions
//--------------------------------------------------------------------

// 6.1. Function to highlight a selected cell
function highlightCell(row, column) {
    let cellElement = document.querySelector(`.cell[row="${row}"][column="${column}"]`);
    if (cellElement) {
        cellElement.classList.add('highlighted'); // Add 'highlighted' class for styling
        cellElement.textContent = '•'; // Immediately update the cell content
    }
}

// 6.2. Function to highlight all cells in a selected row
function highlightRow(row) {
    document.querySelectorAll(`.cell[row="${row}"]`).forEach(cell => {
        cell.classList.add('highlighted-row'); // Add 'highlighted-row' class for styling
    });
}

// 6.3. Function to highlight all cells in a selected column
function highlightColumn(column) {
    document.querySelectorAll(`.cell[column="${column}"]`).forEach(cell => {
        cell.classList.add('highlighted-column'); // Add 'highlighted-column' class for styling
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
    initializeGame(); // Call the function to initialize the game
});

// 7.2. Initialize the game settings and create the board
function initializeGame() {
    board = new Board(4, 4); // Initialize the board with 4 rows and 4 columns
    createBoard();           // Create and display the game board
    resetGame();             // Reset the game settings
}

// 7.3. Reset the game to initial state
function resetGame() {
    playerScore = 0; // Reset player's score
    aiScore = 0;     // Reset AI's score
    isPlayerTurn = true; // Set the turn to player
    lastSelectedRow = null; // Reset last selected row
    lastSelectedColumn = null; // Reset last selected column
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
        cellElement.style.backgroundColor = '#BBB'; // Change the background to grey
        setTimeout(() => {
            cellElement.textContent = '•'; // Update the cell content
            cellElement.style.backgroundColor = '#BBB'; // Maintain the grey background
        }, 500);
    }
}

// 8.2. Function to highlight the entire column
function highlightColumn(column) {
    clearHighlights(); // Clear any existing highlights before highlighting a column
    document.querySelectorAll(`.cell[column="${column}"]`).forEach(cell => {
        cell.style.border = '4px solid #111199'; // Add a solid border to the highlighted column
        cell.style.boxSizing = 'border-box'; // Adjust box sizing to include the border
    });
}

// 8.3. Function to highlight the entire row
function highlightRow(row) {
    clearHighlights(); // Clear any existing highlights before highlighting a row
    document.querySelectorAll(`.row:nth-child(${row + 1}) .cell`).forEach(cell => {
        cell.style.border = '4px solid #111199'; // Add a solid border to the highlighted row
        cell.style.boxSizing = 'border-box'; // Adjust box sizing to include the border
    });
}

// 8.4. Function to clear all highlights
function clearHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.style.border = ''; // Remove any border styling from the cell
        cell.style.boxSizing = ''; // Reset box sizing to default
    });
}


//--------------------------------------------------------------------
// #MM0009 Game Initialization and Restart Logic
//--------------------------------------------------------------------

// 9.1. Event listener for DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    startGame(); // Initialize and start the game when the page is fully loaded
});

// 9.2. Function to reset the game settings and restart the game
function resetGame() {
    board = new Board(4, 4); // Create a new 4x4 game board
    board.cells = board.createInitialBoard(); // Generate new cell values for the board
    playerScore = 0; // Reset player's score to zero
    aiScore = 0;     // Reset AI's score to zero
    isPlayerTurn = true; // Set the turn to the player
    lastSelectedRow = null; // Reset the last selected row to null
    lastSelectedColumn = null; // Reset the last selected column to null
    createBoard(); // Recreate the board with new values
    updateScoreDisplay(); // Update the score display on UI
    clearHighlights(); // Clear any existing highlights on the board
}

// 9.3. Event listener for the Restart button
document.getElementById('restart-button').addEventListener('click', () => {
    resetGame(); // Reset and restart the game when the restart button is clicked
    startGame(); // Start the game after resetting
});

// 9.4. Define the startGame function to handle starting or restarting the game
function startGame() {
    resetGame(); // Reset the game to its initial state
    document.getElementById('board').style.display = 'grid'; // Display the game board
    document.getElementById('score').style.display = 'block'; // Display the score board
    document.getElementById('start-screen').style.display = 'none'; // Hide the start screen
    document.getElementById('end-game-message').style.display = 'none'; // Hide the end game message if it's visible
}


//--------------------------------------------------------------------
// #MM0010 Additional Gameplay Features
//--------------------------------------------------------------------

// 10.1. Function to highlight the selected cell
function highlightCell(row, column) {
    let cellElement = document.querySelector(`.cell[row="${row}"][column="${column}"]`);
    if (cellElement) {
        cellElement.classList.add('highlighted'); // Add the 'highlighted' class for visual indication
        cellElement.textContent = '•'; // Update the cell content to a dot indicating selection
    }
}

// 10.2. Function to highlight the entire column
function highlightColumn(column) {
    clearHighlights(); // Clear any previously highlighted cells
    document.querySelectorAll(`.cell[column="${column}"]`).forEach(cell => {
        cell.classList.add('highlighted-column'); // Add 'highlighted-column' class for styling
    });
}

// 10.3. Function to highlight the entire row
function highlightRow(row) {
    clearHighlights(); // Clear any previously highlighted cells
    document.querySelectorAll(`.row:nth-child(${row + 1}) .cell`).forEach(cell => {
        cell.classList.add('highlighted-row'); // Add 'highlighted-row' class for styling
    });
}

// 10.4. Function to clear all highlights
function clearHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('highlighted', 'highlighted-row', 'highlighted-column'); // Remove all highlight classes
    });
}

// 10.5. Function to update the score display
function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    playerScoreElement.textContent = `Player: ${playerScore}`; // Update player's score display
    aiScoreElement.textContent = `AI: ${aiScore}`; // Update AI's score display
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
    playerScore = 0;         // Reset player's score
    aiScore = 0;             // Reset AI's score
    isPlayerTurn = true;     // Set the turn to the player
    lastSelectedRow = null;  // Reset the last selected row
    lastSelectedColumn = null; // Reset the last selected column
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
    startGame(); // Initialize the game when the page loads
});

// 15.2. Function to reset the game settings
function resetGame() {
    board = new Board(4, 4); // Create a new board with 4 rows and 4 columns
    board.cells = board.createInitialBoard(); // Generate new cell values
    playerScore = 0; // Reset player's score
    aiScore = 0;     // Reset AI's score
    isPlayerTurn = true; // Set the turn to player
    lastSelectedRow = null; // Reset the last selected row
    lastSelectedColumn = null; // Reset the last selected column
    createBoard(); // Recreate the board with new values
    updateScoreDisplay(); // Update the score display
}

// 15.3. Event handler for the Restart button
document.getElementById('restart-button').addEventListener('click', () => {
    resetGame();
    startGame();
});

// 15.4. Define the startGame function to handle starting or restarting the game
function startGame() {
    resetGame(); // Reset the game to its initial state
    document.getElementById('board').style.display = 'grid'; // Display the game board
    document.getElementById('score').style.display = 'block'; // Display the score board
    document.getElementById('start-screen').style.display = 'none'; // Hide the start screen
    document.getElementById('end-game-message').style.display = 'none'; // Hide the end game message
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


//------------------------------
// END OF CODE -----------------
//------------------------------
// CREATED BY MOLDOVAN ---------
//------------------------------
// JAVASCRIPT BY GPT -----------
//------------------------------