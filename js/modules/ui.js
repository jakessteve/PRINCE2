import { elements } from './config.js';
import { state } from './state.js';
import { getFailedCounts, saveFailedCounts } from './storage.js';

export function showCustomConfirm(message, onConfirm) {
    const dialog = document.createElement('div');
    dialog.className = 'custom-dialog';
    dialog.innerHTML = `
        <p>${message}</p>
        <button id="confirm-yes" style="background-color: #3498db; color: white; padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">Yes</button>
        <button id="confirm-no" style="background-color: #e74c3c; color: white; padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer;">No</button>
    `;
    document.body.appendChild(dialog);

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        z-index: 1999;
    `;
    document.body.appendChild(overlay);

    const closeDialog = () => {
        document.body.removeChild(dialog);
        document.body.removeChild(overlay);
    };

    document.getElementById('confirm-yes').addEventListener('click', () => {
        onConfirm();
        closeDialog();
    });

    document.getElementById('confirm-no').addEventListener('click', () => {
        closeDialog();
    });
}

export function showCustomAlert(message) {
    const dialog = document.createElement('div');
    dialog.className = 'custom-dialog';
    dialog.innerHTML = `
        <p>${message}</p>
        <button id="alert-ok" style="background-color: #3498db; color: white; padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer;">OK</button>
    `;
    document.body.appendChild(dialog);

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        z-index: 1999;
    `;
    document.body.appendChild(overlay);

    document.getElementById('alert-ok').addEventListener('click', () => {
        document.body.removeChild(dialog);
        document.body.removeChild(overlay);
    });
}

export function toggleFullscreen() {
    elements.quizWrapper.classList.toggle('fullscreen-explanation');
    elements.body.classList.toggle('explanation-active');
    elements.mainTitle.classList.toggle('hidden');
    elements.closeFullscreenBtn.classList.toggle('hidden');
}

export function prepareQuizScreen() {
    elements.quizForm.classList.add('hidden');
    elements.startBtn.classList.remove('hidden');
    elements.finishBtn.classList.add('hidden');
    elements.counterEl.classList.remove('hidden');
    elements.expandResultsBtn.classList.add('hidden');

    elements.sidebarTitle.classList.remove('pass', 'fail');
    elements.timerEl.classList.remove('warn', 'danger');

    elements.weekIndexContainer.classList.remove('hidden');
}

export function showWelcomeScreen() {
    elements.quizForm.classList.add('hidden');
    elements.startBtn.classList.add('hidden');
    elements.finishBtn.classList.add('hidden');
    elements.counterEl.classList.add('hidden');
    elements.expandResultsBtn.classList.add('hidden');

    const params = new URLSearchParams(window.location.search);
    const week = params.get('week');
    elements.mainTitle.textContent = week
        ? `PRINCE2 Foundation Quiz - Week ${week}`
        : 'PRINCE2 Foundation Quiz';

    elements.sidebarTitle.textContent = '';
    elements.sidebarTitle.classList.remove('pass', 'fail');
    elements.timerEl.innerHTML = '00:00';
    elements.timerEl.classList.remove('warn', 'danger');
    elements.counterEl.textContent = 'Select a Week to Begin';

    resetResultContainers();

    updateActiveWeekLink(week);

    elements.weekIndexContainer.classList.remove('hidden');
}

export function updateActiveWeekLink(activeWeek) {
    elements.weekIndex.querySelectorAll('a').forEach(link => {
        const weekNum = new URL(link.href).searchParams.get('week');
        link.classList.toggle('active-week', weekNum === activeWeek);
    });
}

export async function buildWeekIndex(selectAndPrepareQuizCallback) {
    try {
        const response = await fetch('data/manifest.json');
        const { quizzes: weekNumbers } = await response.json();

        weekNumbers.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
        elements.weekIndex.innerHTML = '';
        weekNumbers.forEach(weekNum => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `?week=${weekNum}`;
            a.textContent = `Week ${weekNum}`;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                elements.weekIndex.querySelectorAll('a').forEach(link => link.classList.remove('active-week'));
                a.classList.add('active-week');
                selectAndPrepareQuizCallback(String(weekNum));
            });
            li.appendChild(a);
            elements.weekIndex.appendChild(li);
        });
    } catch (error) {
        console.error('Failed to build week index:', error);
        elements.weekIndex.innerHTML = '<li>Could not load quiz index.</li>';
    }
}

export function updateSidebarOnFinish(results) {
    const endTime = new Date();
    const timeSpentInSeconds = results.forceFailed ? state.initialTotalTime : Math.round((endTime - state.startTime) / 1000);
    const minutes = Math.floor(timeSpentInSeconds / 60);
    const seconds = timeSpentInSeconds % 60;
    const percentage = results.total > 0 ? Math.round((results.score / results.total) * 100) : 0;

    elements.sidebarTitle.classList.remove('pass', 'fail');

    const passThreshold = 85;
    if (results.forceFailed || percentage < passThreshold) {
        elements.sidebarTitle.innerHTML = `Failed<br>(${percentage}%)`;
        elements.sidebarTitle.classList.add('fail');
    } else {
        elements.sidebarTitle.innerHTML = `Pass<br>(${percentage}%)`;
        elements.sidebarTitle.classList.add('pass');
    }

    elements.timerEl.innerHTML = `<div class="timer-wrapper"><span class="timer-label">Total Time:</span>${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</div>`;

    const correctCount = results.score;
    const incorrectCount = results.answeredCount - results.score;
    const unansweredCount = results.total - results.answeredCount;

    const incorrectClass = incorrectCount > 0 ? 'result-incorrect' : 'result-neutral';
    const unansweredClass = unansweredCount > 0 ? 'result-incorrect' : 'result-neutral';

    elements.counterEl.innerHTML = `
        <div class="test-result-summary">
            <span class="result-correct">Correct Answers: ${correctCount}/${results.total}</span><br>
            <span class="${incorrectClass}">Incorrect Answers: ${incorrectCount}/${results.total}</span><br>
            <span class="${unansweredClass}">Unanswered: ${unansweredCount}/${results.total}</span>
        </div>
    `;
}

export function displayResultsAndGetScore() {
    elements.quizForm.classList.add('hidden');
    elements.scoreContainer.classList.add('hidden');

    let score = 0;
    let analysisHTML = '';
    const answeredCount = elements.quizForm.querySelectorAll('input[type="radio"]:checked').length;

    state.shuffledData.forEach((item, index) => {
        const selectedAnswerNode = elements.quizForm.querySelector(`input[name="q${index}"]:checked`);
        const selectedValue = selectedAnswerNode ? selectedAnswerNode.value : null;
        const isCorrect = selectedValue === item.answer;

        if (isCorrect) {
            score++;
        } else {
            const yourAnswerText = selectedValue ? `${selectedValue.toUpperCase()} - ${item.options[selectedValue]}` : "Not answered";
            analysisHTML += `
                <div class="answer-item">
                    <p><strong>Question ${index + 1}:</strong> ${item.question}</p>
                    <p><strong>Your Answer:</strong> <span class="your-answer-text">${yourAnswerText}</span></p>
                    <p><strong>Correct Answer:</strong> <span class="correct-answer-text">${item.answer.toUpperCase()} - ${item.options[item.answer]}</span></p>
                    <p class="rationale-text"><strong>Rationale:</strong> ${item.reasoning}</p>
                </div>`;

            const failedCounts = getFailedCounts();
            const questionId = item.question;
            failedCounts[questionId] = (failedCounts[questionId] || 0) + 1;
            saveFailedCounts(failedCounts);
        }
    });

    if (analysisHTML) {
        elements.analysisContent.innerHTML = analysisHTML;
        elements.analysisContainer.classList.remove('hidden');
    }

    return { score, total: state.shuffledData.length, answeredCount };
}

export function resetResultContainers() {
    elements.body.classList.remove('is-test-finished');
    elements.scoreContainer.classList.add('hidden');
    elements.analysisContainer.classList.add('hidden');
    elements.scoreContainer.innerHTML = '';
    elements.analysisContent.innerHTML = '';
    elements.quizForm.innerHTML = '';
    elements.sidebarTitle.textContent = '';
    elements.sidebarTitle.classList.remove('pass', 'fail');

    elements.quizWrapper.classList.remove('fullscreen-explanation');
    elements.body.classList.remove('explanation-active');
    elements.mainTitle.classList.remove('hidden');

    elements.timerEl.innerHTML = '00:00';
    elements.timerEl.classList.remove('warn', 'danger');
    elements.counterEl.innerHTML = 'Select a Week to Begin';
}