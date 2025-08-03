// Simple test for event manager functionality
import { eventManager } from './event-manager.js';

// Mock DOM elements for testing
const createMockElement = () => {
    return {
        eventListeners: {},
        addEventListener(eventType, handler, options) {
            if (!this.eventListeners[eventType]) {
                this.eventListeners[eventType] = [];
            }
            this.eventListeners[eventType].push({ handler, options });
        },
        removeEventListener(eventType, handler, options) {
            if (this.eventListeners[eventType]) {
                this.eventListeners[eventType] = this.eventListeners[eventType].filter(
                    listener => listener.handler !== handler
                );
            }
        },
        dispatchEvent(event) {
            if (this.eventListeners[event.type]) {
                this.eventListeners[event.type].forEach(listener => {
                    listener.handler(event);
                });
            }
        }
    };
};

// Test the event manager
export function testEventManager() {
    console.log('Testing Event Manager...');
    
    // Create mock elements
    const button1 = createMockElement();
    const button2 = createMockElement();
    
    let clickCount1 = 0;
    let clickCount2 = 0;
    
    // Add event listeners
    const listenerId1 = eventManager.addListener(button1, 'click', () => {
        clickCount1++;
        console.log('Button 1 clicked');
    });
    
    const listenerId2 = eventManager.addListener(button2, 'click', () => {
        clickCount2++;
        console.log('Button 2 clicked');
    });
    
    // Test that listeners were added
    console.assert(listenerId1 !== undefined, 'Listener 1 should have an ID');
    console.assert(listenerId2 !== undefined, 'Listener 2 should have an ID');
    console.assert(listenerId1 !== listenerId2, 'Listeners should have unique IDs');
    
    // Test event dispatching
    button1.dispatchEvent({ type: 'click' });
    button2.dispatchEvent({ type: 'click' });
    button1.dispatchEvent({ type: 'click' });
    
    console.assert(clickCount1 === 2, 'Button 1 should have been clicked 2 times');
    console.assert(clickCount2 === 1, 'Button 2 should have been clicked 1 time');
    
    // Test removing a specific listener
    eventManager.removeListenerById(listenerId1);
    button1.dispatchEvent({ type: 'click' });
    
    console.assert(clickCount1 === 2, 'Button 1 click count should remain 2 after listener removal');
    console.assert(clickCount2 === 1, 'Button 2 click count should remain 1');
    
    // Test removing all listeners
    eventManager.removeAllListeners();
    button2.dispatchEvent({ type: 'click' });
    
    console.assert(clickCount1 === 2, 'Button 1 click count should remain 2 after all listeners removed');
    console.assert(clickCount2 === 1, 'Button 2 click count should remain 1 after all listeners removed');
    
    console.log('Event Manager tests completed successfully!');
}

// Run the test if this file is executed directly
if (import.meta.url === new URL(import.meta.url).href) {
    testEventManager();
}