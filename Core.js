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
                let num = Math.floor(Math.random() * 9) + 1; // Random szám 1 és 9 között
                row.push(num);
            }
            board.push(row);
        }
        return board;
    }
}

const board = new Board(5, 5); // 5x5-ös tábla létrehozása

function createBoard(board) {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    for (let i = 0; i < board.rows; i++) {
        for (let j = 0; j < board.columns; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = board.cells[i][j]; // Számjegyek megjelenítése
            boardElement.appendChild(cell);
        }
    }
}

createBoard(board); // Tábla létrehozása