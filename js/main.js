"use strict";

import { buildWeekIndex } from './modules/ui-updater.js';
import { bindEvents } from './modules/event-binder.js';
import { selectAndPrepareQuiz, handleURLChange } from './modules/quiz-manager.js';

const quizApp = {
    async init() {
        await buildWeekIndex(selectAndPrepareQuiz);
        bindEvents();
        if (!window.location.search) {
            selectAndPrepareQuiz('1', false);
        }
        handleURLChange();
    },
};

document.addEventListener('DOMContentLoaded', () => {
    quizApp.init();
});
