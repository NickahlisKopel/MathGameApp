# Quick Deploy to Render.com

## Your Server is Ready! 🚀

Everything is configured for Render deployment. Follow these steps:

---

## Step 1: Create a GitHub Repository

### Option A: Using GitHub Desktop (Easier)
1. Download GitHub Desktop from https://desktop.github.com
2. Open GitHub Desktop
3. Click **File** → **Add Local Repository**
4. Browse to `C:\Users\niksu\MathGameApp\server`
5. Click **Add**
6. If prompted "not a git repository", click **create a repository**
7. Click **Publish repository** to GitHub
8. Uncheck "Keep this code private" (or keep checked if you prefer)
9. Click **Publish Repository**

### Option B: Using Command Line
```bash
cd C:\Users\niksu\MathGameApp\server
git init
git add .
git commit -m "Initial server commit"
```

Then go to GitHub.com:
1. Click the **+** icon → **New repository**
2. Name it `mathgame-server`
3. Click **Create repository**

Back in terminal:
```bash
git remote add origin https://github.com/YOUR-USERNAME/mathgame-server.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy on Render

1. **Go to Render.com**
   - Visit https://render.com
   - Click **Get Started** or **Sign Up**
   - Sign up with your GitHub account (easiest)

2. **Create New Web Service**
   - Click **"New +"** button (top right)
   - Select **"Web Service"**

3. **Connect Repository**
   - You'll see a list of your GitHub repositories
   - Find `mathgame-server` and click **"Connect"**
   - (If you don't see it, click "Configure account" to give Render access)

4. **Configure Service**
   Fill in these settings:

   - **Name**: `mathgame-server` (or anything you like)
   - **Region**: Choose closest to your location
   - **Branch**: `main`
   - **Root Directory**: Leave blank (unless server is in a subfolder)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Select **Free**

5. **Create Web Service**
   - Scroll down and click **"Create Web Service"**
   - Render will start building and deploying!

---

## Step 3: Wait for Deployment (2-3 minutes)

You'll see logs like:
```
==> Cloning from https://github.com/...
==> Running 'npm install'
==> Starting service with 'npm start'
==> Server running on port 10000
```

When you see: **"Your service is live 🎉"** - you're done!

---

## Step 4: Get Your Server URL

At the top of the page, you'll see your URL:
```
https://mathgame-server-xxxx.onrender.com
```

Copy this URL!

---

## Step 5: Update Your Mobile App

You need to update the server URL in your React Native app.

### Files to Update:

1. Open: `C:\Users\niksu\MathGameApp\components\FriendsScreen.tsx`
   - Find line ~102: `await socketMultiplayerService.connect('http://192.168.1.214:3000', user, playerProfile.id);`
   - Change to: `await socketMultiplayerService.connect('https://mathgame-server-xxxx.onrender.com', user, playerProfile.id);`

2. Search all files for `192.168.1.214:3000` and replace with your Render URL
   - In VS Code: Press `Ctrl+Shift+F`
   - Search for: `192.168.1.214:3000`
   - Replace all with: `mathgame-server-xxxx.onrender.com` (use your actual URL)

### Important: Use HTTPS, not HTTP!
```
✅ https://mathgame-server-xxxx.onrender.com
❌ http://mathgame-server-xxxx.onrender.com
```

---

## Step 6: Test It!

1. Save all files in your app
2. Reload your Expo app (press `r` in terminal)
3. Try connecting to multiplayer
4. Invite a friend to test!

---

## Monitoring Your Server

### View Logs
1. Go to Render dashboard
2. Click on your service
3. Click **"Logs"** tab
4. See real-time activity

### Check Status
- Green dot = Running
- Yellow = Building
- Red = Error (check logs)

---

## Important: Free Tier Notes

⚠️ **Server sleeps after 15 minutes of inactivity**

What this means:
- If no one uses it for 15 minutes, it goes to sleep
- First connection after sleep takes ~30 seconds
- Then works normally
- This is perfect for testing!

To keep it always on:
- Upgrade to Starter plan ($7/month)
- Or use free tier with first-connection delay

---

## Troubleshooting

### "Build failed"
- Check Render logs for the error
- Usually missing dependency in `package.json`
- Contact me if stuck

### "Can't connect from app"
- Make sure you're using HTTPS
- Check URL is exactly right (no typos)
- No trailing slash in URL
- Look at Render logs to see if connection attempts appear

### "CORS error"
- Server is already configured for CORS
- If issue persists, check Render logs

### "Server keeps sleeping"
- This is normal on free tier
- Upgrade to $7/month for always-on
- Or accept 30-second first-connection delay

---

## Next Steps

✅ Server is deployed
✅ App is updated
✅ Ready to play!

Now you can:
- Share your app with friends
- They can connect from anywhere
- All use the same server

---

## Future Updates

When you update server code:

1. Commit changes to git:
   ```bash
   git add .
   git commit -m "Update server"
   git push
   ```

2. Render auto-deploys! (takes 2-3 minutes)

---

## Questions?

- **Render docs**: https://render.com/docs
- **Check logs**: Always look at Render logs first
- **Test locally**: Run `npm start` to test before deploying

---

## Your Configuration Summary

✅ Port: Auto-configured (Render uses PORT env variable)
✅ Node version: 18.x or higher
✅ Start command: `npm start`
✅ CORS: Enabled for all origins
✅ Ready for production!

