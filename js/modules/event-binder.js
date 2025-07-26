import { getDomElements } from '../constants.js';
import { getState } from '../store/index.js';
import { start, selectAndPrepareQuiz, handleURLChange } from './quiz-manager.js';
import { finish } from './timer.js';
import { updateCounter, highlightSelection } from './dom-utils.js';
import { toggleFullscreen, showCustomConfirm } from './ui-updater.js';

export function bindEvents(doc = document) {
    const domElements = getDomElements(doc);
    domElements.startBtn.addEventListener('click', () => start());
    domElements.finishBtn.addEventListener('click', () => {
        const { isTestFinished, quizData } = getState();
        if (isTestFinished) {
            const params = new URLSearchParams(window.location.search);
            const week = params.get('week');
            if (week) {
                selectAndPrepareQuiz(week, true);
            }
        } else {
            const unansweredCount = quizData.length - domElements.quizForm.querySelectorAll('input[type="radio"]:checked').length;
            if (unansweredCount > 0) {
                showCustomConfirm(`There are ${unansweredCount} questions not answered. Are you sure you want to finish the test?`, () => {
                    finish();
                });
            } else {
                finish();
            }
        }
    });

    domElements.startFinalTestBtn.addEventListener('click', () => {
        selectAndPrepareQuiz('final', true);
    });

    domElements.startFailedTestBtn.addEventListener('click', () => {
        selectAndPrepareQuiz('failed', true);
    });

    domElements.quizForm.addEventListener('change', (event) => {
        updateCounter();
        highlightSelection(event.target);
    });
    window.addEventListener('popstate', () => handleURLChange());

    domElements.expandResultsBtn.addEventListener('click', () => toggleFullscreen());
    domElements.closeFullscreenBtn.addEventListener('click', () => toggleFullscreen());
}