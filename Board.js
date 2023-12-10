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
            if (i === activeRow) {
                cell.classList.add('active-row'); // Az aktív sor celláinak kiemelése
            }
            const cellContent = document.createElement('div');
            cellContent.className = 'cell-content';
            cellContent.textContent = board.cells[i][j];
            cell.appendChild(cellContent);
            cell.onclick = () => handleCellClick(i, j);
            boardElement.appendChild(cell);
        }
    }
}

const board = new Board();
createBoard(board);

// Gondoskodj arról, hogy az activeRow változót a GameLogic.js vagy egy másik releváns fájlban kezeld.