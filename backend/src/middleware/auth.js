const jwt = require('jsonwebtoken');
const db = require('../config/database');

const auth = async (req, res, next) => {
  try {
    //token al
    const token = req.header('Authorization').replace('Bearer ', '');
    
    //token doğrulama
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const result = await db.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    const user = result.rows[0];

    if (!user) {
      throw new Error();
    }

    //requesete ekle
    req.token = token;
    req.user = user;
    next();

  } catch (error) {
    res.status(401).send({ error: 'Lütfen giriş yapın.' });
  }
};

module.exports = auth;