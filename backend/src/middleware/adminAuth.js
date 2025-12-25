const jwt = require('jsonwebtoken');
const db = require('../config/database');

const adminAuth = async (req, res, next) => {
  try {
    // 1. Token'ı al
    const token = req.header('Authorization').replace('Bearer ', '');
    
    // 2. Doğrula
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. Kullanıcıyı bul
    const result = await db.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    const user = result.rows[0];

    // 4. KONTROL: Kullanıcı var mı VE Rolü Admin mi?
    if (!user || user.role !== 'admin') {
      throw new Error();
    }

    req.token = token;
    req.user = user;
    next(); 

  } catch (error) {
    res.status(403).send({ error: 'Access denied. Administrator permission is required.' });
  }
};

module.exports = adminAuth;