const request = require('supertest');
const app = require('../src/server'); 
const db = require('../src/config/database'); 
const jwt = require('jsonwebtoken');

describe('User Inventory Management: Stock Updates', () => {
  let token;
  let userId;
  let ingredientId;
  let itemId;

  //Setup User and Ingredient
  beforeAll(async () => {
    const timestamp = Date.now();
    
    //Creating a user
    const userRes = await db.query(
      `INSERT INTO users (username, email, password_hash, is_verified, role) 
       VALUES ($1, $2, 'hashedpass', TRUE, 'user') 
       RETURNING id, email`,
      [`StockUser_${timestamp}`, `stock_${timestamp}@test.com`]
    );
    userId = userRes.rows[0].id;

    token = jwt.sign(
      { userId: userId, email: userRes.rows[0].email }, 
      process.env.JWT_SECRET || 'your_secret_key_here', 
      { expiresIn: '1h' }
    );

    //Creating an Ingredient ('Golden Apple')
    const ingRes = await db.query(
      `INSERT INTO ingredients (name, unit, unit_category) 
       VALUES ($1, 'count', 'quantity') 
       RETURNING id`,
      [`Golden Apple ${timestamp}`]
    );
    ingredientId = ingRes.rows[0].id;
  });

  //Delete after all
  afterAll(async () => {
    if (itemId) {
      await db.query('DELETE FROM refrigerator_items WHERE id = $1', [itemId]);
    } else {
      await db.query(
        `DELETE FROM refrigerator_items 
         WHERE virtual_refrigerator_id IN (SELECT id FROM virtual_refrigerator WHERE user_id = $1)`,
         [userId]
      );
    }
    await db.query('DELETE FROM virtual_refrigerator WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    await db.query('DELETE FROM ingredients WHERE id = $1', [ingredientId]);
  });

  //TEST SCENARIO 1: Adding New Item to MyStock
  it('should add a new ingredient to the refrigerator', async () => {
    //User adds 5 Golden Apples
    const res = await request(app)
      .post('/api/refrigerator/add')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ingredientId: ingredientId,
        quantity: 5
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('message', 'New Ingredient added.');

    //Verifying in DB
    const checkRes = await db.query(
      `SELECT ri.id, ri.quantity 
       FROM refrigerator_items ri
       JOIN virtual_refrigerator vr ON ri.virtual_refrigerator_id = vr.id
       WHERE vr.user_id = $1 AND ri.ingredient_id = $2`,
      [userId, ingredientId]
    );

    expect(checkRes.rows.length).toBe(1); //Should create 1 row
    expect(Number(checkRes.rows[0].quantity)).toBe(5); //Quantity should be 5
    
    itemId = checkRes.rows[0].id; //Saving ID for cleanup
  });

 //TEST SCENARIO 2: Updating Existing Item
  it('should increase quantity if ingredient already exists', async () => {
    //User adds 3 more Golden Apples
    const res = await request(app)
      .post('/api/refrigerator/add')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ingredientId: ingredientId,
        quantity: 3
      });

    //Expecting: 200 because it's an update
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Ingredient amount updated.');

    //Verifying in DB
    const checkRes = await db.query(
      `SELECT ri.quantity 
       FROM refrigerator_items ri
       JOIN virtual_refrigerator vr ON ri.virtual_refrigerator_id = vr.id
       WHERE vr.user_id = $1 AND ri.ingredient_id = $2`,
      [userId, ingredientId]
    );

    // Initial (5) + Added (3) = 8
    expect(checkRes.rows.length).toBeGreaterThan(0);
    expect(Number(checkRes.rows[0].quantity)).toBe(8);
  });

});