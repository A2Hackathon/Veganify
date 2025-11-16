# API Connection Setup Guide

## Required Inputs to Connect the API

### 1. Backend Environment Variables

Create a `.env` file in the `backend` directory with the following:

```env
# MongoDB Connection String
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/sprout?retryWrites=true&w=majority

# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Server Port (optional, defaults to 4000)
PORT=4000
```

**How to get these:**

#### MongoDB URI:
- **Option 1 (MongoDB Atlas - Cloud):**
  1. Go to https://www.mongodb.com/cloud/atlas
  2. Create a free cluster
  3. Click "Connect" → "Connect your application"
  4. Copy the connection string
  5. Replace `<password>` with your database password

- **Option 2 (Local MongoDB):**
  - If running MongoDB locally: `mongodb://localhost:27017/sprout`

#### Gemini API Key:
1. Go to https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key

---

### 2. iOS App Configuration

#### For iOS Simulator (localhost works):
The current configuration in `APIClient.swift` uses:
```swift
self.baseURL = "http://localhost:4000"
```
This works automatically for the iOS Simulator.

#### For Physical Device (need computer's IP):
If testing on a physical iPhone/iPad, you need to:

1. **Find your computer's IP address:**
   - **Windows:** Open Command Prompt, type `ipconfig`, look for "IPv4 Address"
   - **Mac:** System Preferences → Network → Wi-Fi → IP Address
   - **Example:** `192.168.1.100`

2. **Update `APIClient.swift` line 15:**
   ```swift
   self.baseURL = "http://192.168.1.100:4000"  // Replace with your IP
   ```

3. **Add App Transport Security exception in `Info.plist`:**
   Add this inside the `<dict>` tag:
   ```xml
   <key>NSAppTransportSecurity</key>
   <dict>
       <key>NSAllowsLocalNetworking</key>
       <true/>
       <key>NSAllowsArbitraryLoads</key>
       <true/>
   </dict>
   ```

---

### 3. Backend Setup Steps

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Create `.env` file:**
   ```bash
   # Copy the example (if exists) or create new
   cp .env.example .env
   # Then edit .env with your actual values
   ```

3. **Start the backend:**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

4. **Verify backend is running:**
   - Open browser: http://localhost:4000
   - Should see: `{"ok":true,"msg":"Veganify backend (Albert focus) running"}`

---

### 4. Testing the Connection

#### Test Backend:
```bash
curl http://localhost:4000
# Should return: {"ok":true,"msg":"..."}
```

#### Test from iOS:
1. Run the iOS app in Simulator
2. The app should connect automatically if backend is running
3. Check Xcode console for any connection errors

---

### 5. Common Issues & Solutions

#### Issue: "Cannot connect to localhost" (Physical Device)
- **Solution:** Use your computer's IP address instead of localhost
- Make sure iPhone and computer are on the same Wi-Fi network

#### Issue: "MongoDB connection error"
- **Solution:** Check your MONGO_URI is correct
- Make sure MongoDB Atlas IP whitelist includes `0.0.0.0/0` (or your IP)

#### Issue: "GEMINI_API_KEY not found"
- **Solution:** Make sure `.env` file exists in `backend` directory
- Check that the key is correct (no extra spaces)

#### Issue: "CORS error"
- **Solution:** Backend already has CORS enabled, but if issues persist:
  - Check that backend is running
  - Verify the port matches (4000)

---

### 6. Production Deployment

For production, update `APIClient.swift`:
```swift
#if DEBUG
self.baseURL = "http://localhost:4000"  // or your dev server
#else
self.baseURL = "https://your-production-domain.com"  // Your deployed backend
#endif
```

---

## Quick Start Checklist

- [ ] MongoDB URI configured in `.env`
- [ ] Gemini API key configured in `.env`
- [ ] Backend dependencies installed (`npm install`)
- [ ] Backend server running (`npm start`)
- [ ] iOS base URL configured correctly
- [ ] If using physical device: IP address updated and Info.plist configured
- [ ] Test connection from browser: http://localhost:4000

---

## Need Help?

- Check backend console for error messages
- Check Xcode console for iOS connection errors
- Verify all environment variables are set correctly
- Make sure backend is running before testing iOS app

