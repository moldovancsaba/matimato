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
    document.querySelectorAll('.row').forEach(row => {
        row.childNodes.forEach((cell, cellIndex) => {
            if (cellIndex === column) {
                cell.style.backgroundColor = 'white';
            } else {
                cell.style.backgroundColor = '';
            }
        });
    });
}

// Sor kiemelése
function highlightRow(row) {
    const rows = document.querySelectorAll('.row');
    rows.forEach((rowDiv, rowIndex) => {
        if (rowIndex === row) {
            rowDiv.childNodes.forEach(cell => {
                cell.style.backgroundColor = 'white';
            });
        } else {
            rowDiv.childNodes.forEach(cell => {
                cell.style.backgroundColor = '';
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
    });
}

// A képernyő méretének változására való reagálás
window.addEventListener('resize', updateBoard);

// A játék indítása
document.addEventListener('DOMContentLoaded', updateBoard);