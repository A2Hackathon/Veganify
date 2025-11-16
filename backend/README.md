# Sprout Backend Server

## What is this?

This is the **Express.js Node.js server** that handles all API requests from your iOS app. It's NOT MongoDB - it's a web server that:
- Receives requests from your iOS app
- Stores data in JSON files (no MongoDB needed!)
- Processes AI chat requests
- Handles recipes, profiles, grocery lists, etc.

## How to Start the Server

1. Open a terminal/command prompt
2. Navigate to the backend folder:
   ```bash
   cd backend
   ```
3. Start the server:
   ```bash
   npm start
   ```
   
   Or for development (auto-restarts on changes):
   ```bash
   npm run dev
   ```

4. You should see:
   ```
   ✅ Express app created
   ✅ Using JSON file storage (MongoDB removed)
   ✅ Server listening on http://localhost:4000
   ✅ Server ready to accept connections!
   ```

## Testing the Server

Open your browser and go to: `http://localhost:4000`

You should see: `{"ok":true,"msg":"Veganify backend (Albert focus) running"}`

## Data Storage

All data is stored in JSON files in the `backend/data/` folder:
- `users.json` - User profiles
- `userImpact.json` - XP, coins, streaks
- `recipes.json` - Saved recipes
- `groceryItems.json` - Grocery lists

**No MongoDB needed!** Everything is stored in simple JSON files.

## Important Notes

- The server must be running for your iOS app to work
- The server runs on port 4000 by default
- If using iOS Simulator: use `http://localhost:4000`
- If using physical device: use your computer's IP address (e.g., `http://192.168.1.XXX:4000`)

