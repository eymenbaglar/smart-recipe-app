const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const archiver = require('archiver');

//Its for control
console.log("Backup Service has started. DB_USER:", process.env.DB_USER ? "READ ✅" : "UNREADABLE ❌");

//Folder where backups will be temporarily stored
const BACKUP_DIR = path.join(__dirname, '../backups');
//Folder where images stored
const UPLOADS_DIR = path.join(__dirname, '../uploads');

//Make a folder if not exist
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
}

//Mail Settings
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    }
});

// * Backup Function *
const performBackup = async () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dumpFileName = `db-backup-${timestamp}.sql`;
    const zipFileName = `full-backup-${timestamp}.zip`;
    
    const dumpPath = path.join(BACKUP_DIR, dumpFileName);
    const zipPath = path.join(BACKUP_DIR, zipFileName);

    console.log(`[Backup] Process started: ${timestamp}`);

    //The method works more stably on Windows
    const pgCommand = `pg_dump -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} ${process.env.DB_NAME} > "${dumpPath}"`;

    exec(pgCommand, {
        env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
    }, async (error, stdout, stderr) => {
        if (error) {
            console.error(`[Backup Error] DB dump failed: ${error.message}`);
            return;
        }

        console.log('[Backup] DB Dump created. Files are being zipped....');
        //ZIP the file
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', async () => {
            console.log(`[Backup] Zip completed (${archive.pointer()} bytes). Email is being sent...`);
            
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: process.env.EMAIL_USER,
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
                //Clean delete for SQL file                
                try {
                    if (fs.existsSync(dumpPath)) {
                        fs.unlinkSync(dumpPath);
                    }
                    
                    console.log('[Backup] Temporary SQL file cleared. Zip backup saved locally.');
                } catch (cleanupErr) {
                    console.error('[Backup Warning] Cleanup failed:', cleanupErr);
                }
            }
        });

        archive.on('error', (err) => {
            throw err;
        });

        archive.pipe(output);

        //Add SQL file
        archive.file(dumpPath, { name: dumpFileName });

        //Add uploads folder
        if (fs.existsSync(UPLOADS_DIR)) {
            archive.directory(UPLOADS_DIR, 'uploads');
        } else {
            console.log('[Backup Warning] The Uploads folder could not be found; only the database was backed up.');
        }

        archive.finalize();
    });
};

//CRON JOB (at 04:00 AM everyday)
const scheduleBackup = () => {
    cron.schedule('0 4 * * *', () => {
        console.log('[Cron] Automatic backup triggered.');
        performBackup();
    });
    console.log('[System] Daily backup scheduler set up (04:00).');
};

module.exports = { scheduleBackup, performBackup };