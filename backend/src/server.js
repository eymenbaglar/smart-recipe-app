const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

//Control console log's for backend
console.log("--- Server is Starting ---");
console.log("DB_USER:", process.env.DB_USER);
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

//folder for images that are uploaded from app
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); 
  }
});

const upload = multer({ storage: storage });

//Send Mail Service (uses eymenbaglar@gmail.com)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'eymenbaglar@gmail.com', 
    pass: 'dapq twbc ipuy jhtg'    
  }
});

//Helper Function for sending email
const sendVerificationEmail = async (email, code) => {
  const mailOptions = {
    from: '"Smart Recipe App" <seninmailin@gmail.com>',
    to: email,
    subject: 'Account Verification Code',
    text: `Hello! Welcome to the app. Your verification code is: ${code}. This code is valid for 15 minutes.`
  };
  await transporter.sendMail(mailOptions);
};

//helper function for sending notification
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

//Cronjob for deleting accounts
cron.schedule('0 0 * * *', async () => {
  console.log('Running Account Deletion Cleanup Job...');
  const client = await db.connect();

  try {
    //find expired users (older than 30 days)
    const result = await client.query(`
      SELECT id FROM users 
      WHERE is_deleted = TRUE 
      AND deletion_requested_at < NOW() - INTERVAL '30 days'
    `);

    const usersToDelete = result.rows;

    if (usersToDelete.length > 0) {
      //If a user to be deleted is found, print the log.
      console.log(`${usersToDelete.length} users found for permanent deletion.`);

      for (const user of usersToDelete) {
        try {
          await client.query('BEGIN');

          //Make user's verified recipes author NULL
          await client.query(`
            UPDATE recipes 
            SET created_by = NULL 
            WHERE created_by = $1 AND is_verified = TRUE
          `, [user.id]);

          //Delete user (Hard Delete)
          await client.query('DELETE FROM users WHERE id = $1', [user.id]);

          await client.query('COMMIT');
          console.log(`User ${user.id} permanently deleted.`);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`Failed to delete user ${user.id}:`, err);
        }
      }
    } else {
      //if there is no user to delete today
      console.log('No accounts pending for deletion today.');
    }

  } catch (error) {
    console.error('Cron Job Error:', error);
  } finally {
    client.release();
  }
});

{/* ADMİN API */}
//get pending recipes
app.get('/api/admin/recipes/pending', adminAuth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        r.*, 
        u.username,
        (
          -- Pull recipe ingredients as a JSON list
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
      -- Find recipes that are status = pending
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

//Actions with pending recipes
app.patch('/api/admin/recipes/:id/action', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { action, reason } = req.body;

  try {
    //Retrive the recipe owner and title from the database
    const recipeQuery = await db.query('SELECT created_by, title FROM recipes WHERE id = $1', [id]);
    
    if (recipeQuery.rows.length === 0) {
      return res.status(404).json({ error: 'No recipe found.' });
    }

    const { created_by, title } = recipeQuery.rows[0];
    const userId = created_by; //needed for sendnotification

    //Execute based on action
    //approve the recipe
    if (action === 'approve') {
      //Make recipe 'approved' (means standart recipe)
      await db.query("UPDATE recipes SET status = 'approved' WHERE id = $1", [id]);
      
      //send notification to user
      if (userId) {
        await sendNotification(userId, "Your recipe has been approved! 🎉", `"${title}" has been published.`, "success");
      }
      
      res.json({ message: 'Recipe approved.' });     
    }
    //reject the recipe
    else if (action === 'reject') {
      //make the recipe status rejected and save a rejection message for user
      //user can see the rejection message from 'My Recipes' section
      await db.query(
        "UPDATE recipes SET status = 'rejected', rejection_reason = $1 WHERE id = $2", 
        [reason, id]
      );
      //send notification to user
      if (userId) {
        await sendNotification(userId, "Your recipe has been rejected ⚠️", `"${title}"  has been rejected. Please edit it and resubmit.`, "warning");
      }
      
      res.json({ message: 'Recipe rejected.' });
    }
    //make recipe a 'verified recipe'
    else if (action === 'verify') {
        await db.query(
            "UPDATE recipes SET status = 'approved', is_verified = TRUE WHERE id = $1", 
            [id]
        );
        //send notification to user
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

//Admin Dashboard
app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    //total user
    const userCount = await db.query('SELECT COUNT(*) FROM users');
    
    //total recipes
    const recipeCount = await db.query("SELECT COUNT(*) FROM recipes WHERE status = 'approved'");
    
    //recipes that waiting for approve
    const pendingCount = await db.query("SELECT COUNT(*) FROM recipes WHERE status = 'pending'");
    
    //number of recipes cooked today
    const cookedToday = await db.query(
      "SELECT COUNT(*) FROM meal_history WHERE cooked_at::date = CURRENT_DATE"
    );

    //list all informations in JSON list
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

//Get verified recipes
app.get('/api/admin/recipes/approved', adminAuth, async (req, res) => {
  const { type } = req.query;
  
  try {
    const isVerified = type === 'verified' ? 'TRUE' : 'FALSE';
    
    //find recipes that are verified
    //also calculate reviews and average_rating
    const result = await db.query(
      `SELECT 
         r.*, 
         u.username as author,
         (SELECT COUNT(*) FROM reviews WHERE recipe_id = r.id) as review_count,
         (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE recipe_id = r.id) as average_rating
       FROM recipes r
       LEFT JOIN users u ON r.created_by = u.id
       WHERE r.status = 'approved' AND r.is_verified = ${isVerified}
       -- Order by created time
       ORDER BY r.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Approved recipes fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//Deleting recipe
app.delete('/api/admin/recipes/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  //find recipe take id paramater from frontend
  const recipeInfo = await db.query('SELECT created_by, title FROM recipes WHERE id = $1', [id]);
  try {
    await db.query('DELETE FROM recipes WHERE id = $1', [id]);
    //send notification user to inform his/her recipe deleted
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

//Change verified status (make verified or take back verified status)
app.patch('/api/admin/recipes/:id/toggle-verify', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { isVerified } = req.body;

  try {
    //Find author of recipe and title
    const recipeQuery = await db.query('SELECT created_by, title FROM recipes WHERE id = $1', [id]);

    if (recipeQuery.rows.length === 0) {
      return res.status(404).json({ error: 'No recipe found.' });
    }

    const { created_by, title } = recipeQuery.rows[0];
    const userId = created_by;

    //Update the database (make is_verified field true)
    await db.query(
      'UPDATE recipes SET is_verified = $1 WHERE id = $2',
      [isVerified, id]
    );

    //Send notification to user (If recipe has author)
    if (userId) {
      if (isVerified) {
        await sendNotification(
            userId, 
            "Your recipe has been verified! 🌟", 
            `Congratulations! "${title}" has received the 'Verified Recipe' badge from our editors.`, 
            "success"
        );
      } else {
        //if verified status taken back (is_verified = false)
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

//get a recipe
app.get('/api/admin/recipes/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    //select the list in a JSON type
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

//update recipe
app.put('/api/admin/recipes/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  //take parameter's comes from frontend
  const { title, description, instructions, prep_time, calories, serving, image_url, ingredients } = req.body;

  
  //If empty string comes make it null
  const safePrepTime = (prep_time === '' || prep_time === null) ? null : prep_time;
  const safeCalories = (calories === '' || calories === null) ? null : calories;
  const safeServing  = (serving === ''  || serving === null)  ? null : serving;
  

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    //update the recipe and get the owner's ID
    //use safe constants
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

    //update ingredients
    if (ingredients && Array.isArray(ingredients)) {
      await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]);

      for (const ing of ingredients) {
        //Ingredient quantity should be integer
        const safeQuantity = (ing.quantity === '' || ing.quantity === null) ? null : ing.quantity;

        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit_type) 
           VALUES ($1, $2, $3, $4)`,
          [id, ing.id, safeQuantity, ing.unit]
        );
      }
    }

    await client.query('COMMIT');

    //Send notification
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

//get ingredients (all ingredients in database)
app.get('/api/ingredients', adminAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT id, name FROM ingredients ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Ingredients fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//get all users
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

//Ban/Unban User
app.patch('/api/admin/users/:id/ban', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { isBanned } = req.body;
  
  //role that will be given to user (banned or not banned)
  const newRole = isBanned ? 'banned' : 'user';

  //prevent ban yourself 
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

//Make user admin or take back admin role
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

//get all ingredients
app.get('/api/admin/ingredients/list', adminAuth, async (req, res) => {
  try {
    //order by ID high to low
    const result = await db.query('SELECT * FROM ingredients ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Ingredients list error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//Add new ingredient
app.post('/api/admin/ingredients', adminAuth, async (req, res) => {
  const { name, unit, unit_category, category, calories, isStaple } = req.body;
  
  //if fields left empty
  if (!name || !unit) {
      return res.status(400).json({ error: "Ingredient name and unit are required." });
  }

  //add new ingredient to database by given values from frontend
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
    //send notification to all users to inform that a new ingredient added to database
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

//Edit Ingredient
app.put('/api/admin/ingredients/:id', adminAuth, async (req, res) => {
  //take ingredient information from frontend
  const { id } = req.params;
  const { name, unit, unit_category, category, calories, isStaple } = req.body;

  //update ingredient with new values
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

//get ingredient suggestions to admin panel
app.get('/api/admin/suggestions', adminAuth, async (req, res) => {
  //get all ingredient_suggestions table
  try {
    const result = await db.query('SELECT * FROM ingredient_suggestions ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('SQL Error:', err.message); 
    res.status(500).json({ error: 'No suggestions were made.' });
  }
});

//DONE button on admin panel (it deletes ingredient suggestion from the table)
app.delete('/api/admin/suggestions/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  //delete ingredient_suggestion
  try {
    await db.query('DELETE FROM ingredient_suggestions WHERE id = $1', [id]);
    res.json({ message: 'The suggestion has been removed from the list.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Deletion failed.' });
  }
});

//get all reviews
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

//delete review
app.delete('/api/admin/reviews/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body; //Reason why is deleted

  try {
    //Find user and recipe before deleting (for notification)
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

    //Delete review
    await db.query('DELETE FROM reviews WHERE id = $1', [id]);

    //Send notification to user
    if (user_id) {
        //if comment is to long make it short
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

//get deletion requests
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

{/* USER API */}
//Register
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    //Check user if exist
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    //hash the password using bcrypy
    const hashedPassword = await bcrypt.hash(password, 10);
    //Create a new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    if (userCheck.rows.length > 0) {
      const existingUser = userCheck.rows[0];

      //if user already verified
      if (existingUser.is_verified) {
        return res.status(400).json({ error: 'This email address is already in use.' });
      }

      //If user exist but not verified
      console.log("Unverified account is being tried again, updating:", email);
      
      await db.query(
        `UPDATE users 
         SET username = $1, password_hash = $2, verification_code = $3, verification_code_expires_at = $4 
         WHERE email = $5`,
        [username, hashedPassword, verificationCode, expiresAt, email]
      );

      //Send the mail again
      sendVerificationEmail(email, verificationCode)
        .catch(err => console.error("Mail Error:", err));

      return res.status(201).json({ 
        message: 'The verification code has been sent again.',
        email: email 
      });
    }

    //If user never exist
    await db.query(
      `INSERT INTO users (username, email, password_hash, is_verified, verification_code, verification_code_expires_at) 
       VALUES ($1, $2, $3, FALSE, $4, $5)`,
      [username, email, hashedPassword, verificationCode, expiresAt]
    );

    //send verification email
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
    //get user and verification code info
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1', 
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'User not found.' });
    }

    const user = result.rows[0];

    //Check if user is already verified
    if (user.is_verified) {
      return res.status(400).json({ error: 'This account is already verified.' });
    }

    //Check if the code is true or not
    if (user.verification_code !== code) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    //Check if code time is expired
    if (new Date() > new Date(user.verification_code_expires_at)) {
      return res.status(400).json({ error: 'The code has expired. Please register again or request a new code.' });
    }

    //If everything is okay, verify the user and clean the code
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

//Forgot password
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    //check user exist
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'No user was found registered with this email address.' });
    }

    //Create a code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    //save the code to database
    await db.query(
      `UPDATE users 
       SET verification_code = $1, verification_code_expires_at = $2 
       WHERE email = $3`,
      [verificationCode, expiresAt, email]
    );

    //Send mail
    sendVerificationEmail(email, verificationCode)
      .catch(err => console.error("Forgot Password Mail Error:", err));

    res.json({ message: 'A verification code has been sent to your email address.' });

  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ error: 'Server Error.' });
  }
});

//Verify the code
app.post('/api/auth/verify-reset-code', async (req, res) => {
  const { email, code } = req.body;

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = result.rows[0];

    //Code check
    if (user.verification_code !== code) {
      return res.status(400).json({ error: 'Invalid code.' });
    }

    //Time check
    if (new Date() > new Date(user.verification_code_expires_at)) {
      return res.status(400).json({ error: 'The code has expired. Please try again.' });
    }

    res.json({ message: 'The code has been verified.' });

  } catch (error) {
    console.error('Verify Reset Code Error:', error);
    res.status(500).json({ error: 'Server Error.' });
  }
});

//Save the new password
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    //check code and time again for security
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    
    const user = result.rows[0];

    if (user.verification_code !== code) {
      return res.status(400).json({ error: 'Unauthorized operation. Invalid code.' });
    }
    if (new Date() > new Date(user.verification_code_expires_at)) {
      return res.status(400).json({ error: 'The time is up.' });
    }

    //hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    //update the password and clean the code
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

//Login
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        //check if mail exist
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        //check if user is deleted
        if (user.is_deleted) {
          return res.status(403).json({ 
          error: 'This account is in the process of being deleted. Access has been blocked.' 
          });
        }

        //check if user is banned
        if (user.role === 'banned') {
            return res.status(403).json({ error: 'Your account has been banned.' });
        }

        //check if user is verified
        if (!user.is_verified) {
          return res.status(403).json({ error: 'Your account has not been verified yet. Please try registering again to receive a new code.' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);

        //check the password
        if (!validPassword) {
            return res.status(401).json({ error: 'Incorrect password' });
        }

        //create a token for user
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
        console.error("Login Error:", err);
        res.status(500).json({ error: 'Server Error: ' + err.message });
    }
});

//Get recipes
app.get('/api/recipes', (req, res) => {
  res.json(recipes);
});

//upload profile picture
app.post('/api/profile/upload-photo', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please select an image.' });
    }

    //save the path for database
    const profilePicturePath = req.file.path.replace(/\\/g, "/"); 

    //update database
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


//Changing user information
app.patch('/api/profile', auth, async (req, res) => {
  const userId = req.user.id;
  const { username, email } = req.body;

  try {
    //check email
    const emailCheck = await db.query('SELECT * FROM users WHERE email = $1 AND id != $2', [email, userId]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'This email is already used.' });
    }

    //update the fields comes from frontend
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

//change password (from inside the profile)
app.patch('/api/profile/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.user;

  try {
    //check the current password
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Your current password is incorrect.' });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    //update the database
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

//Deleting account option
app.delete('/api/users/delete', auth, async (req, res) => {
  const userId = req.user.id;
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    //Delete standart recipes
    await client.query(
      `DELETE FROM recipes WHERE created_by = $1 AND is_verified = FALSE`,
      [userId]
    );

    //Mark user as 'will be deleted'
    await client.query(
      `UPDATE users 
       SET is_deleted = TRUE, deletion_requested_at = NOW() 
       WHERE id = $1`,
      [userId]
    );

    //start deletion proccess
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

//Find ingredient in MyStock
app.get('/api/ingredients/search', auth, async (req, res) => {
  const { query } = req.query;

  //min 2 letters
  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'Please enter at least 2 letters.' });
  }

  try {
    //search in database (non-staple ingredients)
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

//Search for ingredient in 'Add A Recipe' (staple ingredients included)
app.get('/api/ingredients/search2', auth, async (req, res) => {
  const { query } = req.query;

  //min 2 letters
  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'Please enter at least 2 letters.' });
  }

  try {
    //search in databse
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

//Add ingredient to MyStock
app.post('/api/refrigerator/add', auth, async (req, res) => {
  const userId = req.user.id;
  const { ingredientId, quantity } = req.body; 

  //find user's MyStock (virtual_refrigerator)
  try {
    let fridgeResult = await db.query('SELECT id FROM virtual_refrigerator WHERE user_id = $1', [userId]);
    let fridgeId;
    
    //if user doesn't have virtual_refrigerator create a new one
    if (fridgeResult.rows.length === 0) {
      const newFridge = await db.query(
        'INSERT INTO virtual_refrigerator (user_id) VALUES ($1) RETURNING id',
        [userId]
      );
      fridgeId = newFridge.rows[0].id;
    } else {
      fridgeId = fridgeResult.rows[0].id;
    }

    //Check if same ingredient on stock
    const checkItem = await db.query(
      'SELECT id, quantity FROM refrigerator_items WHERE virtual_refrigerator_id = $1 AND ingredient_id = $2',
      [fridgeId, ingredientId]
    );
    
    //if ingredient already in stock update
    if (checkItem.rows.length > 0) {
      await db.query(
        'UPDATE refrigerator_items SET quantity = quantity + $1, added_at = CURRENT_TIMESTAMP WHERE id = $2',
        [quantity, checkItem.rows[0].id]
      );
      res.status(200).json({ message: 'Ingredient amount updated.' });

    } 
    //else add new ingredient
    else {
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

//get user's MyStock
app.get('/api/refrigerator', auth, async (req, res) => {
  const userId = req.user.id;

  try {
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

//Deleting Ingredient on MyStock
app.delete('/api/refrigerator/delete/:itemId', auth, async (req, res) => {
  const { itemId } = req.params;
  //delete ingredient
  try {
    await db.query('DELETE FROM refrigerator_items WHERE id = $1', [itemId]);
    
    res.json({ message: 'Ingredient deleted succesfully!' });

  } catch (error) {
    console.error('Deletion Error', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

//update the ingredient on MyStock
app.patch('/api/refrigerator/update/:itemId', auth, async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body; 
  //update ingredient
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

//matching from MyStock
app.get('/api/recipes/match', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const query = `
      -- Fetch all ingredients currently available in the user's virtual refrigerator
      WITH UserInventory AS (
        SELECT ingredient_id, quantity
        FROM refrigerator_items ri
        JOIN virtual_refrigerator vr ON ri.virtual_refrigerator_id = vr.id
        WHERE vr.user_id = $1
      ),
      -- Join recipes with their required ingredients and map them against the user's inventory 
      -- If the user doesn't have an ingredient, 'amount_have' defaults to 0
      RecipeDetails AS (
        SELECT 
          r.id AS recipe_id,
          i.name AS ingredient_name,
          i.unit AS unit,
          ri.quantity AS amount_needed,
          COALESCE(ui.quantity, 0) AS amount_have, -- Handle missing ingredient
          i.is_staple -- Staple ingredients are ignored in scoring
        FROM recipes r
        JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        JOIN ingredients i ON ri.ingredient_id = i.id
        LEFT JOIN UserInventory ui ON ri.ingredient_id = ui.ingredient_id
      ),
      -- Apply the mathematical scoring logic for each ingredient within a recipe
      CalculatedScores AS (
        SELECT 
          recipe_id,
          ingredient_name,
          unit,
          amount_needed,
          amount_have,
          is_staple,
          
          -- Scoring logic:
          -- 1) Staple items don't effect the score
          -- 2) If user has 0 amount score is 0
          -- 3) If user has enough or more than needed score is 1.0
          -- 4) Otherwise calculate the ratio (if has 100g, needs 200g then score is 0.5)
          CASE 
            WHEN is_staple = TRUE THEN 0
            WHEN amount_have = 0 THEN 0
            WHEN (amount_have / amount_needed) >= 1 THEN 1.0
            ELSE (amount_have / amount_needed)
          END AS score,
          -- Calculate missing quantity
          GREATEST(amount_needed - amount_have, 0) AS missing_amount
        FROM RecipeDetails
      )
      -- Group by recipe and calculate total match percantage
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

        -- Calculate match percantage:
        -- (Sum of scores) / (Number of non-staple ingredients) * 100
        ROUND(
          (SUM(cs.score) FILTER (WHERE cs.is_staple = FALSE) / 
           NULLIF(COUNT(*) FILTER (WHERE cs.is_staple = FALSE), 0)) * 100
        ) AS match_percentage,

        -- Generate a JSON list of missing ingredient for the frontend
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

      -- Filterin: Show only recipes with at least %30 match rate
      HAVING ROUND(
          (SUM(cs.score) FILTER (WHERE cs.is_staple = FALSE) / 
           NULLIF(COUNT(*) FILTER (WHERE cs.is_staple = FALSE), 0)) * 100
        ) >= 30

      -- Sorting best matches first
      ORDER BY match_percentage DESC;
    `;

    //Executing query with the user's ID
    const result = await db.query(query, [userId]);

    //Return the sorted list of recipes
    res.json(result.rows);

  } catch (error) {
    console.error('Smart Matching Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

//Manuel Matching Algorithm
app.post('/api/recipes/match-manual', auth, async (req, res) => {
  const { selectedIds } = req.body; //ID's of ingredients that has been chosen

  if (!selectedIds || selectedIds.length === 0) {
    return res.status(400).json({ error: 'Plase choose at least one ingredient' });
  }

  try {
    const query = `
      WITH SelectedIngredients AS (
        -- Convert ID's coming from frontend into a list
        SELECT unnest($1::int[]) AS ingredient_id
      ),
      RecipeStats AS (
        -- non-staple ingredient of every recipe
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
        -- Matching algorithm
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
      
        
        -- Matching statistics
        COALESCE(rs.total_required, 0) AS total_ingredients,
        COALESCE(m.matching_count, 0) AS have_ingredients,
        
        ROUND(
          (COALESCE(m.matching_count, 0)::decimal / NULLIF(rs.total_required, 0)) * 100
        ) AS match_percentage,

        -- Required ingredients list
        (
          SELECT json_agg(json_build_object(
            'name', i.name,
            'missing_amount', ri_sub.quantity, -- In manual mode, display the exact amount required.
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
      JOIN Matches m ON r.id = m.recipe_id -- just matching rates
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.is_verified = TRUE
      -- There is no threshold value for manuel matching rate show all recipes (1-100)
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

//Favorite toogle (add/drop)
app.post('/api/favorites/toggle', auth, async (req, res) => {
  const userId = req.user.id;
  const { recipeId } = req.body;

  try {
    //Check if the recipe in favorites list
    const check = await db.query(
      'SELECT * FROM favorites WHERE user_id = $1 AND recipe_id = $2',
      [userId, recipeId]
    );

    //delete from favorites if exist
    if (check.rows.length > 0) {
      await db.query(
        'DELETE FROM favorites WHERE user_id = $1 AND recipe_id = $2',
        [userId, recipeId]
      );
      res.json({ message: 'Removed from Favorites.', isFavorite: false });
    } else 
     // add if not exist 
      {
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

//favorites
app.get('/api/favorites', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const query = `
      -- temporary user inventory for compare
      WITH UserInventory AS (
        SELECT ingredient_id, quantity
        FROM refrigerator_items ri
        JOIN virtual_refrigerator vr ON ri.virtual_refrigerator_id = vr.id
        WHERE vr.user_id = $1
      ),
      -- calculatin non-staple ingredient required for each recipe
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
      -- matching percantage calculator
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
        
        -- matching rate
        COALESCE(ROUND(
          (COALESCE(m.matching_count, 0)::decimal / NULLIF(rs.total_required, 0)) * 100
        ), 0) AS match_percentage,
        -- missing Ingredient List in JSON list
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
      -- show recently favorited first
      ORDER BY f.added_at DESC;
    `;

    const result = await db.query(query, [userId]);
    res.json(result.rows);

  } catch (error) {
    console.error('Favorite Listing error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//Matching user inventory with the recipe
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
         -- SUM all matching items in the user's inventory
         -- If not return 0
         COALESCE(SUM(rf.quantity), 0) AS user_stock_quantity
       FROM recipe_ingredients ri
       JOIN ingredients i ON ri.ingredient_id = i.id
       
       -- find user's stock and match items in recipe
       LEFT JOIN refrigerator_items rf ON rf.ingredient_id = i.id 
            AND rf.virtual_refrigerator_id IN (
                SELECT id FROM virtual_refrigerator WHERE user_id = $2
            )
            
       WHERE ri.recipe_id = $1
       GROUP BY i.id, i.name, ri.quantity, ri.unit_type, i.is_staple`,
      [id, userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Recipe detail error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

//I cooked button ve stock update (add meal history + Update ingredients + delete which becomes 0)
app.post('/api/recipes/cook', auth, async (req, res) => {
  const userId = req.user.id;
  const { recipeId, multiplier } = req.body; 

  if (!recipeId || !multiplier) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN'); 

    //get ingredients
    const recipeIngredients = await client.query(
      `SELECT i.id, i.name, ri.unit_type, i.is_staple, ri.quantity as base_quantity
       FROM recipe_ingredients ri
       JOIN ingredients i ON ri.ingredient_id = i.id
       WHERE ri.recipe_id = $1`,
      [recipeId]
    );

    //get user's stock
    const userStock = await client.query(
      `SELECT ri.id as row_id, ri.ingredient_id, ri.quantity, i.unit as unit_type
       FROM refrigerator_items ri
       JOIN virtual_refrigerator vr ON ri.virtual_refrigerator_id = vr.id
       JOIN ingredients i ON ri.ingredient_id = i.id
       WHERE vr.user_id = $1 AND ri.ingredient_id = ANY($2::int[])`,
      [userId, recipeIngredients.rows.map(r => r.id)]
    );

    //Calculation and MyStock adjustment
    for (const rItem of recipeIngredients.rows) {
      
      if (rItem.is_staple) continue;

      const uItem = userStock.rows.find(u => u.ingredient_id === rItem.id);
      
      if (!uItem || uItem.unit_type !== rItem.unit_type) continue;

      let neededAmount = rItem.base_quantity * multiplier;

      if (rItem.unit_type === 'qty') {
        neededAmount = Math.ceil(neededAmount);
      }

      let newQuantity = uItem.quantity - neededAmount;

      //If ingredient quantity becomes 0 delete it
      if (newQuantity <= 0) {
        await client.query(
          'DELETE FROM refrigerator_items WHERE id = $1',
          [uItem.row_id]
        );
      } 
      //else update ingredient amount
      else {
        await client.query(
          'UPDATE refrigerator_items SET quantity = $1 WHERE id = $2',
          [newQuantity, uItem.row_id]
        );
      }
    }

    //add to meal history
    await client.query(
      'INSERT INTO meal_history (user_id, recipe_id) VALUES ($1, $2)',
      [userId, recipeId]
    );

    await client.query('COMMIT'); 
    res.json({ message: 'Cooking recorded and inventory updated.' });

  } catch (error) {
    await client.query('ROLLBACK'); 
    console.error('Cooking error:', error);
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
         
         -- user rating and comment if any
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

// Recommendation System
app.get('/api/recipes/recommendations', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    //Check if user has meal_history
    const historyCheck = await db.query(
      'SELECT COUNT(*) FROM meal_history WHERE user_id = $1',
      [userId]
    );
    const historyCount = parseInt(historyCheck.rows[0].count);

    if (historyCount === 0) {
      //If it is cold start
      //just give 10 random recipes
      const randomRecipes = await db.query(`
        SELECT r.id, r.title, r.instructions, r.image_url, r.prep_time, r.calories, r.serving , r.category, r.is_verified, (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE recipe_id = r.id) as average_rating 
        FROM recipes r
        WHERE r.is_verified = TRUE
        ORDER BY RANDOM() 
        LIMIT 10
      `);
      return res.json({ type: 'random', data: randomRecipes.rows });
    }

    //If user has meal_history
    const recommendationQuery = `
      -- data gathering from 20 recipes that user cooked
      WITH LastHistory AS (
        SELECT recipe_id 
        FROM meal_history 
        WHERE user_id = $1 
        ORDER BY cooked_at DESC 
        LIMIT 20
      ),
      -- analyze ingredients used in history to calculate preference score
      -- frequencyScore: how many time ingredient appeared in the last 20 recipes
      -- only inclued non-staple items
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
      -- Find candidate recipes with highest total score
      -- It excludes last 20 match_history recipes for new content
      -- also count hit_count for comparision same scores
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
      -- Ranking the recipes
      -- 1. Total Score
      -- 2. Hit count
      -- 3. random
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

//Give review point or update
app.post('/api/reviews', auth, async (req, res) => {
  const userId = req.user.id;
  const { recipeId, rating, comment } = req.body;
  
  //inserts a new review if already exist update
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

    //send notification to recipe's author that a new comment posted on her/his recipe
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

//Recipe rating statistics
app.get('/api/recipes/:id/stats', auth, async (req, res) => {
  const recipeId = req.params.id;
  const userId = req.user.id;

  //average rating calculation
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

    //get a specific comment and rating
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

//Reviews of A specific recipe
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

//get user's reviews for profile screen
app.get('/api/user/reviews', auth, async (req, res) => {
  const userId = req.user.id;
  //get review using user's id
  try {
    const query = `
      SELECT 
        rv.id,
        rv.rating, 
        rv.comment, 
        rv.updated_at,
        r.id AS recipe_id,
        r.title AS recipe_title, 
        r.image_url
      FROM reviews rv
      JOIN recipes r ON rv.recipe_id = r.id
      WHERE rv.user_id = $1
      ORDER BY rv.updated_at DESC
    `;
    
    const result = await db.query(query, [userId]);
    res.json(result.rows);

  } catch (error) {
    console.error('User reviews error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//get recipe for MyRecipes screen
app.get('/api/recipes/details/:id', auth, async (req, res) => {
  const { id } = req.params;

  //get recipe with recipe's id
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

//add new recipe
app.post('/api/recipes', auth, async (req, res) => {
  const userId = req.user.id;
  const { 
    title, description, instructions, prepTime, calories, imageUrl, serving, ingredients 
  } = req.body;

  //if title or ingredient is not entered
  if (!title || !ingredients || ingredients.length === 0) {
    return res.status(400).json({ error: 'A title and at least one ingredient are required.' });
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    //add recipe to table with 'pending' status
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

    //connect the ingredients
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
    
    //if ingredient with invalid id comes
    if (error.code === '23503') { 
       return res.status(400).json({ error: 'invalid ingredient selection has been made.' });
    }
    
    res.status(500).json({ error: 'Server error, recipe could not be added.' });
  } finally {
    client.release();
  }
});

//get user's own recipes
app.get('/my-recipes', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        r.*, 
        COALESCE(u.username, 'Admin') as username,
        COALESCE(AVG(rv.rating), 0)::NUMERIC(10,1) as average_rating,
        (
          -- get ingredient list on JSON list
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

    const recipes = result.rows.map(recipe => ({
      ...recipe,
      average_rating: parseFloat(recipe.average_rating),
      //if no ingredient comes make it empty list []
      ingredients: recipe.ingredients || []
    }));

    res.json(recipes);
  } catch (err) {
    console.error('My recipes SQL Error:', err.message); 
    res.status(500).json({ error: 'Recipes could not be retrieved.' });
  }
});

//Delete own recipe
app.delete('/api/recipes/:id', auth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    //Check if user is author of the recipe or recipe is verified
    const checkQuery = await db.query(
      'SELECT * FROM recipes WHERE id = $1 AND created_by = $2',
      [id, userId]
    );

    if (checkQuery.rows.length === 0) {
      return res.status(404).json({ error: 'No recipe found or you do not have permission for this.' });
    }

    const recipe = checkQuery.rows[0];

    //if recipe is verified user cannot delete it
    if (recipe.is_verified) {
      return res.status(403).json({ error: 'Verified recipes cannot be deleted. Please contact the admin.' });
    }

    //Deletion Proccess
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      //Delete all connections (for safety)
      await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]);
      await client.query('DELETE FROM reviews WHERE recipe_id = $1', [id]);
      
      //delete recipe
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


//Edit rejected recipe and send back
app.put('/api/recipes/:id', auth, async (req, res) => {
  const recipeId = req.params.id;
  const userId = req.user.id;
  
  //Datas comes from frontend
  const { 
    title, description, instructions, prepTime, calories, imageUrl, serving, ingredients 
  } = req.body;

  //Basic validation
  if (!title || !ingredients || ingredients.length === 0) {
    return res.status(400).json({ error: 'A title and at least one material are required.' });
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');
    //edit recipe information
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

    //If the line does not return after the update, either there is no tariff or the owner is not this user.
    if (updateResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You do not have permission to edit this recipe or the recipe could not be found.' });
    }

    //Delete old ingredients
    await client.query(
      `DELETE FROM recipe_ingredients WHERE recipe_id = $1`,
      [recipeId]
    );

    //add new ingredients
    for (const item of ingredients) {
      //item.id should come from the frontend. If it is a material selected from the list, it has an id.
      await client.query(
        `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit_type)
         VALUES ($1, $2, $3, $4)`,
        [recipeId, item.id, item.quantity, item.unit] 
        
      );
    }

    await client.query('COMMIT');

    res.json({ 
      message: 'The recipe has been successfully updated and resubmitted for approval.',
      recipeId: recipeId
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Recipe update error:', error);

    if (error.code === '23503') { 
       return res.status(400).json({ error: 'An invalid ingredient selection has been made.' });
    }

    res.status(500).json({ error: 'Server error, recipe could not be updated.' });
  } finally {
    client.release();
  }
});

//Save ingredient suggestions
app.post('/api/ingredients/suggest', auth, async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;
  
  //user should write a name
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Please enter a ingredient name.' });
  }

  //insert in ingredient_suggestions table
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

{/* Notification API*/}
//get notifications for a user
app.get('/api/notifications', auth, async (req, res) => {
  try {
    //use user's ID
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

//unread notification
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

//Marked as read
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

//Marked as read all notifications
app.put('/api/notifications/read-all', auth, async (req, res) => {
  try {
    //update all notifications
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

{/*Social API*/}
//Trens of Week (Last 14 days)
app.get('/api/recipes/social/trends', auth, async (req, res) => {
  // If a limit comes from the frontend, use it; if not, use 50.
  const limit = req.query.limit || 20; 

  try {
    const query = `
      SELECT 
        r.*, 
        u.username,
        COUNT(rv.id) as review_count,
        COALESCE(AVG(rv.rating), 0) as raw_rating,
        -- check if the current user is favorited this recipe
        EXISTS(SELECT 1 FROM favorites WHERE user_id = $1 AND recipe_id = r.id) as is_favorited,
        -- Weighted rating (Bayesian Average)
        -- Formula: (v / (v + m)) * R + (m / (v + m)) * C
        (
          (COUNT(rv.id) / (COUNT(rv.id) + 2.0)) * COALESCE(AVG(rv.rating), 0) +
          (2.0 / (COUNT(rv.id) + 2.0)) * 3.5
        ) as weighted_score
      FROM recipes r
      LEFT JOIN reviews rv ON r.id = rv.recipe_id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.status = 'approved'
      -- set interval to last 14 days
      AND (rv.created_at >= NOW() - INTERVAL '14 days' OR r.created_at >= NOW() - INTERVAL '14 days')
      GROUP BY r.id, u.username
      -- eliminate recipes with zero engagement
      HAVING COUNT(rv.id) >= 1
      -- sort by the calculated statistical score
      ORDER BY weighted_score DESC
      LIMIT $2;
    `;
    
    const result = await db.query(query, [req.user.id, limit]);
    res.json(result.rows);
  } catch (err) {
    console.error('Trends Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

//last added recipes
app.get('/api/recipes/social/newest', auth, async (req, res) => {
  const limit = req.query.limit || 20;

  //select last 20 (or frontend limit) recipes that are added to database
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

//Random flow
app.get('/api/recipes/social/random', auth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  
  //take seed as a string
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
      -- Combine ID and Seed and hash them
      ORDER BY HASHTEXT(r.id::text || $4::text) 
      LIMIT $2 OFFSET $3;
    `;
    
    const result = await db.query(query, [req.user.id, limit, offset, seed]);
    res.json(result.rows);
  } catch (err) {
    console.error('Random Feed Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

//search bar filter
app.get('/api/recipes/social/search', auth, async (req, res) => {
  const { q, category, mode, sort } = req.query;
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

    // Verified Filter
    if (mode === 'standard') {
      queryText += ` AND r.is_verified = FALSE`;
    } 

    // Word Search
    if (q) {
      queryText += ` AND (r.title ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex})`;
      values.push(`%${q}%`);
      paramIndex++;
    }

    // Category Filter
    if (category && category !== 'All' && category !== 'Tümü') {
       queryText += ` AND r.category = $${paramIndex}`;
       values.push(category);
       paramIndex++;
    }

    //Rating Logic
    if (sort === 'rating') {
        //Based on rating
        queryText += ` ORDER BY average_rating DESC, r.created_at DESC`;
    } else if (sort === 'newest') {
        //Based on newest
        queryText += ` ORDER BY r.created_at DESC`;
    } else {
        //Default random
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

//add to favorite
app.post('/api/favorites/toggle', auth, async (req, res) => {
  const { recipeId } = req.body;
  const userId = req.user.id;

  try {
    //Check if it is favorited
    const check = await db.query(
      'SELECT * FROM favorites WHERE user_id = $1 AND recipe_id = $2',
      [userId, recipeId]
    );

    if (check.rows.length > 0) {
      //Delete if exist
      await db.query(
        'DELETE FROM favorites WHERE user_id = $1 AND recipe_id = $2',
        [userId, recipeId]
      );
      res.json({ message: 'Removed from favorites', isFavorited: false });
    } else {
      //If not add
      await db.query(
        'INSERT INTO favorites (user_id, recipe_id) VALUES ($1, $2)',
        [userId, recipeId]
      );
      
      res.json({ message: 'Added to favorites', isFavorited: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

scheduleBackup(); //Backup function
//performBackup(); //Manuel Backup for testing

if (require.main === module) {
  app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });
}

module.exports = app;