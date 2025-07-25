import { state } from './state.js';
import { elements } from './config.js';
import { displayResultsAndGetScore, updateSidebarOnFinish } from './ui.js';
import { disableInputs } from './dom.js';

export function startTimer() {
    clearInterval(state.timerInterval);
    state.initialTotalTime = state.quizData.length * 40;
    let totalTime = state.initialTotalTime;

    state.timerInterval = setInterval(() => {
        const minutes = Math.floor(totalTime / 60);
        const seconds = totalTime % 60;
        elements.timerEl.innerHTML = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        const percentageRemaining = (totalTime / state.initialTotalTime) * 100;
        elements.timerEl.classList.remove('warn', 'danger');
        if (percentageRemaining < 60 && percentageRemaining > 30) {
            elements.timerEl.classList.add('warn');
        } else if (percentageRemaining <= 30) {
            elements.timerEl.classList.add('danger');
        }

        if (--totalTime < 0) finish();
    }, 1000);
}

export function finish(forceFailed = false) {
    clearInterval(state.timerInterval);
    state.isTestActive = false;
    state.isTestFinished = true;
    elements.body.classList.add('is-test-finished');

    requestAnimationFrame(() => {
        elements.expandResultsBtn.classList.remove('hidden');
        elements.weekIndexContainer.classList.remove('hidden');
        elements.weekIndexContainer.style.display = '';

        const results = forceFailed
            ? { score: 0, total: state.quizData.length, answeredCount: 0 }
            : displayResultsAndGetScore();

        disableInputs();
        updateSidebarOnFinish(results);

        const params = new URLSearchParams(window.location.search);
        const week = params.get('week');
        elements.mainTitle.textContent = week
            ? `PRINCE2 Foundation Quiz - Week ${week}`
            : 'PRINCE2 Foundation Quiz';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}