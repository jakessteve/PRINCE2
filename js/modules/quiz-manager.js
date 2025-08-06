import { getState, setState } from '../store/index.js';
import { getDomElements } from '../constants.js';
import { showCustomAlert, prepareQuizScreen, updateActiveWeekLink, showWelcomeScreen, resetResultContainers, showCustomConfirm } from './ui-updater.js';
import { buildQuiz, updateCounter } from './dom-utils.js';
import { shuffleArray } from '../utils/array-utils.js';
import { startTimer, finish } from './timer.js';
import { simpleDataService } from '../services/simple-data-service.js';
import serviceWorkerManager from '../services/service-worker-registration.js';
import quizStateManager from '../services/quiz-state-manager.js';

export async function selectAndPrepareQuiz(quizId, autoStart = false) {
    const { isTestActive } = getState();
    if (isTestActive) {
        showCustomConfirm('A test is in progress. Are you sure you want to quit?', async () => {
            finish(true);
            await resetAndLoadQuiz(quizId, autoStart);
        });
    } else {
        await resetAndLoadQuiz(quizId, autoStart);
    }
}

export async function resetAndLoadQuiz(quizId, autoStart) {
    const domElements = getDomElements();
    resetResultContainers();
    setState({
        quizData: [],
        shuffledData: [],
        timerInterval: null,
        startTime: null,
        initialTotalTime: 0,
        isTestActive: false,
        isTestFinished: false,
    });

    history.pushState({}, '', `?week=${quizId}`);
    const isFinalTest = quizId === 'final';
    const isFailedTest = quizId === 'failed';

    try {
        let quizData;
        
        // Check if we're in offline mode and have cached quiz data
        if (!serviceWorkerManager.isOnlineStatus()) {
            const cachedData = await getCachedQuizData(quizId);
            if (cachedData) {
                quizData = cachedData;
                console.log('Using cached quiz data for offline mode');
            } else {
                showCustomAlert("Offline mode: No cached quiz data available. Please connect to the internet.");
                return;
            }
        } else {
            // Online mode - fetch fresh data
            quizData = await simpleDataService.getQuizData(quizId);
            
            // Cache the data for offline use
            await cacheQuizDataForOffline(quizId, quizData);
        }

        setState({ quizData });

        if (isFailedTest && quizData.length === 0) {
            showCustomAlert("Not enough questions have been failed more than 5 times to generate this test.");
            prepareQuizScreen();
            updateActiveWeekLink(null);
            domElements.startBtn.classList.add('hidden');
            return;
        }
    } catch (error) {
        console.error("Failed to load quiz data:", error);
        
        // Try offline mode as fallback
        if (!serviceWorkerManager.isOnlineStatus()) {
            const cachedData = await getCachedQuizData(quizId);
            if (cachedData) {
                setState({ quizData: cachedData });
                console.log('Using cached quiz data as fallback');
            } else {
                showCustomAlert(`Error: Could not load quiz data for "${quizId}". You are offline and no cached data is available.`);
                return;
            }
        } else {
            showCustomAlert(`Error: Could not load quiz data for "${quizId}". Please check the console for details.`);
            return;
        }
    }
    
    const { quizData } = getState();
    if (!quizData || quizData.length === 0 && !isFailedTest) {
        showCustomAlert(`Error: Could not find quiz data for "${quizId}".`);
        return;
    }

    domElements.mainTitle.textContent = isFinalTest
        ? 'PRINCE2 Foundation - Final Test'
        : isFailedTest
            ? 'PRINCE2 Foundation - Most Failed Questions'
            : `PRINCE2 Foundation Quiz - Week ${quizId}`;
    prepareQuizScreen();
    updateActiveWeekLink(quizId);

    // Update start button based on offline status
    if (!serviceWorkerManager.isOnlineStatus()) {
        domElements.startBtn.innerHTML = isFinalTest
            ? 'Start Final Test (Offline)'
            : isFailedTest
                ? 'Start Failed Test (Offline)'
                : `Start Test (Offline)<br>Week ${quizId}`;
        domElements.startBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    } else {
        domElements.startBtn.innerHTML = isFinalTest
            ? 'Start Final Test'
            : isFailedTest
                ? 'Start Failed Test'
                : `Start Test<br>Week ${quizId}`;
        domElements.startBtn.style.background = '';
    }

    updateCounter();
    if (autoStart) {
        start();
    }
}

export function start() {
    const domElements = getDomElements();
    const { quizData } = getState();
    if (!quizData || quizData.length === 0) {
        showCustomAlert("Please select a quiz from the index first!");
        return;
    }
    
    // Initialize quiz session with state manager
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('week') || 'unknown';
    
    try {
        const session = quizStateManager.startQuizSession(quizId, quizData, {
            metadata: {
                source: 'quiz_manager',
                timestamp: new Date().toISOString()
            },
            settings: {
                allowNavigation: true,
                showTimer: true,
                autoSave: true
            }
        });
        
        setState({
            isTestActive: true,
            isTestFinished: false,
            startTime: new Date(),
            quizSession: session
        });
        
        // Show offline mode indicator if applicable
        if (quizStateManager.getCurrentSession().isOffline) {
            showOfflineModeIndicator();
        }
        
        domElements.startBtn.classList.add('hidden');
        domElements.finishBtn.classList.remove('hidden');
        domElements.finishBtn.disabled = false;
        domElements.finishBtn.textContent = 'Finish Test';
        domElements.finishBtn.classList.remove('btn-restart');
        domElements.quizForm.classList.remove('hidden');

        domElements.weekIndexContainer.classList.add('hidden');
        window.requestAnimationFrame(() => {
            domElements.weekIndexContainer.style.display = 'none';
        });

        buildQuiz();
        startTimer();
        
    } catch (error) {
        console.error('Failed to start quiz:', error);
        showCustomAlert('Error: Could not start quiz session. Please try again.');
    }
}

// Helper functions for offline quiz functionality
async function getCachedQuizData(quizId) {
    try {
        // Try to get cached data from service worker first
        if (window.serviceWorkerManager && window.serviceWorkerManager.isOnlineStatus() === false) {
            const cachedData = await fetch(`data/json/week-${quizId}.json`);
            if (cachedData.ok) {
                return await cachedData.json();
            }
        }
        
        // Fallback to localStorage
        const cachedKey = `cachedQuiz_${quizId}`;
        const cachedData = localStorage.getItem(cachedKey);
        return cachedData ? JSON.parse(cachedData) : null;
        
    } catch (error) {
        console.error('Failed to get cached quiz data:', error);
        return null;
    }
}

async function cacheQuizDataForOffline(quizId, quizData) {
    try {
        // Cache in localStorage as fallback
        const cachedKey = `cachedQuiz_${quizId}`;
        localStorage.setItem(cachedKey, JSON.stringify(quizData));
        
        // Cache in service worker if available
        // Skip caching for 'final' and 'failed' quizzes as they are generated dynamically
        if (window.serviceWorkerManager && quizId !== 'final' && quizId !== 'failed') {
            // Only cache if the file actually exists (for week-1 through week-16)
            const weekNum = parseInt(quizId);
            if (!isNaN(weekNum) && weekNum >= 1 && weekNum <= 16) {
                const cacheUrls = [`/data/json/week-${quizId}.json`];
                await window.serviceWorkerManager.cacheQuizData(cacheUrls);
            } else {
                console.warn(`Skipping cache for non-existent file: week-${quizId}.json`);
            }
        }
        
    } catch (error) {
        console.error('Failed to cache quiz data for offline:', error);
    }
}

function showOfflineModeIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'offline-mode-indicator';
    indicator.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px 30px;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        text-align: center;
        animation: fadeInScale 0.3s ease;
    `;
    indicator.innerHTML = `
        <div style="margin-bottom: 10px;">📱</div>
        <div>Offline Mode Active</div>
        <div style="font-size: 14px; margin-top: 5px; opacity: 0.9;">Your progress will be saved locally</div>
    `;
    
    // Add animation keyframes if not already present
    if (!document.getElementById('offline-animation-styles')) {
        const style = document.createElement('style');
        style.id = 'offline-animation-styles';
        style.textContent = `
            @keyframes fadeInScale {
                from {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(indicator);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        indicator.style.animation = 'fadeInScale 0.3s ease reverse';
        setTimeout(() => {
            if (document.body.contains(indicator)) {
                document.body.removeChild(indicator);
            }
        }, 300);
    }, 3000);
}

export function handleURLChange() {
    const params = new URLSearchParams(window.location.search);
    const week = params.get('week');
    if (week) {
        selectAndPrepareQuiz(week);
    } else {
        showWelcomeScreen();
    }
}