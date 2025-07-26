import { getDomElements } from '../constants.js';
import { getState } from '../store/index.js';
import { getFailedCounts, saveFailedCounts } from '../services/storage-service.js';

export function displayResultsAndGetScore() {
    const domElements = getDomElements();
    domElements.quizForm.classList.add('hidden');
    domElements.scoreContainer.classList.add('hidden');

    let score = 0;
    let analysisHTML = '';
    const answeredCount = domElements.quizForm.querySelectorAll('input[type="radio"]:checked').length;
    const { shuffledData } = getState();
    shuffledData.forEach((item, index) => {
        const selectedAnswerNode = domElements.quizForm.querySelector(`input[name="q${index}"]:checked`);
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

            const failedCounts = getFailedCounts();
            const questionId = item.question;
            failedCounts[questionId] = (failedCounts[questionId] || 0) + 1;
            saveFailedCounts(failedCounts);
        }
    });

    if (analysisHTML) {
        domElements.analysisContent.innerHTML = analysisHTML;
        domElements.analysisContainer.classList.remove('hidden');
    }

    return { score, total: shuffledData.length, answeredCount };
}