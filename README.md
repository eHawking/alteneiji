# Alteneiji Group - Premium Website

🏢 **Emirati-Owned Import & Export Trading Company**

A premium website for Alteneiji Group with AI-powered admin panel features for SEO, marketing, and social media automation.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production
npm start
```

## 📁 Project Structure

```
├── server.js          # Express server
├── config/            # Database, Auth, Gemini AI
├── models/            # Database models
├── routes/            # API endpoints
├── middleware/        # Auth & error handling
├── admin/             # Admin panel UI
├── public/            # Public website
└── uploads/           # Media uploads
```

## ⚙️ Configuration

Copy `.env.example` to `.env` and configure:

```env
DB_HOST=localhost
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=alteneiji_db
JWT_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-key
```

## 🗄️ Database Setup

Import the schema to MariaDB:

```bash
mysql -u user -p alteneiji_db < database/schema.sql
```

## 🌐 Access

- **Website**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin
- **API**: http://localhost:3000/api

## 🔑 Default Admin

```
Email: admin@alteneijigroup.com
Password: Admin123!
```

## 🤖 AI Features

Powered by Google Gemini AI:
- **Auto SEO**: Generate meta tags & keywords
- **Social Media**: Create platform-optimized posts
- **Marketing**: Generate campaign strategies

## 📦 Deployment

See [PLESK_DEPLOYMENT.md](./PLESK_DEPLOYMENT.md) for production deployment guide.

## 📄 License

© 2025 Alteneiji Group. All Rights Reserved.
