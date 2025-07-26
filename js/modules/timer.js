import { getState, setState } from '../store/index.js';
import { getDomElements } from '../constants.js';
import { updateSidebarOnFinish } from './ui-updater.js';
import { displayResultsAndGetScore } from './results.js';
import { disableInputs } from './dom-utils.js';

export function startTimer() {
    const domElements = getDomElements();
    let { timerInterval, quizData, initialTotalTime } = getState();
    clearInterval(timerInterval);
    initialTotalTime = quizData.length * 40;
    let totalTime = initialTotalTime;
    setState({ initialTotalTime });

    timerInterval = setInterval(() => {
        const minutes = Math.floor(totalTime / 60);
        const seconds = totalTime % 60;
        domElements.timerEl.innerHTML = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        const percentageRemaining = (totalTime / initialTotalTime) * 100;
        domElements.timerEl.classList.remove('warn', 'danger');
        if (percentageRemaining < 60 && percentageRemaining > 30) {
            domElements.timerEl.classList.add('warn');
        } else if (percentageRemaining <= 30) {
            domElements.timerEl.classList.add('danger');
        }

        if (--totalTime < 0) finish();
    }, 1000);
    setState({ timerInterval });
}

export function finish(forceFailed = false) {
    const domElements = getDomElements();
    let { timerInterval, quizData } = getState();
    clearInterval(timerInterval);
    setState({ isTestActive: false, isTestFinished: true });
    domElements.body.classList.add('is-test-finished');

    requestAnimationFrame(() => {
        domElements.expandResultsBtn.classList.remove('hidden');
        domElements.weekIndexContainer.classList.remove('hidden');
        domElements.weekIndexContainer.style.display = '';

        const results = forceFailed
            ? { score: 0, total: quizData.length, answeredCount: 0 }
            : displayResultsAndGetScore();

        disableInputs();
        updateSidebarOnFinish(results);

        const params = new URLSearchParams(window.location.search);
        const week = params.get('week');
        domElements.mainTitle.textContent = week
            ? `PRINCE2 Foundation Quiz - Week ${week}`
            : 'PRINCE2 Foundation Quiz';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}