import { FAILED_QUESTIONS_STORAGE_KEY } from './config.js';

export function getFailedCounts() {
    const counts = localStorage.getItem(FAILED_QUESTIONS_STORAGE_KEY);
    return counts ? JSON.parse(counts) : {};
}

export function saveFailedCounts(counts) {
    localStorage.setItem(FAILED_QUESTIONS_STORAGE_KEY, JSON.stringify(counts));
}