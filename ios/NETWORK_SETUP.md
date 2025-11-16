# iOS Network Setup Guide

## Important: Network Configuration for iOS

### For iOS Simulator
- The simulator can use `localhost` or `127.0.0.1` to connect to your computer
- No changes needed if running in simulator

### For Physical iOS Device
- **You MUST use your computer's IP address, NOT `localhost`**
- `localhost` on a physical device refers to the device itself, not your computer

## How to Find Your Computer's IP Address

### On Mac:
1. Open Terminal
2. Run: `ipconfig getifaddr en0` (for Wi-Fi) or `ipconfig getifaddr en1` (for Ethernet)
3. Or: System Preferences > Network > Wi-Fi/Ethernet > Advanced > TCP/IP

### On Windows:
1. Open Command Prompt
2. Run: `ipconfig`
3. Look for "IPv4 Address" under your active network adapter

### On Linux:
1. Open Terminal
2. Run: `hostname -I` or `ip addr show`

## Update APIClient.swift

In `ios/APIClient.swift`, line 24, replace:
```swift
self.baseURL = "http://localhost:4000" // ⚠️ Change this to your computer's IP for physical device
```

With your actual IP address:
```swift
self.baseURL = "http://192.168.1.XXX:4000" // Replace XXX with your IP
```

## Firewall Settings

Make sure your firewall allows incoming connections on port 4000:
- **Windows**: Windows Defender Firewall > Allow an app > Node.js
- **Mac**: System Preferences > Security & Privacy > Firewall > Options > Allow Node.js

## Testing Connection

1. Make sure your backend server is running: `cd backend && npm start`
2. Test from your computer's browser: `http://localhost:4000` should show `{"ok":true,...}`
3. Test from your phone's browser (same network): `http://YOUR_IP:4000` should show the same

## Common Issues

### "Could not connect to server"
- Check that backend is running
- Verify IP address is correct
- Check firewall settings
- Ensure phone and computer are on the same Wi-Fi network

### "Connection timeout"
- Backend might not be listening on `0.0.0.0` (check `server.js`)
- Firewall blocking the connection
- Wrong IP address

### CORS Errors
- Backend should have CORS enabled (already configured in `server.js`)

