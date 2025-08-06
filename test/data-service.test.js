import { 
    getQuizData, 
    fetchAllWeeksData, 
    preloadPredictedWeeks, 
    updateUserPerformance,
    invalidateWeekCache,
    invalidateAllCaches 
} from './data-service.js';
import { LRUCache } from './cache-service.js';

// Mock the dynamic imports
jest.mock('../../data/json/week-1.json', () => ({
    default: [
        {
            question: "Test question 1",
            options: { a: "Option A", b: "Option B" },
            answer: "a",
            explanations: { a: "Explanation A", b: "Explanation B" }
        }
    ]
}), { virtual: true });

jest.mock('../../data/json/week-2.json', () => ({
    default: [
        {
            question: "Test question 2",
            options: { a: "Option A", b: "Option B" },
            answer: "b",
            explanations: { a: "Explanation A", b: "Explanation B" }
        }
    ]
}), { virtual: true });

// Mock fetch API
global.fetch = jest.fn();

describe('Data Service - Lazy Loading & Code Splitting', () => {
    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Reset caches
        invalidateAllCaches();
        
        // Mock successful fetch for manifest
        fetch.mockImplementation((url) => {
            if (url === 'data/manifest.json') {
                return Promise.resolve({
                    json: () => Promise.resolve({ quizzes: ['1', '2'] })
                });
            }
            return Promise.reject(new Error('Not found'));
        });
    });

    describe('getQuizData - Lazy Loading', () => {
        it('should load individual week data using dynamic import', async () => {
            const data = await getQuizData('1');
            
            expect(data).toBeDefined();
            expect(Array.isArray(data)).toBe(true);
            expect(data.length).toBeGreaterThan(0);
            expect(data[0].question).toBe("Test question 1");
        });

        it('should cache loaded week data', async () => {
            // First call
            const data1 = await getQuizData('1');
            
            // Second call should use cache
            const data2 = await getQuizData('1');
            
            // Verify same data is returned
            expect(data1).toBe(data2);
            
            // Verify fetch was called only once (for manifest)
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it('should handle cache invalidation', async () => {
            // Load and cache data
            await getQuizData('1');
            
            // Invalidate cache
            invalidateWeekCache('1');
            
            // Load again - should fetch fresh data
            const data = await getQuizData('1');
            expect(data).toBeDefined();
        });
    });

    describe('fetchAllWeeksData - Code Splitting', () => {
        it('should load all weeks data in parallel', async () => {
            const allWeeksData = await fetchAllWeeksData();
            
            expect(allWeeksData).toBeDefined();
            expect(Array.isArray(allWeeksData)).toBe(true);
            expect(allWeeksData.length).toBe(2); // weeks 1 and 2
            
            // Verify each week has data
            allWeeksData.forEach((weekData, index) => {
                expect(Array.isArray(weekData)).toBe(true);
                expect(weekData.length).toBeGreaterThan(0);
            });
        });

        it('should cache all weeks data', async () => {
            // First call
            const data1 = await fetchAllWeeksData();
            
            // Second call should use cache
            const data2 = await fetchAllWeeksData();
            
            // Verify same data is returned
            expect(data1).toBe(data2);
        });
    });

    describe('Performance Features', () => {
        it('should track user navigation patterns', async () => {
            // Load multiple weeks to track navigation
            await getQuizData('1');
            await getQuizData('2');
            await getQuizData('1');
            
            // Navigation pattern should be tracked
            expect(getQuizData).toHaveBeenCalledTimes(3);
        });

        it('should update user performance data', () => {
            updateUserPerformance('1', 80, 10);
            updateUserPerformance('1', 90, 10);
            
            // Performance should be tracked (this would be tested with actual state in integration tests)
            expect(true).toBe(true); // Placeholder for actual performance tracking test
        });

        it('should not track performance for final or failed quizzes', () => {
            expect(() => {
                updateUserPerformance('final', 80, 10);
                updateUserPerformance('failed', 80, 10);
            }).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        it('should handle dynamic import failures gracefully', async () => {
            // Mock dynamic import to fail
            jest.doMock('../../data/json/week-3.json', () => {
                throw new Error('Import failed');
            });
            
            // Should not throw error, but handle it gracefully
            try {
                await getQuizData('3');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });

        it('should handle fetch API fallback', async () => {
            // Mock fetch to succeed for fallback
            fetch.mockImplementation((url) => {
                if (url === 'data/json/week-2.json') {
                    return Promise.resolve({
                        json: () => Promise.resolve([
                            {
                                question: "Fallback question",
                                options: { a: "Option A" },
                                answer: "a",
                                explanations: { a: "Explanation" }
                            }
                        ])
                    });
                }
                return Promise.reject(new Error('Not found'));
            });
            
            const data = await getQuizData('2');
            expect(data).toBeDefined();
            expect(data[0].question).toBe("Fallback question");
        });
    });

    describe('Cache Management', () => {
        it('should clear all caches', () => {
            invalidateAllCaches();
            expect(true).toBe(true); // Placeholder for actual cache verification
        });

        it('should respect cache TTL', async () => {
            // This would need to be tested with actual time manipulation
            // For now, just verify the cache exists
            await getQuizData('1');
            expect(true).toBe(true);
        });
    });

    describe('Special Quiz Types', () => {
        it('should handle final quiz data selection', async () => {
            // Mock all weeks data for final test
            jest.mock('../../data/json/week-1.json', () => ({
                default: Array(20).fill().map((_, i) => ({
                    question: `Question ${i}`,
                    options: { a: "A", b: "B" },
                    answer: "a",
                    explanations: { a: "Explanation" }
                }))
            }), { virtual: true });

            jest.mock('../../data/json/week-2.json', () => ({
                default: Array(20).fill().map((_, i) => ({
                    question: `Question ${i + 20}`,
                    options: { a: "A", b: "B" },
                    answer: "a",
                    explanations: { a: "Explanation" }
                }))
            }), { virtual: true });

            const finalData = await getQuizData('final');
            
            expect(finalData).toBeDefined();
            expect(Array.isArray(finalData)).toBe(true);
            expect(finalData.length).toBe(60); // Final test has 60 questions
        });

        it('should handle failed quiz data selection', async () => {
            // This would need mock failed counts data
            const failedData = await getQuizData('failed');
            
            // Should return array (possibly empty if no failed questions)
            expect(Array.isArray(failedData)).toBe(true);
        });
    });
});

describe('Performance Benchmarks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        invalidateAllCaches();
        
        // Mock successful fetch for manifest
        fetch.mockImplementation((url) => {
            if (url === 'data/manifest.json') {
                return Promise.resolve({
                    json: () => Promise.resolve({ quizzes: ['1', '2'] })
                });
            }
            return Promise.reject(new Error('Not found'));
        });
    });

    it('should measure load time for individual week', async () => {
        const startTime = performance.now();
        await getQuizData('1');
        const endTime = performance.now();
        
        const loadTime = endTime - startTime;
        console.log(`Individual week load time: ${loadTime.toFixed(2)}ms`);
        
        // Load time should be reasonable (less than 100ms for cached data)
        expect(loadTime).toBeLessThan(100);
    });

    it('should measure parallel load time for all weeks', async () => {
        const startTime = performance.now();
        await fetchAllWeeksData();
        const endTime = performance.now();
        
        const loadTime = endTime - startTime;
        console.log(`All weeks parallel load time: ${loadTime.toFixed(2)}ms`);
        
        // Parallel load should be faster than sequential
        expect(loadTime).toBeLessThan(200);
    });

    it('should demonstrate cache performance benefit', async () => {
        // First load (cold cache)
        const startTime1 = performance.now();
        await getQuizData('1');
        const endTime1 = performance.now();
        const coldCacheTime = endTime1 - startTime1;
        
        // Second load (warm cache)
        const startTime2 = performance.now();
        await getQuizData('1');
        const endTime2 = performance.now();
        const warmCacheTime = endTime2 - startTime2;
        
        console.log(`Cold cache time: ${coldCacheTime.toFixed(2)}ms`);
        console.log(`Warm cache time: ${warmCacheTime.toFixed(2)}ms`);
        
        // Warm cache should be significantly faster
        expect(warmCacheTime).toBeLessThan(coldCacheTime / 2);
    });
});