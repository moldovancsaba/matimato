class Board {
    constructor() {
        this.rows = 9;
        this.columns = 9;
        this.cells = this.createInitialBoard();
    }

    createInitialBoard() {
        let board = new Array(this.rows).fill(null).map(() => new Array(this.columns).fill(0));
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
                let num = (i * 3 + Math.floor(i / 3) + j) % 9 + 1;
                board[i][j] = num;
            }
        }
        return board;
    }

    removeNumber(row, column) {
        this.cells[row][column] = null;
    }

    hasAvailableMoves(row, column) {
        return this.cells[row].some(cell => cell != null) || this.cells.some(r => r[column] != null);
    }
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
            cellContent.textContent = board.cells[i][j];
            cell.appendChild(cellContent);
            boardElement.appendChild(cell);
        }
    }
}

const board = new Board();
createBoard(board);