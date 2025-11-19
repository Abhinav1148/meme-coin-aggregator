# Testing Guide - Meme Coin Aggregator

This guide provides step-by-step instructions to run and test the Meme Coin Aggregator project.

## Prerequisites Check

✅ Node.js v20.11.0 installed  
✅ npm installed  
✅ Docker installed (for Redis)  
⚠️ Docker Desktop needs to be running

## Step 1: Start Redis

You have two options:

### Option A: Using Docker (Recommended)

1. **Start Docker Desktop** (if not already running)
   - Open Docker Desktop application
   - Wait for it to fully start (whale icon in system tray)

2. **Start Redis container:**
   ```powershell
   docker-compose up -d redis
   ```

3. **Verify Redis is running:**
   ```powershell
   docker ps
   ```
   You should see a Redis container running.

### Option B: Install Redis Locally (Alternative)

If Docker is not available:
1. Download Redis for Windows from: https://github.com/microsoftarchive/redis/releases
2. Extract and run `redis-server.exe`
3. Or use WSL2 with Redis

## Step 2: Start the Server

Open a terminal in the project directory and run:

```powershell
npm run dev
```

You should see output like:
```
Server running on port 3000
WebSocket server available at ws://localhost:3000
API available at http://localhost:3000/api
Redis connected successfully
```

**Note:** If you see Redis connection errors, make sure Redis is running (see Step 1).

## Step 3: Test the Backend API

### Test 1: Health Check

Open a new terminal and run:

```powershell
curl http://localhost:3000/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "redis": "connected",
    "api": "running"
  }
}
```

### Test 2: Get Tokens

```powershell
curl http://localhost:3000/api/tokens?limit=5
```

**Expected Response:**
```json
{
  "tokens": [
    {
      "token_address": "...",
      "token_name": "...",
      "token_ticker": "...",
      "price_sol": 0.0001,
      ...
    }
  ],
  "metadata": {
    "total": 50,
    "returned": 5,
    "next_cursor": "5",
    "response_time_ms": 123
  }
}
```

### Test 3: Search Tokens

```powershell
curl "http://localhost:3000/api/tokens/search?q=SOL"
```

### Test 4: Get Token by Address

```powershell
curl "http://localhost:3000/api/tokens/{token_address}"
```
(Replace `{token_address}` with an actual token address from Test 2)

### Test 5: Filter and Sort

```powershell
# Sort by volume, descending
curl "http://localhost:3000/api/tokens?sortBy=volume&order=desc&limit=10"

# Filter by minimum volume
curl "http://localhost:3000/api/tokens?minVolume=1000&limit=10"

# Filter by time period
curl "http://localhost:3000/api/tokens?timePeriod=24h&limit=10"
```

## Step 4: Test the Frontend

### Open the Web Interface

1. Open your web browser
2. Navigate to: `http://localhost:3000`

### Frontend Features to Test

#### 1. Connection Status
- You should see "Disconnected" status initially
- Click the **"Connect"** button
- Status should change to **"Connected"** (green)

#### 2. Real-time Updates
- After connecting, you should see token cards appear
- Updates should arrive every 5 seconds
- Watch the "Updates Received" counter increase
- Check the "Last Update" timestamp

#### 3. Token Cards
- Each card displays:
  - Token name and ticker
  - Price in SOL
  - Volume, Liquidity, Market Cap
  - Protocol name
  - Price change percentage (green for positive, red for negative)

#### 4. REST API Button
- Click **"Fetch via REST API"** button
- This fetches tokens using the REST API instead of WebSocket
- Tokens should appear in the grid

#### 5. Multiple Tabs Test
- Open `http://localhost:3000` in 3-4 different browser tabs
- Connect WebSocket in each tab
- All tabs should receive updates simultaneously
- This demonstrates the WebSocket broadcasting capability

#### 6. Log Console
- Scroll down to see the log console
- It shows connection events and update messages
- Click **"Clear Logs"** to clear the console

## Step 5: Advanced Testing

### Test Caching Performance

1. Make multiple rapid requests:
   ```powershell
   # First request (cache miss - slower)
   Measure-Command { curl -s http://localhost:3000/api/tokens?limit=10 | Out-Null }
   
   # Second request (cache hit - faster)
   Measure-Command { curl -s http://localhost:3000/api/tokens?limit=10 | Out-Null }
   ```

2. The second request should be significantly faster due to Redis caching.

### Test WebSocket Reconnection

1. Connect to the frontend
2. Stop the server (Ctrl+C)
3. Restart the server
4. The frontend should attempt to reconnect automatically

### Test Error Handling

1. Stop Redis: `docker-compose stop redis`
2. Check health endpoint: `curl http://localhost:3000/api/health`
3. Should return `"status": "unhealthy"` with Redis disconnected
4. Restart Redis: `docker-compose start redis`
5. Health check should return to healthy

## Step 6: Browser Developer Tools Testing

### Open Browser Console

1. Press `F12` or right-click → "Inspect"
2. Go to "Console" tab

### Test WebSocket Manually

```javascript
// Connect to WebSocket
const socket = io('http://localhost:3000');

// Listen for connection
socket.on('connect', () => {
  console.log('Connected!');
  socket.emit('subscribe');
});

// Listen for updates
socket.on('tokens:update', (data) => {
  console.log('Update received:', data);
});

// Listen for errors
socket.on('error', (error) => {
  console.error('Error:', error);
});
```

### Test REST API from Console

```javascript
// Fetch tokens
fetch('http://localhost:3000/api/tokens?limit=5')
  .then(res => res.json())
  .then(data => console.log('Tokens:', data));

// Health check
fetch('http://localhost:3000/api/health')
  .then(res => res.json())
  .then(data => console.log('Health:', data));
```

## Troubleshooting

### Issue: "Redis connection error"

**Solution:**
- Make sure Docker Desktop is running
- Start Redis: `docker-compose up -d redis`
- Check Redis: `docker ps`

### Issue: "Port 3000 already in use"

**Solution:**
- Change PORT in `.env` file to another port (e.g., 3001)
- Update frontend URL accordingly

### Issue: "Cannot connect to WebSocket"

**Solution:**
- Make sure the server is running
- Check browser console for errors
- Verify CORS settings (should allow all origins in dev mode)

### Issue: "No tokens appearing"

**Solution:**
- Check server logs for API errors
- Verify external APIs (DexScreener, Jupiter) are accessible
- Check network tab in browser DevTools

### Issue: "Build errors"

**Solution:**
- Run `npm install` again
- Delete `node_modules` and `dist` folders
- Run `npm install` and `npm run build`

## Performance Benchmarks

Expected performance metrics:

- **Health Check**: < 50ms
- **Token Fetch (cached)**: < 100ms
- **Token Fetch (uncached)**: 1-3 seconds
- **WebSocket Update Interval**: 5 seconds
- **Cache TTL**: 30 seconds

## Next Steps

After testing:

1. ✅ Verify all API endpoints work
2. ✅ Verify WebSocket real-time updates work
3. ✅ Test with multiple browser tabs
4. ✅ Verify caching improves performance
5. ✅ Test error handling
6. ✅ Check browser console for errors

## Additional Resources

- API Documentation: See `README.md`
- Deployment Guide: See `DEPLOYMENT.md`
- Usage Guide: See `USAGE.md`

---

**Happy Testing! 🚀**

