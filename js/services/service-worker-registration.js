/**
 * Service Worker Registration Utility
 * Handles registration, state management, and communication with the service worker
 */

export class ServiceWorkerManager {
  constructor() {
    this.registration = null;
    this.isSupported = 'serviceWorker' in navigator;
    this.isOnline = navigator.onLine;
    this.offlineQueue = [];
    this.quizState = null;
    this.isInitialized = false;
    this.messageQueue = [];
    
    // Suppress Permissions-Policy warnings by checking browser support
    this.suppressWarnings = this.shouldSuppressWarnings();
    
    this.init();
  }

  /**
   * Check if we should suppress certain warnings based on browser capabilities
   */
  shouldSuppressWarnings() {
    // Check if browser has issues with certain permissions policies
    const userAgent = navigator.userAgent.toLowerCase();
    const isChrome = userAgent.indexOf('chrome') > -1;
    const isSafari = userAgent.indexOf('safari') > -1;
    
    // Suppress warnings for browsers that don't support certain features
    return !isChrome || userAgent.indexOf('edg') > -1; // Suppress on Edge or non-Chrome
  }

  /**
   * Initialize service worker registration
   */
  async init() {
    if (!this.isSupported) {
      if (this.suppressWarnings) {
        console.log('Service Worker not supported or suppressed for this browser');
      } else {
        console.warn('Service Worker is not supported in this browser');
      }
      return;
    }

    if (this.isInitialized) {
      console.log('Service Worker already initialized');
      return;
    }

    try {
      // Check if there's an existing service worker controller
      if (navigator.serviceWorker.controller) {
        console.log('🔄 Using existing service worker controller');
        this.setupCommunication();
        this.isInitialized = true;
        return;
      }

      // Register the service worker with fallback handling
      const swPath = '/sw.js';
      try {
        this.registration = await navigator.serviceWorker.register(swPath, {
          scope: '/'
        });
        console.log('Service Worker registered successfully:', this.registration);
      } catch (error) {
        console.warn('Service Worker registration failed, continuing without SW:', error.message);
        // Continue without service worker - app will work with localStorage fallback
        this.isSupported = false;
        return;
      }

      // Wait for service worker to activate
      if (this.registration.active) {
        console.log('🚀 Service Worker already active');
        await this.waitForServiceWorkerReady();
        this.setupCommunication();
      } else {
        // Listen for service worker activation
        this.registration.addEventListener('updatefound', () => {
          const installingWorker = this.registration.installing;
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'activated') {
              console.log('🚀 Service Worker activated');
              this.waitForServiceWorkerReady().then(() => {
                this.setupCommunication();
              });
            }
          });
        });

        // Also listen for controllerchange event
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('🔄 Service Worker controller changed');
          this.waitForServiceWorkerReady().then(() => {
            this.setupCommunication();
          });
        });
      }

      // Listen for service worker updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.showUpdateNotification();
          }
        });
      });

      // Listen for online/offline events
      this.setupConnectivityListeners();

      // Request notification permission
      this.requestNotificationPermission();

    } catch (error) {
      if (this.suppressWarnings) {
        console.log('Service Worker registration failed, continuing with localStorage fallback:', error.message);
      } else {
        console.error('Service Worker registration failed:', error);
      }
      // Continue without service worker - app will work with localStorage fallback
      this.isSupported = false;
      return;
    }
  }

  /**
   * Wait for service worker to be ready
   */
  async waitForServiceWorkerReady() {
    return new Promise((resolve) => {
      if (navigator.serviceWorker.controller) {
        resolve();
        return;
      }

      const checkController = () => {
        if (navigator.serviceWorker.controller) {
          resolve();
        } else {
          setTimeout(checkController, 100);
        }
      };

      checkController();
    });
  }

  /**
   * Setup communication with service worker
   */
  async setupCommunication() {
    if (this.isInitialized) {
      return;
    }

    // Wait for service worker to be ready
    await this.waitForServiceWorkerReady();

    // Create message channel for two-way communication
    this.messageChannel = new MessageChannel();

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'OFFLINE_STATUS':
          this.isOnline = data.isOnline;
          this.handleConnectivityChange(!data.isOnline);
          break;
          
        case 'SYNC_COMPLETE':
          this.handleSyncComplete(data);
          break;
          
        case 'CACHED_DATA':
          console.log('Data cached successfully:', data);
          break;
      }
    });

    // Send initialization message to service worker
    this.sendMessageToServiceWorker({
      type: 'INITIALIZE',
      data: { timestamp: Date.now() }
    });

    // Process any queued messages
    this.processMessageQueue();

    // Mark as initialized
    this.isInitialized = true;
  }

  /**
   * Process queued messages
   */
  processMessageQueue() {
    if (this.messageQueue && this.messageQueue.length > 0) {
      console.log(`📤 Processing ${this.messageQueue.length} queued messages`);
      const queue = [...this.messageQueue];
      this.messageQueue = [];
      
      queue.forEach(({ message, transferables }) => {
        this.sendMessageToServiceWorker(message, transferables);
      });
    }
  }

  /**
   * Send message to service worker
   */
  sendMessageToServiceWorker(message, transferables = []) {
    if (!navigator.serviceWorker.controller) {
      console.warn('No active service worker controller, queuing message:', message.type);
      // Queue the message for later when service worker is ready
      if (!this.messageQueue) {
        this.messageQueue = [];
      }
      this.messageQueue.push({ message, transferables });
      return;
    }

    navigator.serviceWorker.controller.postMessage(
      { type: message.type, data: message.data },
      transferables
    );
  }

  /**
   * Setup connectivity listeners
   */
  setupConnectivityListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleConnectivityChange(false);
      this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.handleConnectivityChange(true);
    });
  }

  /**
   * Handle connectivity changes
   */
  handleConnectivityChange(isOffline) {
    // Dispatch custom event
    const event = new CustomEvent('connectivity-change', {
      detail: { isOffline }
    });
    window.dispatchEvent(event);

    // Show/hide offline indicator
    this.updateOfflineIndicator(isOffline);

    if (isOffline) {
      this.showOfflineNotification();
    }
  }

  /**
   * Update offline indicator in UI
   */
  updateOfflineIndicator(isOffline) {
    let indicator = document.getElementById('offline-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'offline-indicator';
      indicator.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #dc3545;
        color: white;
        text-align: center;
        padding: 10px;
        font-size: 14px;
        z-index: 9999;
        transform: translateY(-100%);
        transition: transform 0.3s ease;
      `;
      document.body.appendChild(indicator);
    }

    if (isOffline) {
      indicator.textContent = 'You are offline. Some features may be limited.';
      indicator.style.transform = 'translateY(0)';
    } else {
      indicator.textContent = 'You are back online!';
      indicator.style.transform = 'translateY(-100%)';
      
      // Hide the indicator after 3 seconds
      setTimeout(() => {
        indicator.style.transform = 'translateY(-100%)';
      }, 3000);
    }
  }

  /**
   * Show offline notification
   */
  showOfflineNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Offline Mode', {
        body: 'You are now in offline mode. Quiz progress will be saved locally.',
        icon: '/data:,'
      });
    }
  }

  /**
   * Show update notification
   */
  showUpdateNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #007bff;
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 9999;
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    notification.innerHTML = `
      <div style="font-weight: bold;">New Version Available</div>
      <div style="font-size: 12px; margin-top: 5px;">Click to refresh and update</div>
    `;

    notification.addEventListener('click', () => {
      window.location.reload();
    });

    document.body.appendChild(notification);

    // Auto-hide after 10 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 10000);
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Notification permission granted');
        }
      } catch (error) {
        console.warn('Notification permission request failed:', error);
      }
    }
  }

  /**
   * Cache quiz data for offline use
   */
  async cacheQuizData(urls) {
    if (!this.isSupported || !navigator.serviceWorker.controller) {
      return;
    }

    try {
      this.sendMessageToServiceWorker({
        type: 'CACHE_QUIZ_DATA',
        data: { urls }
      });
    } catch (error) {
      console.error('Failed to cache quiz data:', error);
    }
  }

  /**
   * Store quiz state for offline recovery
   */
  storeQuizState(state) {
    this.quizState = state;
    
    if (!this.isSupported || !navigator.serviceWorker.controller) {
      // Fallback to localStorage
      localStorage.setItem('offlineQuizState', JSON.stringify(state));
      return;
    }

    try {
      this.sendMessageToServiceWorker({
        type: 'STORE_QUIZ_STATE',
        data: state
      });
    } catch (error) {
      console.error('Failed to store quiz state:', error);
      // Fallback to localStorage
      localStorage.setItem('offlineQuizState', JSON.stringify(state));
    }
  }

  /**
   * Retrieve stored quiz state
   */
  async retrieveQuizState() {
    if (!this.isSupported || !navigator.serviceWorker.controller) {
      // Fallback to localStorage
      const state = localStorage.getItem('offlineQuizState');
      return state ? JSON.parse(state) : null;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.state);
      };

      try {
        this.sendMessageToServiceWorker({
          type: 'GET_QUIZ_STATE',
          data: {}
        }, [messageChannel.port2]);
      } catch (error) {
        console.error('Failed to retrieve quiz state:', error);
        // Fallback to localStorage
        const state = localStorage.getItem('offlineQuizState');
        resolve(state ? JSON.parse(state) : null);
      }
    });
  }

  /**
   * Add item to offline queue
   */
  addToOfflineQueue(item) {
    this.offlineQueue.push({
      ...item,
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    });

    // Save to localStorage as backup
    localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));

    // If online, try to sync immediately
    if (this.isOnline) {
      this.processOfflineQueue();
    }
  }

  /**
   * Process offline queue
   */
  async processOfflineQueue() {
    if (!this.isOnline || this.offlineQueue.length === 0) {
      return;
    }

    const itemsToProcess = [...this.offlineQueue];
    this.offlineQueue = [];

    try {
      for (const item of itemsToProcess) {
        await this.syncItem(item);
      }

      // Clear localStorage backup
      localStorage.removeItem('offlineQueue');
      
    } catch (error) {
      console.error('Failed to process offline queue:', error);
      // Restore queue if sync fails
      this.offlineQueue = itemsToProcess;
      localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
    }
  }

  /**
   * Sync individual item
   */
  async syncItem(item) {
    // This would typically send the item to a server
    // For now, we'll just log it
    console.log('Syncing item:', item);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Handle sync completion
   */
  handleSyncComplete(data) {
    console.log('Sync completed:', data);
    
    // Dispatch custom event
    const event = new CustomEvent('sync-complete', {
      detail: data
    });
    window.dispatchEvent(event);
  }

  /**
   * Get current online status
   */
  isOnlineStatus() {
    return this.isOnline;
  }

  /**
   * Get service worker registration info
   */
  getRegistrationInfo() {
    return {
      isSupported: this.isSupported,
      isOnline: this.isOnline,
      registration: this.registration,
      queueLength: this.offlineQueue.length
    };
  }

  /**
   * Destroy service worker registration and cleanup
   */
  destroy() {
    if (this.messageChannel) {
      this.messageChannel = null;
    }
    
    if (this.registration) {
      this.registration = null;
    }
    
    console.log('🧹 Service Worker registration cleaned up');
  }
}

// Create global instance
const serviceWorkerManager = new ServiceWorkerManager();

// Export for use in other modules
export default serviceWorkerManager;

// Auto-initialize when module is imported
if (typeof window !== 'undefined') {
  window.serviceWorkerManager = serviceWorkerManager;
}