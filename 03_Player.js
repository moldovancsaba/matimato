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