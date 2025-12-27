const request = require('supertest');
const app = require('../src/server'); 
const db = require('../src/config/database'); 

describe('Recipe Matching Logic', () => {
  let token;
  let userId;
  let recipeId;
  let ingredientId;
  let fridgeId;
  let fridgeItemId;

  //Setup
  beforeAll(async () => {
    const timestamp = Date.now();
    
    //Creating a user
    const userRes = await db.query(
      `INSERT INTO users (username, email, password_hash, is_verified, role) 
       VALUES ($1, $2, 'hashedpass', TRUE, 'user') 
       RETURNING id, email`,
      [`SmartUser_${timestamp}`, `smart_${timestamp}@test.com`]
    );
    userId = userRes.rows[0].id;

    const jwt = require('jsonwebtoken');
    token = jwt.sign(
      { userId: userId, email: userRes.rows[0].email }, 
      process.env.JWT_SECRET || 'your_secret_key_here', 
      { expiresIn: '1h' }
    );

    //Creating a non-staple item (staples are not included the matching algorithm)
    const ingRes = await db.query(
      `INSERT INTO ingredients (name, unit, unit_category, is_staple) 
       VALUES ($1, 'count', 'quantity', FALSE) 
       RETURNING id`,
      [`Magic Bean ${timestamp}`]
    );
    ingredientId = ingRes.rows[0].id;

    //Creating a verified recipe
    const recipeRes = await db.query(
      `INSERT INTO recipes (title, created_by, status, is_verified, prep_time, calories) 
       VALUES ('Magic Stew', $1, 'approved', TRUE, 15, 250) 
       RETURNING id`,
      [userId]
    );
    recipeId = recipeRes.rows[0].id;

    //Recipe Requirement: 5 Magic Beans
    await db.query(
      `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit_type) 
       VALUES ($1, $2, 5, 'count')`,
      [recipeId, ingredientId]
    );

    //Setting up users stock
    const fridgeRes = await db.query(
      `INSERT INTO virtual_refrigerator (user_id) VALUES ($1) RETURNING id`,
      [userId]
    );
    fridgeId = fridgeRes.rows[0].id;

    //Add Stock: User has 5 Magic Beans (100% Match Scenario)
    const stockRes = await db.query(
      `INSERT INTO refrigerator_items (virtual_refrigerator_id, ingredient_id, quantity) 
       VALUES ($1, $2, 5) 
       RETURNING id`,
      [fridgeId, ingredientId]
    );
    fridgeItemId = stockRes.rows[0].id;
  });

  //Delete after all
  afterAll(async () => {
    if (fridgeItemId) {
        await db.query('DELETE FROM refrigerator_items WHERE id = $1', [fridgeItemId]);
    }
    await db.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId]);
    await db.query('DELETE FROM virtual_refrigerator WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM recipes WHERE id = $1', [recipeId]);
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    await db.query('DELETE FROM ingredients WHERE id = $1', [ingredientId]);
  });

  //TEST SCENARIO
  it('should calculate 100% match percentage for fully stocked ingredients', async () => {
    //Getting matching recipes
    const res = await request(app)
      .get('/api/recipes/match')
      .set('Authorization', `Bearer ${token}`);

    //Assertions
    expect(Array.isArray(res.body)).toBeTruthy();
    
    //Finding our specific test recipe in the results
    const matchedRecipe = res.body.find(r => r.id === recipeId);

    //Verifying the recipe exists in the output
    expect(matchedRecipe).toBeDefined();

    // Verifying the smart algorithm calculation
    // User needs 5, has 5 -> Should be 100% match
    expect(Number(matchedRecipe.match_percentage)).toBe(100);
  });

});