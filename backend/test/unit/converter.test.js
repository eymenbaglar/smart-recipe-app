//Test for Converting Logic
const { standardizeIngredient } = require('../../src/utils/converter');

describe('Unit Test: Ingredient Standardization & Conversion', () => {

    //Scenario Group 1: Comma/Period Errors
    
    test('should handle comma as decimal separator (1,5 -> 1.5)', () => {
        const result = standardizeIngredient("1,5", "qty");
        expect(result.quantity).toBe(1.5);
    });

    test('should handle dot as decimal separator (1.5 -> 1.5)', () => {
        const result = standardizeIngredient("1.5", "qty");
        expect(result.quantity).toBe(1.5);
    });

    //Scenario Group 2: Weight Conversions (kg -> gram)

    test('should convert kg to gram (1.2 kg -> 1200 gram)', () => {
        const result = standardizeIngredient("1,2", "kg");
        expect(result.quantity).toBe(1200);
        expect(result.unit).toBe('gram');
    });

    test('should standardize gram variations (gr -> gram)', () => {
        //The quantity should not change, only the name should change.
        const result = standardizeIngredient(500, "gr");
        expect(result.quantity).toBe(500);
        expect(result.unit).toBe('gram');
    });

    //Scenario Group 3: Volume Conversions (L -> ml)

    test('should convert Litre to ml (2.5 L -> 2500 ml)', () => {
        const result = standardizeIngredient(2.5, "L");
        expect(result.quantity).toBe(2500);
        expect(result.unit).toBe('ml');
    });

    test('should handle "lt" abbreviation (1 lt -> 1000 ml)', () => {
        const result = standardizeIngredient(1, "lt");
        expect(result.quantity).toBe(1000);
        expect(result.unit).toBe('ml');
    });

    //Scenario Group 4: Quantity Conversions

    test('should standardize count units (adet -> qty)', () => {
        const result = standardizeIngredient(5, "adet");
        expect(result.quantity).toBe(5);
        expect(result.unit).toBe('qty');
    });

    //Scenario Group 4: Error Handling

    test('should throw error for invalid number input', () => {
        expect(() => {
            standardizeIngredient("abc", "kg");
        }).toThrow("Invalid amount entered.");
    });

    test('should throw error for empty inputs', () => {
        expect(() => {
            standardizeIngredient("", "");
        }).toThrow("Quantity and unit information is required.");
    });

});