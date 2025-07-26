import { shuffleArray } from '../utils/array-utils.js';
import { getFailedCounts } from './storage-service.js';

async function fetchQuizData(quizId) {
    const res = await fetch(`data/json/week-${quizId}.json`);
    return await res.json();
}

async function fetchAllWeeksData() {
    const manifestRes = await fetch('data/manifest.json');
    const { quizzes: weeks } = await manifestRes.json();
    const allWeekPromises = weeks.map(week => fetch(`data/json/week-${week}.json`).then(res => res.json()));
    return await Promise.all(allWeekPromises);
}

export async function getQuizData(quizId) {
    if (quizId === 'final') {
        const allWeeksData = await fetchAllWeeksData();
        const finalTestQuestions = [];
        let remainingPool = [];

        allWeeksData.forEach(weekQuestions => {
            if (weekQuestions.length > 0) {
                shuffleArray(weekQuestions);
                finalTestQuestions.push(weekQuestions.shift());
                remainingPool = remainingPool.concat(weekQuestions);
            }
        });

        const questionsNeeded = 60 - finalTestQuestions.length;

        if (questionsNeeded > 0 && remainingPool.length > 0) {
            shuffleArray(remainingPool);
            const additionalQuestions = remainingPool.slice(0, questionsNeeded);
            finalTestQuestions.push(...additionalQuestions);
        }

        shuffleArray(finalTestQuestions);
        return finalTestQuestions.slice(0, 60);

    } else if (quizId === 'failed') {
        const failedCounts = getFailedCounts();
        const allWeeksData = await fetchAllWeeksData();
        let allQuestions = allWeeksData.flat();

        const uniqueQuestions = new Map();
        allQuestions.forEach(q => {
            if (!uniqueQuestions.has(q.question)) {
                uniqueQuestions.set(q.question, q);
            }
        });

        const questionsWithFailCount = Array.from(uniqueQuestions.values()).map(q => {
            return { ...q, failCount: failedCounts[q.question] || 0 };
        });

        const failedQuestionsPool = questionsWithFailCount
            .filter(q => q.failCount > 5)
            .sort((a, b) => b.failCount - a.failCount);

        return failedQuestionsPool.slice(0, 60);
    } else {
        return await fetchQuizData(quizId);
    }
}