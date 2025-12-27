const request = require('supertest');
const app = require('../src/server'); // Path to your server file
const db = require('../src/config/database'); // Path to your DB config

describe('Cooking & Inventory Transaction', () => {
  let token;
  let userId;
  let recipeId;
  let ingredientId;
  let fridgeItemId;

  //SETUP: Creating dummy data before running tests
  
  beforeAll(async () => {
    //Unique user(if any case of error)
    const timestamp = Date.now();
    const uniqueUsername = `ChefTest_${timestamp}`;
    const uniqueEmail = `chef_${timestamp}@test.com`;

    //Creating a user
    const userRes = await db.query(
      `INSERT INTO users (username, email, password_hash, is_verified, role) 
       VALUES ($1, $2, 'hashedpass', TRUE, 'user') 
       RETURNING id, email`,
      [uniqueUsername, uniqueEmail]
    );
    userId = userRes.rows[0].id;

    //JWT token
    const jwt = require('jsonwebtoken');
    token = jwt.sign(
      { userId: userId, email: userRes.rows[0].email }, 
      process.env.JWT_SECRET || 'your_secret_key_here', 
      { expiresIn: '1h' }
    );

    //Creating a test ingredient
    const ingRes = await db.query(
      `INSERT INTO ingredients (name, unit, unit_category) 
       VALUES ($1, 'g', 'mass') 
       RETURNING id`,
      [`Test Rice ${timestamp}`]
    );
    ingredientId = ingRes.rows[0].id;

    //Creating a test recipe
    const recipeRes = await db.query(
      `INSERT INTO recipes (title, created_by, status, is_verified, prep_time, calories) 
       VALUES ('Rice Bowl', $1, 'approved', TRUE, 20, 300) 
       RETURNING id`,
      [userId]
    );
    recipeId = recipeRes.rows[0].id;

    //Linking Ingredient to Recipe (Recipe requires 100g of Rice)
    await db.query(
      `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit_type) 
       VALUES ($1, $2, 100, 'g')`,
      [recipeId, ingredientId]
    );

    //We Setup User's Refrigerator
    const fridgeRes = await db.query(
      `INSERT INTO virtual_refrigerator (user_id) VALUES ($1) RETURNING id`,
      [userId]
    );
    const fridgeId = fridgeRes.rows[0].id;

    //Adding Stock to User's Fridge (User has 500g of Rice)
    const stockRes = await db.query(
      `INSERT INTO refrigerator_items (virtual_refrigerator_id, ingredient_id, quantity) 
       VALUES ($1, $2, 500) 
       RETURNING id`,
      [fridgeId, ingredientId]
    );
    fridgeItemId = stockRes.rows[0].id;
  });

  //Removing dummy data after tests
  afterAll(async () => {  
    //Deleting meal_history
    await db.query('DELETE FROM meal_history WHERE user_id = $1', [userId]);

    //Deleting refrigeratoritems and recipe items
    if (fridgeItemId) {
        await db.query('DELETE FROM refrigerator_items WHERE id = $1', [fridgeItemId]);
    }
    await db.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId]);

    //Deleting recipe
    await db.query('DELETE FROM recipes WHERE id = $1', [recipeId]);

    //Deleting virtual refrigerator
    await db.query('DELETE FROM virtual_refrigerator WHERE user_id = $1', [userId]);

    //Deleting user
    await db.query('DELETE FROM users WHERE id = $1', [userId]);

    //Deleting ingredient
    await db.query('DELETE FROM ingredients WHERE id = $1', [ingredientId]);
  });

  //Test Scenario
  it('should successfully cook a meal, reduce stock, and record history', async () => {
    // Scenario: User cooks 2 servings.
    // Recipe needs 100g per serving. Total needed: 200g.
    // Initial Stock: 500g.
    // Expected Result: Stock becomes 300g.

    const res = await request(app)
      .post('/api/recipes/cook')
      .set('Authorization', `Bearer ${token}`)
      .send({
        recipeId: recipeId,
        multiplier: 2
      });

    //Checking if the meal entered the cooked status
    expect(res.body).toHaveProperty('message', 'Cooking recorded and inventory updated.');

    //Checking if stock decreased correctly
    const stockCheck = await db.query(
      'SELECT quantity FROM refrigerator_items WHERE id = $1', 
      [fridgeItemId]
    );
    const newQuantity = stockCheck.rows[0].quantity;
    
    //Expectation: 500 - (100 * 2) = 300
    expect(parseFloat(newQuantity)).toBe(300.00);

    //Checking if meal history is created
    const historyCheck = await db.query(
      'SELECT * FROM meal_history WHERE user_id = $1 AND recipe_id = $2',
      [userId, recipeId]
    );
    expect(historyCheck.rows.length).toBeGreaterThan(0);
  });

});