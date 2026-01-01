//Test for portion calculation
const { calculateRequiredAmount } = require('../../src/utils/portionCalculator');

describe('Unit Test: Portion Calculator Logic', () => {

    //Scenario Group 1: qty logic
    
    test('should round UP to nearest 0.5 for "qty" (1.1 -> 1.5)', () => {
        // There is 1 egg for 4 people -> Let's make it 4.4 people. Logically, this should be rounded to 1.5.
        const result = calculateRequiredAmount(1, 4, 4.4, 'qty');
        expect(result).toBe(1.5);
    });

    test('should keep exact halves as is for "qty" (1.5 -> 1.5)', () => {
        //1.5 onions for 2 people -> 2 people (No change)
        const result = calculateRequiredAmount(1.5, 2, 2, 'qty');
        expect(result).toBe(1.5);
    });

    test('should handle minimum amount for "qty" (0.1 -> 0.5)', () => {
        //When a very small portion is requested, it should not be 0, it should be 0.5.
        const result = calculateRequiredAmount(1, 10, 1, 'qty');
        expect(result).toBe(0.5);
    });

    //Scenario Group 2: Weight/Volume Logic

    test('should round to 1 decimal place for weight (g/kg)', () => {
        //3 servings at 100g -> 1 serving should be 33.333...
        const result = calculateRequiredAmount(100, 3, 1, 'g');
        expect(result).toBe(33.3);
    });

    test('should calculate standard scaling correctly (Double)', () => {
        //2 servings of 250ml milk -> 4 servings should be 500ml
        const result = calculateRequiredAmount(250, 2, 4, 'ml');
        expect(result).toBe(500);
    });

    //Scenario Group 3: Errors

    test('should throw error for invalid inputs', () => {
        expect(() => {
            calculateRequiredAmount(-10, 4, 2, 'g');
        }).toThrow("Invalid input: Values must be positive.");
    });
});