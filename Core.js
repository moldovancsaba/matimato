class Board {
    constructor() {
        this.rows = 9;
        this.columns = 9;
        this.cells = this.createInitialBoard();
    }

    createInitialBoard() {
        let board = [];
        for (let i = 0; i < this.rows; i++) {
            let row = [];
            for (let j = 0; j < this.columns; j++) {
                let num = (i * 3 + Math.floor(i / 3) + j) % 9 + 1;
                row.push(num);
            }
            board.push(row);
        }
        return board;
    }

    removeNumber(row, column) {
        this.cells[row][column] = null;
    }

    hasAvailableMoves() {
        return this.cells.some(row => row.some(cell => cell != null));
    }
}

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

const board = new Board();
const humanPlayer = new Player();
const computerPlayer = new Player();
let activeRow = 4; // Kezdeti beállítás a középső sorra

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
        setTimeout(handleComputerMove, 500);
    } else {
        displayMessage("Nem sikerült lépni. Próbáld újra!");
    }
}

function handleComputerMove() {
    let availableRows = [];
    for (let i = 0; i < board.rows; i++) {
        if (board.cells[i][activeRow] != null) {
            availableRows.push(i);
        }
    }

    if (availableRows.length === 0) {
        endGame();
        return;
    }

    let randomRowIndex = availableRows[Math.floor(Math.random() * availableRows.length)];
    computerPlayer.play(board, { row: randomRowIndex, column: activeRow });
    activeRow = getNextActiveRow(randomRowIndex);
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

function createBoard(board) {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    for (let i = 0; i < board.rows; i++) {
        for (let j = 0; j < board.columns; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.setAttribute('data-row', i);
            cell.setAttribute('data-column', j);

            if (i === activeRow) {
                cell.classList.add('active-row');
            }

            const cellContent = document.createElement('div');
            cellContent.className = 'cell-content';
            cellContent.textContent = board.cells[i][j];
            cell.appendChild(cellContent);

            cell.addEventListener('click', function() {
                handleCellClick(parseInt(this.getAttribute('data-row')), parseInt(this.getAttribute('data-column')));
            });

            boardElement.appendChild(cell);
        }
    }
}

// A játék inicializálása
createBoard(board);