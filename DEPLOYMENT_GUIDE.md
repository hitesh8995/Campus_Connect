# 🚀 Campus Connect — Complete Deployment Guide

> A step-by-step guide to deploy the Campus Connect application to production. This covers every detail from pre-deployment preparation to post-deployment monitoring.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Pre-Deployment Checklist](#3-pre-deployment-checklist)
4. [Option A: Deploy on Render (Recommended for Beginners)](#4-option-a-deploy-on-render-recommended-for-beginners)
5. [Option B: Deploy on Railway](#5-option-b-deploy-on-railway)
6. [Option C: Deploy on AWS / DigitalOcean / VPS](#6-option-c-deploy-on-aws--digitalocean--vps)
7. [Option D: Deploy on Vercel (Frontend) + Render (Backend)](#7-option-d-deploy-on-vercel-frontend--render-backend)
8. [Database Setup (MongoDB Atlas)](#8-database-setup-mongodb-atlas)
9. [Environment Variables — Production Configuration](#9-environment-variables--production-configuration)
10. [Email (SMTP) Configuration](#10-email-smtp-configuration)
11. [Razorpay Payment Gateway (Production)](#11-razorpay-payment-gateway-production)
12. [Domain & SSL/HTTPS Setup](#12-domain--sslhttps-setup)
13. [Security Hardening Checklist](#13-security-hardening-checklist)
14. [Post-Deployment Verification](#14-post-deployment-verification)
15. [Monitoring & Maintenance](#15-monitoring--maintenance)
16. [Troubleshooting](#16-troubleshooting)
17. [Cost Breakdown](#17-cost-breakdown)

---

## 1. Architecture Overview

Campus Connect is a **MERN stack** application with the following architecture:

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│                     │     │                      │     │                     │
│   Frontend (React)  │────▶│   Backend (Express)  │────▶│  MongoDB Atlas      │
│   Vite + Tailwind   │     │   Node.js API        │     │  (Cloud Database)   │
│                     │     │                      │     │                     │
└─────────────────────┘     └──────────┬───────────┘     └─────────────────────┘
                                       │
                            ┌──────────┴───────────┐
                            │                      │
                     ┌──────┴──────┐        ┌──────┴──────┐
                     │  Razorpay   │        │  SMTP Email │
                     │  Payments   │        │  (Gmail)    │
                     └─────────────┘        └─────────────┘
```

### Tech Stack Summary

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | React 19, Vite 7, TypeScript, TailwindCSS 3 | User Interface |
| Backend | Express.js 4, Node.js | REST API Server |
| Database | MongoDB (Mongoose 8) | Data Storage |
| Auth | JWT (Access + Refresh Tokens), bcryptjs | Authentication |
| Payments | Razorpay | Event Fee Collection |
| Email | Nodemailer (SMTP/Gmail) | OTP Verification, Notifications |
| QR Codes | qrcode + qrcode.react | Ticket Generation & Verification |
| Security | Helmet, express-rate-limit, CORS | API Protection |
| Logging | Winston | Server Logging |

---

## 2. Prerequisites

Before starting deployment, ensure you have:

### Accounts Required
- [ ] **GitHub** account (to host your code repository)
- [ ] **MongoDB Atlas** account (free tier available) — [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)
- [ ] **Hosting platform** account (Render / Railway / Vercel / AWS)
- [ ] **Razorpay** account (for payments) — [https://razorpay.com](https://razorpay.com)
- [ ] **Gmail** account with App Password OR an SMTP service provider
- [ ] **Domain name** (optional, but recommended for production)

### Tools Required on Your Machine
- [ ] **Node.js** v18+ (`node --version`)
- [ ] **npm** v9+ (`npm --version`)
- [ ] **Git** installed (`git --version`)
- [ ] A modern **web browser** for testing

### Install Git (if not installed)
```bash
# Windows
winget install Git.Git

# macOS
brew install git

# Linux (Ubuntu/Debian)
sudo apt install git
```

---

## 3. Pre-Deployment Checklist

> [!CAUTION]
> Complete ALL of these steps before deploying. Skipping any step can expose your application to security vulnerabilities or cause deployment failures.

### 3.1 Push Code to GitHub

```bash
# Navigate to your project root
cd CAMPUS____CONNECT

# Initialize git (if not already)
git init

# Create .gitignore (CRITICAL - prevents secrets from being committed)
```

Create or verify your `.gitignore` file contains:

```gitignore
# Dependencies
node_modules/

# Environment variables (NEVER commit these)
.env
.env.local
.env.production

# Build output
dist/
build/

# Logs
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
```

> [!CAUTION]
> **NEVER commit `.env` files to Git.** They contain secrets (JWT keys, database passwords, API keys). If you accidentally committed them, rotate ALL secrets immediately.

```bash
# Stage all files
git add .

# Commit
git commit -m "Initial commit - Campus Connect"

# Add your GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/campus-connect.git

# Push
git branch -M main
git push -u origin main
```

### 3.2 Test the Production Build Locally

```bash
# Frontend — Build for production
cd app
npm run build

# Check for TypeScript errors
# If the build succeeds, you'll see a 'dist' folder

# Backend — Test with NODE_ENV=production
cd backend
set NODE_ENV=production    # Windows
# export NODE_ENV=production  # macOS/Linux
node server.js
```

### 3.3 Generate Strong Secrets

> [!IMPORTANT]
> Never use the default secrets from `.env.example` in production. Generate cryptographically strong secrets.

```bash
# Generate JWT_SECRET (run in Node.js or terminal)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate JWT_REFRESH_SECRET (run again for a different key)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate TICKET_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Save these somewhere safe** — you'll need them for the environment variables.

---

## 4. Option A: Deploy on Render (Recommended for Beginners)

**Render** is the easiest platform for deploying full-stack MERN applications for free.

### 4.1 Deploy the Backend API

1. **Go to** [https://render.com](https://render.com) and sign up / log in
2. Click **"New +"** → **"Web Service"**
3. **Connect your GitHub** repository
4. Configure the service:

| Setting | Value |
|---------|-------|
| **Name** | `campus-connect-api` |
| **Region** | Choose closest to your users |
| **Branch** | `main` |
| **Root Directory** | `app/backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Instance Type** | Free (or Starter for production) |

5. Click **"Advanced"** → **"Add Environment Variable"** and add ALL variables from [Section 9](#9-environment-variables--production-configuration)

6. Click **"Create Web Service"**

7. **Wait** for the deployment to complete (3-5 minutes)

8. **Copy your backend URL** (e.g., `https://campus-connect-api.onrender.com`)

### 4.2 Deploy the Frontend

1. Click **"New +"** → **"Static Site"**
2. Connect the same GitHub repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `campus-connect` |
| **Branch** | `main` |
| **Root Directory** | `app` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

4. Add environment variables:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://campus-connect-api.onrender.com/api` |
| `VITE_RAZORPAY_KEY_ID` | Your Razorpay Key ID |

5. Click **"Create Static Site"**

> [!NOTE]
> Render's free tier has a "cold start" — the backend sleeps after 15 minutes of inactivity and takes ~30 seconds to wake up. Upgrade to the Starter plan ($7/month) to avoid this.

### 4.3 Update Backend CORS

After deploying the frontend, update the backend's `FRONTEND_URL` environment variable:

```
FRONTEND_URL=https://campus-connect.onrender.com
```

---

## 5. Option B: Deploy on Railway

**Railway** provides a more developer-friendly experience with better performance.

### 5.1 Deploy Backend

1. Go to [https://railway.app](https://railway.app) and sign up
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Select your repository
4. Railway will auto-detect the Node.js app
5. Click on the service → **"Settings"**:
   - **Root Directory**: `app/backend`
   - **Start Command**: `node server.js`
6. Go to **"Variables"** tab and add all environment variables from [Section 9](#9-environment-variables--production-configuration)
7. Railway will auto-deploy on every push

### 5.2 Deploy Frontend

1. Create another service in the same project
2. **Root Directory**: `app`
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npx serve dist -s`
5. Add frontend environment variables:
   - `VITE_API_URL` = Your Railway backend URL + `/api`
   - `VITE_RAZORPAY_KEY_ID` = Your Razorpay key

### 5.3 Add MongoDB (Optional — Railway Managed)

Railway offers managed MongoDB:
1. Click **"New"** → **"Database"** → **"MongoDB"**
2. Copy the connection string
3. Set it as `MONGO_URI` in your backend variables

---

## 6. Option C: Deploy on AWS / DigitalOcean / VPS

> [!WARNING]
> This option requires more DevOps knowledge. Use only if you're comfortable with Linux server administration.

### 6.1 Provision a Server

**DigitalOcean Droplet** (recommended for simplicity):
- **OS**: Ubuntu 22.04 LTS
- **Plan**: Basic $6/month (1 vCPU, 1GB RAM)
- **Region**: Choose closest to your users

**AWS EC2**:
- **AMI**: Ubuntu 22.04
- **Instance Type**: t2.micro (free tier eligible)
- **Security Group**: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)

### 6.2 Initial Server Setup

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Update packages
sudo apt update && sudo apt upgrade -y

# Create a non-root user (SECURITY: Never run apps as root)
adduser deploy
usermod -aG sudo deploy
su - deploy

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version
npm --version

# Install PM2 (Process Manager - keeps your app running)
sudo npm install -g pm2

# Install Nginx (Reverse Proxy)
sudo apt install -y nginx

# Install Certbot (SSL certificates)
sudo apt install -y certbot python3-certbot-nginx
```

### 6.3 Clone and Setup Application

```bash
# Clone your repo
cd /home/deploy
git clone https://github.com/YOUR_USERNAME/campus-connect.git
cd campus-connect

# Setup Backend
cd app/backend
npm install --production
cp .env.example .env
nano .env    # Edit with your production values (see Section 9)

# Setup Frontend
cd ../
npm install
```

### 6.4 Create Frontend Production Build

```bash
# Create frontend .env
cd /home/deploy/campus-connect/app
nano .env
```

Add:
```
VITE_API_URL=https://yourdomain.com/api
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

```bash
# Build the frontend
npm run build
```

### 6.5 Start Backend with PM2

```bash
cd /home/deploy/campus-connect/app/backend

# Start with PM2
pm2 start server.js --name "campus-connect-api"

# Save PM2 process list
pm2 save

# Setup PM2 to start on reboot
pm2 startup
# Run the command PM2 outputs
```

### 6.6 Configure Nginx as Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/campus-connect
```

Paste the following configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend - Serve static files
    location / {
        root /home/deploy/campus-connect/app/dist;
        index index.html;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API - Proxy to Node.js
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Disable server version disclosure
    server_tokens off;

    # Request size limit (for file uploads)
    client_max_body_size 10M;
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/campus-connect /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 6.7 Setup SSL with Certbot (HTTPS)

```bash
# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot will automatically:
# 1. Obtain the certificate
# 2. Modify Nginx config to redirect HTTP → HTTPS
# 3. Set up auto-renewal

# Test auto-renewal
sudo certbot renew --dry-run
```

### 6.8 Setup Firewall

```bash
# Allow SSH, HTTP, HTTPS only
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

> [!CAUTION]
> **NEVER expose port 5000 directly.** Always use Nginx as a reverse proxy. Port 5000 should only be accessible from localhost.

---

## 7. Option D: Deploy on Vercel (Frontend) + Render (Backend)

This is a **hybrid approach** — Vercel excels at static/React hosting, while Render handles the backend.

### 7.1 Deploy Frontend on Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign up
2. Click **"Import Project"** → Connect GitHub
3. Select your repository
4. Configure:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `app` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

5. Add environment variables:
   - `VITE_API_URL` = `https://campus-connect-api.onrender.com/api`
   - `VITE_RAZORPAY_KEY_ID` = Your Razorpay key

6. Add a `vercel.json` in the `app/` directory for SPA routing:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

7. Click **"Deploy"**

### 7.2 Deploy Backend on Render

Follow [Section 4.1](#41-deploy-the-backend-api) above.

---

## 8. Database Setup (MongoDB Atlas)

> [!IMPORTANT]
> **Never use a local MongoDB in production.** Use MongoDB Atlas for reliability, backups, and security.

### 8.1 Create a Cluster

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and sign up
2. Click **"Build a Database"**
3. Choose **"M0 Free"** tier (512MB, free forever)
4. Select your **cloud provider** (AWS recommended) and **region** (closest to your server)
5. Name your cluster: `campus-connect`
6. Click **"Create"**

### 8.2 Create Database User

1. Go to **"Database Access"** (left sidebar)
2. Click **"Add New Database User"**
3. Authentication Method: **Password**
4. Username: `campus_connect_admin`
5. Password: **Click "Autogenerate Secure Password"** and **save it**
6. Database User Privileges: **"Read and Write to Any Database"**
7. Click **"Add User"**

> [!CAUTION]
> **Use a strong, unique password.** Never use the same password as your other accounts. Save it in a password manager.

### 8.3 Configure Network Access

1. Go to **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. For Render/Railway/Vercel: Add **`0.0.0.0/0`** (allow access from anywhere)
   - This is safe because the database is password-protected
4. For VPS: Add your **server's specific IP address** for extra security
5. Click **"Confirm"**

### 8.4 Get Connection String

1. Go to **"Database"** → **"Connect"**
2. Choose **"Drivers"** → **Node.js**
3. Copy the connection string:
```
mongodb+srv://campus_connect_admin:<PASSWORD>@campus-connect.xxxxx.mongodb.net/college_events?retryWrites=true&w=majority
```
4. **Replace `<PASSWORD>`** with the password from Step 8.2
5. **Add database name** (`college_events`) after `.net/`

### 8.5 Enable Database Backups

1. Go to your cluster → **"Backup"**
2. Free tier: Manual snapshots only
3. **M2+ tier**: Enable **Automatic Continuous Backups**
   - Backup Frequency: Every 6 hours (recommended)
   - Retention: 7 days

### 8.6 Create Admin User in Production Database

After the backend is deployed and connected to Atlas, create the first superadmin user. Use the application's signup flow, then manually promote the user:

```bash
# Connect to your Atlas database using mongosh
mongosh "mongodb+srv://campus_connect_admin:<PASSWORD>@campus-connect.xxxxx.mongodb.net/college_events"

# Promote a user to superadmin
db.users.updateOne(
  { email: "admin@yourinstitution.edu" },
  {
    $set: {
      role: "superadmin",
      approvalStatus: "approved"
    }
  }
)
```

---

## 9. Environment Variables — Production Configuration

### 9.1 Backend Environment Variables

> [!CAUTION]
> Every single value below marked with ⚠️ MUST be changed from the defaults. Using default secrets in production is a critical security vulnerability.

| Variable | Production Value | Notes |
|----------|-----------------|-------|
| `PORT` | `5000` | Or use `$PORT` (Render/Railway set this automatically) |
| `NODE_ENV` | `production` | ⚠️ MUST be `production` |
| `FRONTEND_URL` | `https://yourdomain.com` | ⚠️ Your deployed frontend URL |
| `MONGO_URI` | `mongodb+srv://...` | ⚠️ MongoDB Atlas connection string |
| `JWT_SECRET` | (64-char hex string) | ⚠️ Generate with `crypto.randomBytes(64)` |
| `JWT_REFRESH_SECRET` | (64-char hex string) | ⚠️ Different from JWT_SECRET |
| `JWT_EXPIRE` | `1h` | Access token lifetime |
| `JWT_REFRESH_EXPIRE` | `7d` | Refresh token lifetime |
| `RZP_KEY_ID` | `rzp_live_...` | ⚠️ Razorpay LIVE key (not test) |
| `RZP_KEY_SECRET` | (from Razorpay dashboard) | ⚠️ Razorpay LIVE secret |
| `SMTP_HOST` | `smtp.gmail.com` | Or your SMTP provider |
| `SMTP_PORT` | `587` | TLS port |
| `SMTP_SECURE` | `false` | Use `true` for port 465 |
| `SMTP_USER` | `your-email@gmail.com` | ⚠️ Your actual email |
| `SMTP_PASS` | (Gmail App Password) | ⚠️ NOT your Gmail password |
| `FROM_EMAIL` | `Campus Connect <noreply@yourdomain.com>` | Display name in emails |
| `OTP_EXPIRE_MINUTES` | `5` | OTP validity period |
| `OTP_MAX_ATTEMPTS` | `5` | Max OTP attempts |
| `TICKET_SECRET` | (32-char hex string) | ⚠️ For QR code signing |
| `LOG_LEVEL` | `warn` | Reduce noise in production |

### 9.2 Frontend Environment Variables

| Variable | Production Value |
|----------|-----------------|
| `VITE_API_URL` | `https://your-backend-url.com/api` |
| `VITE_RAZORPAY_KEY_ID` | Your Razorpay Key ID (same as backend) |

> [!IMPORTANT]
> Frontend env vars prefixed with `VITE_` are embedded at **build time**, not runtime. You must rebuild the frontend whenever you change them.

---

## 10. Email (SMTP) Configuration

### 10.1 Gmail App Password Setup

> [!WARNING]
> Never use your actual Gmail password. Always use an App Password.

1. Go to [https://myaccount.google.com/security](https://myaccount.google.com/security)
2. Ensure **2-Factor Authentication** is enabled
3. Go to **"App passwords"** (search in the security settings)
4. Select **"Mail"** and generate a password
5. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)
6. Use this as `SMTP_PASS` in your environment (remove spaces)

### 10.2 Alternative: Use a Transactional Email Service

For higher volume or reliability, consider:

| Service | Free Tier | Setup |
|---------|-----------|-------|
| **SendGrid** | 100 emails/day | SMTP relay or API |
| **Mailgun** | 100 emails/day | SMTP relay |
| **Amazon SES** | 62,000 emails/month (with EC2) | AWS SDK |
| **Resend** | 100 emails/day | API-based |

Example for SendGrid:
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your-sendgrid-api-key
```

---

## 11. Razorpay Payment Gateway (Production)

### 11.1 Switch from Test to Live Mode

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Complete **KYC verification** (mandatory for live mode)
3. Go to **"Settings"** → **"API Keys"**
4. Generate **Live API Keys**
5. Copy `Key ID` (`rzp_live_...`) and `Key Secret`
6. Update environment variables:
   - Backend: `RZP_KEY_ID`, `RZP_KEY_SECRET`
   - Frontend: `VITE_RAZORPAY_KEY_ID`

### 11.2 Webhook Configuration

1. In Razorpay Dashboard → **"Webhooks"**
2. Add webhook URL: `https://your-backend.com/api/payments/webhook`
3. Select events:
   - `payment.captured`
   - `payment.failed`
   - `refund.processed`
4. Copy the **Webhook Secret** and add it as an env variable

### 11.3 Precautions

> [!CAUTION]
> - **Test thoroughly** in test mode before switching to live
> - **Never log** Razorpay key secrets in production
> - **Verify payment signatures** server-side (already implemented)
> - **Set up refund policies** before going live

---

## 12. Domain & SSL/HTTPS Setup

### 12.1 Purchase a Domain

Recommended domain registrars:
- **Namecheap** — [https://www.namecheap.com](https://www.namecheap.com)
- **Cloudflare Registrar** — [https://www.cloudflare.com/products/registrar](https://www.cloudflare.com/products/registrar) (cheapest)
- **Google Domains** — [https://domains.google](https://domains.google)
- **GoDaddy** — [https://www.godaddy.com](https://www.godaddy.com)

### 12.2 DNS Configuration

Point your domain to your hosting:

**For Render:**
- Add a custom domain in Render dashboard
- Create a `CNAME` record: `@` → `campus-connect.onrender.com`

**For VPS:**
- Create an `A` record: `@` → `YOUR_SERVER_IP`
- Create a `CNAME` record: `www` → `yourdomain.com`

**For Vercel:**
- Add domain in Vercel dashboard
- Follow Vercel's DNS instructions

### 12.3 SSL/HTTPS

> [!IMPORTANT]
> HTTPS is **mandatory** for production. Without it, login credentials and payment info are sent in plaintext.

- **Render / Railway / Vercel**: SSL is **automatic** — no setup needed
- **VPS**: Use Certbot (see [Section 6.7](#67-setup-ssl-with-certbot-https))
- **Cloudflare**: Enable "Full (Strict)" SSL mode for even more security

---

## 13. Security Hardening Checklist

> [!CAUTION]
> Go through every item before your application goes live.

### 13.1 Application Security

- [ ] **Change ALL default secrets** (JWT_SECRET, JWT_REFRESH_SECRET, TICKET_SECRET)
- [ ] **Set `NODE_ENV=production`** — Disables verbose error messages
- [ ] **HTTPS everywhere** — Both frontend and backend must use HTTPS
- [ ] **CORS configured correctly** — `FRONTEND_URL` must be your exact frontend domain (not `*`)
- [ ] **Rate limiting is active** — Already configured (100 req/15min general, 5 req/15min for auth)
- [ ] **Helmet.js is active** — Already configured (sets security headers)
- [ ] **Input validation** — Already using `express-validator`
- [ ] **Password hashing** — Already using `bcryptjs` (10 salt rounds)

### 13.2 Database Security

- [ ] **Use MongoDB Atlas** — Not a local MongoDB instance
- [ ] **Strong database password** — At least 20 characters, mixed case, numbers, symbols
- [ ] **Network Access whitelist** — Restrict to server IPs if possible
- [ ] **Enable Atlas Auditing** — Track database access (M10+ tier)
- [ ] **Regular backups** — Enable automated backups

### 13.3 Server Security (VPS Only)

- [ ] **Non-root user** — Never run the application as root
- [ ] **SSH key authentication** — Disable password login
- [ ] **Firewall enabled** — Only allow ports 22, 80, 443
- [ ] **Auto security updates** — Enable unattended-upgrades
- [ ] **Fail2ban installed** — Blocks brute-force SSH attempts

```bash
# Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Install Fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 13.4 Code & Repository Security

- [ ] **`.env` in `.gitignore`** — NEVER commit secrets
- [ ] **No secrets in code** — All secrets via environment variables
- [ ] **Dependencies updated** — Run `npm audit fix` periodically
- [ ] **No console.log with sensitive data** — Remove debug logs before deploying

### 13.5 Payment Security

- [ ] **Razorpay live keys** — Not test keys
- [ ] **Payment verification server-side** — Already done (signature verification)
- [ ] **Webhook secret configured** — Verify webhook authenticity
- [ ] **Amount verification** — Backend verifies payment amount matches event fee

---

## 14. Post-Deployment Verification

After deploying, verify everything works:

### 14.1 Health Check

```bash
# Check backend health
curl https://your-backend-url.com/api/health
# Expected: {"status":"OK","timestamp":"..."}
```

### 14.2 Functional Testing Checklist

| Test | URL / Action | Expected Result |
|------|-------------|-----------------|
| ✅ Home Page loads | `https://yourdomain.com` | Displays landing page |
| ✅ Login works | Try logging in | Redirects to dashboard |
| ✅ Signup + OTP | Create new account | Receives OTP email |
| ✅ Admin dashboard | `/admin/dashboard` | Shows stats |
| ✅ Faculty panel | `/faculty/dashboard` | Shows events |
| ✅ Coordinator panel | `/coordinator/dashboard` | Shows events |
| ✅ Student panel | `/student/dashboard` | Shows registrations |
| ✅ Event creation | Create a test event | Event appears in listing |
| ✅ Event registration | Register for event | Ticket with QR generated |
| ✅ Payment flow | Pay for a paid event | Razorpay checkout works |
| ✅ QR ticket scan | Scan ticket QR code | Verification succeeds |
| ✅ Mobile responsiveness | Open on phone | Responsive layout works |

### 14.3 Performance Check

```bash
# Test response time
curl -w "@curl-format.txt" -o /dev/null -s https://your-backend-url.com/api/health

# Or use online tools:
# - https://tools.pingdom.com
# - https://www.webpagetest.org
# - https://pagespeed.web.dev
```

---

## 15. Monitoring & Maintenance

### 15.1 Application Monitoring

| Tool | Free Tier | Purpose |
|------|-----------|---------|
| **UptimeRobot** | 50 monitors | Uptime monitoring & alerts |
| **Sentry** | 5K events/month | Error tracking & alerting |
| **LogRocket** | 1K sessions/month | Frontend session replay |
| **Render/Railway Dashboard** | Built-in | Server logs & metrics |

### 15.2 Set Up UptimeRobot (Free)

1. Go to [https://uptimerobot.com](https://uptimerobot.com) and sign up
2. Add a monitor:
   - Type: **HTTP(s)**
   - URL: `https://your-backend-url.com/api/health`
   - Interval: 5 minutes
3. Add your email for alerts

### 15.3 Regular Maintenance Tasks

| Task | Frequency | Command/Action |
|------|-----------|----------------|
| Update dependencies | Monthly | `npm audit fix` |
| Check error logs | Weekly | Render/Railway logs dashboard |
| Database backup verification | Monthly | Test restore from backup |
| SSL certificate renewal | Auto (Certbot) | `sudo certbot renew --dry-run` |
| Rotate JWT secrets | Quarterly | Generate new secrets, redeploy |
| Check disk usage | Monthly | `df -h` (VPS only) |
| Review audit logs | Weekly | Admin Panel → Audit Logs |

### 15.4 Deployment Updates

```bash
# For VPS deployment — updating the application
cd /home/deploy/campus-connect
git pull origin main

# Rebuild frontend
cd app
npm install
npm run build

# Restart backend
cd backend
npm install --production
pm2 restart campus-connect-api
```

For Render / Railway / Vercel — push to `main` branch and they auto-deploy.

---

## 16. Troubleshooting

### Common Issues and Solutions

| Problem | Cause | Solution |
|---------|-------|----------|
| **502 Bad Gateway** | Backend crashed | Check server logs, restart PM2 |
| **CORS errors** | `FRONTEND_URL` mismatch | Ensure exact URL match (with https://) |
| **MongoDB connection fails** | Wrong URI or IP not whitelisted | Check Atlas Network Access settings |
| **Emails not sending** | Wrong SMTP credentials | Verify Gmail App Password, check spam |
| **Razorpay errors** | Test keys in production | Switch to live keys after KYC |
| **White screen (frontend)** | Build failed or routing issue | Check build logs, verify `dist/` exists |
| **Slow cold starts (Render)** | Free tier spin-down | Upgrade to Starter plan ($7/month) |
| **"Route not found" errors** | SPA routing not configured | Add rewrite rules (Nginx/Vercel) |
| **JWT expired** | Token lifetime too short | Increase `JWT_EXPIRE` or check clock sync |
| **Rate limit hit** | Too many requests | Adjust limits or add user to whitelist |

### View Logs

```bash
# PM2 logs (VPS)
pm2 logs campus-connect-api

# Render — Dashboard → Logs tab
# Railway — Dashboard → Deployments → Logs
```

---

## 17. Cost Breakdown

### Free Tier Setup (Ideal for college projects & demos)

| Service | Plan | Cost |
|---------|------|------|
| **Render** (Backend) | Free | $0/month |
| **Render** (Frontend) | Free Static | $0/month |
| **MongoDB Atlas** | M0 Free (512MB) | $0/month |
| **Gmail SMTP** | Free | $0/month |
| **Razorpay** | 2% transaction fee | Per transaction |
| **UptimeRobot** | Free (50 monitors) | $0/month |
| **Total** | | **$0/month** |

### Production Setup (Recommended for live use)

| Service | Plan | Cost |
|---------|------|------|
| **Render** (Backend) | Starter | $7/month |
| **Vercel** (Frontend) | Free / Pro | $0-20/month |
| **MongoDB Atlas** | M2 Shared | $9/month |
| **SendGrid** (Email) | Free / Essentials | $0-20/month |
| **Domain** | .com | ~$10/year |
| **Razorpay** | 2% transaction fee | Per transaction |
| **Total** | | **~$17-56/month** |

### Enterprise Setup (High traffic, high availability)

| Service | Plan | Cost |
|---------|------|------|
| **AWS EC2** | t3.small | ~$15/month |
| **MongoDB Atlas** | M10 Dedicated | $57/month |
| **AWS SES** (Email) | Pay per use | ~$1/month |
| **Cloudflare** (CDN + DNS) | Free/Pro | $0-20/month |
| **Domain** | .com | ~$10/year |
| **Total** | | **~$73-93/month** |

---

## Quick Reference: Deployment Decision Matrix

| If you want... | Use |
|----------------|-----|
| **Fastest & easiest** | Render (frontend + backend) |
| **Best performance (free)** | Vercel (frontend) + Railway (backend) |
| **Full control** | VPS (DigitalOcean / AWS EC2) |
| **Auto-scaling** | AWS Elastic Beanstalk / Google Cloud Run |
| **College demo** | Render Free Tier |

---

> [!TIP]
> **Pro tip for college projects:** Start with the **free tier** setup. You can always upgrade later when your application gets real traffic. The free tier is more than enough for demos, presentations, and moderate usage.

---

*Last updated: February 15, 2026*
*Campus Connect v1.0 — College Event Management System*
