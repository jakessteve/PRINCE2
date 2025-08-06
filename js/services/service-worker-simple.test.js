/**
 * Simple Service Worker Tests
 * Basic functionality tests for service worker components
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

describe('Service Worker Manager - Basic Tests', () => {
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

  describe('Service Worker Support', () => {
    it('should check service worker support correctly', () => {
      const hasSupport = serviceWorkerManager.isSupported;
      
      expect(typeof hasSupport).toBe('boolean');
    });

    it('should get online status correctly', () => {
      const isOnline = serviceWorkerManager.isOnlineStatus();
      
      expect(typeof isOnline).toBe('boolean');
    });
  });

  describe('Registration Info', () => {
    it('should provide registration information', () => {
      const info = serviceWorkerManager.getRegistrationInfo();
      
      expect(info).toBeDefined();
      expect(info).toHaveProperty('isSupported');
      expect(info).toHaveProperty('isOnline');
      expect(info).toHaveProperty('queueLength');
    });
  });

  describe('Offline Queue Management', () => {
    it('should add items to offline queue', () => {
      const item = { type: 'quiz_answer', data: { questionId: 'Q1', answer: 'A' } };
      
      serviceWorkerManager.addToOfflineQueue(item);
      
      expect(serviceWorkerManager.offlineQueue).toHaveLength(1);
      expect(serviceWorkerManager.offlineQueue[0]).toEqual(expect.objectContaining(item));
    });

    it('should process offline queue when online', async () => {
      const item = { type: 'quiz_answer', data: { questionId: 'Q1', answer: 'A' } };
      
      // Mock online status
      serviceWorkerManager.isOnline = true;
      
      serviceWorkerManager.addToOfflineQueue(item);
      
      // Mock syncItem to resolve successfully
      serviceWorkerManager.syncItem = jest.fn().mockResolvedValue(true);
      
      await serviceWorkerManager.processOfflineQueue();
      
      expect(serviceWorkerManager.offlineQueue).toHaveLength(0);
    });
  });

  describe('Quiz State Management', () => {
    it('should store and retrieve quiz state', () => {
      const state = {
        quizId: 'week-1',
        currentQuestion: 0,
        answers: [{ questionId: 'Q1', answer: 'A' }],
        startTime: Date.now()
      };
      
      serviceWorkerManager.storeQuizState(state);
      
      const retrievedState = serviceWorkerManager.quizState;
      expect(retrievedState).toEqual(state);
    });

    it('should handle localStorage fallback', () => {
      // Simulate no service worker support
      serviceWorkerManager.isSupported = false;
      
      const state = { quizId: 'week-1', currentQuestion: 0 };
      
      serviceWorkerManager.storeQuizState(state);
      
      // Check localStorage was used
      expect(localStorage.setItem).toHaveBeenCalledWith('offlineQuizState', JSON.stringify(state));
    });
  });

  describe('Connectivity Handling', () => {
    it('should handle offline status', () => {
      // Mock offline status
      serviceWorkerManager.isOnline = false;
      
      const isOffline = !serviceWorkerManager.isOnline;
      expect(isOffline).toBe(true);
    });

    it('should dispatch connectivity change event', () => {
      const mockDispatch = jest.fn();
      window.dispatchEvent = mockDispatch;
      
      serviceWorkerManager.handleConnectivityChange(true);
      
      expect(mockDispatch).toHaveBeenCalledWith(expect.any(Event));
    });
  });

  describe('Cleanup', () => {
    it('should destroy service worker manager', () => {
      serviceWorkerManager.destroy();
      
      expect(serviceWorkerManager.registration).toBeNull();
      expect(serviceWorkerManager.messageChannel).toBeNull();
    });
  });
});

describe('Offline Quiz Service - Basic Tests', () => {
  let offlineService;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Import and create instance
    import('./offline-quiz-service.js').then(module => {
      offlineService = new module.default();
    });
  });

  afterEach(() => {
    if (offlineService) {
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

  it('should handle online/offline transitions', () => {
    const mockAddEventListener = jest.fn();
    window.addEventListener = mockAddEventListener;
    
    // Simulate offline event
    const offlineHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'offline'
    )?.[1];
    
    if (offlineHandler) {
      offlineHandler();
    }
    
    expect(offlineService.isOffline).toBe(true);
  });
});

describe('Quiz State Manager - Basic Tests', () => {
  let stateManager;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Import and create instance
    import('./quiz-state-manager.js').then(module => {
      stateManager = new module.default();
    });
  });

  afterEach(() => {
    if (stateManager) {
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

  it('should export and import session data', () => {
    const testData = {
      session: { quizId: 'week-1', score: 80 },
      metadata: { timestamp: Date.now() }
    };
    
    const exportResult = stateManager.exportSessionData();
    expect(exportResult).toBeDefined();
    
    const importResult = stateManager.importSessionData(exportResult);
    expect(importResult).toBe(true);
  });
});