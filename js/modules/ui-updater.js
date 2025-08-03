import { getDomElements } from '../constants.js';
import { getState } from '../store/index.js';
import { getFailedCounts, saveFailedCounts } from '../services/storage-service.js';
import { eventManager } from './event-manager.js';

// Reusable dialog elements
let confirmDialog = null;
let confirmOverlay = null;
let alertDialog = null;
let alertOverlay = null;

// Initialize dialog elements
function initDialogs() {
    if (!confirmDialog) {
        confirmDialog = document.createElement('div');
        confirmDialog.className = 'custom-dialog';
        confirmDialog.innerHTML = `
            <p id="confirm-message"></p>
            <button id="confirm-yes">Yes</button>
            <button id="confirm-no">No</button>
        `;
        confirmDialog.style.display = 'none';
        document.body.appendChild(confirmDialog);

        confirmOverlay = document.createElement('div');
        confirmOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            z-index: 1999;
            display: none;
        `;
        document.body.appendChild(confirmOverlay);
    }

    if (!alertDialog) {
        alertDialog = document.createElement('div');
        alertDialog.className = 'custom-dialog';
        alertDialog.innerHTML = `
            <p id="alert-message"></p>
            <button id="alert-ok">OK</button>
        `;
        alertDialog.style.display = 'none';
        document.body.appendChild(alertDialog);

        alertOverlay = document.createElement('div');
        alertOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            z-index: 1999;
            display: none;
        `;
        document.body.appendChild(alertOverlay);
    }
}

export function showCustomConfirm(message, onConfirm) {
    initDialogs();
    
    // Update message
    document.getElementById('confirm-message').textContent = message;
    
    // Show dialog and overlay
    confirmDialog.style.display = 'block';
    confirmOverlay.style.display = 'block';

    const closeDialog = () => {
        confirmDialog.style.display = 'none';
        confirmOverlay.style.display = 'none';
    };

    // Remove existing event listeners to prevent duplicates
    const yesButton = document.getElementById('confirm-yes');
    const noButton = document.getElementById('confirm-no');
    
    // Add new event listeners using eventManager for proper cleanup
    const onYes = () => {
        onConfirm();
        closeDialog();
    };
    
    const onNo = () => {
        closeDialog();
    };
    
    eventManager.addListener(yesButton, 'click', onYes);
    eventManager.addListener(noButton, 'click', onNo);
}

export function showCustomAlert(message) {
    initDialogs();
    
    // Update message
    document.getElementById('alert-message').textContent = message;
    
    // Show dialog and overlay
    alertDialog.style.display = 'block';
    alertOverlay.style.display = 'block';

    const closeDialog = () => {
        alertDialog.style.display = 'none';
        alertOverlay.style.display = 'none';
    };

    // Remove existing event listeners to prevent duplicates
    const okButton = document.getElementById('alert-ok');
    
    // Add new event listener using eventManager for proper cleanup
    eventManager.addListener(okButton, 'click', () => {
        closeDialog();
    });
}

export function toggleFullscreen() {
    const domElements = getDomElements();
    domElements.quizWrapper.classList.toggle('fullscreen-explanation');
    domElements.body.classList.toggle('explanation-active');
    domElements.mainTitle.classList.toggle('hidden');
    domElements.closeFullscreenBtn.classList.toggle('hidden');
}

export function prepareQuizScreen() {
    const domElements = getDomElements();
    domElements.quizForm.classList.add('hidden');
    domElements.startBtn.classList.remove('hidden');
    domElements.finishBtn.classList.add('hidden');
    domElements.counterEl.classList.remove('hidden');
    domElements.expandResultsBtn.classList.add('hidden');

    domElements.sidebarTitle.classList.remove('pass', 'fail');
    domElements.timerEl.classList.remove('warn', 'danger');

    domElements.weekIndexContainer.classList.remove('hidden');
}

export function showWelcomeScreen() {
    const domElements = getDomElements();
    domElements.quizForm.classList.add('hidden');
    domElements.startBtn.classList.add('hidden');
    domElements.finishBtn.classList.add('hidden');
    domElements.counterEl.classList.add('hidden');
    domElements.expandResultsBtn.classList.add('hidden');

    const params = new URLSearchParams(window.location.search);
    const week = params.get('week');
    domElements.mainTitle.textContent = week
        ? `PRINCE2 Foundation Quiz - Week ${week}`
        : 'PRINCE2 Foundation Quiz';

    domElements.sidebarTitle.textContent = '';
    domElements.sidebarTitle.classList.remove('pass', 'fail');
    domElements.timerEl.innerHTML = '00:00';
    domElements.timerEl.classList.remove('warn', 'danger');
    domElements.counterEl.textContent = 'Select a Week to Begin';

    resetResultContainers();

    updateActiveWeekLink(week);

    domElements.weekIndexContainer.classList.remove('hidden');
}

export function updateActiveWeekLink(activeWeek) {
    const domElements = getDomElements();
    domElements.weekIndex.querySelectorAll('a').forEach(link => {
        const weekNum = new URL(link.href).searchParams.get('week');
        link.classList.toggle('active-week', weekNum === activeWeek);
    });
}

// Store current week index state for incremental updates
let currentWeekIndex = [];

export async function buildWeekIndex(selectAndPrepareQuizCallback) {
    const domElements = getDomElements();
    try {
        const response = await fetch('data/manifest.json');
        const { quizzes: weekNumbers } = await response.json();

        weekNumbers.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
        
        // Check if we need to update the index
        if (arraysEqual(currentWeekIndex, weekNumbers)) {
            // No changes needed
            return;
        }
        
        // Update current index state
        currentWeekIndex = [...weekNumbers];
        
        // Use DocumentFragment for batch operations
        const fragment = document.createDocumentFragment();
        
        // Create new elements
        weekNumbers.forEach(weekNum => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `?week=${weekNum}`;
            a.textContent = `Week ${weekNum}`;
            a.dataset.week = weekNum;
            li.appendChild(a);
            fragment.appendChild(li);
        });
        
        // Replace content with fragment
        domElements.weekIndex.innerHTML = '';
        domElements.weekIndex.appendChild(fragment);
        
        // Add event delegation for week index links
        eventManager.addListener(domElements.weekIndex, 'click', (e) => {
            if (e.target.tagName === 'A' && e.target.dataset.week) {
                e.preventDefault();
                domElements.weekIndex.querySelectorAll('a').forEach(link => link.classList.remove('active-week'));
                e.target.classList.add('active-week');
                selectAndPrepareQuizCallback(e.target.dataset.week);
            }
        });
    } catch (error) {
        console.error('Failed to build week index:', error);
        domElements.weekIndex.innerHTML = '<li>Could not load quiz index.</li>';
    }
}

// Helper function to compare arrays
function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;
    
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

export function updateSidebarOnFinish(results) {
    const domElements = getDomElements();
    const endTime = new Date();
    const { initialTotalTime, startTime } = getState();
    const timeSpentInSeconds = results.forceFailed ? initialTotalTime : Math.round((endTime - startTime) / 1000);
    const minutes = Math.floor(timeSpentInSeconds / 60);
    const seconds = timeSpentInSeconds % 60;
    const percentage = results.total > 0 ? Math.round((results.score / results.total) * 100) : 0;

    domElements.sidebarTitle.classList.remove('pass', 'fail');

    const passThreshold = 85;
    if (results.forceFailed || percentage < passThreshold) {
        domElements.sidebarTitle.innerHTML = `Failed<br>(${percentage}%)`;
        domElements.sidebarTitle.classList.add('fail');
    } else {
        domElements.sidebarTitle.innerHTML = `Pass<br>(${percentage}%)`;
        domElements.sidebarTitle.classList.add('pass');
    }

    domElements.timerEl.innerHTML = `<div class="timer-wrapper"><span class="timer-label">Total Time:</span>${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</div>`;

    const correctCount = results.score;
    const incorrectCount = results.answeredCount - results.score;
    const unansweredCount = results.total - results.answeredCount;

    const incorrectClass = incorrectCount > 0 ? 'result-incorrect' : 'result-neutral';
    const unansweredClass = unansweredCount > 0 ? 'result-incorrect' : 'result-neutral';

    domElements.counterEl.innerHTML = `
        <div class="test-result-summary">
            <span class="result-correct">Correct Answers: ${correctCount}/${results.total}</span><br>
            <span class="${incorrectClass}">Incorrect Answers: ${incorrectCount}/${results.total}</span><br>
            <span class="${unansweredClass}">Unanswered: ${unansweredCount}/${results.total}</span>
        </div>
    `;
}


export function resetResultContainers() {
    const domElements = getDomElements();
    domElements.body.classList.remove('is-test-finished');
    domElements.scoreContainer.classList.add('hidden');
    domElements.analysisContainer.classList.add('hidden');
    domElements.scoreContainer.innerHTML = '';
    domElements.analysisContent.innerHTML = '';
    domElements.quizForm.innerHTML = '';
    domElements.sidebarTitle.textContent = '';
    domElements.sidebarTitle.classList.remove('pass', 'fail');

    domElements.quizWrapper.classList.remove('fullscreen-explanation');
    domElements.body.classList.remove('explanation-active');
    domElements.mainTitle.classList.remove('hidden');

    domElements.timerEl.innerHTML = '00:00';
    domElements.timerEl.classList.remove('warn', 'danger');
    domElements.counterEl.innerHTML = 'Select a Week to Begin';
}