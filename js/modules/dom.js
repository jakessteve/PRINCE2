import { elements } from './config.js';
import { state } from './state.js';

export function highlightSelection(targetInput) {
    const questionName = targetInput.name;
    document.querySelectorAll(`input[name="${questionName}"]`).forEach(radio => {
        radio.closest('li').classList.remove('selected-answer');
    });
    targetInput.closest('li').classList.add('selected-answer');
}

export function updateCounter() {
    const total = state.quizData ? state.quizData.length : 0;
    const answeredCount = elements.quizForm.querySelectorAll('input[type="radio"]:checked').length;
    const unansweredCount = total - answeredCount;
    elements.counterEl.innerHTML = `Answered: <span class="answered-count">${answeredCount}</span>/<span class="total-count">${total}</span><br>Unanswered: <span class="unanswered-count">${unansweredCount}</span>`;
}

export function disableInputs() {
    elements.quizForm.querySelectorAll('input').forEach(input => input.disabled = true);
    elements.finishBtn.textContent = 'Restart Test';
    elements.finishBtn.classList.add('btn-restart');
}

export function buildQuiz() {
    state.shuffledData = [...state.quizData];
    shuffleArray(state.shuffledData);
    elements.quizForm.innerHTML = '';
    state.shuffledData.forEach((item, index) => {
        const questionBlock = document.createElement('div');
        questionBlock.className = 'question-block';
        const questionText = document.createElement('p');
        questionText.textContent = `${index + 1}. ${item.question}`;
        questionBlock.appendChild(questionText);
        const optionsList = document.createElement('ul');
        const options = Object.entries(item.options);
        shuffleArray(options);
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
        elements.quizForm.appendChild(questionBlock);
    });
    updateCounter();
}

export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}