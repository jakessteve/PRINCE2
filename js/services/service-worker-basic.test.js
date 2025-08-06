/**
 * Basic Service Worker Tests
 * Simple tests for service worker functionality
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

describe('Service Worker Manager - Basic Tests', () => {
  let ServiceWorkerManager;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Import the module
    ServiceWorkerManager = require('./service-worker-registration.js').ServiceWorkerManager;
  });

  afterEach(() => {
    // Clean up
    if (window.serviceWorkerManager) {
      window.serviceWorkerManager.destroy();
    }
  });

  it('should create service worker manager instance', () => {
    const manager = new ServiceWorkerManager();
    
    expect(manager).toBeDefined();
    expect(manager).toHaveProperty('isSupported');
    expect(manager).toHaveProperty('isOnline');
    expect(manager).toHaveProperty('offlineQueue');
    expect(manager).toHaveProperty('quizState');
  });

  it('should check service worker support correctly', () => {
    const manager = new ServiceWorkerManager();
    const hasSupport = manager.isSupported;
    
    expect(typeof hasSupport).toBe('boolean');
  });

  it('should get online status correctly', () => {
    const manager = new ServiceWorkerManager();
    const isOnline = manager.isOnlineStatus();
    
    expect(typeof isOnline).toBe('boolean');
  });

  it('should provide registration information', () => {
    const manager = new ServiceWorkerManager();
    const info = manager.getRegistrationInfo();
    
    expect(info).toBeDefined();
    expect(info).toHaveProperty('isSupported');
    expect(info).toHaveProperty('isOnline');
    expect(info).toHaveProperty('queueLength');
  });

  it('should add items to offline queue', () => {
    const manager = new ServiceWorkerManager();
    const item = { type: 'quiz_answer', data: { questionId: 'Q1', answer: 'A' } };
    
    manager.addToOfflineQueue(item);
    
    expect(manager.offlineQueue).toHaveLength(1);
    expect(manager.offlineQueue[0]).toEqual(expect.objectContaining(item));
  });

  it('should store and retrieve quiz state', () => {
    const manager = new ServiceWorkerManager();
    const state = {
      quizId: 'week-1',
      currentQuestion: 0,
      answers: [{ questionId: 'Q1', answer: 'A' }],
      startTime: Date.now()
    };
    
    manager.storeQuizState(state);
    
    const retrievedState = manager.quizState;
    expect(retrievedState).toEqual(state);
  });

  it('should handle localStorage fallback', () => {
    // Simulate no service worker support
    const manager = new ServiceWorkerManager();
    manager.isSupported = false;
    
    const state = { quizId: 'week-1', currentQuestion: 0 };
    
    manager.storeQuizState(state);
    
    // Check localStorage was used
    expect(localStorage.setItem).toHaveBeenCalledWith('offlineQuizState', JSON.stringify(state));
  });

  it('should destroy service worker manager', () => {
    const manager = new ServiceWorkerManager();
    manager.destroy();
    
    expect(manager.registration).toBeNull();
    expect(manager.messageChannel).toBeNull();
  });
});

describe('Offline Quiz Service - Basic Tests', () => {
  let offlineService;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Import the module
    offlineService = require('./offline-quiz-service.js').default;
  });

  afterEach(() => {
    // Clean up
    if (offlineService && typeof offlineService.clearAllData === 'function') {
      offlineService.clearAllData();
    }
  });

  it('should detect offline mode correctly', () => {
    // Mock offline status
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true
    });

    const isOffline = offlineService.isOfflineMode();
    expect(isOffline).toBe(true);
  });

  it('should handle online mode correctly', () => {
    // Mock online status
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true
    });

    const isOffline = offlineService.isOfflineMode();
    expect(isOffline).toBe(false);
  });

  it('should start a new quiz session', () => {
    const quizData = [
      { question: 'Q1', options: ['A', 'B'], answer: 'A' },
      { question: 'Q2', options: ['A', 'B'], answer: 'B' }
    ];

    const session = offlineService.startQuiz('week-1', quizData);
    
    expect(session).toBeDefined();
    expect(session.quizId).toBe('week-1');
    expect(session.questions).toHaveLength(2);
    expect(session.isOffline).toBe(true);
  });

  it('should record user answers', () => {
    const quizData = [
      { question: 'Q1', options: ['A', 'B'], answer: 'A' }
    ];

    const session = offlineService.startQuiz('week-1', quizData);
    offlineService.recordAnswer('Q1', 'A', 3000);
    
    expect(session.questions[0].userAnswer).toBe('A');
    expect(session.questions[0].timeSpent).toBe(3000);
  });

  it('should complete quiz session', () => {
    const quizData = [
      { question: 'Q1', options: ['A', 'B'], answer: 'A' }
    ];

    const session = offlineService.startQuiz('week-1', quizData);
    offlineService.recordAnswer('Q1', 'A', 3000);
    const completedSession = offlineService.completeQuiz();
    
    expect(completedSession.isCompleted).toBe(true);
    expect(completedSession.score).toBe(1);
  });

  it('should save and load quiz state', () => {
    const quizData = [
      { question: 'Q1', options: ['A', 'B'], answer: 'A' }
    ];

    const session = offlineService.startQuiz('week-1', quizData);
    offlineService.recordAnswer('Q1', 'A', 3000);
    
    offlineService.saveQuizState();
    const loadedSession = offlineService.loadQuizState();
    
    expect(loadedSession).toBeDefined();
    expect(loadedSession.quizId).toBe('week-1');
  });

  it('should clear all offline data', () => {
    const quizData = [
      { question: 'Q1', options: ['A', 'B'], answer: 'A' }
    ];

    offlineService.startQuiz('week-1', quizData);
    offlineService.clearAllData();
    
    const session = offlineService.loadQuizState();
    expect(session).toBeNull();
  });
});

describe('Quiz State Manager - Basic Tests', () => {
  let stateManager;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Import the module
    stateManager = require('./quiz-state-manager.js').default;
  });

  afterEach(() => {
    // Clean up
    if (stateManager && typeof stateManager.clearAllStorage === 'function') {
      stateManager.clearAllStorage();
    }
  });

  it('should manage storage keys correctly', () => {
    const storageKey = stateManager.getStorageKey('session', 'test123');
    
    expect(storageKey).toBe('prince2_quiz_session_test123');
  });

  it('should provide storage information', () => {
    const storageInfo = stateManager.getStorageInfo();
    
    expect(storageInfo).toBeDefined();
    expect(storageInfo).toHaveProperty('totalKeys');
    expect(storageInfo).toHaveProperty('sessions');
  });

  it('should start quiz session with metadata', () => {
    const quizData = [
      { question: 'Q1', options: ['A', 'B'], answer: 'A' }
    ];

    const session = stateManager.startQuizSession('week-1', quizData);
    
    expect(session).toBeDefined();
    expect(session.quizId).toBe('week-1');
    expect(session.questions).toHaveLength(1);
    expect(session.startTime).toBeDefined();
  });

  it('should record answers with additional data', () => {
    const quizData = [
      { question: 'Q1', options: ['A', 'B'], answer: 'A' }
    ];

    const session = stateManager.startQuizSession('week-1', quizData);
    stateManager.recordAnswer('Q1', 'A', 3000);
    
    expect(session.questions[0].userAnswer).toBe('A');
    expect(session.questions[0].timeSpent).toBe(3000);
  });

  it('should calculate quiz statistics correctly', () => {
    const quizData = [
      { question: 'Q1', options: ['A', 'B'], answer: 'A' },
      { question: 'Q2', options: ['A', 'B'], answer: 'B' }
    ];

    const session = stateManager.startQuizSession('week-1', quizData);
    stateManager.recordAnswer('Q1', 'A', 3000);
    stateManager.recordAnswer('Q2', 'B', 5000);
    const stats = stateManager.calculateStatistics();
    
    expect(stats).toBeDefined();
    expect(stats.totalQuestions).toBe(2);
    expect(stats.correctAnswers).toBe(2);
    expect(stats.score).toBe(100);
  });

  it('should export and import session data', () => {
    const quizData = [
      { question: 'Q1', options: ['A', 'B'], answer: 'A' }
    ];

    const session = stateManager.startQuizSession('week-1', quizData);
    stateManager.recordAnswer('Q1', 'A', 3000);
    
    const exportResult = stateManager.exportSessionData();
    expect(exportResult).toBeDefined();
    
    const importResult = stateManager.importSessionData(exportResult);
    expect(importResult).toBe(true);
  });

  it('should clear all storage', () => {
    const quizData = [
      { question: 'Q1', options: ['A', 'B'], answer: 'A' }
    ];

    stateManager.startQuizSession('week-1', quizData);
    stateManager.clearAllStorage();
    
    const storageInfo = stateManager.getStorageInfo();
    expect(storageInfo.totalKeys).toBe(0);
  });
});
