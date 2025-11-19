# Quick Start Guide

## Current Status

✅ **Server is RUNNING** on `http://localhost:3000`  
⚠️ **Redis is DISCONNECTED** (needs to be started)

## Next Steps

### 1. Start Redis (Required for full functionality)

**Option A: Using Docker (Easiest)**

1. **Start Docker Desktop:**
   - Open Docker Desktop application from your Start menu
   - Wait until it's fully started (whale icon in system tray)

2. **Start Redis container:**
   ```powershell
   docker-compose up -d redis
   ```

3. **Verify Redis is running:**
   ```powershell
   docker ps
   ```

4. **Check health again:**
   ```powershell
   curl http://localhost:3000/api/health
   ```
   Should now show `"redis": "connected"`

**Option B: Install Redis Locally**

If you prefer not to use Docker:
- Download Redis for Windows: https://github.com/microsoftarchive/redis/releases
- Or use WSL2: `wsl sudo apt-get install redis-server`

### 2. Test the Application

#### Backend API Tests

**Health Check:**
```powershell
curl http://localhost:3000/api/health
```

**Get Tokens:**
```powershell
curl http://localhost:3000/api/tokens?limit=5
```

**Search Tokens:**
```powershell
curl "http://localhost:3000/api/tokens/search?q=SOL"
```

#### Frontend Tests

1. **Open Browser:**
   - Navigate to: `http://localhost:3000`

2. **Test WebSocket:**
   - Click "Connect" button
   - Watch for real-time token updates
   - Updates arrive every 5 seconds

3. **Test REST API:**
   - Click "Fetch via REST API" button
   - Tokens should appear in the grid

4. **Test Multiple Tabs:**
   - Open 3-4 browser tabs
   - Connect in each tab
   - All should receive updates simultaneously

## Server Commands

**Stop the server:**
- Press `Ctrl+C` in the terminal where it's running

**Restart the server:**
```powershell
npm run dev
```

**Build for production:**
```powershell
npm run build
npm start
```

## Troubleshooting

**If server is not running:**
```powershell
cd c:\meme-coin-aggregator
npm run dev
```

**If Redis connection fails:**
- Make sure Docker Desktop is running
- Run: `docker-compose up -d redis`
- Check: `docker ps`

**If port 3000 is in use:**
- Change `PORT=3001` in `.env` file
- Restart server

## Full Testing Guide

See `TESTING_GUIDE.md` for comprehensive testing instructions.

---

**Server URL:** http://localhost:3000  
**API Base:** http://localhost:3000/api  
**WebSocket:** ws://localhost:3000

