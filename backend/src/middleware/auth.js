// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const db = require('../config/database'); // Veritabanı bağlantını buraya import etmelisin

const auth = async (req, res, next) => {
  try {
    // 1. Token'ı al
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Lütfen giriş yapın.' });
    }

    // 2. Token'ı doğrula
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. (YENİ) Kullanıcıyı veritabanından taze çek ve kontrol et
    // Sadece ID'yi ve rolü çekmek yeterli, * yapıp her şeyi çekmeye gerek yok (performans için)
    const result = await db.query('SELECT id, username, email, role FROM users WHERE id = $1', [decoded.userId]);
    const user = result.rows[0];

    // Kullanıcı silinmişse veya BULUNAMAZSA
    if (!user) {
        return res.status(401).json({ error: 'Kullanıcı bulunamadı.' });
    }

    // (YENİ) Kullanıcı BANLI MI?
    if (user.role === 'banned') {
        return res.status(403).json({ error: 'Hesabınız yasaklanmıştır.' });
    }

    // 4. Kullanıcıyı request'e ekle (Artık güncel veriyi ekliyoruz)
    req.user = user; 
    next();

  } catch (error) {
    console.error("Auth hatası:", error.message);
    res.status(401).json({ error: 'Oturum geçersiz.' });
  }
};

module.exports = auth;