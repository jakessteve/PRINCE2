"use strict";

import { buildWeekIndex } from './modules/ui-updater.js';
import { bindEvents } from './modules/event-binder.js';
import { selectAndPrepareQuiz, handleURLChange } from './modules/quiz-manager.js';
import { testDataService } from '../cache-test.js';
import serviceWorkerManager from './services/service-worker-registration.js';
import { simpleDataService } from './services/simple-data-service.js';

const quizApp = {
    async init() {
        // Initialize service worker first
        try {
            await serviceWorkerManager.init();
            console.log('Service Worker initialized successfully');
        } catch (error) {
            console.warn('Service Worker initialization failed:', error);
        }

        // Run cache tests in development mode
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            try {
                await testDataService();
            } catch (error) {
                console.error('Cache tests failed:', error);
            }
        }

        // Initialize simple data service and show performance stats
        try {
            const stats = simpleDataService.getCacheStats();
            console.log('🚀 Simple Data Service initialized:', stats);
        } catch (error) {
            console.warn('Simple data service initialization failed:', error);
        }
        
        await buildWeekIndex(selectAndPrepareQuiz);
        bindEvents();
        if (!window.location.search) {
            selectAndPrepareQuiz('1', false);
        }
        handleURLChange();

        // Setup offline/online event listeners
        this.setupConnectivityListeners();
    },

    setupConnectivityListeners() {
        // Listen for connectivity changes
        window.addEventListener('connectivity-change', (event) => {
            const isOffline = event.detail.isOffline;
            this.handleConnectivityChange(isOffline);
        });

        // Listen for sync completion
        window.addEventListener('sync-complete', (event) => {
            this.handleSyncComplete(event.detail);
        });
    },

    handleConnectivityChange(isOffline) {
        const domElements = this.getDomElements();
        
        if (isOffline) {
            // Show offline mode indicator
            this.showOfflineMode();
            
            // Disable network-dependent features
            if (domElements.startBtn) {
                domElements.startBtn.disabled = true;
                domElements.startBtn.textContent = 'Offline Mode';
            }
        } else {
            // Hide offline mode indicator
            this.hideOfflineMode();
            
            // Enable network-dependent features
            if (domElements.startBtn) {
                domElements.startBtn.disabled = false;
                // Reset button text based on current quiz
                this.updateStartButtonText();
            }
            
            // Process any pending offline operations
            serviceWorkerManager.processOfflineQueue();
        }
    },

    showOfflineMode() {
        let offlineBanner = document.getElementById('offline-banner');
        
        if (!offlineBanner) {
            offlineBanner = document.createElement('div');
            offlineBanner.id = 'offline-banner';
            offlineBanner.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-align: center;
                padding: 12px;
                font-size: 14px;
                font-weight: 600;
                z-index: 9998;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                transform: translateY(-100%);
                transition: transform 0.3s ease;
            `;
            offlineBanner.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    Offline Mode - Using Cached Data
                </div>
            `;
            document.body.appendChild(offlineBanner);
        }

        // Animate in
        setTimeout(() => {
            offlineBanner.style.transform = 'translateY(0)';
        }, 100);
    },

    hideOfflineMode() {
        const offlineBanner = document.getElementById('offline-banner');
        if (offlineBanner) {
            offlineBanner.style.transform = 'translateY(-100%)';
        }
    },

    updateStartButtonText() {
        const domElements = this.getDomElements();
        const urlParams = new URLSearchParams(window.location.search);
        const week = urlParams.get('week');
        
        if (domElements.startBtn) {
            if (week === 'final') {
                domElements.startBtn.innerHTML = 'Start Final Test';
            } else if (week === 'failed') {
                domElements.startBtn.innerHTML = 'Start Failed Test';
            } else {
                domElements.startBtn.innerHTML = `Start Test<br>Week ${week}`;
            }
        }
    },

    handleSyncComplete(detail) {
        console.log('Sync completed:', detail);
        
        // Show sync notification
        this.showSyncNotification();
        
        // Update UI if needed
        this.updateUIAfterSync();
    },

    showSyncNotification() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 600;
            z-index: 9999;
            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
            opacity: 0;
            transition: all 0.3s ease;
        `;
        notification.textContent = '✓ Offline data synced successfully';
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(-50%) translateY(-5px)';
        }, 100);
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(10px)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    },

    updateUIAfterSync() {
        // Refresh quiz data if needed
        const urlParams = new URLSearchParams(window.location.search);
        const week = urlParams.get('week');
        
        if (week) {
            // You might want to refresh the current quiz data
            console.log('Refreshing quiz data for week:', week);
        }
    },

    getDomElements() {
        // Return DOM elements that are commonly accessed
        return {
            startBtn: document.getElementById('start-btn'),
            finishBtn: document.getElementById('finish-btn'),
            weekIndexContainer: document.getElementById('week-index-container')
        };
    }
};

document.addEventListener('DOMContentLoaded', () => {
    quizApp.init();
});
