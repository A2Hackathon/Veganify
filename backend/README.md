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
- **Cross-Platform Setup**: If your iOS app runs on a MacBook and the server runs on a Windows laptop:
  - The Windows laptop must run `npm start` in the backend folder
  - The MacBook iOS app must connect to the Windows laptop's IP address
  - Find the Windows laptop's IP: Run `ipconfig` on Windows, look for "IPv4 Address" under "Wi-Fi" or "Ethernet"
  - Update `ios/APIClient.swift` to use `http://[WINDOWS_IP]:4000` (e.g., `http://10.5.174.193:4000`)
- If using iOS Simulator on MacBook: use the Windows laptop's IP address (e.g., `http://10.5.174.193:4000`)
- If using physical iOS device: use the Windows laptop's IP address (e.g., `http://10.5.174.193:4000`)

## Multi-Developer Setup

Each developer needs to:
1. Run `npm start` on their own Windows laptop (where the server will run)
2. Find their Windows laptop's IP address using `ipconfig`
3. Update `ios/APIClient.swift` with their Windows laptop's IP address
4. Make sure both the Windows laptop and MacBook are on the same network (Wi-Fi)
5. **Configure Windows Firewall** to allow port 4000 (see `FIREWALL_SETUP.md` for detailed instructions)

## Firewall Configuration

If your MacBook cannot connect to the Windows server, you may need to configure Windows Firewall to allow connections on port 4000.

**Quick Steps:**
1. Open Windows Defender Firewall with Advanced Security (`wf.msc`)
2. Create a new **Inbound Rule** for **TCP port 4000**
3. Allow the connection for **Private** networks
4. Repeat for **Outbound Rules**

See `FIREWALL_SETUP.md` for detailed step-by-step instructions.

