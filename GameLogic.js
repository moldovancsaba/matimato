class HumanPlayer {
    constructor(board) {
        this.board = board;
        this.score = 0;
    }

    makeMove(row, column) {
        if (this.board.cells[row][column] !== '•') {
            this.score += this.board.cells[row][column];
            this.board.removeNumber(row, column);
            return true;
        }
        return false;
    }
}

class ComputerPlayer {
    constructor(board) {
        this.board = board;
        this.score = 0;
    }

    makeMove() {
        // A számítógép lépése
        // ...
    }
}

// Globális változók
const board = new Board(5, 5);
let humanPlayer = new HumanPlayer(board);
let computerPlayer = new ComputerPlayer(board);
let currentPlayer = computerPlayer; // A számítógép kezdi

function handleCellClick(row, column) {
    if (currentPlayer === humanPlayer && humanPlayer.makeMove(row, column)) {
        updateScoreDisplay();
        switchPlayer();
    }
}

function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    playerScoreElement.textContent = `You: ${humanPlayer.score}`;
    aiScoreElement.textContent = `AI: ${computerPlayer.score}`;
}

function switchPlayer() {
    currentPlayer = currentPlayer === humanPlayer ? computerPlayer : humanPlayer;
    if (currentPlayer === computerPlayer) {
        setTimeout(() => {
            let score = computerPlayer.makeMove();
            computerPlayer.score += score;
            updateScoreDisplay();
            switchPlayer();
        }, 1000); // 1 másodperc késleltetés
    }
}

// A játék indítása
createBoard(board);
computerPlayer.makeMove(); // A számítógép kezdi a játékot