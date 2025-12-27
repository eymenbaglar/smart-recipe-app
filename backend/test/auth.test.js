const request = require('supertest');
const app = require('../src/server');

  {/* Register and Login Tests */}
  describe('Authentication & Security Tests', () => {

  //Unique Email Adresses for each tests
  const uniqueEmail = `testuser_${Date.now()}@example.com`;
  
  const testUser = {
    username: 'Test User',
    email: uniqueEmail,
    password: '123456'
  };

  // Succesfull Register for a new user
  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    //It should return: 201 Created
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('email', testUser.email);
  });

  //User with a unverified status
  it('should block login if account is not verified', async () => {
    //We try to login with user we created in the test before that is not verified
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    //It should return: 403 Forbidden
    expect(res.statusCode).toEqual(403);
    expect(res.body.error).toMatch(/not been verified/i); // Does the error message contain the word “verified”?
  });

  //Try to register with same e-mail adress we registred before
  it('should handle re-registration for unverified user correctly', async () => {
    //We send a register request with same fields
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    // It should return: 201
    expect(res.statusCode).toEqual(201);
    expect(res.body.message).toMatch(/sent again/i); //We are expecting a message such as “Code sent again”
  });

  //Successfull Login test (with verified user)
  it('should successfull login with right password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: "elif@example.com",
        password: '123456'
      });

    expect(res.body).toHaveProperty('token'); //Is the token coming after a successful login?
  });

  //Unsuccessfull Login with Wrong Password
  it('should fail login with wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: "elif@example.com",
        password: '123'
      });

    //It should return: 401
    expect(res.statusCode).toEqual(401);
  });
});