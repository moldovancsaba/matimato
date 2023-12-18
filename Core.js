class Board {
    constructor() {
        this.rows = 5;
        this.columns = 5;
        this.cells = this.createInitialBoard();
    }

    createInitialBoard() {
        let board = [];
        for (let i = 0; i < this.rows; i++) {
            let row = [];
            for (let j = 0; j < this.columns; j++) {
                let randomNum = Math.floor(Math.random() * 9) + 1;
                row.push(randomNum);
            }
            board.push(row);
        }
        return board;
    }

    removeNumber(row, column) {
        this.cells[row][column] = 0;
    }

    hasAvailableMoves() {
        return this.cells.some(row => row.some(cell => cell > 0));
    }
}

class Player {
    constructor() {
        this.score = 0;
    }

    play(board, position) {
        if (board.cells[position.row][position.column] > 0) {
            this.score += board.cells[position.row][position.column];
            board.removeNumber(position.row, position.column);
            return true;
        }
        return false;
    }
}

const board = new Board();
const humanPlayer = new Player();
const computerPlayer = new Player();
let activeRow = 0;

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
        updateScoreDisplay();
        if (!board.hasAvailableMoves()) {
            endGame();
            return;
        }
        setTimeout(handleComputerMove, 500);
    } else {
        displayMessage("Nem sikerült lépni. Próbáld újra!");
    }
}

function handleComputerMove() {
    // A számítógép választása...
    updateBoard();
}

function updateBoard() {
    createBoard(board);
}

function endGame() {
    let resultMessage = "";
    if (humanPlayer.score > computerPlayer.score) {
        resultMessage = "Az emberi játékos nyert!";
    } else if (humanPlayer.score < computerPlayer.score) {
        resultMessage = "A számítógép nyert!";
    } else {
        resultMessage = "Az utoljára lépő játékos nyert!";
    }
    displayMessage(resultMessage);
    // saveGameStats(); // Ha Firebase integrációt használsz
}

function getNextActiveRow(currentColumn) {
    return currentColumn;
}

function updateScoreDisplay() {
    const scoreDisplay = document.getElementById('scoreDisplay');
    scoreDisplay.textContent = 'Pontszám: ' + humanPlayer.score;
}

function createBoard(board) {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    for (let i = 0; i < board.rows; i++) {
        for (let j = 0; j < board.columns; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            const cellContent = document.createElement('div');
            cellContent.className = 'cell-content';
            cellContent.textContent = board.cells[i][j] > 0 ? board.cells[i][j] : '';
            cell.appendChild(cellContent);
            cell.onclick = () => handleCellClick(i, j);
            boardElement.appendChild(cell);
        }
    }
}

// A játék inicializálása
createBoard(board);