let activeRow = 4; // Kezdeti beállítás a középső sorra

class Player {
    constructor() {
        this.score = 0;
    }

    play(board, position) {
        if (board.cells[position.row][position.column] != null) {
            this.score += board.cells[position.row][position.column];
            board.removeNumber(position.row, position.column);
            return true;
        }
        return false;
    }
}

const humanPlayer = new Player();
const computerPlayer = new Player();

function displayMessage(message) {
    const messageElement = document.getElementById('message');
    messageElement.textContent = message;
}

function handleCellClick(row, column) {
    displayMessage(`Cell clicked at row ${row}, column ${column}`);
    handleHumanMove(row, column);
}

function handleHumanMove(row, column) {
    if (row !== activeRow) {
        displayMessage("Nem a megengedett sorból választottál. Próbáld újra!");
        return;
    }
    if (humanPlayer.play(board, { row, column })) {
        activeRow = getNextActiveRow(column);
        updateBoard();
        if (!board.hasAvailableMoves()) {
            endGame();
            return;
        }
        setTimeout(handleComputerMove, 500); // Kis késleltetés a számítógép lépése előtt
    } else {
        displayMessage("Nem sikerült lépni. Próbáld újra!");
    }
}

function handleComputerMove() {
    // A számítógép választása
    // ...
    updateBoard();
}

function updateBoard() {
    createBoard(board);
}

function endGame() {
    // Játék vége logika
    // ...
}

function getNextActiveRow(currentColumn) {
    // Következő aktív sor logikája
    return currentColumn;
}

// Inicializálja a játékot
createBoard(board);