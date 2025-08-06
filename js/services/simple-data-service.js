import { shuffleArray } from '../utils/array-utils.js';

/**
 * Simple, high-performance data service with basic caching
 * Eliminates the complex Context7 and intelligent preloading overhead
 */
export class SimpleDataService {
    constructor() {
        // Simple cache with 10-minute TTL for better performance
        this.cache = new Map();
        this.cacheTTL = 600000; // 10 minutes
        this.manifest = null;
        this.allWeeksData = null;
    }

    /**
     * Get cached item or undefined if expired/missing
     */
    _getCached(key) {
        const item = this.cache.get(key);
        if (item && (Date.now() - item.timestamp) < this.cacheTTL) {
            return item.value;
        }
        this.cache.delete(key); // Clean expired item
        return undefined;
    }

    /**
     * Set cached item
     */
    _setCached(key, value) {
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    /**
     * Load manifest once and cache it
     */
    async _getManifest() {
        if (this.manifest) return this.manifest;
        
        try {
            const response = await fetch('data/manifest.json');
            this.manifest = await response.json();
            this._setCached('manifest', this.manifest);
            return this.manifest;
        } catch (error) {
            console.error('Failed to load manifest:', error);
            throw error;
        }
    }

    /**
     * Load week data directly with simple caching
     */
    async _loadWeekData(weekId) {
        const cacheKey = `week-${weekId}`;
        const cached = this._getCached(cacheKey);
        if (cached) return cached;

        try {
            // Use direct fetch for better performance than dynamic imports
            const response = await fetch(`data/json/week-${weekId}.json`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            
            // Cache the data
            this._setCached(cacheKey, data);
            return data;
        } catch (error) {
            console.error(`Failed to load week ${weekId}:`, error);
            throw error;
        }
    }

    /**
     * Load all weeks data in parallel and cache
     */
    async _loadAllWeeksData() {
        if (this.allWeeksData) return this.allWeeksData;

        try {
            const manifest = await this._getManifest();
            const weeks = manifest.quizzes;

            // Load all weeks in parallel for maximum performance
            const weekPromises = weeks.map(weekId => this._loadWeekData(weekId));
            this.allWeeksData = await Promise.all(weekPromises);
            
            // Cache the complete data
            this._setCached('all-weeks', this.allWeeksData);
            return this.allWeeksData;
        } catch (error) {
            console.error('Failed to load all weeks data:', error);
            throw error;
        }
    }

    /**
     * Get quiz data with simplified logic
     */
    async getQuizData(quizId) {
        try {
            switch (quizId) {
                case 'final':
                    return await this._getFinalQuizData();
                case 'failed':
                    return await this._getFailedQuizData();
                default:
                    return await this._loadWeekData(quizId);
            }
        } catch (error) {
            console.error(`Failed to get quiz data for ${quizId}:`, error);
            return [];
        }
    }

    /**
     * Static method for direct access
     */
    static async getQuizData(quizId) {
        return new SimpleDataService().getQuizData(quizId);
    }

    /**
     * Get final quiz data (60 questions from all weeks)
     */
    async _getFinalQuizData() {
        const allWeeksData = await this._loadAllWeeksData();
        const finalQuestions = [];

        // Take a balanced selection from each week
        const questionsPerWeek = Math.ceil(60 / allWeeksData.length);
        
        for (const weekData of allWeeksData) {
            if (weekData.length > 0) {
                const shuffled = [...weekData];
                shuffleArray(shuffled);
                finalQuestions.push(...shuffled.slice(0, questionsPerWeek));
            }
        }

        // If we have more than 60 questions, shuffle and limit
        if (finalQuestions.length > 60) {
            shuffleArray(finalQuestions);
            return finalQuestions.slice(0, 60);
        }

        return finalQuestions;
    }

    /**
     * Get failed quiz data (questions with >5 failures)
     */
    async _getFailedQuizData() {
        const { getFailedCounts } = await import('./storage-service.js');
        const allWeeksData = await this._loadAllWeeksData();
        const failedCounts = getFailedCounts();
        
        const failedQuestions = [];
        const seenQuestions = new Set();

        for (const weekData of allWeeksData) {
            for (const question of weekData) {
                if (!seenQuestions.has(question.question)) {
                    seenQuestions.add(question.question);
                    const failCount = failedCounts[question.question] || 0;
                    if (failCount > 5) {
                        failedQuestions.push({
                            ...question,
                            failCount
                        });
                    }
                }
            }
        }

        // Sort by fail count and limit to 60 questions
        return failedQuestions
            .sort((a, b) => b.failCount - a.failCount)
            .slice(0, 60);
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.manifest = null;
        this.allWeeksData = null;
        console.log('🗑️ Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        let validItems = 0;
        let expiredItems = 0;
        
        for (const [key, item] of this.cache) {
            if ((Date.now() - item.timestamp) < this.cacheTTL) {
                validItems++;
            } else {
                expiredItems++;
            }
        }

        return {
            totalItems: this.cache.size,
            validItems,
            expiredItems,
            memoryUsage: `${(JSON.stringify([...this.cache.values()]).length / 1024).toFixed(2)} KB`
        };
    }
}

// Export singleton instance
export const simpleDataService = new SimpleDataService();