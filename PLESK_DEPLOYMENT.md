# Alteneiji Website - Plesk Deployment Guide

Complete step-by-step guide for deploying to **Plesk Obsidian 18.0.74** with **Node.js 24.12.0** and **MariaDB 11.4.9**.

---

## 📋 Pre-Deployment Checklist

- [ ] Plesk server access with Node.js extension enabled
- [ ] Domain configured (alteneijigroup.com)
- [ ] MariaDB database ready
- [ ] SSL certificate installed
- [ ] Gemini API key (for AI features)

---

## Step 1: Prepare Files for Upload

### Update `.env` for Production

Create a production `.env` file:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=alteneijigroup_user
DB_PASSWORD=YOUR_STRONG_DATABASE_PASSWORD
DB_NAME=alteneijigroup_db

# JWT Secret (generate new one!)
# Run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=YOUR_64_CHAR_RANDOM_STRING_HERE
JWT_EXPIRES_IN=7d

# Gemini AI
GEMINI_API_KEY=YOUR_GEMINI_API_KEY

# Admin Credentials
ADMIN_EMAIL=admin@alteneijigroup.com
ADMIN_PASSWORD=YOUR_STRONG_ADMIN_PASSWORD

# Site Configuration
SITE_URL=https://alteneijigroup.com
SITE_NAME=Alteneiji Group
```

> ⚠️ **Important**: Generate a new JWT_SECRET for production!

---

## Step 2: Create Database in Plesk

1. Go to **Plesk > Databases**
2. Click **Add Database**
3. Configure:
   - Database name: `alteneijigroup_db`
   - Database user: `alteneijigroup_user`
   - Password: (strong password)
4. Click **OK**

### Import Schema

1. Go to **Databases > phpMyAdmin**
2. Select your database
3. Click **Import**
4. Upload `database/schema.sql`
5. Click **Go**

---

## Step 3: Upload Project Files

### Option A: File Manager

1. Go to **Plesk > File Manager**
2. Navigate to `/httpdocs/` or your domain folder
3. Upload the entire `alteneiji` folder contents
4. Ensure this structure:
   ```
   /httpdocs/
   ├── server.js
   ├── package.json
   ├── .env
   ├── config/
   ├── models/
   ├── routes/
   ├── middleware/
   ├── admin/
   ├── public/
   └── uploads/
   ```

### Option B: SSH/SFTP

```bash
# Connect via SFTP
sftp user@alteneijigroup.com

# Upload files
put -r /path/to/alteneiji/* /var/www/vhosts/alteneijigroup.com/httpdocs/
```

---

## Step 4: Configure Node.js in Plesk

1. Go to **Plesk > Node.js**

2. Configure settings:
   | Setting | Value |
   |---------|-------|
   | Node.js Version | 24.12.0 |
   | Document Root | `/httpdocs` |
   | Application Mode | production |
   | Application Startup File | `server.js` |

3. Click **Enable Node.js**

---

## Step 5: Install Dependencies

### Via Plesk Node.js Panel

1. In the Node.js panel, click **NPM Install**
2. Wait for installation to complete

### Via SSH (Alternative)

```bash
cd /var/www/vhosts/alteneijigroup.com/httpdocs
npm install --production
```

---

## Step 6: Create uploads Directory

Make sure the uploads folder exists and is writable:

### Via SSH:
```bash
cd /var/www/vhosts/alteneijigroup.com/httpdocs
mkdir -p uploads
chmod 755 uploads
```

### Via File Manager:
1. Create folder `uploads` in httpdocs
2. Set permissions to 755

---

## Step 7: Start Application

1. Go to **Plesk > Node.js**
2. Click **Restart App**
3. Check the application status shows "Running"

### Verify Startup Logs

Check for errors in the Node.js logs:
- Click **Logs** in the Node.js panel
- Or via SSH: `tail -f /var/www/vhosts/alteneijigroup.com/logs/nodejs.log`

---

## Step 8: Configure SSL & Domain

### Enable SSL

1. Go to **Plesk > SSL/TLS Certificates**
2. Use **Let's Encrypt** for free SSL
3. Enable **Redirect HTTP to HTTPS**

### Domain Settings

1. Go to **Plesk > Hosting Settings**
2. Ensure **Proxy mode** is enabled for Node.js
3. Set preferred domain: `https://alteneijigroup.com`

---

## Step 9: Set Up Process Manager (Optional)

For better reliability, configure PM2:

### Via SSH:

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
cd /var/www/vhosts/alteneijigroup.com/httpdocs
pm2 start server.js --name "alteneiji"

# Save process list
pm2 save

# Setup startup script
pm2 startup
```

---

## Step 10: Configure Firewall

Ensure these ports are open:

| Port | Service |
|------|---------|
| 80 | HTTP |
| 443 | HTTPS |
| 3306 | MariaDB (localhost only) |

---

## 🧪 Post-Deployment Testing

### 1. Website Access
- [ ] Visit https://alteneijigroup.com
- [ ] All pages load correctly
- [ ] Forms work (contact, Gulfood registration)

### 2. Admin Panel
- [ ] Visit https://alteneijigroup.com/admin
- [ ] Login with admin credentials
- [ ] Dashboard loads with stats

### 3. AI Features
- [ ] Navigate to AI SEO
- [ ] Generate test content
- [ ] Verify Gemini API is working

---

## 🔧 Troubleshooting

### App Not Starting

```bash
# Check Node.js logs
cat /var/www/vhosts/alteneijigroup.com/logs/error_log
cat /var/www/vhosts/alteneijigroup.com/logs/nodejs.log
```

### Database Connection Error

1. Verify `.env` credentials
2. Check database user permissions:
   ```sql
   GRANT ALL PRIVILEGES ON alteneijigroup_db.* TO 'alteneijigroup_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

### 502 Bad Gateway

1. Restart Node.js app in Plesk
2. Check if port 3000 is already in use
3. Verify `server.js` startup file path

### Static Files Not Loading

1. Check file permissions (should be 644)
2. Verify folder permissions (should be 755)

---

## 📊 Monitoring Commands (SSH)

```bash
# View app status
pm2 status

# View logs
pm2 logs alteneiji

# Restart app
pm2 restart alteneiji

# Memory usage
pm2 monit
```

---

## 🔄 Updating the Application

1. Upload new files to server
2. Run `npm install` if dependencies changed
3. Restart via **Plesk > Node.js > Restart**

Or via SSH:
```bash
cd /var/www/vhosts/alteneijigroup.com/httpdocs
git pull origin main  # if using git
npm install
pm2 restart alteneiji
```

---

## ✅ Deployment Complete!

Your website should now be live at:
- **Website**: https://alteneijigroup.com
- **Admin Panel**: https://alteneijigroup.com/admin
