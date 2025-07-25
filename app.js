"use strict";

import { buildWeekIndex } from './js/modules/ui.js';
import { bindEvents } from './js/modules/events.js';
import { selectAndPrepareQuiz, handleURLChange } from './js/modules/quiz.js';

const quizApp = {
    async init() {
        await buildWeekIndex(selectAndPrepareQuiz);
        bindEvents();
        if (!window.location.search) {
            selectAndPrepareQuiz('1', true);
        }
        handleURLChange();
    },
};

document.addEventListener('DOMContentLoaded', () => {
    quizApp.init();
});
