# MongoDB Atlas Setup Guide

Follow these steps to set up free persistent storage for your Math Game server.

## Step 1: Create MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up with your email (or use Google/GitHub)
3. Choose the **FREE** tier (M0 Sandbox)
4. Click **Create**

## Step 2: Create a Cluster

1. After signing up, you'll see "Create a deployment"
2. Choose **M0 FREE** tier
3. Select a cloud provider and region (choose closest to you):
   - AWS, Google Cloud, or Azure
   - Region: Pick one close to where your users are
4. Cluster Name: Leave as default or name it `mathgame`
5. Click **Create Deployment**

## Step 3: Create Database User

You'll see a "Security Quickstart" screen:

1. **Authentication Method**: Username and Password
2. **Username**: `mathgameuser` (or your choice)
3. **Password**: Click "Autogenerate Secure Password" 
   - **SAVE THIS PASSWORD!** Copy it somewhere safe
4. Click **Create Database User**

## Step 4: Set Network Access

1. Click **Add entries to your IP Access List**
2. Choose **"Allow access from anywhere"** (for cloud deployment)
   - This adds `0.0.0.0/0` which is needed for Render
3. Click **Add Entry**
4. Click **Finish and Close**

## Step 5: Get Connection String

1. Click **Connect** on your cluster
2. Choose **Drivers**
3. Select **Node.js** and version **4.1 or later**
4. Copy the connection string - it looks like:
   ```
   mongodb+srv://mathgameuser:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. **Replace `<password>` with your actual password**
6. **Add database name**: Change the string to:
   ```
   mongodb+srv://mathgameuser:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/mathgame?retryWrites=true&w=majority
   ```

## Step 6: Add to Render Environment Variables

1. Go to your Render dashboard: https://dashboard.render.com
2. Click on your `mathgameapp` service
3. Go to **Environment** (left sidebar)
4. Click **Add Environment Variable**
5. Add:
   - **Key**: `MONGODB_URI`
   - **Value**: Your full connection string (with password and database name)
6. Click **Save Changes**

Render will automatically redeploy with the new environment variable.

## Step 7: Test

Once deployed:
1. Check Render logs - you should see `[Database] Connected to MongoDB`
2. Add a friend in your app
3. Restart the server (or wait for it to sleep/wake)
4. Friends should still be there! ✅

## Troubleshooting

### "Authentication failed"
- Check that password is correct in connection string
- No special characters should be URL-encoded (use %40 for @, %23 for #, etc.)

### "Connection timeout"
- Make sure IP access list includes `0.0.0.0/0`
- Check your connection string format

### "Database not found"
- MongoDB will create it automatically on first write
- Make sure database name is in the connection string

## What's Next?

Your data will now persist across server restarts! The free tier includes:
- 512 MB storage (plenty for user data)
- Shared RAM and CPU
- Perfect for development and small apps

## Connection String Format

Complete format with all parts:
```
mongodb+srv://USERNAME:PASSWORD@CLUSTER.xxxxx.mongodb.net/DATABASE?retryWrites=true&w=majority
```

Example (with fake data):
```
mongodb+srv://mathgameuser:MyP@ssw0rd123@cluster0.abc123.mongodb.net/mathgame?retryWrites=true&w=majority
```

If password has special characters, URL encode them:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`

