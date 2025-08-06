/**
 * Offline Quiz Service
 * Handles offline quiz functionality, state management, and local storage fallback
 */

export class OfflineQuizService {
  constructor() {
    this.storageKey = 'offlineQuizData';
    this.currentQuizState = null;
    this.isOffline = !navigator.onLine;
    this.autoSaveInterval = null;
    this.autoSaveDelay = 5000; // 5 seconds
    
    this.init();
  }

  /**
   * Initialize the offline quiz service
   */
  init() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOffline = false;
      this.handleOnlineStatus();
    });

    window.addEventListener('offline', () => {
      this.isOffline = true;
      this.handleOfflineStatus();
    });

    // Load any existing offline quiz state
    this.loadOfflineState();

    // Setup auto-save for quiz progress
    this.setupAutoSave();
  }

  /**
   * Handle online status changes
   */
  handleOnlineStatus() {
    console.log('Online - Syncing offline data');
    
    // Sync any pending quiz results
    this.syncPendingResults();
    
    // Clear offline mode indicators
    this.clearOfflineIndicators();
    
    // Dispatch online event
    const event = new CustomEvent('quiz-online', {
      detail: { message: 'Back online - quiz data synced' }
    });
    window.dispatchEvent(event);
  }

  /**
   * Handle offline status changes
   */
  handleOfflineStatus() {
    console.log('Offline - Activating offline mode');
    
    // Show offline mode indicators
    this.showOfflineIndicators();
    
    // Dispatch offline event
    const event = new CustomEvent('quiz-offline', {
      detail: { message: 'Offline mode activated' }
    });
    window.dispatchEvent(event);
  }

  /**
   * Setup auto-save for quiz progress
   */
  setupAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      if (this.currentQuizState && this.hasUnsavedChanges()) {
        this.saveQuizState(this.currentQuizState);
      }
    }, this.autoSaveDelay);
  }

  /**
   * Start a new quiz (online or offline)
   */
  startQuiz(quizId, quizData) {
    const quizState = {
      id: this.generateQuizId(),
      quizId: quizId,
      startTime: new Date().toISOString(),
      endTime: null,
      questions: quizData.map((question, index) => ({
        id: question.question,
        index: index,
        question: question.question,
        options: question.options,
        correctAnswer: question.answer,
        userAnswer: null,
        isAnswered: false,
        timeSpent: 0,
        hints: []
      })),
      currentQuestionIndex: 0,
      score: 0,
      totalQuestions: quizData.length,
      isCompleted: false,
      isOffline: this.isOffline,
      lastSaved: null,
      version: '1.0'
    };

    this.currentQuizState = quizState;
    this.saveQuizState(quizState);
    
    return quizState;
  }

  /**
   * Record user answer
   */
  recordAnswer(questionId, userAnswer, timeSpent = 0) {
    if (!this.currentQuizState) {
      throw new Error('No active quiz session');
    }

    const question = this.currentQuizState.questions.find(q => q.id === questionId);
    if (!question) {
      throw new Error(`Question not found: ${questionId}`);
    }

    question.userAnswer = userAnswer;
    question.isAnswered = true;
    question.timeSpent += timeSpent;

    // Update score if answer is correct
    if (userAnswer === question.correctAnswer) {
      this.currentQuizState.score++;
    }

    // Auto-save the state
    this.saveQuizState(this.currentQuizState);

    return question;
  }

  /**
   * Navigate to next question
   */
  nextQuestion() {
    if (!this.currentQuizState) {
      return null;
    }

    if (this.currentQuizState.currentQuestionIndex < this.currentQuizState.questions.length - 1) {
      this.currentQuizState.currentQuestionIndex++;
      this.saveQuizState(this.currentQuizState);
      return this.currentQuizState.questions[this.currentQuizState.currentQuestionIndex];
    }

    return null;
  }

  /**
   * Navigate to previous question
   */
  previousQuestion() {
    if (!this.currentQuizState) {
      return null;
    }

    if (this.currentQuizState.currentQuestionIndex > 0) {
      this.currentQuizState.currentQuestionIndex--;
      this.saveQuizState(this.currentQuizState);
      return this.currentQuizState.questions[this.currentQuizState.currentQuestionIndex];
    }

    return null;
  }

  /**
   * Get current question
   */
  getCurrentQuestion() {
    if (!this.currentQuizState) {
      return null;
    }

    return this.currentQuizState.questions[this.currentQuizState.currentQuestionIndex];
  }

  /**
   * Complete the quiz
   */
  completeQuiz() {
    if (!this.currentQuizState) {
      throw new Error('No active quiz session');
    }

    this.currentQuizState.endTime = new Date().toISOString();
    this.currentQuizState.isCompleted = true;
    this.currentQuizState.lastSaved = new Date().toISOString();

    this.saveQuizState(this.currentQuizState);

    // Add to pending sync queue
    if (this.isOffline) {
      this.addToPendingSync(this.currentQuizState);
    }

    return this.currentQuizState;
  }

  /**
   * Save quiz state to local storage
   */
  saveQuizState(quizState) {
    try {
      const serializedState = JSON.stringify(quizState);
      localStorage.setItem(this.storageKey, serializedState);
      quizState.lastSaved = new Date().toISOString();
      
      // Also save to service worker if available
      if (window.serviceWorkerManager) {
        window.serviceWorkerManager.storeQuizState(quizState);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to save quiz state:', error);
      return false;
    }
  }

  /**
   * Load quiz state from local storage
   */
  loadOfflineState() {
    try {
      const serializedState = localStorage.getItem(this.storageKey);
      if (serializedState) {
        this.currentQuizState = JSON.parse(serializedState);
        console.log('Loaded offline quiz state:', this.currentQuizState);
        return this.currentQuizState;
      }
    } catch (error) {
      console.error('Failed to load quiz state:', error);
    }
    return null;
  }

  /**
   * Check if there are unsaved changes
   */
  hasUnsavedChanges() {
    if (!this.currentQuizState) {
      return false;
    }

    const lastSaved = new Date(this.currentQuizState.lastSaved);
    const now = new Date();
    const timeSinceLastSave = now - lastSaved;

    return timeSinceLastSave > this.autoSaveDelay;
  }

  /**
   * Get quiz progress
   */
  getProgress() {
    if (!this.currentQuizState) {
      return 0;
    }

    const answeredQuestions = this.currentQuizState.questions.filter(q => q.isAnswered).length;
    return (answeredQuestions / this.currentQuizState.totalQuestions) * 100;
  }

  /**
   * Get quiz statistics
   */
  getStatistics() {
    if (!this.currentQuizState) {
      return null;
    }

    const answeredQuestions = this.currentQuizState.questions.filter(q => q.isAnswered);
    const totalTimeSpent = answeredQuestions.reduce((sum, q) => sum + q.timeSpent, 0);
    const averageTimePerQuestion = answeredQuestions.length > 0 ? totalTimeSpent / answeredQuestions.length : 0;

    return {
      score: this.currentQuizState.score,
      totalQuestions: this.currentQuizState.totalQuestions,
      progress: this.getProgress(),
      totalTimeSpent: totalTimeSpent,
      averageTimePerQuestion: averageTimePerQuestion,
      currentQuestionIndex: this.currentQuizState.currentQuestionIndex,
      isCompleted: this.currentQuizState.isCompleted,
      isOffline: this.currentQuizState.isOffline
    };
  }

  /**
   * Add item to pending sync queue
   */
  addToPendingSync(quizResult) {
    const syncQueue = this.getSyncQueue();
    const syncItem = {
      id: this.generateSyncId(),
      quizResult: quizResult,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    syncQueue.push(syncItem);
    localStorage.setItem('offlineSyncQueue', JSON.stringify(syncQueue));

    // If service worker is available, register for background sync
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'ADD_TO_SYNC_QUEUE',
        data: syncItem
      });
    }

    return syncItem;
  }

  /**
   * Get sync queue
   */
  getSyncQueue() {
    try {
      const queue = localStorage.getItem('offlineSyncQueue');
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Failed to get sync queue:', error);
      return [];
    }
  }

  /**
   * Sync pending results
   */
  async syncPendingResults() {
    const syncQueue = this.getSyncQueue();
    
    if (syncQueue.length === 0) {
      return;
    }

    const successfulSyncs = [];
    const failedSyncs = [];

    for (const item of syncQueue) {
      try {
        await this.syncQuizResult(item.quizResult);
        successfulSyncs.push(item.id);
      } catch (error) {
        console.error('Failed to sync quiz result:', error);
        failedSyncs.push(item.id);
      }
    }

    // Remove successfully synced items
    if (successfulSyncs.length > 0) {
      const updatedQueue = syncQueue.filter(item => !successfulSyncs.includes(item.id));
      localStorage.setItem('offlineSyncQueue', JSON.stringify(updatedQueue));
    }

    return {
      successful: successfulSyncs.length,
      failed: failedSyncs.length,
      total: syncQueue.length
    };
  }

  /**
   * Sync individual quiz result
   */
  async syncQuizResult(quizResult) {
    // This would typically send the result to a server
    // For now, we'll just simulate the sync process
    console.log('Syncing quiz result:', quizResult);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate successful sync
    return { success: true, id: quizResult.id };
  }

  /**
   * Show offline indicators
   */
  showOfflineIndicators() {
    // Update offline indicator in main app
    const event = new CustomEvent('connectivity-change', {
      detail: { isOffline: true }
    });
    window.dispatchEvent(event);
  }

  /**
   * Clear offline indicators
   */
  clearOfflineIndicators() {
    // Update online indicator in main app
    const event = new CustomEvent('connectivity-change', {
      detail: { isOffline: false }
    });
    window.dispatchEvent(event);
  }

  /**
   * Generate unique quiz ID
   */
  generateQuizId() {
    return 'quiz_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate unique sync ID
   */
  generateSyncId() {
    return 'sync_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Export quiz data for backup
   */
  exportQuizData() {
    if (!this.currentQuizState) {
      return null;
    }

    return {
      quizState: this.currentQuizState,
      syncQueue: this.getSyncQueue(),
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
  }

  /**
   * Import quiz data from backup
   */
  importQuizData(importedData) {
    try {
      if (importedData.quizState) {
        this.currentQuizState = importedData.quizState;
        this.saveQuizState(this.currentQuizState);
      }

      if (importedData.syncQueue) {
        localStorage.setItem('offlineSyncQueue', JSON.stringify(importedData.syncQueue));
      }

      return true;
    } catch (error) {
      console.error('Failed to import quiz data:', error);
      return false;
    }
  }

  /**
   * Clear all offline data
   */
  clearAllData() {
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem('offlineSyncQueue');
      this.currentQuizState = null;
      
      // Clear from service worker if available
      if (window.serviceWorkerManager) {
        window.serviceWorkerManager.storeQuizState(null);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      return false;
    }
  }

  /**
   * Get current offline status
   */
  isOfflineMode() {
    return this.isOffline;
  }

  /**
   * Get current quiz state
   */
  getCurrentQuizState() {
    return this.currentQuizState;
  }
}

// Create global instance
const offlineQuizService = new OfflineQuizService();

// Export for use in other modules
export default offlineQuizService;

// Auto-initialize when module is imported
if (typeof window !== 'undefined') {
  window.offlineQuizService = offlineQuizService;
}