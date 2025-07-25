import { state } from './state.js';
import { QUIZ_BANK, elements } from './config.js';
import { showCustomAlert, prepareQuizScreen, updateActiveWeekLink, showWelcomeScreen, resetResultContainers } from './ui.js';
import { shuffleArray, buildQuiz, updateCounter } from './dom.js';
import { startTimer, finish } from './timer.js';
import { getFailedCounts } from './storage.js';

export function selectAndPrepareQuiz(quizId, autoStart = false) {
    if (state.isTestActive) {
        showCustomConfirm('A test is in progress. Are you sure you want to quit?', () => {
            finish(true);
            resetAndLoadQuiz(quizId, autoStart);
        });
    } else {
        resetAndLoadQuiz(quizId, autoStart);
    }
}

export function resetAndLoadQuiz(quizId, autoStart) {
    resetResultContainers();
    state.quizData = [];
    state.shuffledData = [];
    state.timerInterval = null;
    state.startTime = null;
    state.initialTotalTime = 0;
    state.isTestActive = false;
    state.isTestFinished = false;

    history.pushState({}, '', `?week=${quizId}`);
    const isFinalTest = quizId === 'final';
    const isFailedTest = quizId === 'failed';

    if (isFinalTest) {
        const finalTestQuestions = [];
        let remainingPool = [];
        const weeks = Object.keys(QUIZ_BANK);

        weeks.forEach(week => {
            const weekQuestions = [...QUIZ_BANK[week]];
            if (weekQuestions.length > 0) {
                shuffleArray(weekQuestions);
                finalTestQuestions.push(weekQuestions.shift());
                remainingPool = remainingPool.concat(weekQuestions);
            }
        });

        const questionsNeeded = 60 - finalTestQuestions.length;

        if (questionsNeeded > 0 && remainingPool.length > 0) {
            shuffleArray(remainingPool);
            const additionalQuestions = remainingPool.slice(0, questionsNeeded);
            finalTestQuestions.push(...additionalQuestions);
        }

        shuffleArray(finalTestQuestions);
        state.quizData = finalTestQuestions.slice(0, 60);

    } else if (isFailedTest) {
        const failedCounts = getFailedCounts();
        let allQuestions = [];
        Object.values(QUIZ_BANK).forEach(week => {
            allQuestions = allQuestions.concat(week);
        });

        const uniqueQuestions = new Map();
        allQuestions.forEach(q => {
            if (!uniqueQuestions.has(q.question)) {
                uniqueQuestions.set(q.question, q);
            }
        });

        const questionsWithFailCount = Array.from(uniqueQuestions.values()).map(q => {
            return { ...q, failCount: failedCounts[q.question] || 0 };
        });

        const failedQuestionsPool = questionsWithFailCount
            .filter(q => q.failCount > 5)
            .sort((a, b) => b.failCount - a.failCount);

        state.quizData = failedQuestionsPool.slice(0, 60);

        if (state.quizData.length === 0) {
            showCustomAlert("Not enough questions have been failed more than 5 times to generate this test.");
            prepareQuizScreen();
            updateActiveWeekLink(null);
            elements.startBtn.classList.add('hidden');
            return;
        }
    } else {
        state.quizData = QUIZ_BANK[quizId];
    }

    if (!state.quizData || state.quizData.length === 0 && !isFailedTest) {
        showCustomAlert(`Error: Could not find quiz data for "${quizId}".`);
        return;
    }

    elements.mainTitle.textContent = isFinalTest
        ? 'PRINCE2 Foundation - Final Test'
        : isFailedTest
            ? 'PRINCE2 Foundation - Most Failed Questions'
            : `PRINCE2 Foundation Quiz - Week ${quizId}`;
    prepareQuizScreen();
    updateActiveWeekLink(quizId);

    elements.startBtn.innerHTML = isFinalTest
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
    if (!state.quizData || state.quizData.length === 0) {
        showCustomAlert("Please select a quiz from the index first!");
        return;
    }
    state.isTestActive = true;
    state.isTestFinished = false;
    elements.startBtn.classList.add('hidden');
    elements.finishBtn.classList.remove('hidden');
    elements.finishBtn.disabled = false;
    elements.finishBtn.textContent = 'Finish Test';
    elements.finishBtn.classList.remove('btn-restart');
    elements.quizForm.classList.remove('hidden');
    state.startTime = new Date();

    elements.weekIndexContainer.classList.add('hidden');
    window.requestAnimationFrame(() => {
        elements.weekIndexContainer.style.display = 'none';
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