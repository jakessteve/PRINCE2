// Event Manager for centralized event handling and cleanup
class EventManager {
    constructor() {
        // Store all registered event listeners for cleanup
        this.listeners = new Map();
        // Counter for generating unique listener IDs
        this.listenerIdCounter = 0;
    }

    /**
     * Add an event listener with automatic cleanup tracking
     * @param {EventTarget} target - The element to attach the listener to
     * @param {string} eventType - The event type (e.g., 'click', 'change')
     * @param {Function} handler - The event handler function
     * @param {Object} options - Event listener options
     * @returns {string} - Unique ID for the listener
     */
    addListener(target, eventType, handler, options = {}) {
        // Remove any existing listener for the same target/eventType combination
        this.removeListener(target, eventType);
        
        // Add the new event listener
        target.addEventListener(eventType, handler, options);
        
        // Generate a unique ID for this listener
        const listenerId = `listener_${++this.listenerIdCounter}`;
        
        // Store the listener information for cleanup
        this.listeners.set(listenerId, {
            target,
            eventType,
            handler,
            options
        });
        
        return listenerId;
    }

    /**
     * Remove a specific event listener
     * @param {EventTarget} target - The element to remove the listener from
     * @param {string} eventType - The event type
     */
    removeListener(target, eventType) {
        // Find and remove the listener from our tracking
        for (const [id, listener] of this.listeners.entries()) {
            if (listener.target === target && listener.eventType === eventType) {
                target.removeEventListener(eventType, listener.handler, listener.options);
                this.listeners.delete(id);
                break;
            }
        }
    }

    /**
     * Remove all event listeners managed by this instance
     */
    removeAllListeners() {
        for (const [id, listener] of this.listeners.entries()) {
            listener.target.removeEventListener(listener.eventType, listener.handler, listener.options);
        }
        this.listeners.clear();
    }

    /**
     * Remove a specific listener by its ID
     * @param {string} listenerId - The unique ID of the listener to remove
     */
    removeListenerById(listenerId) {
        const listener = this.listeners.get(listenerId);
        if (listener) {
            listener.target.removeEventListener(listener.eventType, listener.handler, listener.options);
            this.listeners.delete(listenerId);
        }
    }
}

// Export a singleton instance
export const eventManager = new EventManager();