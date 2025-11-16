# MongoDB Atlas Setup Guide

## Step 1: Create a MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for a free account (or log in if you have one)
3. Create a new organization (if prompted)
4. Create a new project (e.g., "Sprout" or "Veganify")

## Step 2: Create a Cluster

1. Click **"Create"** or **"Build a Database"**
2. Choose **FREE (M0)** tier
3. Select a cloud provider and region (choose closest to you)
4. Click **"Create"** (takes 1-3 minutes)

## Step 3: Create Database User

1. Go to **Database Access** (left sidebar)
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Enter:
   - **Username**: `sprout_user` (or your choice)
   - **Password**: Create a strong password (save it!)
5. Set user privileges to **"Read and write to any database"**
6. Click **"Add User"**

## Step 4: Whitelist Your IP Address (IMPORTANT!)

**What is IP Whitelisting?**
MongoDB Atlas blocks all connections by default for security. You must tell Atlas which IP addresses are allowed to connect to your database. This is called "whitelisting" or "IP Access List".

**How to Whitelist:**

1. Go to **Network Access** (left sidebar in MongoDB Atlas dashboard)
2. Click **"Add IP Address"** button (green button)
3. You have two options:

   **Option A: Add Your Current IP (Recommended for Development)**
   - Click **"Add Current IP Address"** button
   - This automatically detects and adds your current IP
   - Click **"Confirm"**
   - ✅ **Best for**: Personal development, testing on your computer

   **Option B: Allow Access from Anywhere (Easier but Less Secure)**
   - Click **"Allow Access from Anywhere"**
   - This adds `0.0.0.0/0` which means "allow all IPs"
   - Click **"Confirm"**
   - ⚠️ **Warning**: Less secure, but easier for development
   - ✅ **Best for**: Quick testing, if your IP changes frequently

4. Wait a few seconds for the change to take effect

**Why is this needed?**
- Security: Prevents unauthorized access to your database
- MongoDB Atlas requires it before you can connect
- Without it, you'll get connection timeout errors

**Common Issue:**
If your IP address changes (e.g., you switch WiFi networks), you may need to add the new IP address again.

## Step 5: Get Your Connection String

1. Go to **Database** (left sidebar)
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Select **"Node.js"** and version **"5.5 or later"**
5. Copy the connection string - it looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## Step 6: Format Your Connection String

Replace the placeholders in the connection string:

**Before:**
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

**After (replace with your actual values):**
```
mongodb+srv://sprout_user:your_password_here@cluster0.xxxxx.mongodb.net/sprout?retryWrites=true&w=majority
```

**Important:**
- Replace `<username>` with your database username (e.g., `sprout_user`)
- Replace `<password>` with your database password
- Replace `cluster0.xxxxx` with your actual cluster name
- Add database name after `.net/` (e.g., `/sprout` or `/veganify`)

## Step 7: Add to .env File

Create or update your `.env` file in the `backend` folder:

```env
MONGO_URI=mongodb+srv://sprout_user:your_password@cluster0.xxxxx.mongodb.net/sprout?retryWrites=true&w=majority
GEMINI_API_KEY=your_gemini_api_key_here
PORT=4000
```

**⚠️ Important:**
- URL-encode special characters in your password (e.g., `@` becomes `%40`, `#` becomes `%23`)
- Don't use quotes around the URI in .env file
- Make sure there are no spaces

## Step 8: Test the Connection

Run your server:
```bash
cd backend
npm start
```

You should see:
```
✅ MongoDB connected successfully
   Database: sprout
   Host: cluster0.xxxxx.mongodb.net
✅ Server listening on http://localhost:4000
```

## Common Issues & Solutions

### ❌ "Authentication failed"
- **Fix**: Check username and password in connection string
- **Fix**: Make sure password is URL-encoded if it has special characters

### ❌ "ENOTFOUND" or "getaddrinfo"
- **Fix**: Check cluster URL is correct
- **Fix**: Make sure your IP is whitelisted in Network Access

### ❌ "Connection timeout"
- **Fix**: Check your internet connection
- **Fix**: Verify IP whitelist includes your current IP
- **Fix**: Try "Allow Access from Anywhere" (0.0.0.0/0) for testing

### ❌ "Invalid connection string"
- **Fix**: Make sure it starts with `mongodb+srv://` (for Atlas)
- **Fix**: Check for typos or missing parts
- **Fix**: Remove any quotes around the URI in .env

### ❌ "MongooseError: The `uri` parameter to `openUri()` must be a string"
- **Fix**: Make sure MONGO_URI is defined in .env
- **Fix**: Check .env file is in the `backend` folder
- **Fix**: Restart the server after changing .env

## Using Local MongoDB (Alternative)

If you prefer local MongoDB instead of Atlas:

1. Install MongoDB locally: https://www.mongodb.com/try/download/community
2. Start MongoDB service
3. Use connection string:
   ```
   mongodb://localhost:27017/veganify
   ```

## Quick Setup Command

You can also use the setup script:

```bash
cd backend
node setup.js MONGO_URI="mongodb+srv://username:password@cluster.mongodb.net/sprout?retryWrites=true&w=majority" GEMINI_API_KEY="your_key"
```

Replace with your actual values!

