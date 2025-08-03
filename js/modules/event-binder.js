import { getDomElements } from '../constants.js';
import { getState } from '../store/index.js';
import { start, selectAndPrepareQuiz, handleURLChange } from './quiz-manager.js';
import { finish } from './timer.js';
import { updateCounter, highlightSelection } from './dom-utils.js';
import { toggleFullscreen, showCustomConfirm } from './ui-updater.js';
import { eventManager } from './event-manager.js';

export function bindEvents(doc = document) {
    const domElements = getDomElements(doc);
    eventManager.addListener(domElements.startBtn, 'click', () => start());
    eventManager.addListener(domElements.finishBtn, 'click', () => {
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

    eventManager.addListener(domElements.startFinalTestBtn, 'click', () => {
        selectAndPrepareQuiz('final', true);
    });

    eventManager.addListener(domElements.startFailedTestBtn, 'click', () => {
        selectAndPrepareQuiz('failed', true);
    });

    eventManager.addListener(domElements.quizForm, 'change', (event) => {
        updateCounter();
        highlightSelection(event.target);
    });
    eventManager.addListener(window, 'popstate', () => handleURLChange());

    eventManager.addListener(domElements.expandResultsBtn, 'click', () => toggleFullscreen());
    eventManager.addListener(domElements.closeFullscreenBtn, 'click', () => toggleFullscreen());
}