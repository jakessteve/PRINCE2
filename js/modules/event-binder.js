import { getDomElements } from '../constants.js';
import { getState } from '../store/index.js';
import { start, selectAndPrepareQuiz, handleURLChange } from './quiz-manager.js';
import { finish } from './timer.js';
import { updateCounter, highlightSelection } from './dom-utils.js';
import { toggleFullscreen, showCustomConfirm } from './ui-updater.js';
import { eventManager } from './event-manager.js';

export function bindEvents(doc = document) {
    const domElements = getDomElements(doc);
    console.log('🔗 Binding events');
    
    eventManager.addListener(domElements.startBtn, 'click', () => start());
    eventManager.addListener(domElements.finishBtn, 'click', () => {
        console.log('🎯 Finish button clicked');
        const { isTestFinished, quizData } = getState();
        console.log('📊 Current state:', { isTestFinished, quizDataLength: quizData?.length });
        
        if (isTestFinished) {
            console.log('⏭️ Test already finished, restarting');
            const params = new URLSearchParams(window.location.search);
            const week = params.get('week');
            if (week) {
                selectAndPrepareQuiz(week, true);
            }
        } else {
            const unansweredCount = quizData.length - domElements.quizForm.querySelectorAll('input[type="radio"]:checked').length;
            console.log('📝 Unanswered questions:', unansweredCount);
            
            if (unansweredCount > 0) {
                console.log('⚠️ Showing confirmation for unanswered questions');
                showCustomConfirm(`There are ${unansweredCount} questions not answered. Are you sure you want to finish the test?`, () => {
                    console.log('✅ User confirmed, calling finish()');
                    finish();
                });
            } else {
                console.log('✅ No unanswered questions, calling finish() directly');
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
    
    // Add beforeunload event listener to handle page refresh/close during active tests
    eventManager.addListener(window, 'beforeunload', (event) => {
        const { isTestActive, quizData } = getState();
        if (isTestActive) {
            // Show confirmation dialog before allowing page refresh/close
            // Use the same message format as for unanswered questions
            const domElements = getDomElements();
            const unansweredCount = quizData.length - domElements.quizForm.querySelectorAll('input[type="radio"]:checked').length;
            const confirmationMessage = `There are ${unansweredCount} questions not answered. Are you sure you want to finish the test?`;
            event.returnValue = confirmationMessage;
            return confirmationMessage;
        }
    });
}