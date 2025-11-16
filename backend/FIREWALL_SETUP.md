# Windows Firewall Setup for Backend Server

If your MacBook cannot connect to the Windows server, the Windows Firewall might be blocking port 4000.

## Quick Check: Is Firewall Blocking Port 4000?

### Method 1: Check via Windows Settings (Easiest)

1. Press `Windows Key + I` to open Settings
2. Go to **Privacy & Security** → **Windows Security** → **Firewall & network protection**
3. Click **Advanced settings** (or search "Windows Defender Firewall with Advanced Security")
4. Click **Inbound Rules** in the left panel
5. Look for a rule named "Node.js" or "Port 4000" or "Express"
6. If you see it and it's **Enabled** and **Allow**, you're good!
7. If you don't see it, or it's **Blocked**, continue to Method 2

### Method 2: Create a New Firewall Rule

1. Open **Windows Defender Firewall with Advanced Security**:
   - Press `Windows Key + R`
   - Type `wf.msc` and press Enter

2. Click **Inbound Rules** in the left panel

3. Click **New Rule...** in the right panel

4. Select **Port** → Click **Next**

5. Select **TCP** and **Specific local ports**: enter `4000` → Click **Next**

6. Select **Allow the connection** → Click **Next**

7. Check all three boxes:
   - ✅ Domain
   - ✅ Private
   - ✅ Public
   → Click **Next**

8. Name it: `Node.js Backend Server (Port 4000)`
   Description: `Allows incoming connections to Express.js backend server on port 4000`
   → Click **Finish**

9. **Repeat steps 3-8 for Outbound Rules** (same settings)

### Method 3: Temporarily Disable Firewall (For Testing Only)

⚠️ **WARNING**: Only do this for testing! Re-enable it after testing.

1. Press `Windows Key + I` → **Privacy & Security** → **Windows Security**
2. Click **Firewall & network protection**
3. Click on your active network (Private network or Public network)
4. Toggle **Windows Defender Firewall** to **Off**
5. Test your connection
6. **Re-enable the firewall** after testing!

### Method 4: Check via Command Line

Open PowerShell as Administrator and run:

```powershell
# Check if port 4000 is blocked
netsh advfirewall firewall show rule name=all | findstr "4000"

# Or check all Node.js rules
netsh advfirewall firewall show rule name=all | findstr "Node"
```

### Method 5: Test Firewall with PowerShell

```powershell
# Test if port 4000 is listening (should show your Node.js process)
netstat -ano | findstr :4000

# Check firewall status
netsh advfirewall show allprofiles
```

## Verify the Fix

After creating the firewall rule:

1. **On Windows laptop**: Make sure server is running (`npm start` in backend folder)
2. **On MacBook browser**: Try `http://10.5.174.193:4000`
3. **In iOS app**: Try using the chatbot or any feature that connects to the server

## Common Issues

### "Connection refused" or "Cannot connect to server"
- ✅ Firewall is likely blocking the connection
- ✅ Follow Method 2 above to create a firewall rule

### "Connection timed out"
- ✅ Server might not be running
- ✅ Check if both devices are on the same Wi-Fi network
- ✅ Verify the IP address is correct (`ipconfig` on Windows)

### Firewall rule created but still not working
- ✅ Make sure the rule is **Enabled** (green checkmark)
- ✅ Make sure it applies to **Private** network (if you're on Wi-Fi)
- ✅ Try temporarily disabling firewall (Method 3) to test if that's the issue

## Quick Reference

**Windows Firewall Settings Location:**
- Settings → Privacy & Security → Windows Security → Firewall & network protection → Advanced settings
- Or: `wf.msc` (run dialog)

**Port to Allow:**
- **4000** (TCP, both Inbound and Outbound)

**Network Type:**
- Allow on **Private** network (for Wi-Fi connections)
- Optionally allow on **Public** if needed

