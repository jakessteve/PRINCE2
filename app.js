"use strict";

import { QUIZ_BANK } from './js/modules/config.js';
import { buildWeekIndex } from './js/modules/ui.js';
import { bindEvents } from './js/modules/events.js';
import { selectAndPrepareQuiz, handleURLChange } from './js/modules/quiz.js';

const quizApp = {
    init() {
        if (!QUIZ_BANK || Object.keys(QUIZ_BANK).length === 0) {
            console.error("Quiz data (QUIZ_BANK) not found.");
            alert("Error: Could not load quiz data. Please check the console (F12).");
            return;
        }
        buildWeekIndex(selectAndPrepareQuiz);
        bindEvents();
        handleURLChange();
    },
};

document.addEventListener('DOMContentLoaded', () => {
    quizApp.init();
});
