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
                // Random szám generálása 1 és 9 között
                let num = Math.floor(Math.random() * 9) + 1;
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

const board = new Board();

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

            cell.onclick = function() {
                // Kattintás hatására eltüntetjük a számot
                board.removeNumber(i, j);
                this.firstChild.style.display = 'none';
            };

            boardElement.appendChild(cell);
        }
    }
}

// A játék inicializálása
createBoard(board);