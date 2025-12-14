// backend/src/server.js
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./config/database');
const auth = require('./middleware/auth');
const multer = require('multer');
const path = require('path');
const adminAuth = require('./middleware/adminAuth');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Dosyalar 'uploads' klasörüne gitsin
  },
  filename: function (req, file, cb) {
    // Dosya adı çakışmasın diye isminin başına tarih ekliyoruz
    // Örn: 17654321-profil.jpg
    cb(null, Date.now() + path.extname(file.originalname)); 
  }
});

const upload = multer({ storage: storage });

{/* ADMİN API'LERİ*/}
//pending olan tarifleri getir
app.get('/api/admin/recipes/pending', adminAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*, u.username as author 
       FROM recipes r
       LEFT JOIN users u ON r.created_by = u.id
       WHERE r.status = 'pending'
       ORDER BY r.created_at ASC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

//pending tarifle ilgili işlemler
app.patch('/api/admin/recipes/:id/action', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { action, reason } = req.body; // action: 'approve', 'reject', 'verify'

  try {
    if (action === 'approve') {
      await db.query("UPDATE recipes SET status = 'approved' WHERE id = $1", [id]);
      res.json({ message: 'Tarif onaylandı.' });
    } 
    else if (action === 'reject') {
      await db.query(
        "UPDATE recipes SET status = 'rejected', rejection_reason = $1 WHERE id = $2", 
        [reason, id]
      );
      res.json({ message: 'Tarif reddedildi.' });
    }
    else if (action === 'verify') {
        // Hem onaylı yap hem de verified (mavi tik) yap
        await db.query(
            "UPDATE recipes SET status = 'approved', is_verified = TRUE WHERE id = $1", 
            [id]
        );
        res.json({ message: 'Tarif doğrulandı (Verified) ve onaylandı.' });
    }
    else {
      res.status(400).json({ error: 'Geçersiz işlem.' });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Dashboard İstatistikleri
app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    // 1. Toplam Kullanıcı Sayısı
    const userCount = await db.query('SELECT COUNT(*) FROM users');
    
    // 2. Onaylanmış Toplam Tarif Sayısı
    const recipeCount = await db.query("SELECT COUNT(*) FROM recipes WHERE status = 'approved'");
    
    // 3. Onay Bekleyen Tarif Sayısı
    const pendingCount = await db.query("SELECT COUNT(*) FROM recipes WHERE status = 'pending'");
    
    // 4. Bugün Pişirilen Yemek Sayısı (Meal History'den)
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

// Onaylanmış tarifleri getir (İstatistiklerle birlikte)
app.get('/api/admin/recipes/approved', adminAuth, async (req, res) => {
  const { type } = req.query; // 'verified' veya 'standard'
  
  try {
    const isVerified = type === 'verified' ? 'TRUE' : 'FALSE';
    
    const result = await db.query(
      `SELECT 
         r.*, 
         u.username as author,
         -- Yorum sayısını hesapla
         (SELECT COUNT(*) FROM reviews WHERE recipe_id = r.id) as review_count,
         -- Ortalama puanı hesapla (Yoksa 0 ver)
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

// Tarif Silme (Admin yetkisiyle)
app.delete('/api/admin/recipes/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    // Önce bağlı tablolardan (ingredients, reviews vb.) silinmesi gerekebilir (CASCADE ayarlı değilse)
    // Basitlik adına direkt siliyoruz (DB'de ON DELETE CASCADE olduğunu varsayarak)
    await db.query('DELETE FROM recipes WHERE id = $1', [id]);
    res.json({ message: 'Tarif silindi.' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verified Durumunu Değiştir (Toggle)
app.patch('/api/admin/recipes/:id/toggle-verify', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { isVerified } = req.body; // Yeni durum

  try {
    await db.query(
      'UPDATE recipes SET is_verified = $1 WHERE id = $2',
      [isVerified, id]
    );
    res.json({ message: 'Verified durumu güncellendi.' });
  } catch (error) {
    console.error('Verify toggle error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Tekil Tarif Getir (Düzenleme modalını doldurmak için)
app.get('/api/admin/recipes/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    // Tarif bilgileri + malzemeleri JSON array olarak çekiyoruz
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
      return res.status(404).json({ error: 'Tarif bulunamadı' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Tarifi Güncelle
app.put('/api/admin/recipes/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { title, description, instructions, prep_time, calories, serving, image_url, ingredients } = req.body;

  const client = await db.connect();

  try {
    await client.query('BEGIN'); // Transaction Başlat

    // A. Temel Bilgileri Güncelle
    await client.query(
      `UPDATE recipes 
       SET title = $1, description = $2, instructions = $3, prep_time = $4, calories = $5, serving = $6, image_url = $7 
       WHERE id = $8`,
      [title, description, instructions, prep_time, calories, serving, image_url, id]
    );

    // B. Malzemeleri Güncelle (Eskileri sil, yenileri ekle)
    if (ingredients && Array.isArray(ingredients)) {
      // 1. Mevcut bağlantıları sil
      await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]);

      // 2. Yeni malzemeleri ekle
      for (const ing of ingredients) {
        // Dropdown'dan seçilen id ve girilen miktar ile ekle
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit_type) 
           VALUES ($1, $2, $3, $4)`,
          [id, ing.id, ing.quantity, ing.unit]
        );
      }
    }

    await client.query('COMMIT'); // Onayla
    res.json({ message: 'Tarif başarıyla güncellendi.' });

  } catch (error) {
    await client.query('ROLLBACK'); // Hata varsa geri al
    console.error('Update error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

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
    // Tarif bilgileri + malzemeleri JSON array olarak çekiyoruz
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
      return res.status(404).json({ error: 'Tarif bulunamadı' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 1. Tüm Kullanıcıları Getir (İstatistiklerle)
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

// 2. Kullanıcıyı Banla/Banı Kaldır (Rolünü 'banned' yapıyoruz veya eski haline döndürüyoruz)
app.patch('/api/admin/users/:id/ban', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { isBanned } = req.body; // true = banla, false = aç
  
  // Eğer banlanacaksa rolü 'banned' yap, açılacaksa 'user' yap
  const newRole = isBanned ? 'banned' : 'user';

  try {
    // Kendini banlamayı engelle (Opsiyonel güvenlik)
    if (id == req.user.userId) { 
        return res.status(400).json({ error: "Kendinizi banlayamazsınız." });
    }

    await db.query('UPDATE users SET role = $1 WHERE id = $2', [newRole, id]);
    res.json({ message: `Kullanıcı durumu güncellendi: ${newRole}` });
  } catch (error) {
    console.error('Ban error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. Kullanıcıyı Admin Yap/Geri Al
app.patch('/api/admin/users/:id/role', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body; // 'admin' veya 'user'

  try {
    await db.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
    res.json({ message: 'Rol güncellendi.' });
  } catch (error) {
    console.error('Role update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 1. Tüm Malzemeleri Getir
app.get('/api/admin/ingredients/list', adminAuth, async (req, res) => {
  try {
    // Veritabanındaki gerçek sütun isimlerini çekiyoruz
    const result = await db.query('SELECT * FROM ingredients ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Ingredients list error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. Yeni Malzeme Ekle (SQL TABLOLARINA GÖRE DÜZENLENDİ)
app.post('/api/admin/ingredients', adminAuth, async (req, res) => {
  // Frontend'den gelen veriler
  const { name, unit, unit_category, category, calories, isStaple } = req.body;
  
  if (!name || !unit) {
      return res.status(400).json({ error: "Malzeme adı ve birimi zorunludur." });
  }

  try {
    await db.query(
      `INSERT INTO ingredients 
       (name, unit, unit_category, category, calories_per_unit, is_staple) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        name, 
        unit, 
        unit_category || 'count', // Varsayılan: count
        category || 'General',    // Varsayılan: General
        calories || 0,            // Frontend'den 'calories' geliyor, DB'de 'calories_per_unit'
        isStaple || false
      ]
    );
    res.status(201).json({ message: 'Malzeme başarıyla eklendi.' });
  } catch (error) {
    console.error('Add ingredient error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. Malzeme Düzenleme
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
    res.json({ message: 'Malzeme güncellendi.' });
  } catch (error) {
    console.error('Update ingredient error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

{/* USER API'LERİ*/}
// Register endpoint
app.post('/auth/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Lütfen tüm alanları doldurun.' });
    }

    try {
        const userCheck = await db.query(
            'SELECT * FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );

        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Bu e-posta veya kullanıcı adı zaten kullanılıyor.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await db.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, hashedPassword]
        );

        console.log("✅ Yeni kullanıcı oluşturuldu:", newUser.rows[0]);

        res.status(201).json({
            message: 'Kullanıcı başarıyla oluşturuldu!',
            user: newUser.rows[0]
        });

    } catch (err) {
        console.error("Register Hatası:", err);
        res.status(500).json({ error: 'Sunucu hatası oluştu.' });
    }
});

// Login endpoint
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
        }

        const user = result.rows[0];

        if (user.role === 'banned') {
            return res.status(403).json({ error: 'Hesabınız erişime engellenmiştir (Banned).' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Şifre hatalı' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Giriş Başarılı',
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
        res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
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
      return res.status(400).json({ error: 'Lütfen bir resim seçin.' });
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
      message: 'Profil fotoğrafı güncellendi.', 
      filePath: profilePicturePath 
    });

  } catch (error) {
    console.error('Fotoğraf yükleme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
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
      GROUP BY r.id
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
        f.added_at,
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
  const userId = req.user.id; // Auth middleware'den gelen user id

  try {
    const result = await db.query(
      `SELECT 
         i.name, 
         ri.quantity, 
         ri.unit_type,
         i.is_staple,
         -- Kullanıcının dolabındaki miktar (Yoksa 0 döner)
         COALESCE(rf.quantity, 0) AS user_stock_quantity
       FROM recipe_ingredients ri
       JOIN ingredients i ON ri.ingredient_id = i.id
       -- Kullanıcının stoğuyla eşleştiriyoruz
       LEFT JOIN refrigerator_items rf ON rf.ingredient_id = i.id 
       LEFT JOIN virtual_refrigerator vr ON rf.virtual_refrigerator_id = vr.id AND vr.user_id = $2
       WHERE ri.recipe_id = $1`,
      [id, userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Tarif detay hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
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
         r.serving,
         
         -- KULLANICININ VERDİĞİ PUAN VE YORUM (Varsa)
         rv.rating AS my_rating,
         rv.comment AS my_comment,

         (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE recipe_id = r.id) as average_rating
         
       FROM meal_history mh
       JOIN recipes r ON mh.recipe_id = r.id
       LEFT JOIN reviews rv ON r.id = rv.recipe_id AND rv.user_id = $1
       
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
        SELECT r.id, r.title, r.image_url, r.prep_time, r.calories, r.serving , (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE recipe_id = r.id) as average_rating 
        FROM recipes r
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
        WHERE r.id NOT IN (SELECT recipe_id FROM LastHistory)
        GROUP BY r.id
      )
      -- Sonuçları sırala
      SELECT 
        r.id, r.title, r.image_url, r.prep_time, r.calories, r.serving,(SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE recipe_id = r.id) as average_rating,
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
    console.error('Öneri sistemi hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
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
    return res.status(400).json({ error: 'Başlık ve en az bir malzeme gereklidir.' });
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
      message: 'Tarif başarıyla gönderildi! Admin onayından sonra yayınlanacaktır.',
      recipeId: newRecipeId 
    });

  } catch (error) {
    await client.query('ROLLBACK'); 
    console.error('Tarif ekleme hatası:', error);
    
    // olmayan malzeme idsi gelirse
    if (error.code === '23503') { 
       return res.status(400).json({ error: 'Geçersiz malzeme seçimi yapıldı.' });
    }
    
    res.status(500).json({ error: 'Sunucu hatası, tarif eklenemedi.' });
  } finally {
    client.release();
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});