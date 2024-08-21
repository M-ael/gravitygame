/*
Fix slider transition being instant.
Resize, center and add small square to stop button.

Decrease the used spawn delay gradually.

Rename delimiter to separator.
Add Comments
*/

let cards = [];
let activeCards = [];

let spawnDelay = 50;
let spawnDelayMultiplier = 50;
let defaultSpawnDelay = spawnDelay * spawnDelayMultiplier;
let minDelay = 300;
let difficulty = 1;

let score = 0;
let scorePrefix = 'Score: ';
let currentLevel = 1;
let levelPrefix = 'Level ';

let spawnIntervalId;
let gameIntervalId;
let gameInProgress = false;

// Load saved settings from localStorage
document.getElementById('cardDataInput').value = localStorage.getItem('cardData') || '';
document.getElementById('cardDelimiter').value = localStorage.getItem('cardDelimiter') || '\n';
document.getElementById('textAnswerDelimiter').value = localStorage.getItem('textAnswerDelimiter') || ', ';
document.getElementById('spawnDelay').value = localStorage.getItem('spawnDelay') || spawnDelay;
document.getElementById('spawnDelayValue').textContent = `${document.getElementById('spawnDelay').value * spawnDelayMultiplier}`;
document.getElementById('difficultySlider').value = localStorage.getItem('difficulty') || 1;
document.getElementById('difficultyValue').textContent = `${document.getElementById('difficultySlider').value}`;

document.getElementById('startGame').addEventListener('click', startGame);
document.getElementById('answerBox').addEventListener('keydown', checkAnswer);
document.getElementById('spawnDelay').addEventListener('input', updateSpawnDelay);
document.getElementById('difficultySlider').addEventListener('input', updateDifficulty);

// Dark mode toggle
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    themeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
});

// Set initial theme
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
}

// Stop button functionality
const stopButton = document.getElementById('stopButton');
let stopTimer;

stopButton.addEventListener('mousedown', () => {
    stopTimer = setTimeout(() => {
        endGame('Game stopped by user');
    }, 700);
});

stopButton.addEventListener('mouseup', () => {
    clearTimeout(stopTimer);
});

stopButton.addEventListener('mouseleave', () => {
    clearTimeout(stopTimer);
});

// Blur textarea when game is running
const cardDataInput = document.getElementById('cardDataInput');
const textareaContainer = cardDataInput.parentElement;

function updateTextareaBlur() {
    if (gameInProgress) {
        textareaContainer.classList.add('blurred');
    } else {
        textareaContainer.classList.remove('blurred');
    }
}

function startGame() {
    gameInProgress = true;
    updateTextareaBlur();
    updateSpawnDelay();
    updateDifficulty();

    if (gameInProgress) {
        clearInterval(spawnIntervalId);
        clearInterval(gameIntervalId);
        clearCards();
    }

    score = 0;
    currentLevel = 1;
    cards = shuffle(parseCardData());
    activeCards = [];
    document.getElementById('score').textContent = scorePrefix + score;
    document.getElementById('level').textContent = levelPrefix + currentLevel;
    document.getElementById('answerBox').value = '';
    document.getElementById('answerBox').focus();
    updateStatusMessage('');

    localStorage.setItem('cardData', document.getElementById('cardDataInput').value.trim());
    localStorage.setItem('cardDelimiter', document.getElementById('cardDelimiter').value);
    localStorage.setItem('textAnswerDelimiter', document.getElementById('textAnswerDelimiter').value);
    localStorage.setItem('spawnDelay', document.getElementById('spawnDelay').value);

    spawnIntervalId = setInterval(spawnCard, Math.max(minDelay, spawnDelay * spawnDelayMultiplier));
    gameIntervalId = setInterval(updateGame, 60);
}

function updateSpawnDelay() {
    spawnDelay = parseInt(document.getElementById('spawnDelay').value);
    document.getElementById('spawnDelayValue').textContent = `${spawnDelay * spawnDelayMultiplier}`;
    localStorage.setItem('spawnDelay', spawnDelay);
}

function updateDifficulty() {
    difficulty = parseInt(document.getElementById('difficultySlider').value);
    document.getElementById('difficultyValue').textContent = `${difficulty}`;
    localStorage.setItem('difficulty', difficulty);
}

function parseCardData() {
    const cardData = document.getElementById('cardDataInput').value.trim();
    const cardDelimiter = new RegExp(document.getElementById('cardDelimiter').value);
    const textAnswerDelimiter = document.getElementById('textAnswerDelimiter').value;

    return cardData.split(cardDelimiter).map(item => {
        const [text, answer] = item.split(textAnswerDelimiter).map(part => part.trim());
        return { text, answer };
    });
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function spawnCard() {
    if (!gameInProgress || (cards.length == 0)) return;

    clearInterval(spawnIntervalId);
    spawnIntervalId = setInterval(spawnCard, Math.max(minDelay, spawnDelay * spawnDelayMultiplier - ((spawnDelay * spawnDelayMultiplier - minDelay)/(10 - 1)) * (currentLevel - 1))); //Correction Term for decrease in delay, such that the delay is at its min. after 10 rounds

    const card = cards.shift();
    const cardElement = document.createElement('div');
    cardElement.className = 'card';
    cardElement.textContent = card.text;

    const gameArea = document.getElementById('gameArea');
    gameArea.appendChild(cardElement);

    const maxLeft = gameArea.clientWidth - cardElement.clientWidth;
    const randomLeft = Math.floor(Math.random() * maxLeft);
    cardElement.style.left = `${randomLeft}px`;

    const duration = 5 / (difficulty ** (Math.log(10/7)/Math.log(5)));
    cardElement.style.animation = `fall ${duration}s linear, fadeIn 0.4s ease`;

    cardElement.dataset.answer = card.answer;
    activeCards.push({ element: cardElement, answer: card.answer });
}

function updateGame() {
    const gameArea = document.getElementById('gameArea');
    activeCards = activeCards.filter(({ element, answer }) => {
        const cardRect = element.getBoundingClientRect();
        const gameAreaRect = gameArea.getBoundingClientRect();

        if (cardRect.top <= gameAreaRect.bottom) { 
            element.style.top = `${gameAreaRect.bottom - cardRect.height}px`; // Keep card within the game area
            return true;
        }

        if (cardRect.bottom >= gameAreaRect.bottom + cardRect.height) { // Adjust for card height
            endGame(answer);
            return false;
        }

        return true;
    });
}

function checkAnswer(event) {
    if (event.key === 'Enter') {
        if (!gameInProgress) {
            startGame();
            return;
        }

        const answerBox = event.target;
        const answer = answerBox.value.trim();
        answerBox.value = '';

        const gameArea = document.getElementById('gameArea');
        for (const { element, answer: correctAnswer } of activeCards) {
            if (correctAnswer.toLowerCase() === answer.toLowerCase()) {
                gameArea.removeChild(element);
                score++;
                document.getElementById('score').textContent = scorePrefix + score;
                
                if (activeCards.length == 1 && cards.length == 0) {
                    cards = shuffle(parseCardData());
                    currentLevel++;
                    document.getElementById('level').textContent = levelPrefix + currentLevel;
                    updateStatusMessage(`Level Up! Level ${currentLevel}`);

                    clearInterval(spawnIntervalId);
                    spawnIntervalId = setInterval(spawnCard, defaultSpawnDelay);
                }

                activeCards = activeCards.filter(({ element: el }) => el !== element);
                return;
            }
        }
    }
}

function endGame(reason) {
    clearInterval(spawnIntervalId);
    clearInterval(gameIntervalId);
    clearCards();
    gameInProgress = false;
    updateTextareaBlur();
    updateStatusMessage(`Game Over! ${reason}. Please start the game.`);
}

function clearCards() {
    const gameArea = document.getElementById('gameArea');
    while (gameArea.firstChild) {
        gameArea.removeChild(gameArea.firstChild);
    }
    activeCards = [];
}

function updateStatusMessage(message) {
    const statusMessage = document.getElementById('gameStatus');
    statusMessage.textContent = message;
    statusMessage.style.visibility = message ? 'visible' : 'hidden';
}