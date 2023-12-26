// user-interface.js

// Játéktábla létrehozása
function createBoard() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    for (let i = 0; i < board.rows; i++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';
        for (let j = 0; j < board.columns; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = board.cells[i][j];
            cell.setAttribute('row', i);
            cell.setAttribute('column', j);
            cell.addEventListener('click', () => handleCellClick(i, j));
            rowDiv.appendChild(cell);
        }
        boardElement.appendChild(rowDiv);
    }
}

// Oszlop kiemelése
function highlightColumn(column) {
    document.querySelectorAll('.cell').forEach(cell => {
        if (cell.getAttribute('column') === String(column)) {
            cell.style.border = '2px solid white';
        } else {
            cell.style.border = '';
        }
    });
}

// Sor kiemelése
function highlightRow(row) {
    const rows = document.querySelectorAll('.row');
    rows.forEach((rowDiv, rowIndex) => {
        if (rowIndex === row) {
            rowDiv.childNodes.forEach(cell => {
                cell.style.border = '2px solid white';
            });
        } else {
            rowDiv.childNodes.forEach(cell => {
                cell.style.border = '';
            });
        }
    });
}

// A cella kiemelése
function highlightCell(row, column) {
    let cellElement = document.querySelector(`.cell[row="${row}"][column="${column}"]`);
    if (cellElement) {
        cellElement.style.backgroundColor = '#444444';
        setTimeout(() => {
            cellElement.textContent = '•';
            cellElement.style.backgroundColor = '';
            cellElement.style.border = '';
        }, 500);
    }
}

// Pontszámok megjelenítése
function updateScoreDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    playerScoreElement.textContent = `You: ${playerScore}`;
    aiScoreElement.textContent = `AI: ${aiScore}`;
}

// A játéktábla frissítése és kiemelések eltávolítása
function updateBoard() {
    createBoard();
    removeHighlights();
    updateScoreDisplay();
}

// Kiemelések eltávolítása
function removeHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.style.backgroundColor = '';
        cell.style.border = '';
    });
}

// A képernyő méretének változására való reagálás
window.addEventListener('resize', updateBoard);

// A játék indítása
document.addEventListener('DOMContentLoaded', updateBoard);