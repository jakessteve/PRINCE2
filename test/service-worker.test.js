/**
 * Service Worker and Offline Functionality Tests
 * Comprehensive testing suite for service worker registration, caching, and offline functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock DOM APIs
global.fetch = jest.fn();
global.caches = {
  open: jest.fn(),
  has: jest.fn(),
  delete: jest.fn(),
  keys: jest.fn()
};

// Mock Service Worker Registration
navigator.serviceWorker = {
  register: jest.fn(),
  ready: Promise.resolve({
    showNotification: jest.fn(),
    sync: jest.fn()
  }),
  controller: {
    postMessage: jest.fn()
  }
};

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem: jest.fn(function(key) {
    return this.store[key] || null;
  }),
  setItem: jest.fn(function(key, value) {
    this.store[key] = String(value);
  }),
  removeItem: jest.fn(function(key) {
    delete this.store[key];
  }),
  clear: jest.fn(function() {
    this.store = {};
  })
};

global.localStorage = localStorageMock;

// Import modules to test
import ServiceWorkerManager from './service-worker-registration.js';
import offlineQuizService from './offline-quiz-service.js';
import quizStateManager from './quiz-state-manager.js';

describe('Service Worker Registration', () => {
  let serviceWorkerManager;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Create new instance
    serviceWorkerManager = new ServiceWorkerManager();
  });

  afterEach(() => {
    if (serviceWorkerManager) {
      serviceWorkerManager.destroy();
    }
  });

  describe('Service Worker Registration', () => {
    it('should register service worker successfully', async () => {
      navigator.serviceWorker.register.mockResolvedValue({
        active: { state: 'activated' },
        installing: { state: 'installing' },
        waiting: { state: 'installed' }
      });

      const result = await serviceWorkerManager.registerServiceWorker();
      
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith(
        expect.stringContaining('sw.js'),
        expect.objectContaining({
          scope: '/'
        })
      );
      expect(result).toBe(true);
    });

    it('should handle service worker registration failure', async () => {
      navigator.serviceWorker.register.mockRejectedValue(new Error('Registration failed'));

      const result = await serviceWorkerManager.registerServiceWorker();
      
      expect(result).toBe(false);
    });

    it('should check service worker support correctly', () => {
      const hasSupport = serviceWorkerManager.hasServiceWorkerSupport();
      
      expect(typeof hasSupport).toBe('boolean');
    });
  });

  describe('Cache Management', () => {
    it('should cache static assets successfully', async () => {
      const mockCache = {
        put: jest.fn(),
        match: jest.fn()
      };
      
      const mockResponse = new Response('test content');
      fetch.mockResolvedValue(mockResponse);
      global.caches.open.mockResolvedValue(mockCache);

      const urls = ['/style.css', '/js/main.js'];
      const result = await serviceWorkerManager.cacheStaticAssets(urls);
      
      expect(global.caches.open).toHaveBeenCalledWith('prince2-quiz-static');
      expect(mockCache.put).toHaveBeenCalledTimes(urls.length);
      expect(result).toBe(true);
    });

    it('should handle cache failure gracefully', async () => {
      fetch.mockRejectedValue(new Error('Network error'));
      
      const urls = ['/style.css'];
      const result = await serviceWorkerManager.cacheStaticAssets(urls);
      
      expect(result).toBe(false);
    });

    it('should clear cache successfully', async () => {
      global.caches.keys.mockResolvedValue(['prince2-quiz-static', 'prince2-quiz-data']);
      
      const mockCache = {
        delete: jest.fn()
      };
      global.caches.open.mockResolvedValue(mockCache);

      const result = await serviceWorkerManager.clearAllCaches();
      
      expect(global.caches.delete).toHaveBeenCalledTimes(2);
      expect(result).toBe(true);
    });
  });

  describe('Quiz Data Caching', () => {
    it('should cache quiz data successfully', async () => {
      const mockCache = {
        put: jest.fn(),
        match: jest.fn()
      };
      
      const mockResponse = new Response(JSON.stringify([{ question: 'Test Q', answer: 'A' }]));
      fetch.mockResolvedValue(mockResponse);
      global.caches.open.mockResolvedValue(mockCache);

      const urls = ['/data/json/week-1.json'];
      const result = await serviceWorkerManager.cacheQuizData(urls);
      
      expect(result).toBe(true);
      expect(mockCache.put).toHaveBeenCalledWith(
        expect.stringContaining('/data/json/week-1.json'),
        expect.any(Response)
      );
    });

    it('should retrieve cached quiz data', async () => {
      const mockCache = {
        match: jest.fn().mockResolvedValue(new Response(JSON.stringify([{ question: 'Test Q' }])))
      };
      
      global.caches.open.mockResolvedValue(mockCache);

      const result = await serviceWorkerManager.getCachedQuizData('/data/json/week-1.json');
      
      expect(result).toEqual([{ question: 'Test Q' }]);
    });

    it('should handle cache miss gracefully', async () => {
      const mockCache = {
        match: jest.fn().mockResolvedValue(null)
      };
      
      global.caches.open.mockResolvedValue(mockCache);

      const result = await serviceWorkerManager.getCachedQuizData('/data/json/week-1.json');
      
      expect(result).toBeNull();
    });
  });
});

describe('Offline Quiz Service', () => {
  let offlineService;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    offlineService = new offlineQuizService();
  });

  afterEach(() => {
    if (offlineService) {
      offlineService.clearAllData();
    }
  });

  describe('Quiz Session Management', () => {
    it('should start a new quiz session', () => {
      const quizData = [
        { question: 'Q1', options: ['A', 'B'], answer: 'A' },
        { question: 'Q2', options: ['A', 'B'], answer: 'B' }
      ];

      const session = offlineService.startQuiz('week-1', quizData);
      
      expect(session).toBeDefined();
      expect(session.quizId).toBe('week-1');
      expect(session.questions).toHaveLength(2);
      expect(session.isCompleted).toBe(false);
    });

    it('should record user answers correctly', () => {
      const quizData = [
        { question: 'Q1', options: ['A', 'B'], answer: 'A' }
      ];

      const session = offlineService.startQuiz('week-1', quizData);
      const result = offlineService.recordAnswer('Q1', 'B', 5000);
      
      expect(result.question.userAnswer).toBe('B');
      expect(result.question.isAnswered).toBe(true);
      expect(result.isCorrect).toBe(false);
    });

    it('should navigate between questions', () => {
      const quizData = [
        { question: 'Q1', options: ['A', 'B'], answer: 'A' },
        { question: 'Q2', options: ['A', 'B'], answer: 'B' }
      ];

      const session = offlineService.startQuiz('week-1', quizData);
      const nextQuestion = offlineService.nextQuestion();
      
      expect(nextQuestion).toBeDefined();
      expect(session.currentQuestionIndex).toBe(1);
    });

    it('should complete quiz session', () => {
      const quizData = [
        { question: 'Q1', options: ['A', 'B'], answer: 'A' }
      ];

      const session = offlineService.startQuiz('week-1', quizData);
      offlineService.recordAnswer('Q1', 'A', 5000);
      const completedSession = offlineService.completeQuiz();
      
      expect(completedSession.isCompleted).toBe(true);
      expect(completedSession.endTime).toBeDefined();
    });
  });

  describe('State Persistence', () => {
    it('should save and load quiz state', () => {
      const quizData = [
        { question: 'Q1', options: ['A', 'B'], answer: 'A' }
      ];

      const session = offlineService.startQuiz('week-1', quizData);
      offlineService.recordAnswer('Q1', 'A', 5000);
      
      const loadedState = offlineService.loadOfflineState();
      
      expect(loadedState).toBeDefined();
      expect(loadedState.questions[0].userAnswer).toBe('A');
    });

    it('should export and import quiz data', () => {
      const quizData = [
        { question: 'Q1', options: ['A', 'B'], answer: 'A' }
      ];

      const session = offlineService.startQuiz('week-1', quizData);
      const exportedData = offlineService.exportQuizData();
      
      expect(exportedData).toBeDefined();
      expect(exportedData.quizState).toBeDefined();
      
      const importResult = offlineService.importQuizData(exportedData);
      expect(importResult).toBe(true);
    });

    it('should clear all offline data', () => {
      const quizData = [
        { question: 'Q1', options: ['A', 'B'], answer: 'A' }
      ];

      offlineService.startQuiz('week-1', quizData);
      const clearResult = offlineService.clearAllData();
      
      expect(clearResult).toBe(true);
      const loadedState = offlineService.loadOfflineState();
      expect(loadedState).toBeNull();
    });
  });

  describe('Sync Queue Management', () => {
    it('should add items to sync queue', () => {
      const quizData = [
        { question: 'Q1', options: ['A', 'B'], answer: 'A' }
      ];

      const session = offlineService.startQuiz('week-1', quizData);
      offlineService.completeQuiz();
      
      const syncQueue = offlineService.getSyncQueue();
      
      expect(syncQueue.length).toBeGreaterThan(0);
      expect(syncQueue[0].status).toBe('pending');
    });

    it('should sync pending results', async () => {
      const quizData = [
        { question: 'Q1', options: ['A', 'B'], answer: 'A' }
      ];

      const session = offlineService.startQuiz('week-1', quizData);
      offlineService.completeQuiz();
      
      // Mock successful sync
      offlineService.syncQuizResult = jest.fn().mockResolvedValue({ success: true });
      
      const result = await offlineService.syncPendingResults();
      
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
    });
  });

  describe('Offline Detection', () => {
    it('should detect offline mode correctly', () => {
      // Mock offline status
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });

      const isOffline = offlineService.isOfflineMode();
      
      expect(isOffline).toBe(true);
    });

    it('should handle online/offline transitions', () => {
      const onlineHandler = jest.fn();
      const offlineHandler = jest.fn();

      // Mock event listeners
      window.addEventListener = jest.fn().mockImplementation((event, handler) => {
        if (event === 'online') onlineHandler.mockImplementation(handler);
        if (event === 'offline') offlineHandler.mockImplementation(handler);
      });

      // Simulate offline event
      offlineHandler();
      
      expect(offlineService.isOffline).toBe(true);
    });
  });
});

describe('Quiz State Manager', () => {
  let stateManager;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    stateManager = new quizStateManager();
  });

  afterEach(() => {
    if (stateManager) {
      stateManager.clearAllStorage();
    }
  });

  describe('Session Management', () => {
    it('should start quiz session with metadata', () => {
      const quizData = [
        { question: 'Q1', options: ['A', 'B'], answer: 'A' }
      ];

      const session = stateManager.startQuizSession('week-1', quizData, {
        metadata: { source: 'test' },
        settings: { allowNavigation: false }
      });
      
      expect(session).toBeDefined();
      expect(session.quizId).toBe('week-1');
      expect(session.metadata.source).toBe('test');
      expect(session.settings.allowNavigation).toBe(false);
    });

    it('should assess question difficulty correctly', () => {
      const easyQuestion = { question: 'Q', options: ['A', 'B'] };
      const hardQuestion = { 
        question: 'This is a very long question with lots of details and complex options', 
        options: ['Option A with detailed explanation', 'Option B with detailed explanation'] 
      };

      const easyDifficulty = stateManager.assessDifficulty(easyQuestion);
      const hardDifficulty = stateManager.assessDifficulty(hardQuestion);
      
      expect(easyDifficulty).toBe('easy');
      expect(hardDifficulty).toBe('hard');
    });

    it('should categorize questions correctly', () => {
      const methodQuestion = { 
        question: 'PRINCE2 method', 
        options: ['A', 'B'] 
      };
      const themeQuestion = { 
        question: 'Business case theme', 
        options: ['A', 'B'] 
      };

      const methodCategory = stateManager.categorizeQuestion(methodQuestion);
      const themeCategory = stateManager.categorizeQuestion(themeQuestion);
      
      expect(methodCategory).toBe('methodology');
      expect(themeCategory).toBe('themes');
    });
  });

  describe('Answer Management', () => {
    it('should record answers with additional data', () => {
      const quizData = [
        { question: 'Q1', options: ['A', 'B'], answer: 'A' }
      ];

      const session = stateManager.startQuizSession('week-1', quizData);
      const result = stateManager.recordAnswer('Q1', 'B', 5000, {
        notes: 'This was tricky',
        hints: ['Hint 1']
      });
      
      expect(result.question.userAnswer).toBe('B');
      expect(result.question.notes).toBe('This was tricky');
      expect(result.question.hints).toEqual(['Hint 1']);
    });

    it('should handle bookmarking and notes', () => {
      const quizData = [
        { question: 'Q1', options: ['A', 'B'], answer: 'A' }
      ];

      const session = stateManager.startQuizSession('week-1', quizData);
      
      const bookmarkResult = stateManager.toggleBookmark('Q1');
      const noteResult = stateManager.addQuestionNote('Q1', 'Important question');
      
      expect(bookmarkResult).toBe(true);
      expect(noteResult).toBe(true);
      
      const question = stateManager.getQuestionById('Q1');
      expect(question.bookmarks).toBe(true);
      expect(question.notes).toBe('Important question');
    });
  });

  describe('Statistics and Analysis', () => {
    it('should calculate quiz statistics correctly', () => {
      const quizData = [
        { question: 'Q1', options: ['A', 'B'], answer: 'A' },
        { question: 'Q2', options: ['A', 'B'], answer: 'B' }
      ];

      const session = stateManager.startQuizSession('week-1', quizData);
      stateManager.recordAnswer('Q1', 'A', 3000);
      stateManager.recordAnswer('Q2', 'A', 5000);
      
      const stats = stateManager.getQuizStatistics();
      
      expect(stats.performance.score).toBe(1);
      expect(stats.performance.totalQuestions).toBe(2);
      expect(stats.performance.accuracy).toBe(50);
      expect(stats.performance.totalTimeSpent).toBe(8000);
    });

    it('should provide category performance analysis', () => {
      const quizData = [
        { question: 'PRINCE2 method', options: ['A', 'B'], answer: 'A' },
        { question: 'Business case theme', options: ['A', 'B'], answer: 'B' }
      ];

      const session = stateManager.startQuizSession('week-1', quizData);
      stateManager.recordAnswer('PRINCE2 method', 'A', 3000);
      stateManager.recordAnswer('Business case theme', 'A', 5000);
      
      const stats = stateManager.getQuizStatistics();
      
      expect(stats.analysis.categoryPerformance).toHaveLength(2);
      expect(stats.analysis.categoryPerformance[0].category).toBe('methodology');
      expect(stats.analysis.categoryPerformance[1].category).toBe('themes');
    });
  });

  describe('Storage Management', () => {
    it('should manage storage keys correctly', () => {
      const storageKey = stateManager.getStorageKey('session', 'test123');
      
      expect(storageKey).toBe('prince2_quiz_session_test123');
    });

    it('should provide storage information', () => {
      const quizData = [
        { question: 'Q1', options: ['A', 'B'], answer: 'A' }
      ];

      stateManager.startQuizSession('week-1', quizData);
      
      const storageInfo = stateManager.getStorageInfo();
      
      expect(storageInfo.totalKeys).toBeGreaterThan(0);
      expect(storageInfo.sessions).toBe(1);
    });

    it('should export and import session data', () => {
      const quizData = [
        { question: 'Q1', options: ['A', 'B'], answer: 'A' }
      ];

      const session = stateManager.startQuizSession('week-1', quizData);
      stateManager.recordAnswer('Q1', 'A', 3000);
      
      const exportedData = stateManager.exportSessionData();
      
      expect(exportedData).toBeDefined();
      expect(exportedData.session).toBeDefined();
      
      const importResult = stateManager.importSessionData(exportedData);
      expect(importResult).toBe(true);
    });
  });

  describe('Auto-save and Recovery', () => {
    it('should detect unsaved changes', (done) => {
      const quizData = [
        { question: 'Q1', options: ['A', 'B'], answer: 'A' }
      ];

      const session = stateManager.startQuizSession('week-1', quizData);
      
      // Simulate time passing
      setTimeout(() => {
        const hasChanges = stateManager.hasUnsavedChanges();
        expect(hasChanges).toBe(true);
        done();
      }, 4000); // More than autoSaveDelay
    });

    it('should handle online/offline transitions', () => {
      const quizData = [
        { question: 'Q1', options: ['A', 'B'], answer: 'A' }
      ];

      const session = stateManager.startQuizSession('week-1', quizData);
      
      // Mock offline session
      session.isOffline = true;
      stateManager.currentSession = session;
      
      // Simulate online transition
      stateManager.handleOnlineTransition();
      
      expect(stateManager.currentSession.isOffline).toBe(false);
    });
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    // Clean up any remaining instances
    if (window.serviceWorkerManager) {
      window.serviceWorkerManager.destroy();
    }
  });

  it('should integrate service worker with offline quiz service', async () => {
    // Mock service worker registration
    navigator.serviceWorker.register.mockResolvedValue({
      active: { state: 'activated' },
      installing: { state: 'installing' },
      waiting: { state: 'installed' }
    });

    // Initialize services
    const serviceWorkerManager = new ServiceWorkerManager();
    await serviceWorkerManager.registerServiceWorker();
    
    const offlineService = new offlineQuizService();
    
    // Test integration
    const quizData = [
      { question: 'Q1', options: ['A', 'B'], answer: 'A' }
    ];

    const session = offlineService.startQuiz('week-1', quizData);
    offlineService.recordAnswer('Q1', 'A', 3000);
    
    expect(session).toBeDefined();
    expect(session.questions[0].userAnswer).toBe('A');
  });

  it('should handle complete offline workflow', async () => {
    // Mock offline environment
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true
    });

    const offlineService = new offlineQuizService();
    const stateManager = new quizStateManager();
    
    // Simulate complete offline workflow
    const quizData = [
      { question: 'Q1', options: ['A', 'B'], answer: 'A' },
      { question: 'Q2', options: ['A', 'B'], answer: 'B' }
    ];

    const session = stateManager.startQuizSession('week-1', quizData);
    stateManager.recordAnswer('Q1', 'A', 3000);
    stateManager.recordAnswer('Q2', 'B', 5000);
    
    const completedSession = stateManager.completeQuiz();
    
    expect(completedSession.isCompleted).toBe(true);
    expect(completedSession.isOffline).toBe(true);
    
    // Test data persistence
    const exportedData = stateManager.exportSessionData();
    const importResult = stateManager.importSessionData(exportedData);
    
    expect(importResult).toBe(true);
    expect(exportedData.session.score).toBe(2);
  });

  it('should handle network failures gracefully', async () => {
    // Mock network failures
    fetch.mockRejectedValue(new Error('Network error'));
    
    const serviceWorkerManager = new ServiceWorkerManager();
    
    // Should handle cache failure gracefully
    const result = await serviceWorkerManager.cacheStaticAssets(['/style.css']);
    expect(result).toBe(false);
    
    // Should handle offline mode
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true
    });

    const offlineService = new offlineQuizService();
    const isOffline = offlineService.isOfflineMode();
    
    expect(isOffline).toBe(true);
  });
});