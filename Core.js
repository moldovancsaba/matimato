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
                row.push(Math.floor(Math.random() * 9) + 1); // Véletlenszerű számok 1 és 9 között
            }
            board.push(row);
        }
        return board;
    }

    removeNumber(row, column) {
        this.cells[row][column] = '•'; // Központi pont megjelenítése eltávolításkor
    }

    hasAvailableMoves() {
        return this.cells.some(row => row.some(cell => cell !== '•'));
    }
}

// Globális változók
const board = new Board(5, 5); // 5x5-ös tábla
let playerScore = 0; // Játékos pontszáma
let aiScore = 0; // AI pontszáma

// Játéktábla létrehozása
function createBoard(board) {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    for (let i = 0; i < board.rows; i++) {
        for (let j = 0; j < board.columns; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = board.cells[i][j]; // Szám vagy "•" megjelenítése
            cell.addEventListener('click', () => handleCellClick(i, j));
            boardElement.appendChild(cell);
        }
    }
}

// Cellákra kattintás kezelése
function handleCellClick(row, column) {
    if (board.cells[row][column] !== '•') {
        playerScore += isNaN(board.cells[row][column]) ? 0 : board.cells[row][column]; // Pontok hozzáadása, ha a cella számot tartalmaz
        board.removeNumber(row, column);
        updateScoreDisplay();
        createBoard(board);
        handleComputerMove(); // Számítógép lépése a játékos lépése után
    }
}

// Számítógép lépése
function handleComputerMove() {
    let availableCells = [];
    for (let i = 0; i < board.rows; i++) {
        for (let j = 0; j < board.columns; j++) {
            if (board.cells[i][j] !== '•') {
                availableCells.push({ row: i, column: j });
            }
        }
    }

    if (availableCells.length > 0) {
        let randomCellIndex = Math.floor(Math.random() * availableCells.length);
        let cell = availableCells[randomCellIndex];
        aiScore += board.cells[cell.row][cell.column];
        board.removeNumber(cell.row, cell.column);
        updateScoreDisplay();
        createBoard(board); // Újrarajzolja a táblát a változások után
    }
}

// Pontszám megjelenítése
function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    playerScoreElement.textContent = `You: ${playerScore}`;
    aiScoreElement.textContent = `AI: ${aiScore}`;
}

// A képernyő méretének változására való reagálás
window.addEventListener('resize', function() {
    createBoard(board);
});

// A játék indítása és az első AI lépés
createBoard(board);
handleComputerMove(); // Első lépés az AI-tól