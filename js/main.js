"use strict";

import { buildWeekIndex } from './modules/ui-updater.js';
import { bindEvents } from './modules/event-binder.js';
import { selectAndPrepareQuiz, handleURLChange } from './modules/quiz-manager.js';
import { testDataService } from './services/cache-test.js';

const quizApp = {
    async init() {
        // Run cache tests in development mode
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            try {
                await testDataService();
            } catch (error) {
                console.error('Cache tests failed:', error);
            }
        }
        
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
