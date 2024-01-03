//------------------------------
// 80-matimato.js --------------
//------------------------------
// JAVASCRIPT STARTS HERE ------
//------------------------------

//--------------------------------------------------------------------
// #MM0001 - Class definition for the game board.
//--------------------------------------------------------------------

// 1.1. Class definition
class Board {
    constructor(rows, columns) {
        this.rows = rows; // Number of rows in the board.
        this.columns = columns; // Number of columns in the board.
        this.cells = this.createInitialBoard(); // Initializing the board cells.
    }

// 1.2. Function to create the initial board setup with random numbers.
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

// 1.3. Initializing global variables.
let board = new Board(4, 4); // Create a new game board instance with 4 rows and 4 columns.
let playerScore = 0; // Initialize player's score.
let aiScore = 0; // Initialize AI's score.
let isPlayerTurn = true; // Flag to track whose turn it is, starting with the player.


//--------------------------------------------------------------------
// #MM0002 - Function to Create and Display the Game Board
//--------------------------------------------------------------------

// 2.1. Function to create and display the game board in the UI.
function createBoard() {
    const boardElement = document.getElementById('board'); // Access the board element in the HTML.
    boardElement.innerHTML = ''; // Clear any existing content in the board element.
    // Set the grid layout based on the number of rows and columns in the board.
    boardElement.style.gridTemplateRows = `repeat(${board.rows}, 1fr)`;
    boardElement.style.gridTemplateColumns = `repeat(${board.columns}, 1fr)`;

    for (let i = 0; i < board.rows; i++) { // Loop through each row.
        const rowDiv = document.createElement('div'); // Create a new div for the row.
        rowDiv.className = 'row'; // Assign 'row' class for styling.
        for (let j = 0; j < board.columns; j++) { // Loop through each column in the row.
            const cell = document.createElement('div'); // Create a new div for the cell.
            cell.className = 'cell'; // Assign 'cell' class for styling.
            cell.textContent = board.cells[i][j]; // Set the cell's content to the board's value.
            // Set custom attributes to identify the cell's row and column.
            cell.setAttribute('row', i);
            cell.setAttribute('column', j);
            // Add an event listener to handle clicks on the cell.
            cell.addEventListener('click', () => handleCellClick(i, j));
            rowDiv.appendChild(cell); // Add the cell to the row div.
        }
        boardElement.appendChild(rowDiv); // Add the completed row div to the board element.
    }
}

// 2.2. Global variables to keep track of the last selected row and column.
let lastSelectedRow = null; 
let lastSelectedColumn = null;


//--------------------------------------------------------------------
// #MM0003 - Cell Click Handling and Game Logic
//--------------------------------------------------------------------

// 3.1. Function to handle cell clicks by the player.
function handleCellClick(row, column) {
    // Check if it's player's turn, the cell is not already taken, and the click is in the same row or it's the first click.
    if (isPlayerTurn && board.cells[row][column] !== '•' && (lastSelectedRow === null || lastSelectedRow === row)) {
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

// 3.2. Function for AI's move logic.
function computerMove() {
    if (!isPlayerTurn) {
        let availableCells = getAvailableCellsInColumn(lastSelectedColumn); // Get available cells in the last selected column.
        if (availableCells.length > 0) {
            // Select the cell with the maximum value in the column.
            let maxCell = availableCells.reduce((max, cell) => 
                board.cells[cell.row][cell.column] > board.cells[max.row][max.column] ? cell : max, 
                availableCells[0]
            );
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

// 3.3. Function to check if the player has any possible moves left.
function checkPlayerMovePossibility() {
    if (!canPlayerMove()) {
        endGame(); // End the game if the player has no moves.
    }
}

// 3.4. Function to get available cells in a given column.
function getAvailableCellsInColumn(column) {
    let availableCells = [];
    for (let i = 0; i < board.rows; i++) {
        if (board.cells[i][column] !== '•') { // Check if the cell is not already taken.
            availableCells.push({ row: i, column: column }); // Add the cell to available options.
        }
    }
    return availableCells; // Return the list of available cells.
}

// 3.5. Function to check if the game should end.
function checkEndGame() {
    // Check if neither the player nor the AI can make a move.
    if ((!isPlayerTurn && !canComputerMove()) || (isPlayerTurn && !canPlayerMove())) {
        endGame(); // End the game.
    }
}

// 3.6. Function to handle the end of the game.
function endGame() {
    let winner;
    // Determine the winner based on scores.
    if (playerScore > aiScore) {
        winner = 'Player wins!';
    } else if (aiScore > playerScore) {
        winner = 'AI wins!';
    } else {
        winner = 'Draw!';
    }

// 3.7. Update the UI to reflect the end of the game.
    document.getElementById('board').style.display = 'none';
    document.getElementById('end-game-message').style.display = 'block';
    document.getElementById('winner-message').textContent = winner; // Show who the winner is.
}

// 3.8. Function to check if the computer can make a move.
function canComputerMove() {
    return getAvailableCellsInColumn(lastSelectedColumn).length > 0; // Check if there are any available cells in the last selected column.
}

// 3.9. Function to check if the player can make a move.
function canPlayerMove() {
    return getAvailableCellsInRow(lastSelectedRow).length > 0; // Check if there are any available cells in the last selected row.
}

// 3.10. Function to get available cells in a given row.
function getAvailableCellsInRow(row) {
    let availableCells = [];
    for (let j = 0; j < board.columns; j++) {
        if (board.cells[row][j] !== '•') { // Check if the cell is not already taken.
            availableCells.push({ row: row, column: j }); // Add the cell to available options.
        }
    }
    return availableCells; // Return the list of available cells.
}

// 3.11. Function to highlight a specific cell.
function highlightCell(row, column) {
    let cellElement = document.querySelector(`.cell[row="${row}"][column="${column}"]`);
    if (cellElement) {
        cellElement.style.backgroundColor = '#666666'; // Change the cell's background color.
        setTimeout(() => {
            cellElement.textContent = '•'; // Update the cell's content after a short delay.
            cellElement.style.backgroundColor = '#666666'; // Maintain the background color.
        }, 500);
    }
}

// 3.12. Function to highlight all cells in a specified column.
function highlightColumn(column) {
    clearHighlights(); // Clear any existing highlights before applying new ones.
    document.querySelectorAll(`.cell[column="${column}"]`).forEach(cell => {
        cell.style.border = '4px solid #BBBBBB'; // Add a border to each cell in the column.
        cell.style.boxSizing = 'border-box'; // Adjust the box sizing to include the border.
    });
}

// 3.13. Function to highlight all cells in a specified row.
function highlightRow(row) {
    clearHighlights(); // Clear any existing highlights before applying new ones.
    document.querySelectorAll(`.row:nth-child(${row + 1}) .cell`).forEach(cell => {
        cell.style.border = '4px solid #BBBBBB'; // Add a border to each cell in the row.
        cell.style.boxSizing = 'border-box'; // Adjust the box sizing to include the border.
    });
}

// 3.14. Function to clear all cell highlights.
function clearHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.style.border = ''; // Remove the border from the cell.
        cell.style.boxSizing = ''; // Reset the box sizing to default.
    });
}

// 3.15. Function to update the score display on the UI.
function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    playerScoreElement.textContent = `You: ${playerScore}`; // Update the player's score display.
    aiScoreElement.textContent = `AI: ${aiScore}`; // Update the AI's score display.
}

// 3.16. Event listener for DOMContentLoaded to start the game once the document is fully loaded.
document.addEventListener('DOMContentLoaded', () => {
    startGame(); // Call the startGame function to initiate the game.
});

// 3.17. Function to start or restart the game.
function startGame() {
    resetGame(); // Call the resetGame function to reset the game to its initial state.
    // Update the UI to display the game components.
    document.getElementById('board').style.display = 'grid';
    document.getElementById('score').style.display = 'block';
    document.getElementById('start-screen').style.display = 'none'; // Hide the start screen, if any.
}

// 3.18. Event listener for the restart button.
document.getElementById('restart-button').addEventListener('click', () => {
    resetGame();
    startGame();
});

// 3.19. Function to reset the game to its initial state.
function resetGame() {
    board = new Board(4, 4); // Create a new 4x4 game board.
    board.cells = board.createInitialBoard(); // Generate new cell values for the board.
    playerScore = 0; // Reset the player's score.
    aiScore = 0; // Reset the AI's score.
    isPlayerTurn = true; // Set the turn back to the player.
    lastSelectedRow = null; // Reset the last selected row.
    lastSelectedColumn = null; // Reset the last selected column.
    createBoard(); // Call createBoard to set up the board again.
    updateScoreDisplay(); // Update the score display with reset scores.
}

// 3.20. Function to hide the game components and show the start screen.
function hideGame() {
    document.getElementById('board').style.display = 'none'; // Hide the game board.
    document.getElementById('score').style.display = 'none'; // Hide the score display.
    document.getElementById('end-game-message').style.display = 'none'; // Hide the end-game message.
    document.getElementById('start-screen').style.display = 'block'; // Show the start screen.
}






//------------------------------
// END OF CODE -----------------
//------------------------------
// CREATED BY MOLDOVAN ---------
//------------------------------
// JAVASCRIPT BY GPT -----------
//------------------------------