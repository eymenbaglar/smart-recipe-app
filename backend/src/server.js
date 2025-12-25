const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// KONTROL: Değişkenler gelmiş mi bakalım (Terminalde göreceksin)
console.log("--- Server Başlatılıyor ---");
console.log("DB_USER:", process.env.DB_USER); // Eğer undefined yazıyorsa dosya bulunamadı demektir.
console.log("DB_PORT:", process.env.DB_PORT);
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./config/database');
const auth = require('./middleware/auth');
const multer = require('multer');
const adminAuth = require('./middleware/adminAuth');
const { debug } = require('console');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { scheduleBackup, performBackup } = require('./backupService');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); 
  }
});

const upload = multer({ storage: storage });

// Mail Gönderme Servisi
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'eymenbaglar@gmail.com', 
    pass: 'dapq twbc ipuy jhtg'    
  }
});

// Yardımcı Fonksiyon: Mail Gönder
const sendVerificationEmail = async (email, code) => {
  const mailOptions = {
    from: '"Smart Recipe App" <seninmailin@gmail.com>',
    to: email,
    subject: 'Account Verification Code',
    text: `Hello! Welcome to the app. Your verification code is: ${code}. This code is valid for 15 minutes.`
  };
  await transporter.sendMail(mailOptions);
};

//bildirim için helper fonksion
const sendNotification = async (userId, title, message, type = 'info') => {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
      [userId, title, message, type]
    );
  } catch (err) {
    console.error(`Notification error (User: ${userId}):`, err.message);
  }
};

cron.schedule('0 0 * * *', async () => {
  console.log('Running Account Deletion Cleanup Job...');
  const client = await db.connect();

  try {
    // 1. Süresi dolmuş (30 günden eski) kullanıcıları bul
    const result = await client.query(`
      SELECT id FROM users 
      WHERE is_deleted = TRUE 
      AND deletion_requested_at < NOW() - INTERVAL '30 days'
    `);

    const usersToDelete = result.rows;

    if (usersToDelete.length > 0) {
      console.log(`${usersToDelete.length} users found for permanent deletion.`);

      for (const user of usersToDelete) {
        try {
          await client.query('BEGIN');

          // A. Verified Tariflerin Sahibini Admin Yap (veya NULL yap)
          // Eğer sisteminde sabit bir Admin ID varsa NULL yerine o ID'yi yaz (örn: created_by = 1)
          await client.query(`
            UPDATE recipes 
            SET created_by = NULL 
            WHERE created_by = $1 AND is_verified = TRUE
          `, [user.id]);

          // B. Kullanıcıyı Kalıcı Olarak Sil (Hard Delete)
          // Standart tarifler zaten talep anında silinmişti.
          await client.query('DELETE FROM users WHERE id = $1', [user.id]);

          await client.query('COMMIT');
          console.log(`User ${user.id} permanently deleted.`);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`Failed to delete user ${user.id}:`, err);
        }
      }
    } else {
      console.log('No accounts pending for deletion today.');
    }

  } catch (error) {
    console.error('Cron Job Error:', error);
  } finally {
    client.release();
  }
});

{/* ADMİN API'LERİ*/}
//pending olan tarifleri getir
app.get('/api/admin/recipes/pending', adminAuth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        r.*, 
        u.username,
        (
          -- Tarifin malzemelerini JSON listesi olarak çekiyoruz
          SELECT json_agg(
            json_build_object(
              'name', i.name,
              'quantity', ri.quantity,
              'unit', ri.unit_type
            )
          )
          FROM recipe_ingredients ri
          JOIN ingredients i ON ri.ingredient_id = i.id
          WHERE ri.recipe_id = r.id
        ) as ingredients
      FROM recipes r
      JOIN users u ON r.created_by = u.id
      WHERE r.status = 'pending'
      ORDER BY r.created_at ASC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Admin Pending Error:', err);
    res.status(500).json({ error: 'Recipes could not be retrieved.' });
  }
});

//pending tarifle ilgili işlemler
app.patch('/api/admin/recipes/:id/action', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { action, reason } = req.body;

  try {
    // 1. ADIM: Önce tarifin sahibini ve başlığını veritabanından çekelim
    const recipeQuery = await db.query('SELECT created_by, title FROM recipes WHERE id = $1', [id]);
    
    if (recipeQuery.rows.length === 0) {
      return res.status(404).json({ error: 'No recipe found.' });
    }

    const { created_by, title } = recipeQuery.rows[0];
    const userId = created_by; // sendNotification için gerekli değişken

    // 2. ADIM: Aksiyona göre işlem yap
    if (action === 'approve') {
      await db.query("UPDATE recipes SET status = 'approved' WHERE id = $1", [id]);
      
      // Eğer tarifi bir kullanıcı yazdıysa (Admin değilse) bildirim gönder
      if (userId) {
        await sendNotification(userId, "Your recipe has been approved! 🎉", `"${title}" has been published.`, "success");
      }
      
      res.json({ message: 'Recipe approved.' });     
    } 
    else if (action === 'reject') {
      await db.query(
        "UPDATE recipes SET status = 'rejected', rejection_reason = $1 WHERE id = $2", 
        [reason, id]
      );
      
      if (userId) {
        await sendNotification(userId, "Your recipe has been rejected ⚠️", `"${title}"  has been rejected. Please edit it and resubmit.`, "warning");
      }
      
      res.json({ message: 'Recipe rejected.' });
    }
    else if (action === 'verify') {
        await db.query(
            "UPDATE recipes SET status = 'approved', is_verified = TRUE WHERE id = $1", 
            [id]
        );
        
        if (userId) {
          await sendNotification(userId, "Your recipe has been verified! ✅", `"${title}" has been verified and approved by our editors.`, "success");
        }
        
        res.json({ message: 'Recipe Verified and Approved.' });
    }
    else {
      res.status(400).json({ error: 'Invalid transaction.' });
    }
  } catch (error) {
    console.error("Action Error:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Dashboard İstatistikleri
app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    //toplam kullanıcı
    const userCount = await db.query('SELECT COUNT(*) FROM users');
    
    //onaylanmış tarif
    const recipeCount = await db.query("SELECT COUNT(*) FROM recipes WHERE status = 'approved'");
    
    //onay bekleyen tarif
    const pendingCount = await db.query("SELECT COUNT(*) FROM recipes WHERE status = 'pending'");
    
    //bugün pişirilen yemek sayısı
    const cookedToday = await db.query(
      "SELECT COUNT(*) FROM meal_history WHERE cooked_at::date = CURRENT_DATE"
    );

    res.json({
      totalUsers: userCount.rows[0].count,
      totalRecipes: recipeCount.rows[0].count,
      pendingRecipes: pendingCount.rows[0].count,
      cookedToday: cookedToday.rows[0].count
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//Onaylanmış tarifleri getir
app.get('/api/admin/recipes/approved', adminAuth, async (req, res) => {
  const { type } = req.query;
  
  try {
    const isVerified = type === 'verified' ? 'TRUE' : 'FALSE';
    
    const result = await db.query(
      `SELECT 
         r.*, 
         u.username as author,
         (SELECT COUNT(*) FROM reviews WHERE recipe_id = r.id) as review_count,
         (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE recipe_id = r.id) as average_rating
       FROM recipes r
       LEFT JOIN users u ON r.created_by = u.id
       WHERE r.status = 'approved' AND r.is_verified = ${isVerified}
       ORDER BY r.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Approved recipes fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//Tarif silme
app.delete('/api/admin/recipes/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const recipeInfo = await db.query('SELECT created_by, title FROM recipes WHERE id = $1', [id]);
  try {
    await db.query('DELETE FROM recipes WHERE id = $1', [id]);
    if (recipeInfo.rows.length > 0) {
        await sendNotification(
            recipeInfo.rows[0].created_by, 
            "Your recipe has been deleted 🗑️", 
            `"${recipeInfo.rows[0].title}" has been removed from publication.`, 
            "error"
        );
    }
    res.json({ message: 'Recipe deleted.' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//Verified durumunu değiştir
app.patch('/api/admin/recipes/:id/toggle-verify', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { isVerified } = req.body; // true veya false gelir

  try {
    // 1. ADIM: Tarif sahibini ve başlığını bul
    const recipeQuery = await db.query('SELECT created_by, title FROM recipes WHERE id = $1', [id]);

    if (recipeQuery.rows.length === 0) {
      return res.status(404).json({ error: 'No recipe found.' });
    }

    const { created_by, title } = recipeQuery.rows[0];
    const userId = created_by;

    // 2. ADIM: Veritabanını güncelle
    await db.query(
      'UPDATE recipes SET is_verified = $1 WHERE id = $2',
      [isVerified, id]
    );

    // 3. ADIM: Bildirim Gönder (Sadece kullanıcı varsa)
    if (userId) {
      if (isVerified) {
        // Verified Yapıldıysa
        await sendNotification(
            userId, 
            "Your recipe has been verified! 🌟", 
            `Congratulations! "${title}" has received the 'Verified Recipe' badge from our editors.`, 
            "success"
        );
      } else {
        // Verified Geri Alındıysa
        await sendNotification(
            userId, 
            "Verification Removed ℹ️", 
            `The verified status of your recipe titled "${title}" has been removed.`, 
            "warning"
        );
      }
    }

    res.json({ message: 'Verified status updated.' });
  } catch (error) {
    console.error('Verify toggle error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//Tekil tarif getir
app.get('/api/admin/recipes/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT r.*, 
             COALESCE(
               (SELECT json_agg(json_build_object(
                  'id', i.id,
                  'name', i.name,
                  'quantity', ri.quantity,
                  'unit', ri.unit_type 
                ))
                FROM recipe_ingredients ri
                JOIN ingredients i ON ri.ingredient_id = i.id
                WHERE ri.recipe_id = r.id
               ), 
               '[]'::json
             ) as ingredients
      FROM recipes r 
      WHERE r.id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Could not find recipe' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//Tarifi Güncelle
app.put('/api/admin/recipes/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  // Gelen verileri al
  const { title, description, instructions, prep_time, calories, serving, image_url, ingredients } = req.body;

  
  // Boş string ("") gelirse veritabanına NULL gönder, yoksa sayıyı gönder.
  const safePrepTime = (prep_time === '' || prep_time === null) ? null : prep_time;
  const safeCalories = (calories === '' || calories === null) ? null : calories;
  const safeServing  = (serving === ''  || serving === null)  ? null : serving;
  

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // 1. ADIM: Tarifi güncelle ve sahibinin ID'sini al
    // Parametre dizisinde req.body'den gelenleri değil, yukarıda düzelttiğimiz (safe...) değişkenleri kullanıyoruz.
    const updateResult = await client.query(
      `UPDATE recipes 
       SET title = $1, description = $2, instructions = $3, prep_time = $4, calories = $5, serving = $6, image_url = $7 
       WHERE id = $8
       RETURNING created_by`,
      [title, description, instructions, safePrepTime, safeCalories, safeServing, image_url, id] 
    );

    if (updateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Tarif bulunamadı.' });
    }

    const userId = updateResult.rows[0].created_by;

    // 2. ADIM: Malzemeleri güncelle
    if (ingredients && Array.isArray(ingredients)) {
      await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]);

      for (const ing of ingredients) {
        // Malzeme miktarı da sayısal olmalı, onu da garantiye alalım (Opsiyonel ama iyi olur)
        const safeQuantity = (ing.quantity === '' || ing.quantity === null) ? null : ing.quantity;

        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit_type) 
           VALUES ($1, $2, $3, $4)`,
          [id, ing.id, safeQuantity, ing.unit]
        );
      }
    }

    await client.query('COMMIT');

    // 3. ADIM: Bildirim Gönder
    if (userId) {
        await sendNotification(
            userId, 
            "Your recipe has been edited  ✏️", 
            `The admin has made some updates to your  "${title}" recipe.`, 
            "info"
        );
    }

    res.json({ message: 'Recipe updated successfully.' });

  } catch (error) {
    await client.query('ROLLBACK'); 
    console.error('Update error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

//ingredients getir
app.get('/api/ingredients', adminAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT id, name FROM ingredients ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Ingredients fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/recipes/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT r.*, 
             COALESCE(
               (SELECT json_agg(json_build_object(
                  'id', i.id,
                  'name', i.name,
                  'quantity', ri.quantity,
                  'unit', ri.unit_type 
                ))
                FROM recipe_ingredients ri
                JOIN ingredients i ON ri.ingredient_id = i.id
                WHERE ri.recipe_id = r.id
               ), 
               '[]'::json
             ) as ingredients
      FROM recipes r 
      WHERE r.id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Could not find recipe' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//Tüm Kullanıcıları Getir
app.get('/api/admin/users', adminAuth, async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id, u.username, u.email, u.role, u.created_at, u.profile_picture,
        (SELECT COUNT(*) FROM recipes WHERE created_by = u.id) as recipe_count,
        (SELECT COUNT(*) FROM reviews WHERE user_id = u.id) as review_count
      FROM users u
      ORDER BY u.created_at DESC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//Kullanıcıyı Banla/Banı Kaldır
app.patch('/api/admin/users/:id/ban', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { isBanned } = req.body;
  
  const newRole = isBanned ? 'banned' : 'user';

  try {
    if (id == req.user.userId) { 
        return res.status(400).json({ error: "You can not ban yourself" });
    }

    await db.query('UPDATE users SET role = $1 WHERE id = $2', [newRole, id]);
    res.json({ message: `User status updated: ${newRole}` });
  } catch (error) {
    console.error('Ban error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//Kullanıcıyı Admin Yap/Geri Al
app.patch('/api/admin/users/:id/role', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  try {
    await db.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
    res.json({ message: 'Role updated' });
  } catch (error) {
    console.error('Role update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//Tüm Malzemeleri Getir
app.get('/api/admin/ingredients/list', adminAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM ingredients ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Ingredients list error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//Yeni Malzeme Ekle
app.post('/api/admin/ingredients', adminAuth, async (req, res) => {
  const { name, unit, unit_category, category, calories, isStaple } = req.body;
  
  if (!name || !unit) {
      return res.status(400).json({ error: "Ingredient name and unit are required." });
  }

  try {
    await db.query(
      `INSERT INTO ingredients 
       (name, unit, unit_category, category, calories_per_unit, is_staple) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        name, 
        unit, 
        unit_category || 'count',
        category || 'General',    
        calories || 0, 
        isStaple || false
      ]
    );
    const newItemName = name;
    const allUsers = await db.query('SELECT id FROM users');
    allUsers.rows.forEach(async (user) => {
        await sendNotification(
            user.id, 
            "New Ingredient Added! 🥑", 
            `"${newItemName}" has been added to our database. Add it to your stock now!`, 
            "success"
        );
    });
    res.status(201).json({ message: 'Ingredient added succesfully' });
  } catch (error) {
    console.error('Add ingredient error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//Malzeme Düzenleme
app.put('/api/admin/ingredients/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { name, unit, unit_category, category, calories, isStaple } = req.body;

  try {
    await db.query(
      `UPDATE ingredients 
       SET name = $1, unit = $2, unit_category = $3, category = $4, calories_per_unit = $5, is_staple = $6
       WHERE id = $7`,
      [name, unit, unit_category, category, calories, isStaple, id]
    );
    res.json({ message: 'Ingredient updated' });
  } catch (error) {
    console.error('Update ingredient error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//malzeme önerilerini getir
app.get('/api/admin/suggestions', adminAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM ingredient_suggestions ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('SQL Hatası:', err.message); 
    res.status(500).json({ error: 'No suggestions were made.' });
  }
});

//DONE butonu
app.delete('/api/admin/suggestions/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM ingredient_suggestions WHERE id = $1', [id]);
    res.json({ message: 'The suggestion has been removed from the list.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Deletion failed.' });
  }
});

//tüm yorumları getir
app.get('/api/admin/reviews', adminAuth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        r.id, 
        r.comment, 
        r.rating, 
        r.created_at,
        u.username,
        rec.title as recipe_title
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN recipes rec ON r.recipe_id = rec.id
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Comments could not be retrieved.' });
  }
});

//yorum silme
app.delete('/api/admin/reviews/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body; // Adminin yazdığı silme sebebi

  try {
    // 1. Silmeden önce kullanıcıyı ve tarifi bul (Bildirim için)
    const reviewInfo = await db.query(`
      SELECT r.user_id, r.comment, rec.title 
      FROM reviews r
      JOIN recipes rec ON r.recipe_id = rec.id
      WHERE r.id = $1
    `, [id]);

    if (reviewInfo.rows.length === 0) {
      return res.status(404).json({ error: 'No comments found.' });
    }

    const { user_id, title, comment } = reviewInfo.rows[0];

    // 2. Yorumu Sil
    await db.query('DELETE FROM reviews WHERE id = $1', [id]);

    // 3. Kullanıcıya Bildirim Gönder
    if (user_id) {
        // Yorum çok uzunsa bildirimde göstermek için kısaltalım
        const shortComment = comment.length > 20 ? comment.substring(0, 20) + '...' : comment;
        
        await sendNotification(
            user_id, 
            "Your comment has been removed. ⚠️", 
            `Your comment with the content "${shortComment}" on the "${title}" recipe has been removed because it violates our community guidelines. \nReason: ${reason}`, 
            "warning"
        );
    }

    res.json({ message: 'The comment was deleted and the user was notified.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Deletion failed.' });
  }
});

//deletion istekleri
app.get('/api/admin/pending-deletions', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, username, email, deletion_requested_at 
      FROM users 
      WHERE is_deleted = TRUE
      ORDER BY deletion_requested_at ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

{/* USER API'LERİ*/}
// Register endpoint
// --- REGISTER (GÜNCELLENMİŞ & LOG EKLENMİŞ) ---
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // 1. Önce Kullanıcıyı Kontrol Et
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    // Şifreyi her durumda hash'lememiz lazım (Yeni kayıt veya güncelleme için)
    const hashedPassword = await bcrypt.hash(password, 10);
    // Yeni kod üret
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    if (userCheck.rows.length > 0) {
      const existingUser = userCheck.rows[0];

      // DURUM A: Kullanıcı ZATEN DOĞRULANMIŞSA -> Hata ver
      if (existingUser.is_verified) {
        return res.status(400).json({ error: 'This email address is already in use.' });
      }

      // DURUM B: Kullanıcı VAR AMA DOĞRULANMAMIŞSA -> GÜNCELLE (Update)
      // Kullanıcı "Geri" tuşuna basıp tekrar kayıt olmaya çalışıyordur.
      console.log("Unverified account is being tried again, updating:", email);

      await db.query(
        `UPDATE users 
         SET username = $1, password_hash = $2, verification_code = $3, verification_code_expires_at = $4 
         WHERE email = $5`,
        [username, hashedPassword, verificationCode, expiresAt, email]
      );

      // Maili tekrar gönder (Arka planda)
      sendVerificationEmail(email, verificationCode)
        .catch(err => console.error("Mail Error:", err));

      // Frontend'e "Başarılı" dön (201 Created veya 200 OK)
      return res.status(201).json({ 
        message: 'The verification code has been sent again.',
        email: email 
      });
    }

    // DURUM C: Kullanıcı HİÇ YOKSA -> YENİ KAYIT (Insert)
    await db.query(
      `INSERT INTO users (username, email, password_hash, is_verified, verification_code, verification_code_expires_at) 
       VALUES ($1, $2, $3, FALSE, $4, $5)`,
      [username, email, hashedPassword, verificationCode, expiresAt]
    );

    console.log("New entry created. Email sent....");
    sendVerificationEmail(email, verificationCode)
      .catch(err => console.error("Mail Error:", err));

    res.status(201).json({ 
      message: 'Registration successful! Code sent.',
      email: email 
    });

  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

//email verification
app.post('/api/auth/verify', async (req, res) => {
  const { email, code } = req.body;

  try {
    // 1. Kullanıcıyı ve kod bilgilerini çek
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1', 
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'User not found.' });
    }

    const user = result.rows[0];

    // 2. Halihazırda doğrulanmış mı?
    if (user.is_verified) {
      return res.status(400).json({ error: 'This account is already verified.' });
    }

    // 3. Kod doğru mu?
    if (user.verification_code !== code) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    // 4. Süresi dolmuş mu?
    if (new Date() > new Date(user.verification_code_expires_at)) {
      return res.status(400).json({ error: 'The code has expired. Please register again or request a new code.' });
    }

    // 5. Her şey tamamsa: Hesabı doğrula ve kodu temizle
    await db.query(
      `UPDATE users 
       SET is_verified = TRUE, verification_code = NULL, verification_code_expires_at = NULL 
       WHERE id = $1`,
      [user.id]
    );

    res.json({ message: 'Your account has been successfully verified! You can now log in.' });

  } catch (error) {
    console.error('Verify Error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// --- 1. ŞİFRE SIFIRLAMA TALEBİ (Mail Gönder) ---
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    // Kullanıcı var mı?
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length === 0) {
      // Güvenlik gereği "Böyle bir mail yok" demek yerine "Varsa gönderdik" demek daha iyidir 
      // ama şimdilik kullanıcı dostu olması için hata dönelim.
      return res.status(404).json({ error: 'No user was found registered with this email address.' });
    }

    // Kod üret (6 haneli)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 dk geçerli

    // Kodu veritabanına kaydet (Eski kod varsa üzerine yazar)
    await db.query(
      `UPDATE users 
       SET verification_code = $1, verification_code_expires_at = $2 
       WHERE email = $3`,
      [verificationCode, expiresAt, email]
    );

    // Mail Gönder (Fire and Forget - Beklemeden yanıt dön)
    sendVerificationEmail(email, verificationCode) // Mevcut fonksiyonunu kullanıyoruz
      .catch(err => console.error("Forgot Password Mail Error:", err));

    res.json({ message: 'A verification code has been sent to your email address.' });

  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ error: 'Server Error.' });
  }
});

// --- 2. KODU DOĞRULA (Ara Adım) ---
// Kullanıcı kodu girdiğinde, yeni şifre ekranına geçmeden önce bu çalışacak.
app.post('/api/auth/verify-reset-code', async (req, res) => {
  const { email, code } = req.body;

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = result.rows[0];

    // Kod kontrolü
    if (user.verification_code !== code) {
      return res.status(400).json({ error: 'Invalid code.' });
    }

    // Süre kontrolü
    if (new Date() > new Date(user.verification_code_expires_at)) {
      return res.status(400).json({ error: 'The code has expired. Please try again.' });
    }

    res.json({ message: 'The code has been verified.' });

  } catch (error) {
    console.error('Verify Reset Code Error:', error);
    res.status(500).json({ error: 'Server Error.' });
  }
});

// --- 3. YENİ ŞİFREYİ KAYDET ---
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    // Güvenlik İçin: Kodu ve süreyi TEKRAR kontrol ediyoruz.
    // (Biri araya girip direkt bu endpointi çağırmasın diye)
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    
    const user = result.rows[0];

    if (user.verification_code !== code) {
      return res.status(400).json({ error: 'Unauthorized operation. Invalid code.' });
    }
    if (new Date() > new Date(user.verification_code_expires_at)) {
      return res.status(400).json({ error: 'The time is up.' });
    }

    // Yeni şifreyi hashle
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Şifreyi güncelle ve kodu temizle (Tekrar kullanılamasın)
    await db.query(
      `UPDATE users 
       SET password_hash = $1, verification_code = NULL, verification_code_expires_at = NULL 
       WHERE email = $2`,
      [hashedPassword, email]
    );

    res.json({ message: 'Your password has been successfully changed. You can log in now.' });

  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Login endpoint
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        if (user.is_deleted) {
          // İsteğe bağlı: Kalan günü hesaplayıp mesajda gösterebilirsin
          return res.status(403).json({ 
          error: 'This account is in the process of being deleted. Access has been blocked.' 
          });
        }

        if (user.role === 'banned') {
            return res.status(403).json({ error: 'Your account has been banned.' });
        }

        if (!user.is_verified) {
          return res.status(403).json({ error: 'Your account has not been verified yet. Please try registering again to receive a new code.' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Incorrect password' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login Successful',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                profile_picture: user.profile_picture,
                role: user.role
            }
        });

    } catch (err) {
        console.error("Login Hatası:", err); // Hatayı terminale yazdırır
        res.status(500).json({ error: 'Server Error: ' + err.message });
    }
});

// Get recipes
app.get('/api/recipes', (req, res) => {
  res.json(recipes);
});

//profil resmi yükleme
app.post('/api/profile/upload-photo', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please select an image.' });
    }

    // Dosya başarıyla yüklendi, şimdi yolunu veritabanına kaydedelim
    // Windows kullanıyorsan ters slash (\) sorun olabilir, düzelterek kaydedelim.
    // Kaydedilecek format: 'uploads/dosya_adi.jpg'
    const profilePicturePath = req.file.path.replace(/\\/g, "/"); 

    // Veritabanını güncelle
    await db.query(
      'UPDATE users SET profile_picture = $1 WHERE id = $2',
      [profilePicturePath, req.user.id]
    );

    res.json({ 
      message: 'Profile photo updated.', 
      filePath: profilePicturePath 
    });

  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});


//kullanıcı bilgilerini değiştirme
app.patch('/api/profile', auth, async (req, res) => {
  //req'den gelen kullanıcı
  const userId = req.user.id;
  const { username, email } = req.body;

  try {
    //email kontrol kısmı
    const emailCheck = await db.query('SELECT * FROM users WHERE email = $1 AND id != $2', [email, userId]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'This email is already used.' });
    }

    //güncelle
    const result = await db.query(
      'UPDATE users SET username = $1, email = $2 WHERE id = $3 RETURNING id, username, email',
      [username, email, userId]
    );

    const updatedUser = result.rows[0];
    res.json({ message: 'Profile updated succesfully.', user: updatedUser });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/profile/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.user; //authdan kullanıcıyı al

  try {
    //mevcut şifrenin doğruluğunu kontrol et
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Your current password is incorrect.' });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    //veritabanını güncelle
    await db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newHashedPassword, user.id]
    );

    res.json({ message: 'Your password has been successfully updated.' });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//kullanıcının hesabını silmesi
app.delete('/api/users/delete', auth, async (req, res) => {
  const userId = req.user.id;
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // 1. ADIM: Standart (Onaylanmamış) tarifleri HEMEN sil
    await client.query(
      `DELETE FROM recipes WHERE created_by = $1 AND is_verified = FALSE`,
      [userId]
    );

    // 2. ADIM: Kullanıcıyı "Silinecek" olarak işaretle (Soft Delete)
    // Hesabı ve Verified tarifleri şimdilik tutuyoruz.
    await client.query(
      `UPDATE users 
       SET is_deleted = TRUE, deletion_requested_at = NOW() 
       WHERE id = $1`,
      [userId]
    );

    await client.query('COMMIT');
    
    res.json({ 
      message: 'Your account deletion request has been received. Your standard recipes have been deleted. Your verified recipes will not be deleted. Your account will be permanently deleted in 30 days.' 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete Account Request Error:', error);
    res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
});

//kullanıcının MyStock add kısmında ekleme yaparken istediği ingredient'ı bulması
app.get('/api/ingredients/search', auth, async (req, res) => {
  const { query } = req.query; // query'i al

  //min 2 harf giriyor
  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'Please enter at least 2 letters.' });
  }

  try {
    // databasede ara
    const result = await db.query(
      'SELECT id, name, unit, unit_category, calories_per_unit FROM ingredients WHERE name ILIKE $1 AND is_staple = FALSE LIMIT 10',
      [`%${query}%`]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

//Add recipe için staple dahil search
app.get('/api/ingredients/search2', auth, async (req, res) => {
  const { query } = req.query; // query'i al

  //min 2 harf giriyor
  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'Please enter at least 2 letters.' });
  }

  try {
    // databasede ara
    const result = await db.query(
      'SELECT id, name, unit, unit_category, calories_per_unit FROM ingredients WHERE name ILIKE $1 LIMIT 10',
      [`%${query}%`]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

//MyStock'a ürün ekleme
app.post('/api/refrigerator/add', auth, async (req, res) => {
  const userId = req.user.id;
  const { ingredientId, quantity } = req.body; 

  try {
    let fridgeResult = await db.query('SELECT id FROM virtual_refrigerator WHERE user_id = $1', [userId]);
    let fridgeId;

    if (fridgeResult.rows.length === 0) {
      const newFridge = await db.query(
        'INSERT INTO virtual_refrigerator (user_id) VALUES ($1) RETURNING id',
        [userId]
      );
      fridgeId = newFridge.rows[0].id;
    } else {
      fridgeId = fridgeResult.rows[0].id;
    }

    //dolapta aynı malzemeden var mı
    const checkItem = await db.query(
      'SELECT id, quantity FROM refrigerator_items WHERE virtual_refrigerator_id = $1 AND ingredient_id = $2',
      [fridgeId, ingredientId]
    );

    if (checkItem.rows.length > 0) {
      await db.query(
        'UPDATE refrigerator_items SET quantity = quantity + $1, added_at = CURRENT_TIMESTAMP WHERE id = $2',
        [quantity, checkItem.rows[0].id]
      );
      res.status(200).json({ message: 'Ingredient amount updated.' });

    } else {
      await db.query(
        'INSERT INTO refrigerator_items (virtual_refrigerator_id, ingredient_id, quantity) VALUES ($1, $2, $3)',
        [fridgeId, ingredientId, quantity]
      );
      res.status(201).json({ message: 'New Ingredient added.' });
    }

  } catch (error) {
    console.error('Stock add error', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//MyStock listesini çekme
app.get('/api/refrigerator', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    //kullancının mystock kısmını çek
    const result = await db.query(
      `SELECT 
        ri.id, 
        i.name, 
        ri.quantity, 
        i.unit,           
        i.unit_category, 
        ri.added_at 
       FROM refrigerator_items ri
       JOIN virtual_refrigerator vr ON ri.virtual_refrigerator_id = vr.id
       JOIN ingredients i ON ri.ingredient_id = i.id
       WHERE vr.user_id = $1
       ORDER BY ri.added_at DESC`, 
      [userId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('MyStock listing error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

//ürün silme
app.delete('/api/refrigerator/delete/:itemId', auth, async (req, res) => {
  const { itemId } = req.params;

  try {
    await db.query('DELETE FROM refrigerator_items WHERE id = $1', [itemId]);
    
    res.json({ message: 'Ingredient deleted succesfully!' });

  } catch (error) {
    console.error('Deletion Error', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

//ürünü güncelleme
app.patch('/api/refrigerator/update/:itemId', auth, async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body; 

  try {
    await db.query(
      'UPDATE refrigerator_items SET quantity = $1 WHERE id = $2',
      [quantity, itemId]
    );
    
    res.json({ message: 'Ingredient Updated' });

  } catch (error) {
    console.error('Editing Error', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//mystocktan matching
app.get('/api/recipes/match', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const query = `
      WITH UserInventory AS (
        SELECT ingredient_id, quantity
        FROM refrigerator_items ri
        JOIN virtual_refrigerator vr ON ri.virtual_refrigerator_id = vr.id
        WHERE vr.user_id = $1
      ),
      RecipeDetails AS (
        SELECT 
          r.id AS recipe_id,
          i.name AS ingredient_name,
          i.unit AS unit,
          ri.quantity AS amount_needed,
          COALESCE(ui.quantity, 0) AS amount_have,
          i.is_staple
        FROM recipes r
        JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        JOIN ingredients i ON ri.ingredient_id = i.id
        LEFT JOIN UserInventory ui ON ri.ingredient_id = ui.ingredient_id
      ),
      CalculatedScores AS (
        SELECT 
          recipe_id,
          ingredient_name,
          unit,
          amount_needed,
          amount_have,
          is_staple,
          -- Puanlama (malzeme staple değilse hesapla)
          CASE 
            WHEN is_staple = TRUE THEN 0
            WHEN amount_have = 0 THEN 0
            WHEN (amount_have / amount_needed) >= 1 THEN 1.0
            ELSE (amount_have / amount_needed)
          END AS score,
          -- Eksik miktar hesabı
          GREATEST(amount_needed - amount_have, 0) AS missing_amount
        FROM RecipeDetails
      )
      SELECT 
        r.id,
        r.title,
        r.description,
        r.instructions,
        r.image_url,
        r.prep_time,
        r.calories,
        r.serving,
        r.category,
        r.is_verified,
        COALESCE(u.username, 'Admin') as username,
        (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE recipe_id = r.id) as average_rating,

        -- Eşleşme oranı hesabı
        ROUND(
          (SUM(cs.score) FILTER (WHERE cs.is_staple = FALSE) / 
           NULLIF(COUNT(*) FILTER (WHERE cs.is_staple = FALSE), 0)) * 100
        ) AS match_percentage,

        (
          SELECT json_agg(json_build_object(
            'name', cs_sub.ingredient_name,
            'missing_amount', cs_sub.missing_amount,
            'unit', cs_sub.unit
          ))
          FROM CalculatedScores cs_sub
          WHERE cs_sub.recipe_id = r.id AND cs_sub.missing_amount > 0 AND cs_sub.is_staple = FALSE
        ) AS missing_ingredients

      FROM recipes r
      JOIN CalculatedScores cs ON r.id = cs.recipe_id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.is_verified = TRUE
      GROUP BY r.id , u.username
      HAVING ROUND(
          (SUM(cs.score) FILTER (WHERE cs.is_staple = FALSE) / 
           NULLIF(COUNT(*) FILTER (WHERE cs.is_staple = FALSE), 0)) * 100
        ) >= 30
      ORDER BY match_percentage DESC;
    `;

    const result = await db.query(query, [userId]);
    res.json(result.rows);

  } catch (error) {
    console.error('Smart Matching Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

//manuelden matching algoritması
app.post('/api/recipes/match-manual', auth, async (req, res) => {
  const { selectedIds } = req.body; // Örn: [1, 5, 23]

  if (!selectedIds || selectedIds.length === 0) {
    return res.status(400).json({ error: 'Plase choose at least one ingredient' });
  }

  try {
    const query = `
      WITH SelectedIngredients AS (
        -- fronttan gelen id'leri listeye çevir
        SELECT unnest($1::int[]) AS ingredient_id
      ),
      RecipeStats AS (
        -- Her tarifin önemli malzeme sayısı (staple olmayan)
        SELECT 
          r.id AS recipe_id,
          COUNT(ri.ingredient_id) AS total_required
        FROM recipes r
        JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE i.is_staple = FALSE 
        GROUP BY r.id
      ),
      Matches AS (
        -- matching
        SELECT 
          r.id AS recipe_id,
          COUNT(ri.ingredient_id) AS matching_count
        FROM recipes r
        JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE i.is_staple = FALSE 
          AND ri.ingredient_id IN (SELECT ingredient_id FROM SelectedIngredients)
        GROUP BY r.id
      )
      SELECT 
        r.id,
        r.title,
        r.description,
        r.instructions,
        r.image_url,
        r.prep_time,
        r.calories,
        r.serving,
        r.category,
        r.is_verified,
        COALESCE(u.username, 'Admin') as username,
        (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE recipe_id = r.id) as average_rating,
      
        
        -- Eşleşme istatistikleri
        COALESCE(rs.total_required, 0) AS total_ingredients,
        COALESCE(m.matching_count, 0) AS have_ingredients,
        
        ROUND(
          (COALESCE(m.matching_count, 0)::decimal / NULLIF(rs.total_required, 0)) * 100
        ) AS match_percentage,

        -- Eksik malzemelerin listesi
        (
          SELECT json_agg(json_build_object(
            'name', i.name,
            'missing_amount', ri_sub.quantity, -- Manuel modda direkt gereken miktarı gösteriyoruz
            'unit', ri_sub.unit_type
          ))
          FROM recipe_ingredients ri_sub
          JOIN ingredients i ON ri_sub.ingredient_id = i.id
          WHERE ri_sub.recipe_id = r.id 
            AND i.is_staple = FALSE
            AND ri_sub.ingredient_id NOT IN (SELECT ingredient_id FROM SelectedIngredients)
        ) AS missing_ingredients

      FROM recipes r
      JOIN RecipeStats rs ON r.id = rs.recipe_id
      JOIN Matches m ON r.id = m.recipe_id -- Sadece eşleşmesi olanları getir (INNER JOIN)
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.is_verified = TRUE
      
      ORDER BY 
        m.matching_count DESC, 
        match_percentage DESC;
    `;

    const result = await db.query(query, [selectedIds]);
    res.json(result.rows);

  } catch (error) {
    console.error('Manuel matching error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

//favori eşleşmeleri
app.post('/api/favorites/toggle', auth, async (req, res) => {
  const userId = req.user.id;
  const { recipeId } = req.body;

  try {
    // Bu tarif favorilerde var mı diye bak
    const check = await db.query(
      'SELECT * FROM favorites WHERE user_id = $1 AND recipe_id = $2',
      [userId, recipeId]
    );

    if (check.rows.length > 0) {
      await db.query(
        'DELETE FROM favorites WHERE user_id = $1 AND recipe_id = $2',
        [userId, recipeId]
      );
      res.json({ message: 'Removed from Favorites.', isFavorite: false });
    } else {
      await db.query(
        'INSERT INTO favorites (user_id, recipe_id) VALUES ($1, $2)',
        [userId, recipeId]
      );
      res.json({ message: 'Added to Favorites.', isFavorite: true });
    }

  } catch (error) {
    console.error('Favorites Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

//favoriler
app.get('/api/favorites', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const query = `
      WITH UserInventory AS (
        SELECT ingredient_id, quantity
        FROM refrigerator_items ri
        JOIN virtual_refrigerator vr ON ri.virtual_refrigerator_id = vr.id
        WHERE vr.user_id = $1
      ),
      RecipeStats AS (
        SELECT 
          r.id AS recipe_id,
          COUNT(ri.ingredient_id) AS total_required
        FROM recipes r
        JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE i.is_staple = FALSE 
        GROUP BY r.id
      ),
      Matches AS (
        SELECT 
          r.id AS recipe_id,
          COUNT(ri.ingredient_id) AS matching_count
        FROM recipes r
        JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE i.is_staple = FALSE 
          AND ri.ingredient_id IN (SELECT ingredient_id FROM UserInventory)
        GROUP BY r.id
      )
      SELECT 
        r.id,
        r.title,
        r.description,
        r.image_url,
        r.prep_time,
        r.calories,
        r.serving,
        r.instructions,
        r.category,
        r.is_verified,
        f.added_at,
        COALESCE(u.username, 'Admin') as username,
        (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE recipe_id = r.id) as average_rating,
        
        -- Eşleşme oranı
        COALESCE(ROUND(
          (COALESCE(m.matching_count, 0)::decimal / NULLIF(rs.total_required, 0)) * 100
        ), 0) AS match_percentage,

        (
          SELECT json_agg(json_build_object(
            'name', i.name,
            'missing_amount', (ri_sub.quantity - COALESCE(ui.quantity, 0)),
            'unit', ri_sub.unit_type
          ))
          FROM recipe_ingredients ri_sub
          JOIN ingredients i ON ri_sub.ingredient_id = i.id
          LEFT JOIN UserInventory ui ON ri_sub.ingredient_id = ui.ingredient_id
          WHERE ri_sub.recipe_id = r.id 
            AND (ri_sub.quantity - COALESCE(ui.quantity, 0)) > 0 
            AND i.is_staple = FALSE
        ) AS missing_ingredients

      FROM favorites f
      JOIN recipes r ON f.recipe_id = r.id
      LEFT JOIN RecipeStats rs ON r.id = rs.recipe_id
      LEFT JOIN Matches m ON r.id = m.recipe_id
      LEFT JOIN users u ON r.created_by = u.id

      WHERE f.user_id = $1
      
      ORDER BY f.added_at DESC;
    `;

    const result = await db.query(query, [userId]);
    res.json(result.rows);

  } catch (error) {
    console.error('Favorite Listing error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//tarifle kullanıcı stoğu eşleştirme
app.get('/api/recipes/:id/ingredients', auth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id; 

  try {
    const result = await db.query(
      `SELECT 
         i.name, 
         ri.quantity, 
         ri.unit_type,
         i.is_staple,
         -- Kullanıcının stoğundaki tüm eşleşenleri TOPLA (SUM)
         -- Eğer yoksa 0 döndür
         COALESCE(SUM(rf.quantity), 0) AS user_stock_quantity
       FROM recipe_ingredients ri
       JOIN ingredients i ON ri.ingredient_id = i.id
       
       -- KRİTİK DÜZELTME BURADA:
       -- Önce kullanıcının sanal dolabını bul, SADECE oradaki itemlarla eşleştir.
       -- Bu sayede başkasının stoğu veya hayalet stoklar karışmaz.
       LEFT JOIN refrigerator_items rf ON rf.ingredient_id = i.id 
            AND rf.virtual_refrigerator_id IN (
                SELECT id FROM virtual_refrigerator WHERE user_id = $2
            )
            
       WHERE ri.recipe_id = $1
       
       -- GRUPLAMA:
       -- Aynı malzemeden birden fazla satır oluşmasını engeller,
       -- stokları tek satırda toplar.
       GROUP BY i.id, i.name, ri.quantity, ri.unit_type, i.is_staple`,
      [id, userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Recipe detail error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

//I cooked butonu ve stoğu güncelleme (Geçmişe ekle + Malzemeleri stokta düzenle + 0 olanları sil)
app.post('/api/recipes/cook', auth, async (req, res) => {
  const userId = req.user.id;
  const { recipeId, multiplier } = req.body; 

  if (!recipeId || !multiplier) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN'); 

    // 1. Malzemeleri çek
    const recipeIngredients = await client.query(
      `SELECT i.id, i.name, ri.unit_type, i.is_staple, ri.quantity as base_quantity
       FROM recipe_ingredients ri
       JOIN ingredients i ON ri.ingredient_id = i.id
       WHERE ri.recipe_id = $1`,
      [recipeId]
    );

    // 2. Stoğu çek
    const userStock = await client.query(
      `SELECT ri.id as row_id, ri.ingredient_id, ri.quantity, i.unit as unit_type
       FROM refrigerator_items ri
       JOIN virtual_refrigerator vr ON ri.virtual_refrigerator_id = vr.id
       JOIN ingredients i ON ri.ingredient_id = i.id
       WHERE vr.user_id = $1 AND ri.ingredient_id = ANY($2::int[])`,
      [userId, recipeIngredients.rows.map(r => r.id)]
    );

    // 3. Hesaplama ve stokğu ayarlama
    for (const rItem of recipeIngredients.rows) {
      
      if (rItem.is_staple) continue;

      const uItem = userStock.rows.find(u => u.ingredient_id === rItem.id);
      
      if (!uItem || uItem.unit_type !== rItem.unit_type) continue;

      let neededAmount = rItem.base_quantity * multiplier;

      if (rItem.unit_type === 'qty') {
        neededAmount = Math.ceil(neededAmount);
      }

      let newQuantity = uItem.quantity - neededAmount;

      //eğer 0'a düşerse sil değilse güncelle
      if (newQuantity <= 0) {
        await client.query(
          'DELETE FROM refrigerator_items WHERE id = $1',
          [uItem.row_id]
        );
      } else {
        await client.query(
          'UPDATE refrigerator_items SET quantity = $1 WHERE id = $2',
          [newQuantity, uItem.row_id]
        );
      }
    }

    // 4. Geçmişe ekle
    await client.query(
      'INSERT INTO meal_history (user_id, recipe_id) VALUES ($1, $2)',
      [userId, recipeId]
    );

    await client.query('COMMIT'); 
    res.json({ message: 'Cooking recorded and inventory updated.' });

  } catch (error) {
    await client.query('ROLLBACK'); 
    console.error('Pişirme hatası:', error);
    res.status(500).json({ error: 'Server error during cooking process.' });
  } finally {
    client.release();
  }
});

//meal history
app.get('/api/history', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await db.query(
      `SELECT 
         mh.id AS history_id,
         mh.cooked_at,
         
         r.id, -- Tarif ID
         r.title, 
         r.image_url, 
         r.calories,
         r.prep_time,
         r.instructions,
         r.serving,
         r.category,
         r.description,
         r.is_verified,
         COALESCE(u.username, 'Admin') as username,
         
         -- KULLANICININ VERDİĞİ PUAN VE YORUM (Varsa)
         rv.rating AS my_rating,
         rv.comment AS my_comment,

         (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE recipe_id = r.id) as average_rating
         
       FROM meal_history mh
       JOIN recipes r ON mh.recipe_id = r.id
       LEFT JOIN reviews rv ON r.id = rv.recipe_id AND rv.user_id = $1
       LEFT JOIN users u ON r.created_by = u.id
       
       WHERE mh.user_id = $1
       ORDER BY mh.cooked_at DESC`,
      [userId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Past listing error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Recommendation Sistemi
app.get('/api/recipes/recommendations', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Geçmişi varmı kontrol et
    const historyCheck = await db.query(
      'SELECT COUNT(*) FROM meal_history WHERE user_id = $1',
      [userId]
    );
    const historyCount = parseInt(historyCheck.rows[0].count);

    if (historyCount === 0) {
      // Eğer Cold Startsa
      const randomRecipes = await db.query(`
        SELECT r.id, r.title, r.instructions, r.image_url, r.prep_time, r.calories, r.serving , r.category, r.is_verified, (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE recipe_id = r.id) as average_rating 
        FROM recipes r
        WHERE r.is_verified = TRUE
        ORDER BY RANDOM() 
        LIMIT 10
      `);
      return res.json({ type: 'random', data: randomRecipes.rows });
    }

    // Geçmişi varsa
    const recommendationQuery = `
      WITH LastHistory AS (
        SELECT recipe_id 
        FROM meal_history 
        WHERE user_id = $1 
        ORDER BY cooked_at DESC 
        LIMIT 20
      ),
      IngredientScores AS (
        SELECT 
          ri.ingredient_id, 
          COUNT(*) as freq_score 
        FROM recipe_ingredients ri
        JOIN LastHistory lh ON ri.recipe_id = lh.recipe_id
        JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE i.is_staple = FALSE
        GROUP BY ri.ingredient_id
      ),
      CandidateRecipes AS (
        SELECT 
          r.id,
          SUM(ibs.freq_score) as total_score, 
          COUNT(ibs.ingredient_id) as hit_count 
        FROM recipes r
        JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        JOIN IngredientScores ibs ON ri.ingredient_id = ibs.ingredient_id
        WHERE r.id NOT IN (SELECT recipe_id FROM LastHistory) AND r.is_verified = TRUE
        GROUP BY r.id
      )
      -- Sonuçları sırala
      SELECT 
        r.id, r.title, r.description, r.instructions, r.image_url, r.prep_time, r.calories, r.serving,r.category, r.is_verified, (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE recipe_id = r.id) as average_rating,
        cr.total_score,
        cr.hit_count
      FROM recipes r
      JOIN CandidateRecipes cr ON r.id = cr.id
      ORDER BY 
        cr.total_score DESC, 
        cr.hit_count DESC,   
        RANDOM()            
      LIMIT 15;
    `;

    const recommendations = await db.query(recommendationQuery, [userId]);
    res.json({ type: 'algorithm', data: recommendations.rows });

  } catch (error) {
    console.error('Recommendation system error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Puan ver veya güncelle
app.post('/api/reviews', auth, async (req, res) => {
  const userId = req.user.id;
  const { recipeId, rating, comment } = req.body;
  

  try {
    const query = `
      INSERT INTO reviews (user_id, recipe_id, rating, comment, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, recipe_id) 
      DO UPDATE SET 
        rating = EXCLUDED.rating,
        comment = EXCLUDED.comment,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    
    const result = await db.query(query, [userId, recipeId, rating, comment]);
    res.json(result.rows[0]);

    const recipeOwnerQuery = await db.query('SELECT created_by, title FROM recipes WHERE id = $1', [recipeId]);
    const recipeOwnerId = recipeOwnerQuery.rows[0].created_by;
    const recipeTitle = recipeOwnerQuery.rows[0].title;

    if (recipeOwnerId !== req.user.id) {
        await sendNotification(
            recipeOwnerId, 
            "New Comment 💬", 
            `A new review has been posted for your "${recipeTitle}" recipe.`, 
            "info"
        );
    }

  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Tarifin puan istatistikleri
app.get('/api/recipes/:id/stats', auth, async (req, res) => {
  const recipeId = req.params.id;
  const userId = req.user.id;

  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_ratings,
        COUNT(NULLIF(comment, '')) as total_comments,
        
        COALESCE(AVG(rating), 0) as average_rating
      FROM reviews
      WHERE recipe_id = $1
    `;
    const statsResult = await db.query(statsQuery, [recipeId]);

    const userReviewQuery = `
      SELECT rating, comment 
      FROM reviews 
      WHERE recipe_id = $1 AND user_id = $2
    `;
    const userReviewResult = await db.query(userReviewQuery, [recipeId, userId]);

    res.json({
      stats: statsResult.rows[0],
      userReview: userReviewResult.rows[0] || null
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Tarifin yorumları
app.get('/api/recipes/:id/reviews', auth, async (req, res) => {
  const recipeId = req.params.id;

  try {
    const query = `
      SELECT 
        r.id, 
        r.rating, 
        r.comment, 
        r.created_at, 
        u.username  
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.recipe_id = $1
      ORDER BY r.created_at DESC 
      LIMIT 20 
    `;
    
    const result = await db.query(query, [recipeId]);
    res.json(result.rows);

  } catch (error) {
    console.error('Reviews list error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//profile ekranına reviewları getirmek
app.get('/api/user/reviews', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const query = `
      SELECT 
        rv.id, -- Review ID
        rv.rating, 
        rv.comment, 
        rv.updated_at,
        r.id AS recipe_id, -- Modal için lazım
        r.title AS recipe_title, 
        r.image_url
      FROM reviews rv
      JOIN recipes r ON rv.recipe_id = r.id
      WHERE rv.user_id = $1
      ORDER BY rv.updated_at DESC -- En son güncellenen en üstte
    `;
    
    const result = await db.query(query, [userId]);
    res.json(result.rows);

  } catch (error) {
    console.error('User reviews error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//tarifi myreviews kısmı için getirme
app.get('/api/recipes/details/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      'SELECT * FROM recipes WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Recipe details error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//yeni recipe ekleme
app.post('/api/recipes', auth, async (req, res) => {
  const userId = req.user.id;
  const { 
    title, description, instructions, prepTime, calories, imageUrl, serving, ingredients 
  } = req.body;

  if (!title || !ingredients || ingredients.length === 0) {
    return res.status(400).json({ error: 'A title and at least one ingredient are required.' });
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // 1. tarifi 'pending' olarak recipe tablosuna ekle
    const recipeResult = await client.query(
      `INSERT INTO recipes (
         title, description, instructions, prep_time, calories, image_url, serving, 
         created_by, status, is_verified
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', false)
       RETURNING id`,
      [title, description, instructions, prepTime, calories, imageUrl, serving, userId]
    );
    const newRecipeId = recipeResult.rows[0].id;

    // 2. Malzemeleri bağla
    for (const item of ingredients) {
      
      await client.query(
        `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit_type)
         VALUES ($1, $2, $3, $4)`,
        [newRecipeId, item.id, item.quantity, item.unit]
      );
    }

    await client.query('COMMIT'); 
    res.status(201).json({ 
      message: 'The recipe has been successfully submitted! It will be published after admin approval.',
      recipeId: newRecipeId 
    });

  } catch (error) {
    await client.query('ROLLBACK'); 
    console.error('Recipe addition error:', error);
    
    // olmayan malzeme idsi gelirse
    if (error.code === '23503') { 
       return res.status(400).json({ error: 'invalid ingredient selection has been made.' });
    }
    
    res.status(500).json({ error: 'Server error, recipe could not be added.' });
  } finally {
    client.release();
  }
});

//kullanıcının kendi tariflerini getir
app.get('/my-recipes', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        r.*, 
        COALESCE(u.username, 'Admin') as username,
        COALESCE(AVG(rv.rating), 0)::NUMERIC(10,1) as average_rating,
        (
          -- Bu alt sorgu, tarifin malzemelerini JSON listesi olarak getirir
          SELECT json_agg(
            json_build_object(
              'id', i.id,
              'name', i.name,
              'quantity', ri.quantity,
              'unit', ri.unit_type
            )
          )
          FROM recipe_ingredients ri
          JOIN ingredients i ON ri.ingredient_id = i.id
          WHERE ri.recipe_id = r.id
        ) as ingredients
      FROM recipes r
      LEFT JOIN reviews rv ON r.id = rv.recipe_id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.created_by = $1
      GROUP BY r.id , u.username
      ORDER BY r.created_at DESC
    `, [req.user.id]);

    // Verileri formatla
    const recipes = result.rows.map(recipe => ({
      ...recipe,
      average_rating: parseFloat(recipe.average_rating),
      // Eğer hiç malzeme yoksa null gelir, onu boş dizi [] yapalım
      ingredients: recipe.ingredients || []
    }));

    res.json(recipes);
  } catch (err) {
    console.error('My recipes SQL Error:', err.message); 
    res.status(500).json({ error: 'Recipes could not be retrieved.' });
  }
});

app.delete('/api/recipes/:id', auth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // 1. Önce tarifi kontrol et (Sahibi mi? Onaylı mı?)
    const checkQuery = await db.query(
      'SELECT * FROM recipes WHERE id = $1 AND created_by = $2',
      [id, userId]
    );

    if (checkQuery.rows.length === 0) {
      return res.status(404).json({ error: 'No recipe found or you do not have permission for this.' });
    }

    const recipe = checkQuery.rows[0];

    // İSTEK: Onaylanmış (is_verified = true) tarifler silinemez
    if (recipe.is_verified) {
      return res.status(403).json({ error: 'Verified recipes cannot be deleted. Please contact the admin.' });
    }

    // 2. Silme İşlemi (Transaction ile güvenli silme)
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Önce ilişkili tabloları temizle (ON DELETE CASCADE varsa gerekmez ama garanti olsun)
      await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]);
      await client.query('DELETE FROM reviews WHERE recipe_id = $1', [id]);
      
      // Tarifi sil
      await client.query('DELETE FROM recipes WHERE id = $1', [id]);
      
      await client.query('COMMIT');
      res.json({ message: 'The recipe has been successfully deleted.' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('Deletion error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});


//rejected tarifi düzenle ve tekrar gönder
app.put('/api/recipes/:id', auth, async (req, res) => {
  const recipeId = req.params.id;
  const userId = req.user.id;
  
  // Frontend'den gelen veriler (POST kopyasıyla aynı yapıda)
  const { 
    title, description, instructions, prepTime, calories, imageUrl, serving, ingredients 
  } = req.body;

  // Temel validasyon
  if (!title || !ingredients || ingredients.length === 0) {
    return res.status(400).json({ error: 'A title and at least one material are required.' });
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');
    
    const updateResult = await client.query(
      `UPDATE recipes 
       SET title = $1, 
           description = $2, 
           instructions = $3, 
           prep_time = $4, 
           calories = $5, 
           image_url = COALESCE($6, image_url),
           serving = $7,
           status = 'pending' 
       WHERE id = $8 AND created_by = $9
       RETURNING id`,
      [title, description, instructions, prepTime, calories, imageUrl, serving, recipeId, userId]
    );

    // Eğer güncelleme sonucunda satır dönmediyse; ya tarif yok ya da sahibi bu kullanıcı değil.
    if (updateResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You do not have permission to edit this recipe or the recipe could not be found.' });
    }

    // 2. ADIM: Eski malzemeleri temizle
    await client.query(
      `DELETE FROM recipe_ingredients WHERE recipe_id = $1`,
      [recipeId]
    );

    // 3. ADIM: Yeni malzemeleri ekle (POST kodundaki döngünün aynısı)
    for (const item of ingredients) {
      // item.id frontend'den gelmeli. Eğer listeden seçilen bir malzeme ise id'si vardır.
      await client.query(
        `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit_type)
         VALUES ($1, $2, $3, $4)`,
        [recipeId, item.id, item.quantity, item.unit] 
        
      );
    }

    await client.query('COMMIT'); // İşlemi onayla

    res.json({ 
      message: 'The recipe has been successfully updated and resubmitted for approval.',
      recipeId: recipeId
    });

  } catch (error) {
    await client.query('ROLLBACK'); // Hata durumunda her şeyi geri al
    console.error('Recipe update error:', error);

    if (error.code === '23503') { 
       return res.status(400).json({ error: 'An invalid ingredient selection has been made.' });
    }

    res.status(500).json({ error: 'Server error, recipe could not be updated.' });
  } finally {
    client.release(); // Bağlantıyı havuza iade et
  }
});

// Malzeme Önerisi Kaydetme Endpoint'i
app.post('/api/ingredients/suggest', auth, async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Please enter a ingredient name.' });
  }

  try {
    await db.query(
      'INSERT INTO ingredient_suggestions (user_id, ingredient_name) VALUES ($1, $2)',
      [userId, name.trim()]
    );
    res.json({ message: 'Your suggestion has been successfully received. Thank you!' });
  } catch (err) {
    console.error('Suggestion error:', err.message);
    res.status(500).json({ error: 'A server error occurred.' });
  }
});

{/* Bildirim API'leri*/}
//bildirimi getir
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Notifications Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

//okunmamış bildirim
app.get('/api/notifications/unread-count', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('Notification Count Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

//okundu olarak işaretle
app.put('/api/notifications/:id/read', auth, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Mark Read Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

//tümünü okundu olarak işaretlendi
app.put('/api/notifications/read-all', auth, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ message: 'All marked as read' });
  } catch (err) {
    console.error('Read All Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

{/*Social API'leri*/}
//haftanın trendleri (son 7 gün)
app.get('/api/recipes/social/trends', auth, async (req, res) => {
  // Frontend'den limit gelirse onu kullan, gelmezse 50 kullan
  const limit = req.query.limit || 20; 

  try {
    const query = `
      SELECT 
        r.*, 
        u.username,
        COUNT(rv.id) as review_count,
        COALESCE(AVG(rv.rating), 0) as raw_rating,
        EXISTS(SELECT 1 FROM favorites WHERE user_id = $1 AND recipe_id = r.id) as is_favorited,
        (
          (COUNT(rv.id) / (COUNT(rv.id) + 2.0)) * COALESCE(AVG(rv.rating), 0) +
          (2.0 / (COUNT(rv.id) + 2.0)) * 3.5
        ) as weighted_score
      FROM recipes r
      LEFT JOIN reviews rv ON r.id = rv.recipe_id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.status = 'approved'
      AND (rv.created_at >= NOW() - INTERVAL '14 days' OR r.created_at >= NOW() - INTERVAL '14 days')
      GROUP BY r.id, u.username
      HAVING COUNT(rv.id) >= 1
      ORDER BY weighted_score DESC
      LIMIT $2; -- <-- DEĞİŞİKLİK BURADA ($2 oldu)
    `;
    
    // Parametre dizisine limiti ekledik: [req.user.id, limit]
    const result = await db.query(query, [req.user.id, limit]);
    res.json(result.rows);
  } catch (err) {
    console.error('Trends Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

//son eklenen tarifler
app.get('/api/recipes/social/newest', auth, async (req, res) => {
  const limit = req.query.limit || 20;

  try {
    const query = `
      SELECT 
        r.*,
        u.username,
        (SELECT COALESCE(AVG(rating), 0)::NUMERIC(10,1) FROM reviews WHERE recipe_id = r.id) as average_rating,
        EXISTS(SELECT 1 FROM favorites WHERE user_id = $1 AND recipe_id = r.id) as is_favorited
      FROM recipes r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.status = 'approved'
      ORDER BY r.created_at DESC
      LIMIT $2; -- <-- DEĞİŞİKLİK BURADA ($2 oldu)
    `;
    const result = await db.query(query, [req.user.id, limit]);
    res.json(result.rows);
  } catch (err) {
    console.error('Newest Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

//random akışı
app.get('/api/recipes/social/random', auth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  
  // Seed'i string olarak alıyoruz
  const seed = req.query.seed || '0.5'; 

  try {
    const query = `
      SELECT 
        r.*, 
        u.username,
        (SELECT COALESCE(AVG(rating), 0)::NUMERIC(10,1) FROM reviews WHERE recipe_id = r.id) as average_rating,
        EXISTS(SELECT 1 FROM favorites WHERE user_id = $1 AND recipe_id = r.id) as is_favorited
      FROM recipes r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.status = 'approved'
      -- DÜZELTME: MD5 yerine HASHTEXT kullanıyoruz.
      -- ID ve Seed'i birleştirip hashliyoruz. Bu her zaman aynı sırayı verir.
      ORDER BY HASHTEXT(r.id::text || $4::text) 
      LIMIT $2 OFFSET $3;
    `;
    
    // Parametreler: [User ID, Limit, Offset, Seed]
    const result = await db.query(query, [req.user.id, limit, offset, seed]);
    res.json(result.rows);
  } catch (err) {
    console.error('Random Feed Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

//search bar filtresi
app.get('/api/recipes/social/search', auth, async (req, res) => {
  const { q, category, mode, sort } = req.query; // 'sort' parametresi eklendi
  const userId = req.user.id; 

  try {
    let queryText = `
      SELECT 
        r.*, 
        u.username,
        (SELECT COALESCE(AVG(rating), 0)::NUMERIC(10,1) FROM reviews WHERE recipe_id = r.id) as average_rating,
        EXISTS(SELECT 1 FROM favorites WHERE user_id = $1 AND recipe_id = r.id) as is_favorited
      FROM recipes r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.status = 'approved'
    `;

    const values = [userId]; 
    let paramIndex = 2; 

    // Verified Filtresi
    if (mode === 'standard') {
      queryText += ` AND r.is_verified = FALSE`;
    } 

    // Kelime Araması
    if (q) {
      queryText += ` AND (r.title ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex})`;
      values.push(`%${q}%`);
      paramIndex++;
    }

    // Kategori Filtresi
    if (category && category !== 'All' && category !== 'Tümü') {
       queryText += ` AND r.category = $${paramIndex}`;
       values.push(category);
       paramIndex++;
    }

    // --- SIRALAMA MANTIĞI (GÜNCELLENDİ) ---
    if (sort === 'rating') {
        // Puana göre (En yüksekten düşüğe), eşitse yeniye göre
        queryText += ` ORDER BY average_rating DESC, r.created_at DESC`;
    } else if (sort === 'newest') {
        // En yeniye göre
        queryText += ` ORDER BY r.created_at DESC`;
    } else {
        // Varsayılan: Random
        queryText += ` ORDER BY RANDOM()`;
    }

    queryText += ` LIMIT 30`;

    const result = await db.query(queryText, values);
    res.json(result.rows);

  } catch (err) {
    console.error('Search Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

//favoriye ekleme
app.post('/api/favorites/toggle', auth, async (req, res) => {
  const { recipeId } = req.body;
  const userId = req.user.id; // auth middleware'den gelen ID

  try {
    // Önce favorilerde var mı kontrol et
    const check = await db.query(
      'SELECT * FROM favorites WHERE user_id = $1 AND recipe_id = $2',
      [userId, recipeId]
    );

    if (check.rows.length > 0) {
      // Varsa sil (Unlike)
      await db.query(
        'DELETE FROM favorites WHERE user_id = $1 AND recipe_id = $2',
        [userId, recipeId]
      );
      res.json({ message: 'Removed from favorites', isFavorited: false });
    } else {
      // Yoksa ekle (Like)
      await db.query(
        'INSERT INTO favorites (user_id, recipe_id) VALUES ($1, $2)',
        [userId, recipeId]
      );
      
      // (Opsiyonel) Tarif sahibine bildirim gönderilebilir buraya eklenebilir.
      
      res.json({ message: 'Added to favorites', isFavorited: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

scheduleBackup();
//performBackup();

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});