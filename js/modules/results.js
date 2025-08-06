import { getDomElements } from '../constants.js';
import { getState } from '../store/index.js';
import { getFailedCounts, saveFailedCounts } from '../services/storage-service.js';

export function displayResultsAndGetScore() {
    const domElements = getDomElements();
    console.log('🎯 displayResultsAndGetScore called');
    
    domElements.quizForm.classList.add('hidden');
    domElements.scoreContainer.classList.add('hidden');

    let score = 0;
    let analysisHTML = '';
    const answeredCount = domElements.quizForm.querySelectorAll('input[type="radio"]:checked').length;
    const { shuffledData } = getState();
    
    console.log('📊 Quiz data:', { totalQuestions: shuffledData.length, answeredCount });

    shuffledData.forEach((item, index) => {
        const selectedAnswerNode = domElements.quizForm.querySelector(`input[name="q${index}"]:checked`);
        const selectedValue = selectedAnswerNode ? selectedAnswerNode.value : null;
        const isCorrect = selectedValue === item.answer;

        // Update score for correct answers
        if (isCorrect) {
            score++;
        } else {
            // Update failed counts for incorrect answers
            const failedCounts = getFailedCounts();
            const questionId = item.question;
            failedCounts[questionId] = (failedCounts[questionId] || 0) + 1;
            saveFailedCounts(failedCounts);
        }

        // Only show details for incorrect or unanswered questions
        if (!isCorrect || !selectedValue) {
            // Show explanations for correct answer and selected wrong answer (if any)
            const yourAnswerText = selectedValue ? `${selectedValue.toUpperCase()} - ${item.options[selectedValue]}` : "Not answered";
            
            // Build explanations HTML
            let explanationsHTML = '';
            
            // Always show explanation for correct answer for incorrect/unanswered questions
            if (item.explanations && item.explanations[item.answer]) {
                explanationsHTML += `
                    <p class="explanation-item correct-explanation-results">
                        <strong>Explanation:</strong> ${item.explanations[item.answer]}
                    </p>`;
            }
            
            // Show explanation for selected wrong answer (if any)
            if (!isCorrect && selectedValue && item.explanations && item.explanations[selectedValue]) {
                explanationsHTML += `
                    <p class="explanation-item incorrect-explanation">
                        <strong>Explanation (for ${selectedValue.toUpperCase()}):</strong> ${item.explanations[selectedValue]}
                    </p>`;
            }
            
            analysisHTML += `
                <div class="answer-item">
                    <p><strong>Question ${index + 1}:</strong> ${item.question}</p>
                    <p><strong>Your Answer:</strong> <span class="${isCorrect ? 'correct-answer-text' : 'your-answer-text'}">${yourAnswerText}</span></p>
                    ${!isCorrect && selectedValue && item.explanations && item.explanations[selectedValue] ? `<p class="explanation-item incorrect-explanation"><strong>Explanation (for ${selectedValue.toUpperCase()}):</strong> ${item.explanations[selectedValue]}</p>` : ''}
                    ${(!isCorrect && selectedValue) || (!selectedValue) ? `<p><strong>Correct Answer:</strong> <span class="${selectedValue ? 'correct-answer-text' : 'your-answer-text'}">${item.answer.toUpperCase()} - ${item.options[item.answer]}</span></p>` : ''}
                    ${item.explanations && item.explanations[item.answer] ? `<p class="explanation-item correct-explanation-results"><strong>Explanation:</strong> ${item.explanations[item.answer].replace(/^Correct\.\s*/, '')}</p>` : ''}
                    ${item.reasoning ? `<p class="rationale-text"><strong>Overall Rationale:</strong> ${item.reasoning}</p>` : ''}
                </div>`;
        }
    });

    console.log('📝 Analysis HTML length:', analysisHTML.length);

    if (analysisHTML) {
        domElements.analysisContent.innerHTML = analysisHTML;
        domElements.analysisContainer.classList.remove('hidden');
        console.log('✅ Analysis container shown');
    } else {
        console.log('⚠️ No analysis HTML generated');
    }

    return { score, total: shuffledData.length, answeredCount };
}