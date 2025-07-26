import { getDomElements } from '../constants.js';
import { getState, setState } from '../store/index.js';
import { shuffleArray } from '../utils/array-utils.js';

export function highlightSelection(targetInput) {
    const questionName = targetInput.name;
    document.querySelectorAll(`input[name="${questionName}"]`).forEach(radio => {
        radio.closest('li').classList.remove('selected-answer');
    });
    targetInput.closest('li').classList.add('selected-answer');
}

export function updateCounter() {
    const domElements = getDomElements();
    const { quizData } = getState();
    const total = quizData ? quizData.length : 0;
    const answeredCount = domElements.quizForm.querySelectorAll('input[type="radio"]:checked').length;
    const unansweredCount = total - answeredCount;
    domElements.counterEl.innerHTML = `Answered: <span class="answered-count">${answeredCount}</span>/<span class="total-count">${total}</span><br>Unanswered: <span class="unanswered-count">${unansweredCount}</span>`;
}

export function disableInputs() {
    const domElements = getDomElements();
    domElements.quizForm.querySelectorAll('input').forEach(input => input.disabled = true);
    domElements.finishBtn.innerHTML = 'Restart<br>Test';
    domElements.finishBtn.classList.add('btn-restart');
}

export function buildQuiz() {
    const domElements = getDomElements();
    const { quizData } = getState();
    const shuffledData = [...quizData];
    shuffleArray(shuffledData);
    setState({ shuffledData });
    domElements.quizForm.innerHTML = '';
    shuffledData.forEach((item, index) => {
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
        domElements.quizForm.appendChild(questionBlock);
    });
    updateCounter();
}
