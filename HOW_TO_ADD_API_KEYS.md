# 🔑 How to Add Your API Keys

I've created everything you need! Here are **3 easy ways** to add your API keys:

## Method 1: Quick Command (Easiest) ⚡

If you have both keys ready, just run:

```bash
cd backend
node create-env.js "your_mongodb_uri" "your_gemini_api_key"
```

**Example:**
```bash
node create-env.js "mongodb+srv://user:pass@cluster.mongodb.net/sprout" "AIzaSyD1234567890"
```

## Method 2: Setup Script with Named Parameters

```bash
cd backend
node setup.js MONGO_URI="your_mongodb_uri" GEMINI_API_KEY="your_gemini_api_key"
```

## Method 3: Manual (Edit File)

1. Go to `backend` folder
2. Copy `.env.template` to `.env`:
   ```bash
   cp .env.template .env
   ```
3. Open `.env` in a text editor
4. Replace the placeholder values with your actual keys

---

## 📋 What You Need:

### 1. MongoDB URI
- **Get it from:** https://www.mongodb.com/cloud/atlas
- **Steps:**
  1. Create free account
  2. Create a cluster (free tier is fine)
  3. Click "Connect" → "Connect your application"
  4. Copy the connection string
  5. Replace `<password>` with your database password

**Format:** `mongodb+srv://username:password@cluster.mongodb.net/sprout?retryWrites=true&w=majority`

### 2. Gemini API Key
- **Get it from:** https://makersuite.google.com/app/apikey
- **Steps:**
  1. Sign in with Google
  2. Click "Create API Key"
  3. Copy the key

**Format:** `AIzaSyD...` (long string)

---

## ✅ After Adding Keys:

1. **Install dependencies** (first time only):
   ```bash
   npm install
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

3. **Test it**: Open http://localhost:4000 in browser

4. **Run iOS app**: It will connect automatically!

---

## 🎯 Quick Example:

If your keys are:
- MongoDB: `mongodb+srv://john:password123@cluster0.abc123.mongodb.net/sprout`
- Gemini: `AIzaSyD_abcdefghijklmnopqrstuvwxyz1234567890`

Run:
```bash
node create-env.js "mongodb+srv://john:password123@cluster0.abc123.mongodb.net/sprout" "AIzaSyD_abcdefghijklmnopqrstuvwxyz1234567890"
```

That's it! 🎉

