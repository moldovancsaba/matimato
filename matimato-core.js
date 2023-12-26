// matimato-core.js

//--------------------------------------------------
//--------------------------------------------------

// #MM0001 Global variables
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

const board = new Board(5, 5);
let playerScore = 0;
let aiScore = 0;
let isPlayerTurn = true; // A játékos kezdi

//--------------------------------------------------
//--------------------------------------------------

// #MM0002 Create Gamefield
function createBoard() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    boardElement.style.gridTemplateRows = `repeat(${board.rows}, 1fr)`; // Adjuk hozzá a sorokat

    for (let i = 0; i < board.rows; i++) {
        const rowDiv = document.createElement('div'); // Létrehozzuk a sor div-et
        rowDiv.className = 'row';
        for (let j = 0; j < board.columns; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = board.cells[i][j];
            cell.setAttribute('row', i);
            cell.setAttribute('column', j);
            cell.addEventListener('click', () => handleCellClick(i, j));
            rowDiv.appendChild(cell); // Adjuk hozzá a cellát a sor div-hez
        }
        boardElement.appendChild(rowDiv); // Adjuk hozzá a sor div-et a táblához
    }
}

//--------------------------------------------------
//--------------------------------------------------

// #MM0003 Game Logic

let lastSelectedRow = null; // Utoljára választott sor
let lastSelectedColumn = null; // Utoljára választott oszlop

function handleCellClick(row, column) {
    if (isPlayerTurn && board.cells[row][column] !== '•' && (lastSelectedColumn === null || lastSelectedColumn === column)) {
        playerScore += board.cells[row][column];
        board.cells[row][column] = '•';
        highlightCell(row, column);
        highlightRow(row); // Sor kiemelése
        isPlayerTurn = false;
        updateScoreDisplay();
        lastSelectedRow = row; // Az utoljára választott sor mentése
        setTimeout(computerMove, 1000);
    }
}

function computerMove() {
    let availableCells = lastSelectedRow != null ? getAvailableCellsInRow(lastSelectedRow) : getAvailableCells();
    if (availableCells.length > 0) {
        let highestValue = 0;
        let selectedCell = null;

        // Keresse meg a legnagyobb számot tartalmazó cellát
        for (let cell of availableCells) {
            let cellValue = board.cells[cell.row][cell.column];
            if (cellValue > highestValue) {
                highestValue = cellValue;
                selectedCell = cell;
            }
        }

        // Ha van kiválasztott cella, lépjen rá
        if (selectedCell) {
            aiScore += highestValue;
            board.cells[selectedCell.row][selectedCell.column] = '•';
            highlightCell(selectedCell.row, selectedCell.column);
            highlightColumn(selectedCell.column); // Oszlop kiemelése
            isPlayerTurn = true;
            lastSelectedColumn = selectedCell.column; // Az utoljára választott oszlop mentése
            updateScoreDisplay();
        }
    }
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

function getAvailableCellsInColumn(column) {
    let availableCells = [];
    for (let i = 0; i < board.rows; i++) {
        if (board.cells[i][column] !== '•') {
            availableCells.push({ row: i, column: column });
        }
    }
    return availableCells;
}

function getAvailableCells() {
    let availableCells = [];
    for (let i = 0; i < board.rows; i++) {
        for (let j = 0; j < board.columns; j++) {
            if (board.cells[i][j] !== '•') {
                availableCells.push({ row: i, column: j });
            }
        }
    }
    return availableCells;
}


//--------------------------------------------------
//--------------------------------------------------

// #MM0004 User Interface Functions

function highlightCell(row, column) {
    let cellElement = document.querySelector(`.cell[row="${row}"][column="${column}"]`);
    if (cellElement) {
        cellElement.style.backgroundColor = '#444444';
        setTimeout(() => {
            cellElement.textContent = '•';
            cellElement.style.backgroundColor = '#444444'; // Háttérszín megtartása
        }, 500);
    }
}

function highlightColumn(column) {
    clearHighlights(); // Előző kiemelések törlése
    document.querySelectorAll(`.cell[column="${column}"]`).forEach(cell => {
        cell.style.border = '6px solid #00008B';
        cell.style.boxSizing = 'border-box'; // A keretet is beleértve tartsa meg a méretét
    });
}

function highlightRow(row) {
    clearHighlights(); // Előző kiemelések törlése
    document.querySelectorAll(`.row:nth-child(${row + 1}) .cell`).forEach(cell => {
        cell.style.border = '6px solid #00008B';
        cell.style.boxSizing = 'border-box'; // A keretet is beleértve tartsa meg a méretét
    });
}

function clearHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.style.border = '';
        cell.style.boxSizing = ''; // Visszaállítja az alapértelmezett méretezést
    });
}

function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    playerScoreElement.textContent = `You: ${playerScore}`;
    aiScoreElement.textContent = `AI: ${aiScore}`;
}

// A játék indítása
document.addEventListener('DOMContentLoaded', () => {
    createBoard();
    updateScoreDisplay();
});

//--------------------------------------------------
//--------------------------------------------------

// #MM0005 Initialize Game
document.addEventListener('DOMContentLoaded', () => {
    createBoard();
    updateScoreDisplay();
});

//--------------------------------------------------
//--------------------------------------------------

// #MM0006 Start and End Game Logic
document.addEventListener('DOMContentLoaded', () => {
    // Start gomb eseménykezelője
    const startButton = document.getElementById('start-button');
    startButton.addEventListener('click', () => {
        startGame();
    });

    // Restart gomb eseménykezelője
    const restartButton = document.getElementById('restart-button');
    restartButton.addEventListener('click', () => {
        restartGame();
    });
});

function startGame() {
    createBoard();
    updateScoreDisplay();
    document.getElementById('start-button').style.display = 'none'; // Elrejti a Start gombot
    document.getElementById('board').style.display = 'grid'; // Megjeleníti a játéktáblát
}

function restartGame() {
    resetGameVariables();
    startGame();
    document.getElementById('end-game-message').style.display = 'none'; // Elrejti a játék végi üzenetet
}

function endGame() {
    document.getElementById('board').style.display = 'none'; // Elrejti a játéktáblát
    const winnerMessage = document.getElementById('winner-message');
    const winner = playerScore > aiScore ? 'You win!' : aiScore > playerScore ? 'AI wins!' : 'It\'s a tie!';
    winnerMessage.textContent = winner;
    document.getElementById('end-game-message').style.display = 'block'; // Megjeleníti a játék végi üzenetet
}

function resetGameVariables() {
    // Újraindítja a játékot a kezdeti állapotba
    board = new Board(5, 5);
    playerScore = 0;
    aiScore = 0;
    isPlayerTurn = true;
    lastSelectedRow = null;
    lastSelectedColumn = null;
}


//--------------------------------------------------
//--------------------------------------------------
