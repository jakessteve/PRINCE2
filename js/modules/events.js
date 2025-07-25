import { elements } from './config.js';
import { state } from './state.js';
import { start, selectAndPrepareQuiz, handleURLChange } from './quiz.js';
import { finish } from './timer.js';
import { updateCounter, highlightSelection } from './dom.js';
import { toggleFullscreen, showCustomConfirm } from './ui.js';

export function bindEvents() {
    elements.startBtn.addEventListener('click', () => start());
    elements.finishBtn.addEventListener('click', () => {
        if (state.isTestFinished) {
            const params = new URLSearchParams(window.location.search);
            const week = params.get('week');
            if (week) {
                selectAndPrepareQuiz(week, true);
            }
        } else {
            const unansweredCount = state.quizData.length - elements.quizForm.querySelectorAll('input[type="radio"]:checked').length;
            if (unansweredCount > 0) {
                showCustomConfirm(`There are ${unansweredCount} questions not answered. Are you sure you want to finish the test?`, () => {
                    finish();
                });
            } else {
                finish();
            }
        }
    });

    elements.startFinalTestBtn.addEventListener('click', () => {
        selectAndPrepareQuiz('final', true);
    });

    elements.startFailedTestBtn.addEventListener('click', () => {
        selectAndPrepareQuiz('failed', true);
    });

    elements.quizForm.addEventListener('change', (event) => {
        updateCounter();
        highlightSelection(event.target);
    });
    window.addEventListener('popstate', () => handleURLChange());

    elements.expandResultsBtn.addEventListener('click', () => toggleFullscreen());
    elements.closeFullscreenBtn.addEventListener('click', () => toggleFullscreen());
}