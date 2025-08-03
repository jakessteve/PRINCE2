/**
 * LRU Cache implementation with time-based expiration
 */
export class LRUCache {
    constructor(maxSize = 100, ttl = 300000) { // Default: 100 items, 5 minutes TTL
        this.maxSize = maxSize;
        this.ttl = ttl; // Time to live in milliseconds
        this.cache = new Map();
    }

    /**
     * Get item from cache
     * @param {string} key 
     * @returns {*} cached value or undefined
     */
    get(key) {
        const item = this.cache.get(key);
        
        // Check if item exists and hasn't expired
        if (item && (Date.now() - item.timestamp) < this.ttl) {
            // Move to front (most recently used)
            this.cache.delete(key);
            this.cache.set(key, { ...item, timestamp: Date.now() });
            return item.value;
        }
        
        // Remove expired item
        if (item) {
            this.cache.delete(key);
        }
        
        return undefined;
    }

    /**
     * Set item in cache
     * @param {string} key 
     * @param {*} value 
     */
    set(key, value) {
        // Remove oldest items if cache is full
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        // Add new item
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    /**
     * Check if cache has non-expired item
     * @param {string} key 
     * @returns {boolean}
     */
    has(key) {
        const item = this.cache.get(key);
        if (item && (Date.now() - item.timestamp) < this.ttl) {
            return true;
        }
        
        // Remove expired item
        if (item) {
            this.cache.delete(key);
        }
        
        return false;
    }

    /**
     * Clear all items from cache
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Get current cache size
     * @returns {number}
     */
    size() {
        // Clean expired items and return actual size
        for (const [key, item] of this.cache) {
            if ((Date.now() - item.timestamp) >= this.ttl) {
                this.cache.delete(key);
            }
        }
        return this.cache.size;
    }
}