const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const archiver = require('archiver');

// KONTROL İÇİN (Eğer hala undefined gelirse bunu terminalde göreceğiz)
console.log("Backup Service has started. DB_USER:", process.env.DB_USER ? "READ ✅" : "UNREADABLE ❌");

// Yedeklerin geçici olarak tutulacağı klasör
const BACKUP_DIR = path.join(__dirname, '../backups');
// Resimlerin olduğu klasör
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Klasör yoksa oluştur
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
}

// Mail Ayarları (Server.js'deki ile aynı transporter)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    }
});

// --- YEDEKLEME FONKSİYONU ---
const performBackup = async () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dumpFileName = `db-backup-${timestamp}.sql`;
    const zipFileName = `full-backup-${timestamp}.zip`;
    
    const dumpPath = path.join(BACKUP_DIR, dumpFileName);
    const zipPath = path.join(BACKUP_DIR, zipFileName);

    console.log(`[Backup] Process started: ${timestamp}`);

    
    const pgCommand = `set PGPASSWORD=${process.env.DB_PASSWORD}&& pg_dump -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} ${process.env.DB_NAME} > "${dumpPath}"`;

    exec(pgCommand, async (error, stdout, stderr) => {
        if (error) {
            console.error(`[Backup Error] DB dump failed: ${error.message}`);
            return;
        }

        console.log('[Backup] DB Dump created. Files are being zipped....');

        // 2. SQL Dosyası ve Uploads Klasörünü Ziple
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', async () => {
            console.log(`[Backup] Zip completed (${archive.pointer()} bytes). Email is being sent...`);
            
            // 3. Mail Gönder
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: process.env.EMAIL_USER, // Kendine gönder
                    subject: `📦 Daily System Backup - ${timestamp}`,
                    text: 'The attached file contains a database backup (.sql) and uploaded images (uploads).',
                    attachments: [
                        {
                            filename: zipFileName,
                            path: zipPath
                        }
                    ]
                });
                console.log('[Backup] Mail sent successfully! ✅');
            } catch (mailErr) {
                console.error('[Backup Error] Mail could not be sent:', mailErr);
            } finally {
                // 4. Temizlik: Dosyaları sil 
                fs.unlinkSync(dumpPath); // SQL'i sil
                fs.unlinkSync(zipPath);  // Zip'i sil
                console.log('[Backup] Temporary files have been cleared.');
            }
        });

        archive.on('error', (err) => {
            throw err;
        });

        archive.pipe(output);

        // SQL dosyasını ekle
        archive.file(dumpPath, { name: dumpFileName });

        // Uploads klasörünü ekle (Eğer klasör varsa)
        if (fs.existsSync(UPLOADS_DIR)) {
            archive.directory(UPLOADS_DIR, 'uploads');
        } else {
            console.log('[Backup Warning] The Uploads folder could not be found; only the database was backed up.');
        }

        archive.finalize();
    });
};

// --- ZAMANLAYICI (CRON JOB) ---
// Her gece 04:00'te çalışır ('0 4 * * *')
// Test için '*/1 * * * *' yaparsan her dakika çalışır.
const scheduleBackup = () => {
    cron.schedule('0 4 * * *', () => {
        console.log('[Cron] Automatic backup triggered.');
        performBackup();
    });
    console.log('[System] Daily backup scheduler set up (04:00).');
};

module.exports = { scheduleBackup, performBackup };