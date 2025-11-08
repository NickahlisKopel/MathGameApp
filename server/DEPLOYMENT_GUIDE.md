# Multiplayer Server Deployment Guide

This guide will walk you through deploying your Math Game multiplayer server so others can connect to it from anywhere.

## Prerequisites

- Your Node.js server code (in the `server` folder)
- A cloud hosting account (see options below)
- Basic understanding of command line/terminal

---

## Option 1: Render.com (Recommended - Free Tier Available)

Render is a modern cloud platform with a generous free tier, perfect for Socket.IO servers.

### Step 1: Prepare Your Server Code

1. Make sure your `server/package.json` has a start script:
```json
{
  "scripts": {
    "start": "node index.js"
  }
}
```

2. Add an environment variable for the port in `server/index.js`:
```javascript
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

3. Create a `server/.gitignore` file if it doesn't exist:
```
node_modules/
.env
```

### Step 2: Create a Git Repository

1. Initialize git in your server folder (if not already done):
```bash
cd server
git init
git add .
git commit -m "Initial server commit"
```

2. Push to GitHub:
   - Create a new repository on GitHub
   - Follow GitHub's instructions to push your code

### Step 3: Deploy on Render

1. Go to [render.com](https://render.com) and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub account and select your repository
4. Configure the service:
   - **Name**: `math-game-server` (or your choice)
   - **Root Directory**: `server` (if server is in subfolder)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Click "Create Web Service"

### Step 4: Configure Environment Variables

In Render dashboard:
1. Go to your service → "Environment"
2. Add any environment variables your server needs
3. Click "Save Changes"

### Step 5: Get Your Server URL

1. Once deployed, Render will give you a URL like: `https://math-game-server.onrender.com`
2. Update your app to use this URL instead of `http://192.168.1.214:3000`

### Step 6: Update Your Mobile App

In your app's socket service, change the server URL:

**services/socketMultiplayerService.ts** or wherever you connect:
```typescript
// OLD:
socketMultiplayerService.connect('http://192.168.1.214:3000', user, playerProfile.id);

// NEW:
socketMultiplayerService.connect('https://math-game-server.onrender.com', user, playerProfile.id);
```

**Important Notes:**
- Render's free tier may sleep after 15 minutes of inactivity
- First connection after sleep takes ~30 seconds to wake up
- Upgrade to paid plan ($7/month) for always-on service

---

## Option 2: Railway.app (Simple, Paid)

Railway is very developer-friendly with a simple pricing model.

### Step 1-2: Same as Render (Prepare code and Git)

### Step 3: Deploy on Railway

1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect Node.js and deploy
5. Click on the service → "Settings" → "Generate Domain" to get public URL

### Step 4: Update Your App

Use the Railway URL in your app:
```typescript
socketMultiplayerService.connect('https://your-app.up.railway.app', user, playerProfile.id);
```

**Pricing:** $5/month for 5 USD of usage credit, pay as you go after that.

---

## Option 3: Heroku (Classic Option)

Heroku is a well-established platform.

### Step 1: Prepare Your Code

1. Ensure `package.json` has engines specified:
```json
{
  "engines": {
    "node": "18.x"
  }
}
```

2. Create a `Procfile` in your server folder:
```
web: node index.js
```

### Step 2: Install Heroku CLI

Download from [heroku.com/cli](https://devcenter.heroku.com/articles/heroku-cli)

### Step 3: Deploy to Heroku

```bash
cd server
heroku login
heroku create math-game-multiplayer
git push heroku main
```

### Step 4: Get Your URL

```bash
heroku open
```

This will show your app URL: `https://math-game-multiplayer.herokuapp.com`

**Pricing:** Free tier no longer available, starts at $7/month.

---

## Option 4: DigitalOcean App Platform

For more control and scalability.

### Step 1-2: Same as Render (Prepare code and Git)

### Step 3: Deploy on DigitalOcean

1. Go to [digitalocean.com](https://www.digitalocean.com) and sign up
2. Navigate to "App Platform" → "Create App"
3. Connect your GitHub repository
4. Configure:
   - **Type**: Web Service
   - **Run Command**: `npm start`
   - **HTTP Port**: 3000
5. Choose your plan (starts at $5/month)
6. Launch app

### Step 4: Get Your URL

DigitalOcean will provide a URL like: `https://math-game-server-xxxxx.ondigitalocean.app`

---

## Option 5: AWS EC2 (Advanced - Full Control)

For experienced users who want complete control.

### Step 1: Launch EC2 Instance

1. Go to AWS Console → EC2 → Launch Instance
2. Choose Ubuntu Server
3. Select instance type (t2.micro for free tier)
4. Configure security group:
   - Allow SSH (port 22) from your IP
   - Allow Custom TCP (port 3000) from anywhere (0.0.0.0/0)
5. Launch and download key pair

### Step 2: Connect to Server

```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### Step 3: Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

### Step 4: Deploy Your Code

```bash
# Upload your server files
scp -i your-key.pem -r server ubuntu@your-ec2-public-ip:~/

# On the server:
cd server
npm install
pm2 start index.js --name "math-game-server"
pm2 startup
pm2 save
```

### Step 5: Set Up Domain (Optional)

1. Get your EC2 public IP
2. Point your domain's A record to this IP
3. Update your app to use: `http://your-domain.com:3000`

**OR** Set up NGINX reverse proxy to use port 80/443

---

## Security Considerations

### 1. Use Environment Variables

Create a `.env` file for sensitive data:
```env
PORT=3000
NODE_ENV=production
```

Install dotenv:
```bash
npm install dotenv
```

Use in your code:
```javascript
require('dotenv').config();
const PORT = process.env.PORT || 3000;
```

### 2. Add Rate Limiting

Install express-rate-limit:
```bash
npm install express-rate-limit
```

Add to your server:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 3. Enable CORS Properly

```javascript
const cors = require('cors');

app.use(cors({
  origin: ['https://your-app-domain.com'],
  credentials: true
}));
```

### 4. Use HTTPS

For production, always use HTTPS. Most platforms (Render, Railway, Heroku) provide free SSL certificates automatically.

---

## Testing Your Deployment

1. **Test with browser:**
   Visit your server URL - you should see a basic response

2. **Test Socket.IO connection:**
   Use a tool like [Socket.IO Client Tool](https://amritb.github.io/socketio-client-tool/)

3. **Test from your app:**
   Update the server URL in your app and test multiplayer functionality

---

## Monitoring Your Server

### Render
- Dashboard shows real-time logs and metrics
- Set up health checks automatically

### Railway
- Built-in logs and metrics dashboard
- Auto-deploys on git push

### PM2 (for EC2/VPS)
```bash
pm2 monit          # Real-time monitoring
pm2 logs           # View logs
pm2 status         # Check status
```

---

## Troubleshooting

### Connection Issues

1. **Check server is running:**
   - Look at platform logs
   - Verify the URL is accessible

2. **Check mobile app URL:**
   - Make sure you're using `https://` not `http://`
   - Ensure no trailing slashes

3. **Socket.IO WebSocket issues:**
   Add fallback transports:
   ```javascript
   io(serverUrl, {
     transports: ['websocket', 'polling']
   });
   ```

### Performance Issues

1. **Server sleeping (Render free tier):**
   - Upgrade to paid plan
   - Or use a service like UptimeRobot to ping every 10 minutes

2. **High latency:**
   - Choose a server location closer to your users
   - Consider upgrading instance size

---

## Cost Comparison

| Platform | Free Tier | Paid | Best For |
|----------|-----------|------|----------|
| **Render** | Yes (with sleep) | $7/month | Getting started |
| **Railway** | $5 credit/month | Pay as you go | Simple deployment |
| **Heroku** | No | $7/month | Established apps |
| **DigitalOcean** | No | $5+/month | Scaling apps |
| **AWS EC2** | Yes (12 months) | Variable | Full control |

---

## Recommended Approach for Your App

1. **Start with Render.com free tier** - Test with friends
2. **Upgrade to Render paid** ($7/month) - Once you have regular users
3. **Move to DigitalOcean/AWS** - If you need to scale significantly

---

## Quick Start Checklist

- [ ] Prepare server code with proper PORT configuration
- [ ] Create Git repository
- [ ] Choose hosting platform
- [ ] Deploy server
- [ ] Get public URL
- [ ] Update mobile app with new server URL
- [ ] Test connection
- [ ] Monitor logs
- [ ] Set up proper security (CORS, rate limiting)
- [ ] Consider HTTPS/SSL
- [ ] Set up monitoring/alerts

---

## Need Help?

Common issues:
- **"Connection refused"** - Check server is running and firewall settings
- **"CORS error"** - Configure CORS in your server
- **"WebSocket error"** - Try polling transport fallback
- **Server sleeps** - Upgrade from free tier or implement keep-alive ping

