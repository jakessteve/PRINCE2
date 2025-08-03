import { shuffleArray } from '../utils/array-utils.js';
import { getFailedCounts } from './storage-service.js';
import { LRUCache } from './cache-service.js';

// Initialize caches with appropriate TTL (5 minutes) and max size
const weekDataCache = new LRUCache(20, 300000); // Cache up to 20 weeks for 5 minutes
const allQuizzesCache = new LRUCache(1, 300000); // Cache all quizzes data for 5 minutes
const manifestCache = new LRUCache(1, 300000); // Cache manifest for 5 minutes

async function fetchQuizData(quizId) {
    // Check if data is in cache
    const cacheKey = `week-${quizId}`;
    if (weekDataCache.has(cacheKey)) {
        return weekDataCache.get(cacheKey);
    }
    
    // Fetch data if not in cache
    const res = await fetch(`data/json/week-${quizId}.json`);
    const data = await res.json();
    
    // Store in cache
    weekDataCache.set(cacheKey, data);
    return data;
}

async function fetchManifest() {
    // Check if manifest is in cache
    if (manifestCache.has('manifest')) {
        return manifestCache.get('manifest');
    }
    
    // Fetch manifest if not in cache
    const manifestRes = await fetch('data/manifest.json');
    const manifest = await manifestRes.json();
    
    // Store in cache
    manifestCache.set('manifest', manifest);
    return manifest;
}

/**
 * Create dynamic bundles based on user behavior patterns
 * @param {Array<string>} weeks - Array of week identifiers
 * @returns {Array<Array<string>>} Array of week bundles
 */
function createUserBundles(weeks) {
    // If we have user performance data, create bundles of weeks with similar performance
    // Otherwise, fall back to grouping weeks into bundles of 4
    if (Object.keys(userPerformance).length > 0) {
        // Group weeks by performance levels (high, medium, low)
        const highPerformance = [];
        const mediumPerformance = [];
        const lowPerformance = [];
        
        weeks.forEach(week => {
            const performance = userPerformance[week];
            if (performance) {
                if (performance.averageScore >= 80) {
                    highPerformance.push(week);
                } else if (performance.averageScore >= 60) {
                    mediumPerformance.push(week);
                } else {
                    lowPerformance.push(week);
                }
            } else {
                // If no performance data, add to medium performance group
                mediumPerformance.push(week);
            }
        });
        
        // Create bundles from each performance group
        const bundles = [];
        const bundleSize = 4;
        
        // Helper function to create bundles from an array
        const createBundlesFromArray = (array) => {
            const result = [];
            for (let i = 0; i < array.length; i += bundleSize) {
                result.push(array.slice(i, i + bundleSize));
            }
            return result;
        };
        
        // Add bundles from each performance group
        bundles.push(...createBundlesFromArray(highPerformance));
        bundles.push(...createBundlesFromArray(mediumPerformance));
        bundles.push(...createBundlesFromArray(lowPerformance));
        
        // If we have any remaining weeks that don't fit in bundles, add them as smaller bundles
        return bundles.filter(bundle => bundle.length > 0);
    } else {
        // Fall back to grouping weeks into bundles of 4
        const bundles = [];
        const bundleSize = 4;
        for (let i = 0; i < weeks.length; i += bundleSize) {
            bundles.push(weeks.slice(i, i + bundleSize));
        }
        return bundles;
    }
}

async function fetchAllWeeksData() {
    // Check if all quizzes data is in cache
    if (allQuizzesCache.has('all')) {
        return allQuizzesCache.get('all');
    }
    
    // Get manifest
    const { quizzes: weeks } = await fetchManifest();
    
    // Create dynamic bundles based on user behavior patterns
    // If we have user performance data, create bundles of weeks with similar performance
    // Otherwise, fall back to grouping weeks into bundles of 4
    const weekBundles = createUserBundles(weeks);
    
    // Check if we have any existing bundled files we can use
    // We have bundled files for groups of 4 weeks each
    const existingBundledFiles = {
        '1-2-3-4': 'bundled-group1.json',
        '5-6-7-8': 'bundled-group2.json',
        '9-10-11-12': 'bundled-group3.json',
        '13-14-15-16': 'bundled-group4.json'
    };
    
    // Fetch data for each bundle
    const allWeekPromises = weekBundles.map(async (bundle, bundleIndex) => {
        const bundleKey = bundle.join('-');
        if (weekDataCache.has(bundleKey)) {
            return weekDataCache.get(bundleKey);
        } else {
            // Check if we have an existing bundled file for this bundle
            if (existingBundledFiles[bundleKey]) {
                try {
                    // Fetch the bundled file
                    const res = await fetch(`data/json/${existingBundledFiles[bundleKey]}`);
                    const bundledData = await res.json();
                    
                    // Extract week data from the bundled file
                    const bundleData = [];
                    // The bundled data is an array of arrays, where each inner array represents a week's questions
                    // The index of the inner array corresponds to the week number (0-based)
                    bundledData.forEach((weekQuestions, index) => {
                        const weekNumber = index + 1; // Convert 0-based index to 1-based week number
                        bundleData.push(weekQuestions);
                        // Store each week's data in the cache
                        const cacheKey = `week-${weekNumber}`;
                        weekDataCache.set(cacheKey, weekQuestions);
                    });
                    
                    return bundleData;
                } catch (error) {
                    console.warn(`Failed to fetch bundled file ${existingBundledFiles[bundleKey]}, falling back to individual fetches:`, error);
                    // Fall back to individual fetches
                    const bundleData = [];
                    for (const week of bundle) {
                        const weekData = await fetchQuizData(week);
                        bundleData.push(weekData);
                    }
                    // Store each week's data in the cache
                    bundle.forEach((week, index) => {
                        const cacheKey = `week-${week}`;
                        weekDataCache.set(cacheKey, bundleData[index]);
                    });
                    return bundleData;
                }
            } else {
                // For dynamic bundles, we'll need to fetch each week individually
                // and then combine them into a single bundle response
                const bundleData = [];
                for (const week of bundle) {
                    const weekData = await fetchQuizData(week);
                    bundleData.push(weekData);
                }
                // Store each week's data in the cache
                bundle.forEach((week, index) => {
                    const cacheKey = `week-${week}`;
                    weekDataCache.set(cacheKey, bundleData[index]);
                });
                return bundleData;
            }
        }
    });
    
    // Flatten the array of arrays into a single array of week data
    const allWeeksData = (await Promise.all(allWeekPromises)).flat();
    
    // Store in cache
    allQuizzesCache.set('all', allWeeksData);
    return allWeeksData;
}

// Track user navigation patterns for intelligent preloading
const userNavigationPattern = [];

// Track user performance on specific weeks for intelligent preloading
const userPerformance = {};

/**
 * Update user performance data for a specific week
 * @param {string} weekId - The week identifier
 * @param {number} score - The user's score (0-100)
 * @param {number} totalQuestions - The total number of questions
 */
export function updateUserPerformance(weekId, score, totalQuestions) {
    if (weekId === 'final' || weekId === 'failed') {
        return; // Don't track performance for final or failed quizzes
    }
    
    if (!userPerformance[weekId]) {
        userPerformance[weekId] = {
            attempts: 0,
            totalScore: 0,
            totalQuestions: 0,
            averageScore: 0
        };
    }
    
    userPerformance[weekId].attempts++;
    userPerformance[weekId].totalScore += score;
    userPerformance[weekId].totalQuestions += totalQuestions;
    userPerformance[weekId].averageScore = userPerformance[weekId].totalScore / userPerformance[weekId].attempts;
}

export async function getQuizData(quizId) {
    // Track user navigation for preloading strategy
    userNavigationPattern.push(quizId);
    if (userNavigationPattern.length > 10) {
        userNavigationPattern.shift(); // Keep only the last 10 navigations
    }

    if (quizId === 'final') {
        // For final quiz, implement selective fetching using bundled data
        // This reduces HTTP requests from 16 to 4
        const allWeeksData = await fetchAllWeeksData();
        
        // Determine how many questions we need from each week (balanced approach)
        const weeks = allWeeksData.length;
        const questionsPerWeek = Math.ceil(60 / weeks);
        const finalTestQuestions = [];
        let remainingPool = [];

        // Process data for each week selectively
        for (const weekData of allWeeksData) {
            if (weekData.length > 0) {
                const shuffledWeekQuestions = [...weekData]; // Create a shallow copy to avoid modifying original cached array
                shuffleArray(shuffledWeekQuestions);
                
                // Take only the required number of questions from this week
                const weekQuestions = shuffledWeekQuestions.slice(0, questionsPerWeek);
                finalTestQuestions.push(...weekQuestions);
                
                // Add remaining questions to the pool for additional selection
                if (shuffledWeekQuestions.length > questionsPerWeek) {
                    remainingPool = remainingPool.concat(shuffledWeekQuestions.slice(questionsPerWeek));
                }
            }
        }

        // If we have more than 60 questions, shuffle and take only 60
        if (finalTestQuestions.length > 60) {
            shuffleArray(finalTestQuestions);
            return finalTestQuestions.slice(0, 60);
        }

        // If we need more questions, fill from the remaining pool
        const questionsNeeded = 60 - finalTestQuestions.length;
        if (questionsNeeded > 0 && remainingPool.length > 0) {
            shuffleArray(remainingPool);
            const additionalQuestions = remainingPool.slice(0, questionsNeeded);
            finalTestQuestions.push(...additionalQuestions);
        }

        shuffleArray(finalTestQuestions);
        return finalTestQuestions.slice(0, 60);

    } else if (quizId === 'failed') {
        const failedCounts = getFailedCounts();
        const allWeeksData = await fetchAllWeeksData();
        
        // Use a Set to track unique question texts for efficient existence checking
        const seenQuestions = new Set();
        const questionsWithFailCount = [];
        
        // Combine deduplication and fail count mapping in a single pass
        // Implement early termination when we have enough questions (60)
        let questionsProcessed = 0;
        const maxQuestionsNeeded = 60;
        
        // Process all weeks data in a single pass
        for (const weekQuestions of allWeeksData) {
            for (const q of weekQuestions) {
                // Check if we've already seen this question
                if (!seenQuestions.has(q.question)) {
                    seenQuestions.add(q.question);
                    
                    // Add fail count to the question
                    const questionWithFailCount = {
                        ...q,
                        failCount: failedCounts[q.question] || 0
                    };
                    
                    // Only add questions with fail count > 5
                    if (questionWithFailCount.failCount > 5) {
                        questionsWithFailCount.push(questionWithFailCount);
                        questionsProcessed++;
                    }
                    
                    // Early termination if we have enough questions
                    if (questionsProcessed >= maxQuestionsNeeded) {
                        break;
                    }
                }
            }
            
            // Early termination if we have enough questions
            if (questionsProcessed >= maxQuestionsNeeded) {
                break;
            }
        }
        
        // Check if we have enough questions
        if (questionsWithFailCount.length < 10) {
            return [];
        }
        
        // Sort by fail count (descending) and limit to 60 questions
        return questionsWithFailCount
            .sort((a, b) => b.failCount - a.failCount)
            .slice(0, 60);
    } else {
        // For individual weeks, use selective loading
        return await fetchQuizData(quizId);
    }
}

/**
 * Invalidate cache for a specific week
 * @param {string} quizId
 */
export function invalidateWeekCache(quizId) {
    const cacheKey = `week-${quizId}`;
    weekDataCache.cache.delete(cacheKey);
}

/**
 * Invalidate all caches
 */
export function invalidateAllCaches() {
    weekDataCache.clear();
    allQuizzesCache.clear();
    manifestCache.clear();
}

/**
 * Preload data for weeks that are likely to be accessed based on user behavior
 */
export async function preloadPredictedWeeks() {
    // Analyze user navigation pattern to predict next likely accessed weeks
    if (userNavigationPattern.length === 0) {
        console.log("No user navigation pattern available for preloading.");
        return;
    }

    // Count frequency of each week access
    const frequencyMap = {};
    userNavigationPattern.forEach(week => {
        if (week !== 'final' && week !== 'failed') {
            frequencyMap[week] = (frequencyMap[week] || 0) + 1;
        }
    });

    // Create a combined score based on frequency and performance
    // Weeks with lower performance should be prioritized for preloading
    const combinedScores = {};
    
    // Get all weeks from manifest
    const { quizzes: allWeeks } = await fetchManifest();
    
    // Calculate combined scores for all weeks
    allWeeks.forEach(week => {
        // Frequency score (0-100)
        const frequencyScore = (frequencyMap[week] || 0) * 20; // Max 100 for 5 accesses
        
        // Performance score (0-100) - lower performance = higher priority
        const performanceData = userPerformance[week];
        let performanceScore = 50; // Default score if no performance data
        if (performanceData) {
            // Invert the average score so that lower scores get higher priority
            performanceScore = 100 - performanceData.averageScore;
        }
        
        // Combined score (frequency 70%, performance 30%)
        combinedScores[week] = (frequencyScore * 0.7) + (performanceScore * 0.3);
    });

    // Sort weeks by combined score (descending)
    const sortedWeeks = Object.entries(combinedScores)
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);

    // Preload the highest scoring weeks (up to 3)
    const weeksToPreload = sortedWeeks.slice(0, 3);
    
    // Also preload weeks that are numerically close to recently accessed weeks
    const recentWeek = userNavigationPattern[userNavigationPattern.length - 1];
    if (recentWeek !== 'final' && recentWeek !== 'failed') {
        const weekNum = parseInt(recentWeek);
        if (!isNaN(weekNum)) {
            // Add adjacent weeks
            if (weekNum > 1) weeksToPreload.push((weekNum - 1).toString());
            if (weekNum < 16) weeksToPreload.push((weekNum + 1).toString());
            
            // Ensure no duplicates in weeksToPreload
            weeksToPreload = [...new Set(weeksToPreload)];
        }
    }

    // Remove duplicates and 'final'/'failed' if present
    const uniqueWeeksToPreload = [...new Set(weeksToPreload)]
        .filter(week => week !== 'final' && week !== 'failed');

    // Preload the predicted weeks
    const preloadPromises = uniqueWeeksToPreload.map(week =>
        fetchQuizData(week).catch(err => console.warn(`Failed to preload week ${week}:`, err))
    );
    
    await Promise.allSettled(preloadPromises);
}