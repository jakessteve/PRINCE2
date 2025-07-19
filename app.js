const quizApp = {
    quizData: [],
    shuffledData: [],
    timerInterval: null,
    startTime: null,
    initialTotalTime: 0,
    isTestActive: false,

    quizBankData: window.QUIZ_BANK,

    elements: {
        mainTitle: document.getElementById('main-title'),
        welcomeMessage: document.getElementById('welcome-message'),
        quizWrapper: document.getElementById('quiz-wrapper'),
        quizForm: document.getElementById('quiz-form'),
        scoreContainer: document.getElementById('score-container'),
        analysisContainer: document.getElementById('analysis-container'),
        analysisContent: document.getElementById('analysis-content'),
        allAnswersContainer: document.getElementById('all-answers-container'),
        allAnswersContent: document.getElementById('all-answers-content'),
        startBtn: document.getElementById('start-btn'),
        finishBtn: document.getElementById('finish-btn'),
        startFinalTestBtn: document.getElementById('start-final-test-btn'),
        timerEl: document.getElementById('timer'),
        counterEl: document.getElementById('question-counter'),
        sidebarTitle: document.getElementById('sidebar-title'),
        weekIndexContainer: document.getElementById('week-index-container'),
        weekIndex: document.getElementById('week-index'),
    },

    init() {
        if (!this.quizBankData || Object.keys(this.quizBankData).length === 0) {
            console.error("Quiz data (QUIZ_BANK) not found.");
            alert("Error: Could not load quiz data. Please check the console (F12).");
            return;
        }
        this.buildWeekIndex();
        this.bindEvents();
        this.handleURLChange();
    },

    bindEvents() {
        this.elements.startBtn.addEventListener('click', () => this.start());
        this.elements.finishBtn.addEventListener('click', () => {
            const unansweredCount = this.quizData.length - this.elements.quizForm.querySelectorAll('input[type="radio"]:checked').length;
            if (unansweredCount > 0) {
                const confirmFinish = confirm(`There are ${unansweredCount} questions not answered. Are you sure you want to finish the test?`);
                if (confirmFinish) {
                    this.finish();
                }
            } else {
                this.finish();
            }
        });

        this.elements.startFinalTestBtn.addEventListener('click', () => {
            this.selectAndPrepareQuiz('final', true);
        });

        this.elements.quizForm.addEventListener('change', (event) => {
            this.updateCounter();
            this.highlightSelection(event.target);
        });
        window.addEventListener('popstate', () => this.handleURLChange());
    },

    selectAndPrepareQuiz(quizId, autoStart = false) {
        if (this.isTestActive) {
            if (!confirm('A test is in progress. Are you sure you want to quit?')) {
                return;
            }
            this.finish(true);
        }

        this.resetResultContainers();
        this.quizData = [];
        this.shuffledData = [];
        this.timerInterval = null;
        this.startTime = null;
        this.initialTotalTime = 0;
        this.isTestActive = false;

        history.pushState({}, '', `?week=${quizId}`);
        const isFinalTest = quizId === 'final';

        if (isFinalTest) {
            const finalTestQuestions = [];
            let remainingPool = [];
            const weeks = Object.keys(this.quizBankData);

            // 1. Pick one random question from each week to guarantee coverage
            weeks.forEach(week => {
                const weekQuestions = [...this.quizBankData[week]];
                if (weekQuestions.length > 0) {
                    this.shuffleArray(weekQuestions);
                    finalTestQuestions.push(weekQuestions.shift()); // Add one question to the final list
                    remainingPool = remainingPool.concat(weekQuestions); // Add the rest to the remaining pool
                }
            });

            // 2. Calculate how many more questions are needed to reach 60
            const questionsNeeded = 60 - finalTestQuestions.length;

            // 3. Fill the remainder with questions from the remaining pool
            if (questionsNeeded > 0 && remainingPool.length > 0) {
                this.shuffleArray(remainingPool);
                const additionalQuestions = remainingPool.slice(0, questionsNeeded);
                finalTestQuestions.push(...additionalQuestions);
            }

            // 4. Shuffle the final list of questions and assign it
            this.shuffleArray(finalTestQuestions);
            this.quizData = finalTestQuestions.slice(0, 60); // Ensure it's exactly 60

        } else {
            this.quizData = this.quizBankData[quizId];
        }

        if (!this.quizData || this.quizData.length === 0) {
            alert(`Error: Could not find quiz data for "${quizId}".`);
            return;
        }

        this.elements.mainTitle.textContent = isFinalTest
            ? 'PRINCE2 Foundation - Final Test'
            : `PRINCE2 Foundation Quiz - Week ${quizId}`;
        this.prepareQuizScreen();
        this.updateActiveWeekLink(quizId);
        this.elements.startBtn.textContent = isFinalTest
            ? 'Start Final Test'
            : `Start Test Week ${quizId}`;
        this.updateCounter();
        if (autoStart) {
            this.start();
        }
    },

    highlightSelection(targetInput) {
        const questionName = targetInput.name;
        document.querySelectorAll(`input[name="${questionName}"]`).forEach(radio => {
            radio.closest('li').classList.remove('selected-answer');
        });
        targetInput.closest('li').classList.add('selected-answer');
    },

    handleURLChange() {
        const params = new URLSearchParams(window.location.search);
        const week = params.get('week');
        if (week) {
            this.selectAndPrepareQuiz(week);
        } else {
            this.showWelcomeScreen();
        }
    },

    prepareQuizScreen() {
        this.elements.welcomeMessage.classList.add('hidden');
        this.elements.quizForm.classList.add('hidden');
        this.elements.startBtn.classList.remove('hidden');
        this.elements.finishBtn.classList.add('hidden');
        this.elements.questionCounter.classList.remove('hidden');

        this.elements.sidebarTitle.textContent = 'Controls';
        this.elements.sidebarTitle.classList.remove('pass', 'fail');
        this.elements.timerEl.innerHTML = "00:00";
        this.elements.timerEl.classList.remove('warn', 'danger');

        this.resetResultContainers();

        this.elements.weekIndexContainer.classList.remove('hidden');
    },

    showWelcomeScreen() {
        this.elements.welcomeMessage.classList.remove('hidden');
        this.elements.quizForm.classList.add('hidden');
        this.elements.startBtn.classList.add('hidden');
        this.elements.finishBtn.classList.add('hidden');
        this.elements.questionCounter.classList.add('hidden');
        const params = new URLSearchParams(window.location.search);
        const week = params.get('week');
        this.elements.mainTitle.textContent = week
            ? `PRINCE2 Foundation Quiz - Week ${week}`
            : 'PRINCE2 Foundation Quiz';

        this.elements.sidebarTitle.textContent = 'Controls';
        this.elements.sidebarTitle.classList.remove('pass', 'fail');
        this.elements.timerEl.innerHTML = '00:00';
        this.elements.timerEl.classList.remove('warn', 'danger');
        this.elements.questionCounter.textContent = 'Select a Week to Begin';

        this.resetResultContainers();

        this.updateActiveWeekLink(week);

        this.elements.weekIndexContainer.classList.remove('hidden');
    },

    updateActiveWeekLink(activeWeek) {
        this.elements.weekIndex.querySelectorAll('a').forEach(link => {
            const weekNum = new URL(link.href).searchParams.get('week');
            link.classList.toggle('active-week', weekNum === activeWeek);
        });
    },

    buildWeekIndex() {
        const weekNumbers = Object.keys(this.quizBankData).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
        this.elements.weekIndex.innerHTML = '';
        weekNumbers.forEach(weekNum => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `?week=${weekNum}`;
            a.textContent = `Week ${weekNum}`;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                this.elements.weekIndex.querySelectorAll('a').forEach(link => link.classList.remove('active-week'));
                a.classList.add('active-week');
                this.selectAndPrepareQuiz(weekNum);
            });
            li.appendChild(a);
            this.elements.weekIndex.appendChild(li);
        });
    },

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    },

    start() {
        if (!this.quizData || this.quizData.length === 0) {
            alert("Please select a quiz from the index first!");
            return;
        }
        this.isTestActive = true;
        this.elements.startBtn.classList.add('hidden');
        this.elements.finishBtn.classList.remove('hidden');
        this.elements.finishBtn.disabled = false;
        this.elements.finishBtn.textContent = 'Finish Test';
        this.elements.quizForm.classList.remove('hidden');
        this.startTime = new Date();

        this.elements.weekIndexContainer.classList.add('hidden');
        window.requestAnimationFrame(() => {
            this.elements.weekIndexContainer.style.display = 'none';
        });

        this.buildQuiz();
        this.startTimer();
    },

    buildQuiz() {
        this.shuffledData = [...this.quizData];
        this.shuffleArray(this.shuffledData);
        this.elements.quizForm.innerHTML = '';
        this.shuffledData.forEach((item, index) => {
            const questionBlock = document.createElement('div');
            questionBlock.className = 'question-block';
            const questionText = document.createElement('p');
            questionText.textContent = `${index + 1}. ${item.question}`;
            questionBlock.appendChild(questionText);
            const optionsList = document.createElement('ul');
            const options = Object.entries(item.options);
            this.shuffleArray(options);
            options.forEach(([key, value]) => {
                const optionItem = document.createElement('li');
                const label = document.createElement('label');
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = `q${index}`;
                radio.value = key;
                label.appendChild(radio);
                label.appendChild(document.createTextNode(` ${value}`));
                optionItem.appendChild(label);
                optionsList.appendChild(optionItem);
            });
            questionBlock.appendChild(optionsList);
            this.elements.quizForm.appendChild(questionBlock);
        });
        this.updateCounter();
    },

    startTimer() {
        clearInterval(this.timerInterval);
        this.initialTotalTime = this.quizData.length * 40;
        let totalTime = this.initialTotalTime;

        this.timerInterval = setInterval(() => {
            const minutes = Math.floor(totalTime / 60);
            const seconds = totalTime % 60;
            this.elements.timerEl.innerHTML = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            const percentageRemaining = (totalTime / this.initialTotalTime) * 100;
            this.elements.timerEl.classList.remove('warn', 'danger');
            if (percentageRemaining < 60 && percentageRemaining > 30) {
                this.elements.timerEl.classList.add('warn');
            } else if (percentageRemaining <= 30) {
                this.elements.timerEl.classList.add('danger');
            }

            if (--totalTime < 0) this.finish();
        }, 1000);
    },

    finish(forceFailed = false) {
        clearInterval(this.timerInterval);
        this.isTestActive = false;

        this.elements.weekIndexContainer.classList.remove('hidden');
        this.elements.weekIndexContainer.style.display = '';

        const results = forceFailed
            ? { score: 0, total: this.quizData.length, answeredCount: 0 }
            : this.displayResultsAndGetScore();

        this.disableInputs();
        this.updateSidebarOnFinish(results);

        const params = new URLSearchParams(window.location.search);
        const week = params.get('week');
        this.updateActiveWeekLink(week);
        this.elements.mainTitle.textContent = week
            ? `PRINCE2 Foundation Quiz - Week ${week}`
            : 'PRINCE2 Foundation Quiz';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    updateSidebarOnFinish(results) {
        const endTime = new Date();
        const timeSpentInSeconds = results.forceFailed ? this.initialTotalTime : Math.round((endTime - this.startTime) / 1000);
        const minutes = Math.floor(timeSpentInSeconds / 60);
        const seconds = timeSpentInSeconds % 60;
        const percentage = results.total > 0 ? Math.round((results.score / results.total) * 100) : 0;

        this.elements.sidebarTitle.classList.remove('pass', 'fail');

        const passThreshold = 85;
        if (results.forceFailed || percentage < passThreshold) {
            this.elements.sidebarTitle.textContent = `Failed (${percentage}%)`;
            this.elements.sidebarTitle.classList.add('fail');
        } else {
            this.elements.sidebarTitle.textContent = `Pass (${percentage}%)`;
            this.elements.sidebarTitle.classList.add('pass');
        }

        this.elements.timerEl.innerHTML = `<span class="timer-label">Total Time:</span>${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        const correctCount = results.score;
        const incorrectCount = results.answeredCount - results.score;
        const unansweredCount = results.total - results.answeredCount;

        const incorrectClass = incorrectCount > 0 ? 'result-incorrect' : 'result-neutral';
        const unansweredClass = unansweredCount > 0 ? 'result-incorrect' : 'result-neutral';

        this.elements.counterEl.innerHTML = `
            <span class="result-correct">Correct Answers: ${correctCount}/${results.total}</span><br>
            <span class="${incorrectClass}">Incorrect Answers: ${incorrectCount}/${results.total}</span><br>
            <span class="${unansweredClass}">Unanswered: ${unansweredCount}/${results.total}</span>
        `;
    },

    displayResultsAndGetScore() {
        this.elements.quizForm.classList.add('hidden');
        this.elements.scoreContainer.classList.add('hidden');

        let score = 0;
        let analysisHTML = '';
        let allAnswersHTML = '';
        const answeredCount = this.elements.quizForm.querySelectorAll('input[type="radio"]:checked').length;

        this.shuffledData.forEach((item, index) => {
            const selectedAnswerNode = this.elements.quizForm.querySelector(`input[name="q${index}"]:checked`);
            const selectedValue = selectedAnswerNode ? selectedAnswerNode.value : null;
            const isCorrect = selectedValue === item.answer;

            if (isCorrect) {
                score++;
            } else {
                const yourAnswerText = selectedValue ? `${selectedValue.toUpperCase()} - ${item.options[selectedValue]}` : "Not answered";
                analysisHTML += `
                    <div class="answer-item">
                        <p><strong>Question ${index + 1}:</strong> ${item.question}</p>
                        <p><strong>Your Answer:</strong> <span class="your-answer-text">${yourAnswerText}</span></p>
                        <p><strong>Correct Answer:</strong> <span class="correct-answer-text">${item.answer.toUpperCase()} - ${item.options[item.answer]}</span></p>
                        <p class="rationale-text"><strong>Rationale:</strong> ${item.reasoning}</p>
                    </div>`;
            }

            allAnswersHTML += `
                <div class="answer-item">
                    <p><strong>Question ${index + 1}:</strong> ${item.question}</p>
                    <p><strong>Correct Answer: ${item.answer.toUpperCase()}</strong> - ${item.options[item.answer]}</p>
                    <p class="rationale-text"><strong>Rationale:</strong> ${item.reasoning}</p>
                </div>`;
        });

        if (analysisHTML) {
            this.elements.analysisContent.innerHTML = analysisHTML;
            this.elements.analysisContainer.classList.remove('hidden');
        }
        this.elements.allAnswersContainer.classList.remove('hidden');
        this.elements.allAnswersContent.innerHTML = allAnswersHTML;

        return { score, total: this.shuffledData.length, answeredCount };
    },

    disableInputs() {
        this.elements.quizForm.querySelectorAll('input').forEach(input => input.disabled = true);
        this.elements.finishBtn.disabled = true;
        this.elements.finishBtn.textContent = 'Test Completed';
    },

    updateCounter() {
        const total = this.quizData ? this.quizData.length : 0;
        const answeredCount = this.elements.quizForm.querySelectorAll('input[type="radio"]:checked').length;
        const unansweredCount = total - answeredCount;
        this.elements.counterEl.innerHTML = `Questions Answered: <span class="answered-count">${answeredCount}</span> / <span class="total-count">${total}</span><br>Unanswered: <span class="unanswered-count">${unansweredCount}</span>`;
    },

    resetResultContainers() {
        this.elements.scoreContainer.classList.add('hidden');
        this.elements.analysisContainer.classList.add('hidden');
        this.elements.allAnswersContainer.classList.add('hidden');
        this.elements.scoreContainer.innerHTML = '';
        this.elements.analysisContent.innerHTML = '';
        this.elements.allAnswersContent.innerHTML = '';
        this.elements.quizForm.innerHTML = '';
        this.elements.sidebarTitle.textContent = 'Controls';
        this.elements.sidebarTitle.classList.remove('pass', 'fail');

        // ADDED: Reset timer and counter to their pre-test state
        this.elements.timerEl.innerHTML = '00:00';
        this.elements.timerEl.classList.remove('warn', 'danger');
        this.elements.counterEl.innerHTML = 'Select a Week to Begin';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    quizApp.init();
});