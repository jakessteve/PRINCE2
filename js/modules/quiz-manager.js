import { getState, setState } from '../store/index.js';
import { getDomElements } from '../constants.js';
import { showCustomAlert, prepareQuizScreen, updateActiveWeekLink, showWelcomeScreen, resetResultContainers, showCustomConfirm } from './ui-updater.js';
import { buildQuiz, updateCounter } from './dom-utils.js';
import { shuffleArray } from '../utils/array-utils.js';
import { startTimer, finish } from './timer.js';
import { getQuizData } from '../services/data-service.js';

export async function selectAndPrepareQuiz(quizId, autoStart = false) {
    const { isTestActive } = getState();
    if (isTestActive) {
        showCustomConfirm('A test is in progress. Are you sure you want to quit?', async () => {
            finish(true);
            await resetAndLoadQuiz(quizId, autoStart);
        });
    } else {
        await resetAndLoadQuiz(quizId, autoStart);
    }
}

export async function resetAndLoadQuiz(quizId, autoStart) {
    const domElements = getDomElements();
    resetResultContainers();
    setState({
        quizData: [],
        shuffledData: [],
        timerInterval: null,
        startTime: null,
        initialTotalTime: 0,
        isTestActive: false,
        isTestFinished: false,
    });

    history.pushState({}, '', `?week=${quizId}`);
    const isFinalTest = quizId === 'final';
    const isFailedTest = quizId === 'failed';

    try {
        const quizData = await getQuizData(quizId);
        setState({ quizData });

        if (isFailedTest && quizData.length === 0) {
            showCustomAlert("Not enough questions have been failed more than 5 times to generate this test.");
            prepareQuizScreen();
            updateActiveWeekLink(null);
            domElements.startBtn.classList.add('hidden');
            return;
        }
    } catch (error) {
        console.error("Failed to load quiz data:", error);
        showCustomAlert(`Error: Could not load quiz data for "${quizId}". Please check the console for details.`);
        return;
    }
    const { quizData } = getState();
    if (!quizData || quizData.length === 0 && !isFailedTest) {
        showCustomAlert(`Error: Could not find quiz data for "${quizId}".`);
        return;
    }

    domElements.mainTitle.textContent = isFinalTest
        ? 'PRINCE2 Foundation - Final Test'
        : isFailedTest
            ? 'PRINCE2 Foundation - Most Failed Questions'
            : `PRINCE2 Foundation Quiz - Week ${quizId}`;
    prepareQuizScreen();
    updateActiveWeekLink(quizId);

    domElements.startBtn.innerHTML = isFinalTest
        ? 'Start Final Test'
        : isFailedTest
            ? 'Start Failed Test'
            : `Start Test<br>Week ${quizId}`;

    updateCounter();
    if (autoStart) {
        start();
    }
}

export function start() {
    const domElements = getDomElements();
    const { quizData } = getState();
    if (!quizData || quizData.length === 0) {
        showCustomAlert("Please select a quiz from the index first!");
        return;
    }
    setState({ isTestActive: true, isTestFinished: false, startTime: new Date() });
    domElements.startBtn.classList.add('hidden');
    domElements.finishBtn.classList.remove('hidden');
    domElements.finishBtn.disabled = false;
    domElements.finishBtn.textContent = 'Finish Test';
    domElements.finishBtn.classList.remove('btn-restart');
    domElements.quizForm.classList.remove('hidden');

    domElements.weekIndexContainer.classList.add('hidden');
    window.requestAnimationFrame(() => {
        domElements.weekIndexContainer.style.display = 'none';
    });

    buildQuiz();
    startTimer();
}

export function handleURLChange() {
    const params = new URLSearchParams(window.location.search);
    const week = params.get('week');
    if (week) {
        selectAndPrepareQuiz(week);
    } else {
        showWelcomeScreen();
    }
}