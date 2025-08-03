import { getQuizData, preloadPredictedWeeks, updateUserPerformance, invalidateAllCaches } from './data-service.js';

// Test function to verify the data service is working correctly
export async function testDataService() {
    console.log('Testing data service...');
    
    // Test fetching individual week data
    console.log('Fetching week 1 data...');
    try {
        const week1Data = await getQuizData('1');
        console.log(`Week 1 data fetched successfully. Questions: ${week1Data.length}`);
    } catch (error) {
        console.error('Error fetching week 1 data:', error);
    }
    
    // Test fetching final quiz data
    console.log('Fetching final quiz data...');
    try {
        const finalData = await getQuizData('final');
        console.log(`Final quiz data fetched successfully. Questions: ${finalData.length}`);
    } catch (error) {
        console.error('Error fetching final quiz data:', error);
    }
    
    // Test updating user performance
    console.log('Updating user performance...');
    try {
        updateUserPerformance('1', 85, 10);
        updateUserPerformance('2', 75, 10);
        updateUserPerformance('3', 90, 10);
        console.log('User performance updated successfully.');
    } catch (error) {
        console.error('Error updating user performance:', error);
    }
    
    // Test preloading
    console.log('Preloading predicted weeks...');
    try {
        await preloadPredictedWeeks();
        console.log('Preloading completed successfully.');
    } catch (error) {
        console.error('Error during preloading:', error);
    }
    
    // Test cache invalidation
    console.log('Invalidating all caches...');
    try {
        invalidateAllCaches();
        console.log('Caches invalidated successfully.');
    } catch (error) {
        console.error('Error invalidating caches:', error);
    }
    
    console.log('Data service test completed.');
}

// Run the test
// testDataService();