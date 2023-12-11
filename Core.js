class Board {
    constructor() {
        this.rows = 9;
        this.columns = 9;
        this.cells = this.createInitialBoard();
    }

    createInitialBoard() {
        const emojiMap = {
            1: '1️⃣', 2: '2️⃣', 3: '3️⃣',
            4: '4️⃣', 5: '5️⃣', 6: '6️⃣',
            7: '7️⃣', 8: '8️⃣', 9: '9️⃣'
        };

        const numbers = [
            [6, 3, 9, 5, 7, 4, 1, 8, 2].map(n => emojiMap[n]),
            [5, 4, 1, 8, 2, 9, 3, 7, 6].map(n => emojiMap[n]),
            [7, 8, 2, 6, 1, 3, 9, 5, 4].map(n => emojiMap[n]),
            [1, 9, 8, 4, 6, 7, 5, 2, 3].map(n => emojiMap[n]),
            [3, 6, 5, 9, 8, 2, 4, 1, 7].map(n => emojiMap[n]),
            [4, 2, 7, 1, 3, 5, 8, 6, 9].map(n => emojiMap[n]),
            [9, 5, 6, 7, 4, 8, 2, 3, 1].map(n => emojiMap[n]),
            [8, 1, 3, 2, 9, 6, 7, 4, 5].map(n => emojiMap[n]),
            [2, 7, 4, 3, 5, 1, 6, 9, 8].map(n => emojiMap[n])
        ];

        // Keverés a sorok véletlenszerű sorrendbe állításához
        for (let i = numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }

        return numbers;
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
            board.removeNumber(position.row][position.column] = null;
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
        setTimeout(handleComputerMove, 500); // Kis késleltetés a számítógép lépése előtt
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
        // Ha azonos a pontszám, az utoljára lépő nyer
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
            if (i === activeRow) {
                cell.classList.add('active-row');
            }
            const cellContent = document.createElement('div');
            cellContent.className = 'cell-content';
            cellContent.innerHTML = board.cells[i][j]; // Használja az innerHTML-t az emoji-k megjelenítéséhez
            cell.appendChild(cellContent);
            cell.onclick = () => handleCellClick(i, j);
            boardElement.appendChild(cell);
        }
    }
}

// A játék inicializálása
createBoard(board);