export const FAILED_QUESTIONS_STORAGE_KEY = 'prince2FailedQuestions';

export const getDomElements = (doc = document) => ({
    body: doc.body,
    mainTitle: doc.getElementById('main-title'),
    expandResultsBtn: doc.getElementById('expand-results-btn'),
    closeFullscreenBtn: doc.getElementById('close-fullscreen-btn'),
    quizWrapper: doc.getElementById('quiz-wrapper'),
    quizForm: doc.getElementById('quiz-form'),
    scoreContainer: doc.getElementById('score-container'),
    analysisContainer: doc.getElementById('analysis-container'),
    analysisContent: doc.getElementById('analysis-content'),
    startBtn: doc.getElementById('start-btn'),
    finishBtn: doc.getElementById('finish-btn'),
    startFinalTestBtn: doc.getElementById('start-final-test-btn'),
    startFailedTestBtn: doc.getElementById('start-failed-test-btn'),
    timerEl: doc.getElementById('timer'),
    counterEl: doc.getElementById('question-counter'),
    sidebarTitle: doc.getElementById('sidebar-title'),
    weekIndexContainer: doc.getElementById('week-index-container'),
    weekIndex: doc.getElementById('week-index'),
});