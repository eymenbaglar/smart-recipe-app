//Test for Recipe Sorting Logic
const { sortRecipes } = require('../../src/utils/sorter');

describe('Unit Test: Recipe Sorting Logic', () => {

    //Mock Data for test
    const mockRecipes = [
        { id: 1, title: 'High Rating', average_rating: '4.8', calories: 500, prep_time: 30, added_at: '2025-01-01', match_percentage: 90 },
        { id: 2, title: 'Low Rating', average_rating: '2.5', calories: 200, prep_time: 15, added_at: '2023-01-01', match_percentage: 40 },
        { id: 3, title: 'None Rating (Null)', average_rating: null,  calories: 800, prep_time: 60, added_at: '2024-01-01', match_percentage: 0 }
    ];

    //Scenario 1: Sorting by Score
    test('should sort by rating high to low', () => {
        const sorted = sortRecipes(mockRecipes, 'rating_high');
        
        //Expectation: 4.8 -> 2.5 -> null(0)
        expect(sorted[0].id).toBe(1);
        expect(sorted[2].id).toBe(3);
    });

    test('should sort by rating low to high (handling nulls)', () => {
        const sorted = sortRecipes(mockRecipes, 'rating_low');
        
        //Expectation: null(0) -> 2.5 -> 4.8
        expect(sorted[0].id).toBe(3); 
        expect(sorted[2].id).toBe(1);
    });

    //Scenario 2: Sorting by Calories
    test('should sort by calories low to high', () => {
        const sorted = sortRecipes(mockRecipes, 'calories_low');
        
        //Expectation: 200 -> 500 -> 800
        expect(sorted[0].id).toBe(2);
        expect(sorted[2].id).toBe(3);
    });

    //Scenario 3: Sorting by Time
    test('should sort by prep time short to long', () => {
        const sorted = sortRecipes(mockRecipes, 'time_short');
        
        //Expectation: 15 -> 30 -> 60
        expect(sorted[0].id).toBe(2);
        expect(sorted[2].id).toBe(3);
    });

    //Scenario 4: Sorting by Date
    test('should sort by date new to old (default behavior)', () => {
        //It should work by default even if we send 'unknown_key'
        const sorted = sortRecipes(mockRecipes, 'date_new');
        
        //Expectation: 2025 -> 2024 -> 2023
        expect(sorted[0].id).toBe(1); // 2025
        expect(sorted[1].id).toBe(3); // 2024
        expect(sorted[2].id).toBe(2); // 2023
    });

    test('should sort by date old to new', () => {
        const sorted = sortRecipes(mockRecipes, 'date_old');
        
        //Expectation: 2023 -> 2024 -> 2025
        expect(sorted[0].id).toBe(2); // 2023
        expect(sorted[2].id).toBe(1); // 2025
    });

    //Scenario 5: Sorting by Match Percantage
    test('should sort by match percentage high to low', () => {
        const sorted = sortRecipes(mockRecipes, 'match_high');
        
        //Expectation: 90 -> 40 -> 0
        expect(sorted[0].id).toBe(1);
        expect(sorted[2].id).toBe(3);
    });

});