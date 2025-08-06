/**
 * Quiz State Manager
 * Handles comprehensive quiz state management, persistence, and recovery
 */

export class QuizStateManager {
  constructor() {
    this.storagePrefix = 'prince2_quiz_';
    this.currentSession = null;
    this.autoSaveInterval = null;
    this.autoSaveDelay = 3000; // 3 seconds
    this.stateVersion = '1.0';
    this.saveTimeout = null;
    
    this.init();
  }

  /**
   * Initialize the state manager
   */
  init() {
    this.setupAutoSave();
    this.loadPersistedState();
    this.setupEventListeners();
  }

  /**
   * Setup auto-save functionality
   */
  setupAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      if (this.currentSession && this.hasUnsavedChanges()) {
        this.saveCurrentState();
      }
    }, this.autoSaveDelay);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.handleOnlineTransition();
    });

    window.addEventListener('offline', () => {
      this.handleOfflineTransition();
    });

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.saveCurrentState();
      }
    });

    // Listen for page unload
    window.addEventListener('beforeunload', () => {
      this.saveCurrentState();
    });

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data;
        if (type === 'RESTORE_QUIZ_STATE') {
          this.restoreState(data);
        }
      });
    }
  }

  /**
   * Start a new quiz session
   */
  startQuizSession(quizId, quizData, options = {}) {
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      quizId: quizId,
      startTime: new Date().toISOString(),
      endTime: null,
      questions: this.initializeQuestions(quizData),
      currentQuestionIndex: 0,
      score: 0,
      totalQuestions: quizData.length,
      isCompleted: false,
      isOffline: !navigator.onLine,
      lastSaved: null,
      version: this.stateVersion,
      metadata: {
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...options.metadata
      },
      settings: {
        allowNavigation: options.allowNavigation !== false,
        showTimer: options.showTimer !== false,
        autoSave: options.autoSave !== false,
        ...options.settings
      }
    };

    this.currentSession = session;
    this.saveCurrentState();
    
    return session;
  }

  /**
   * Initialize questions for the quiz
   */
  initializeQuestions(quizData) {
    return quizData.map((question, index) => ({
      id: this.generateQuestionId(question.question),
      originalIndex: index,
      question: question.question,
      options: question.options,
      correctAnswer: question.answer,
      userAnswer: null,
      isAnswered: false,
      timeSpent: 0,
      hints: [],
      bookmarks: false,
      notes: '',
      difficulty: this.assessDifficulty(question),
      category: this.categorizeQuestion(question)
    }));
  }

  /**
   * Assess question difficulty
   */
  assessDifficulty(question) {
    // Simple difficulty assessment based on question length and complexity
    const optionsText = Array.isArray(question.options) ? question.options.join('') : '';
    const textLength = question.question.length + optionsText.length;
    if (textLength < 100) return 'easy';
    if (textLength < 200) return 'medium';
    return 'hard';
  }

  /**
   * Categorize question
   */
  categorizeQuestion(question) {
    // Simple categorization based on keywords
    const optionsText = Array.isArray(question.options) ? question.options.join(' ') : '';
    const text = (question.question + ' ' + optionsText).toLowerCase();
    if (text.includes('prince2') || text.includes('method')) return 'methodology';
    if (text.includes('theme') || text.includes('business case')) return 'themes';
    if (text.includes('process') || text.includes('plan')) return 'processes';
    if (text.includes('quality') || text.includes('risk')) return 'quality';
    return 'general';
  }

  /**
   * Record user answer
   */
  recordAnswer(questionId, userAnswer, timeSpent = 0, additionalData = {}) {
    if (!this.currentSession) {
      throw new Error('No active quiz session');
    }

    const question = this.currentSession.questions.find(q => q.id === questionId);
    if (!question) {
      throw new Error(`Question not found: ${questionId}`);
    }

    const wasPreviouslyAnswered = question.isAnswered;
    question.userAnswer = userAnswer;
    question.isAnswered = true;
    question.timeSpent += timeSpent;
    question.answerTimestamp = new Date().toISOString();
    
    // Add additional data
    Object.assign(question, additionalData);

    // Update score if answer is correct and wasn't previously answered
    if (userAnswer === question.correctAnswer && !wasPreviouslyAnswered) {
      this.currentSession.score++;
    }

    // Auto-save the state
    this.saveCurrentState();

    return {
      question: question,
      isCorrect: userAnswer === question.correctAnswer,
      isNewAnswer: !wasPreviouslyAnswered
    };
  }

  /**
   * Navigate to question
   */
  navigateToQuestion(questionIndex) {
    if (!this.currentSession) {
      return null;
    }

    if (questionIndex >= 0 && questionIndex < this.currentSession.questions.length) {
      this.currentSession.currentQuestionIndex = questionIndex;
      this.saveCurrentState();
      return this.currentSession.questions[questionIndex];
    }

    return null;
  }

  /**
   * Get current question
   */
  getCurrentQuestion() {
    if (!this.currentSession) {
      return null;
    }

    const questionIndex = this.currentSession.currentQuestionIndex;
    return this.currentSession.questions[questionIndex];
  }

  /**
   * Get question by ID
   */
  getQuestionById(questionId) {
    if (!this.currentSession) {
      return null;
    }

    return this.currentSession.questions.find(q => q.id === questionId);
  }

  /**
   * Bookmark question
   */
  toggleBookmark(questionId) {
    if (!this.currentSession) {
      return false;
    }

    const question = this.getQuestionById(questionId);
    if (question) {
      question.bookmarks = !question.bookmarks;
      this.saveCurrentState();
      return question.bookmarks;
    }

    return false;
  }

  /**
   * Add note to question
   */
  addQuestionNote(questionId, note) {
    if (!this.currentSession) {
      return false;
    }

    const question = this.getQuestionById(questionId);
    if (question) {
      question.notes = note;
      this.saveCurrentState();
      return true;
    }

    return false;
  }

  /**
   * Complete the quiz
   */
  completeQuiz(additionalData = {}) {
    if (!this.currentSession) {
      throw new Error('No active quiz session');
    }

    this.currentSession.endTime = new Date().toISOString();
    this.currentSession.isCompleted = true;
    this.currentSession.lastSaved = new Date().toISOString();
    
    // Add completion data
    this.currentSession.completionData = {
      totalTimeSpent: this.calculateTotalTimeSpent(),
      averageTimePerQuestion: this.calculateAverageTimePerQuestion(),
      accuracy: this.calculateAccuracy(),
      bookmarkedQuestions: this.getBookmarkedQuestions().length,
      ...additionalData
    };

    this.saveCurrentState();

    // Add to sync queue if offline
    if (this.currentSession.isOffline) {
      this.addToSyncQueue(this.currentSession);
    }

    return this.currentSession;
  }

  /**
   * Calculate total time spent
   */
  calculateTotalTimeSpent() {
    if (!this.currentSession) return 0;
    return this.currentSession.questions.reduce((sum, q) => sum + q.timeSpent, 0);
  }

  /**
   * Calculate average time per question
   */
  calculateAverageTimePerQuestion() {
    if (!this.currentSession) return 0;
    const answeredQuestions = this.currentSession.questions.filter(q => q.isAnswered).length;
    return answeredQuestions > 0 ? this.calculateTotalTimeSpent() / answeredQuestions : 0;
  }

  /**
   * Calculate accuracy
   */
  calculateAccuracy() {
    if (!this.currentSession) return 0;
    const answeredQuestions = this.currentSession.questions.filter(q => q.isAnswered);
    if (answeredQuestions.length === 0) return 0;
    const correctAnswers = answeredQuestions.filter(q => q.userAnswer === q.correctAnswer).length;
    return (correctAnswers / answeredQuestions.length) * 100;
  }

  /**
   * Get bookmarked questions
   */
  getBookmarkedQuestions() {
    if (!this.currentSession) return [];
    return this.currentSession.questions.filter(q => q.bookmarks);
  }

  /**
   * Get quiz statistics
   */
  getQuizStatistics() {
    if (!this.currentSession) return null;

    const answeredQuestions = this.currentSession.questions.filter(q => q.isAnswered);
    const totalTimeSpent = this.calculateTotalTimeSpent();
    const averageTimePerQuestion = this.calculateAverageTimePerQuestion();
    const accuracy = this.calculateAccuracy();

    // Calculate category performance
    const categoryStats = {};
    this.currentSession.questions.forEach(q => {
      if (!categoryStats[q.category]) {
        categoryStats[q.category] = { total: 0, correct: 0 };
      }
      categoryStats[q.category].total++;
      if (q.isAnswered && q.userAnswer === q.correctAnswer) {
        categoryStats[q.category].correct++;
      }
    });

    // Calculate difficulty distribution
    const difficultyStats = {};
    this.currentSession.questions.forEach(q => {
      if (!difficultyStats[q.difficulty]) {
        difficultyStats[q.difficulty] = { total: 0, correct: 0 };
      }
      difficultyStats[q.difficulty].total++;
      if (q.isAnswered && q.userAnswer === q.correctAnswer) {
        difficultyStats[q.difficulty].correct++;
      }
    });

    return {
      session: {
        id: this.currentSession.id,
        quizId: this.currentSession.quizId,
        startTime: this.currentSession.startTime,
        endTime: this.currentSession.endTime,
        isCompleted: this.currentSession.isCompleted,
        isOffline: this.currentSession.isOffline
      },
      performance: {
        score: this.currentSession.score,
        totalQuestions: this.currentSession.totalQuestions,
        progress: (answeredQuestions.length / this.currentSession.totalQuestions) * 100,
        accuracy: accuracy,
        totalTimeSpent: totalTimeSpent,
        averageTimePerQuestion: averageTimePerQuestion
      },
      analysis: {
        categoryPerformance: Object.keys(categoryStats).map(category => ({
          category,
          total: categoryStats[category].total,
          correct: categoryStats[category].correct,
          accuracy: categoryStats[category].total > 0 ? 
            (categoryStats[category].correct / categoryStats[category].total) * 100 : 0
        })),
        difficultyDistribution: Object.keys(difficultyStats).map(difficulty => ({
          difficulty,
          total: difficultyStats[difficulty].total,
          correct: difficultyStats[difficulty].correct,
          accuracy: difficultyStats[difficulty].total > 0 ? 
            (difficultyStats[difficulty].correct / difficultyStats[difficulty].total) * 100 : 0
        })),
        bookmarks: this.getBookmarkedQuestions().length,
        notes: this.currentSession.questions.filter(q => q.notes && q.notes.trim()).length
      }
    };
  }

  /**
   * Save current state with debouncing
   */
  saveCurrentState() {
    if (!this.currentSession) return false;

    // Debounce saves to avoid excessive localStorage writes
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      try {
        this.currentSession.lastSaved = new Date().toISOString();
        
        // Save to localStorage
        const storageKey = this.getStorageKey('session', this.currentSession.id);
        localStorage.setItem(storageKey, JSON.stringify(this.currentSession));
        
        // Save to service worker if available
        if (window.serviceWorkerManager) {
          window.serviceWorkerManager.storeQuizState(this.currentSession);
        }
        
        console.log('Quiz state saved successfully');
      } catch (error) {
        console.error('Failed to save quiz state:', error);
      }
    }, 1000); // Debounce to 1 second

    return true;
  }

  /**
   * Load persisted state
   */
  loadPersistedState() {
    try {
      // Get all session keys
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.storagePrefix + 'session_'));
      
      if (keys.length > 0) {
        // Load the most recent session
        const latestKey = keys.sort().pop();
        const serializedState = localStorage.getItem(latestKey);
        
        if (serializedState) {
          const session = JSON.parse(serializedState);
          
          // Check if session is still active (not completed and recent)
          const sessionAge = Date.now() - new Date(session.startTime).getTime();
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          
          if (!session.isCompleted && sessionAge < maxAge) {
            this.currentSession = session;
            console.log('Restored previous quiz session:', session.id);
            return session;
          }
        }
      }
    } catch (error) {
      console.error('Failed to load persisted state:', error);
    }
    
    return null;
  }

  /**
   * Restore state from data
   */
  restoreState(sessionData) {
    try {
      this.currentSession = sessionData;
      this.saveCurrentState();
      console.log('Quiz state restored:', sessionData.id);
      return true;
    } catch (error) {
      console.error('Failed to restore quiz state:', error);
      return false;
    }
  }

  /**
   * Add to sync queue
   */
  addToSyncQueue(session) {
    const syncQueue = this.getSyncQueue();
    const syncItem = {
      id: this.generateSyncId(),
      sessionId: session.id,
      sessionData: session,
      timestamp: new Date().toISOString(),
      status: 'pending',
      retryCount: 0
    };

    syncQueue.push(syncItem);
    localStorage.setItem(this.getStorageKey('sync_queue'), JSON.stringify(syncQueue));

    // Register for background sync if service worker is available
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
      const queueData = localStorage.getItem(this.getStorageKey('sync_queue'));
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('Failed to get sync queue:', error);
      return [];
    }
  }

  /**
   * Clear current session
   */
  clearCurrentSession() {
    this.currentSession = null;
    this.saveCurrentState();
  }

  /**
   * Export session data
   */
  exportSessionData() {
    if (!this.currentSession) return null;

    return {
      session: this.currentSession,
      statistics: this.getQuizStatistics(),
      exportDate: new Date().toISOString(),
      version: this.stateVersion
    };
  }

  /**
   * Import session data
   */
  importSessionData(importedData) {
    try {
      if (importedData.session) {
        this.currentSession = importedData.session;
        this.saveCurrentState();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import session data:', error);
      return false;
    }
  }

  /**
   * Check for unsaved changes
   */
  hasUnsavedChanges() {
    if (!this.currentSession) return false;
    
    const lastSaved = new Date(this.currentSession.lastSaved);
    const now = new Date();
    const timeSinceLastSave = now - lastSaved;

    return timeSinceLastSave > this.autoSaveDelay;
  }

  /**
   * Handle online transition
   */
  handleOnlineTransition() {
    if (this.currentSession && this.currentSession.isOffline) {
      console.log('Transitioning to online mode - syncing data');
      this.syncPendingData();
    }
  }

  /**
   * Handle offline transition
   */
  handleOfflineTransition() {
    if (this.currentSession) {
      this.currentSession.isOffline = true;
      this.saveCurrentState();
      console.log('Transitioned to offline mode');
    }
  }

  /**
   * Sync pending data
   */
  async syncPendingData() {
    const syncQueue = this.getSyncQueue();
    
    if (syncQueue.length === 0) {
      return;
    }

    const successfulSyncs = [];
    const failedSyncs = [];

    for (const item of syncQueue) {
      try {
        await this.syncSessionData(item.sessionData);
        successfulSyncs.push(item.id);
      } catch (error) {
        console.error('Failed to sync session data:', error);
        failedSyncs.push(item.id);
      }
    }

    // Remove successfully synced items
    if (successfulSyncs.length > 0) {
      const updatedQueue = syncQueue.filter(item => !successfulSyncs.includes(item.id));
      localStorage.setItem(this.getStorageKey('sync_queue'), JSON.stringify(updatedQueue));
    }

    return {
      successful: successfulSyncs.length,
      failed: failedSyncs.length,
      total: syncQueue.length
    };
  }

  /**
   * Sync individual session data
   */
  async syncSessionData(sessionData) {
    // This would typically send the session data to a server
    console.log('Syncing session data:', sessionData.id);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { success: true, id: sessionData.id };
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate question ID
   */
  generateQuestionId(questionText) {
    return 'question_' + btoa(questionText).replace(/[^a-zA-Z0-9]/g, '').substr(0, 16);
  }

  /**
   * Generate sync ID
   */
  generateSyncId() {
    return 'sync_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get storage key
   */
  getStorageKey(type, id = '') {
    return this.storagePrefix + type + (id ? '_' + id : '');
  }

  /**
   * Get current session
   */
  getCurrentSession() {
    return this.currentSession;
  }

  /**
   * Get storage info
   */
  getStorageInfo() {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(this.storagePrefix));
    const totalSize = keys.reduce((sum, key) => {
      const value = localStorage.getItem(key);
      return sum + (value ? new Blob([value]).size : 0);
    }, 0);

    return {
      totalKeys: keys.length,
      totalSize: totalSize,
      sessions: keys.filter(key => key.includes('session_')).length,
      syncQueue: keys.filter(key => key.includes('sync_queue')).length
    };
  }

  /**
   * Clear all storage
   */
  clearAllStorage() {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.storagePrefix));
      keys.forEach(key => localStorage.removeItem(key));
      
      if (window.serviceWorkerManager) {
        window.serviceWorkerManager.storeQuizState(null);
      }
      
      this.currentSession = null;
      return true;
    } catch (error) {
      console.error('Failed to clear storage:', error);
      return false;
    }
  }
}

// Create global instance
const quizStateManager = new QuizStateManager();

// Export for use in other modules
export default quizStateManager;

// Auto-initialize when module is imported
if (typeof window !== 'undefined') {
  window.quizStateManager = quizStateManager;
}