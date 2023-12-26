//------------------------------
// matimato-core.js
//------------------------------
// CODE STARTS HERE
//------------------------------
// #MM0001 Global variables
//------------------------------

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

//------------------------------
// #MM0002 Create Gamefield
//------------------------------

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

//------------------------------
// #MM0003 Game Logic
//------------------------------

let lastSelectedRow = null; // Utoljára választott sor
let lastSelectedColumn = null; // Utoljára választott oszlop

function handleCellClick(row, column) {
    if (isPlayerTurn && board.cells[row][column] !== '•' && (lastSelectedColumn === null || lastSelectedColumn === column)) {
        playerScore += board.cells[row][column];
        board.cells[row][column] = '•';
        highlightCell(row, column);
        highlightRow(row); // Sor kiemelése
        isPlayerTurn = false;
        lastSelectedRow = row;
        setTimeout(computerMove, 1000);
    } else if (isPlayerTurn) {
        if (!canPlayerMove()) {
            endGame(); // Ha a játékos nem tud lépni, vége a játéknak
        }
    }
    updateScoreDisplay();
}

function canPlayerMove() {
    // Ellenőrzi, hogy a játékos tud-e lépni
    return lastSelectedColumn === null ? getAvailableCells().length > 0 : getAvailableCellsInColumn(lastSelectedColumn).length > 0;
}

function computerMove() {
    let availableCells = lastSelectedRow != null ? getAvailableCellsInRow(lastSelectedRow) : getAvailableCells();
    if (availableCells.length > 0) {
        let maxCell = availableCells.reduce((max, cell) => board.cells[cell.row][cell.column] > board.cells[max.row][max.column] ? cell : max, availableCells[0]);
        aiScore += board.cells[maxCell.row][maxCell.column];
        board.cells[maxCell.row][maxCell.column] = '•';
        highlightCell(maxCell.row, maxCell.column);
        highlightColumn(maxCell.column); // Oszlop kiemelése
        isPlayerTurn = true;
        lastSelectedColumn = maxCell.column;
    } else {
        endGame(); // Ha a számítógép nem tud lépni, vége a játéknak
    }
    updateScoreDisplay();
}

function endGame() {
    let winner = playerScore > aiScore ? 'You win!' : playerScore < aiScore ? 'AI wins!' : 'Draw!';
    document.getElementById('board').style.display = 'none';
    document.getElementById('end-game-message').style.display = 'block';
    document.getElementById('winner-message').textContent = winner;
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

//------------------------------
// #MM0004 UI Functions
//------------------------------

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

//------------------------------
// #MM0005 Initialize Game
//------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // Start gomb eseménykezelője
    document.getElementById('start-button').addEventListener('click', () => {
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('board').style.display = 'grid';
        resetGame();
    });

    // Restart gomb eseménykezelője
    document.getElementById('restart-button').addEventListener('click', () => {
        document.getElementById('end-game-message').style.display = 'none';
        document.getElementById('board').style.display = 'grid';
        resetGame();
    });

    // Játéktábla és eredményjelző elrejtése induláskor
    document.getElementById('board').style.display = 'none';
    document.getElementById('end-game-message').style.display = 'none';
});

//------------------------------
// #MM0006 Start and End Logic
//------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // Kezdetben csak a Start gomb látható
    hideGame();
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('restart-button').addEventListener('click', restartGame);
});

function hideGame() {
    document.getElementById('board').style.display = 'none';
    document.getElementById('score').style.display = 'block'; // Pontszám mindig látható
    document.getElementById('end-game-message').style.display = 'none';
    document.getElementById('start-screen').style.display = 'block';
}

function startGame() {
    resetGameVariables();
    createBoard();
    updateScoreDisplay();
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('board').style.display = 'grid';
    document.getElementById('score').style.display = 'block'; // Pontszám megjelenítése
}

function restartGame() {
    resetGameVariables();
    createBoard();
    updateScoreDisplay();
    document.getElementById('end-game-message').style.display = 'none';
    document.getElementById('board').style.display = 'grid';
    document.getElementById('score').style.display = 'block'; // Pontszám megjelenítése
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

//------------------------------
// END OF CODE
//------------------------------