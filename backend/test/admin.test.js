const request = require('supertest');
const app = require('../src/server'); 
const db = require('../src/config/database'); 
const jwt = require('jsonwebtoken');

describe('Security: Admin Privileges', () => {
  let adminToken;
  let userToken;
  let adminId;
  let userId;
  let recipeId;

  //Creating two users (Admin and Standart User)
  beforeAll(async () => {
    const timestamp = Date.now();
    
    //Creating standart user
    const userRes = await db.query(
      `INSERT INTO users (username, email, password_hash, is_verified, role) 
       VALUES ($1, $2, 'hashedpass', TRUE, 'user') 
       RETURNING id, email, role`,
      [`RegularUser_${timestamp}`, `user_${timestamp}@test.com`]
    );
    userId = userRes.rows[0].id;
    userToken = jwt.sign(
      { userId: userId, email: userRes.rows[0].email, role: 'user' }, 
      process.env.JWT_SECRET || 'your_secret_key_here', 
      { expiresIn: '1h' }
    );

    //Creating Admin User
    const adminRes = await db.query(
      `INSERT INTO users (username, email, password_hash, is_verified, role) 
       VALUES ($1, $2, 'hashedpass', TRUE, 'admin') 
       RETURNING id, email, role`,
      [`AdminUser_${timestamp}`, `admin_${timestamp}@test.com`]
    );
    adminId = adminRes.rows[0].id;
    adminToken = jwt.sign(
      { userId: adminId, email: adminRes.rows[0].email, role: 'admin' }, 
      process.env.JWT_SECRET || 'your_secret_key_here', 
      { expiresIn: '1h' }
    );

    //Creating A Pending Recipe (Created by User)
    const recipeRes = await db.query(
      `INSERT INTO recipes (title, created_by, status, is_verified, prep_time, calories) 
       VALUES ('Suspicious Soup', $1, 'pending', FALSE, 10, 100) 
       RETURNING id`,
      [userId]
    );
    recipeId = recipeRes.rows[0].id;
  });

  //Deleting after the test
  afterAll(async () => {
    await db.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId]);
    await db.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM recipes WHERE id = $1', [recipeId]);
    await db.query('DELETE FROM users WHERE id IN ($1, $2)', [userId, adminId]);
  });

  //TEST SCENARIO 1: Access control from a standart user
  it('should deny access to admin endpoints for regular users', async () => {
    //Attempting to access Dashboard Stats
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${userToken}`);

    //Expectation: 403 or 401 (User not have permisson for this)
    expect([401,403]).toContain(res.statusCode);
  });

  //TEST SCENARIO 2: Admin Access
  it('should allow access to admin endpoints for admin users', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    //Expecting the access Dashbord
    expect(res.body).toHaveProperty('totalUsers');
  });

  //TEST SCENARIO 3: Approve Recipe (With admin token)
  it('should allow admin to approve a pending recipe', async () => {
    //Approving the 'Suspicious Soup'
    const res = await request(app)
      .patch(`/api/admin/recipes/${recipeId}/action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve' });

    expect(res.body).toHaveProperty('message', 'Recipe approved.');

    //Verifying in DB
    const checkRes = await db.query('SELECT status FROM recipes WHERE id = $1', [recipeId]);
    expect(checkRes.rows[0].status).toBe('approved');
  });

});