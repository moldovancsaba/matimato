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
                row.push(Math.floor(Math.random() * 9) + 1);
            }
            board.push(row);
        }
        return board;
    }

    removeNumber(row, column) {
        this.cells[row][column] = 0;
    }
}

class Player {
    constructor() {
        this.score = 0;
    }

    play(board, position) {
        if (board.cells[position.row][position.column] !== 0) {
            this.score += board.cells[position.row][position.column];
            board.removeNumber(position.row, position.column);
            return true;
        }
        return false;
    }
}

const board = new Board();
const humanPlayer = new Player();

function displayScore() {
    const scoreElement = document.getElementById('score');
    scoreElement.textContent = `Score: ${humanPlayer.score}`;
}

function handleCellClick(row, column) {
    if (humanPlayer.play(board, { row, column })) {
        updateBoard();
        displayScore();
    }
}

function updateBoard() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    for (let i = 0; i < board.rows; i++) {
        for (let j = 0; j < board.columns; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            const cellContent = document.createElement('div');
            cellContent.className = 'cell-content';
            cellContent.textContent = board.cells[i][j] === 0 ? '' : board.cells[i][j];
            cell.appendChild(cellContent);
            cell.onclick = () => handleCellClick(i, j);
            boardElement.appendChild(cell);
        }
    }
}

// A játék inicializálása
updateBoard();