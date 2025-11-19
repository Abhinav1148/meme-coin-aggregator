# Step-by-Step Guide to Use and Deploy

This document provides a complete step-by-step guide to set up, use, and deploy the Meme Coin Aggregator service.

## Part 1: Local Setup and Usage

### Step 1: Prerequisites

1. **Install Node.js 20+**
   ```bash
   # Check version
   node --version
   # Should be v20.x.x or higher
   ```

2. **Install Redis**
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Linux (Ubuntu/Debian)
   sudo apt-get update
   sudo apt-get install redis-server
   sudo systemctl start redis
   
   # Windows
   # Download from https://redis.io/download
   # Or use WSL2
   ```

3. **Verify Redis is Running**
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

### Step 2: Clone and Install

```bash
# Navigate to project directory
cd meme-coin-aggregator

# Install dependencies
npm install
```

### Step 3: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env file (optional, defaults work for local)
# PORT=3000
# REDIS_HOST=localhost
# REDIS_PORT=6379
```

### Step 4: Build the Project

```bash
# Build TypeScript to JavaScript
npm run build
```

### Step 5: Start the Service

```bash
# Development mode (with auto-reload)
npm run dev

# OR Production mode
npm start
```

You should see:
```
Server running on port 3000
WebSocket server available at ws://localhost:3000
API available at http://localhost:3000/api
```

### Step 6: Test the Service

**Test 1: Health Check**
```bash
curl http://localhost:3000/api/health
```

**Test 2: Get Tokens**
```bash
curl http://localhost:3000/api/tokens?limit=5
```

**Test 3: WebSocket Test Page**
1. Open browser: `http://localhost:3000`
2. Click "Connect" button
3. Watch real-time token updates

**Test 4: Run Tests**
```bash
npm test
```

### Step 7: Test WebSocket in Multiple Tabs

1. Open `http://localhost:3000` in 3-4 browser tabs
2. Click "Connect" in each tab
3. Observe that all tabs receive updates simultaneously
4. Updates appear every 5 seconds

### Step 8: Test API Performance

```bash
# Test rapid API calls (10 requests)
for i in {1..10}; do
  echo "Request $i:"
  time curl -s "http://localhost:3000/api/tokens?limit=10" > /dev/null
done
```

Notice that subsequent requests are faster due to caching.

## Part 2: Deployment

### Option A: Railway (Easiest - Recommended)

#### Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub

#### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Authorize Railway to access your GitHub
4. Select your repository

#### Step 3: Add Redis Database
1. In your project, click "New"
2. Select "Database" → "Add Redis"
3. Railway automatically provisions Redis

#### Step 4: Configure Environment Variables
1. Click on your service
2. Go to "Variables" tab
3. Add these variables:
   ```
   NODE_ENV=production
   PORT=3000
   REDIS_HOST=${{Redis.REDIS_HOST}}
   REDIS_PORT=${{Redis.REDIS_PORT}}
   REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
   REDIS_TTL=30
   UPDATE_INTERVAL=10
   WEBSOCKET_UPDATE_INTERVAL=5
   ```

#### Step 5: Configure Build Settings
1. Go to "Settings" → "Build"
2. Build Command: `npm install && npm run build`
3. Start Command: `npm start`

#### Step 6: Deploy
1. Railway automatically detects changes and deploys
2. Wait for deployment to complete (2-3 minutes)
3. Check "Deployments" tab for status

#### Step 7: Get Your URL
1. Go to "Settings" → "Domains"
2. Railway provides: `https://your-app.railway.app`
3. Your API: `https://your-app.railway.app/api`

#### Step 8: Test Deployment
```bash
# Health check
curl https://your-app.railway.app/api/health

# Get tokens
curl https://your-app.railway.app/api/tokens?limit=5
```

### Option B: Render

#### Step 1: Create Account
1. Go to https://render.com
2. Sign up with GitHub

#### Step 2: Create Web Service
1. Click "New" → "Web Service"
2. Connect GitHub repository
3. Select your repository

#### Step 3: Configure Service
- **Name**: meme-coin-aggregator
- **Environment**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Plan**: Free

#### Step 4: Add Redis
1. Click "New" → "Redis"
2. Select "Free" plan
3. Note connection details

#### Step 5: Set Environment Variables
In Web Service → Environment:
```
NODE_ENV=production
PORT=10000
REDIS_HOST=<from Redis service>
REDIS_PORT=<from Redis service>
REDIS_PASSWORD=<from Redis service>
REDIS_TTL=30
```

#### Step 6: Deploy
1. Click "Create Web Service"
2. Wait for deployment (3-5 minutes)

### Option C: Heroku

#### Step 1: Install Heroku CLI
```bash
npm install -g heroku-cli
heroku login
```

#### Step 2: Create App
```bash
heroku create meme-coin-aggregator
```

#### Step 3: Add Redis
```bash
heroku addons:create heroku-redis:hobby-dev
```

#### Step 4: Set Environment Variables
```bash
heroku config:set NODE_ENV=production
heroku config:set REDIS_TTL=30
```

#### Step 5: Deploy
```bash
git push heroku main
```

### Option D: Docker

#### Step 1: Build Image
```bash
docker build -t meme-coin-aggregator .
```

#### Step 2: Run with Docker Compose
```bash
docker-compose up -d
```

#### Step 3: Test
```bash
curl http://localhost:3000/api/health
```

## Part 3: Post-Deployment Verification

### Step 1: Health Check
```bash
curl https://your-deployed-url.com/api/health
```
Expected: `{"status":"healthy",...}`

### Step 2: API Test
```bash
curl https://your-deployed-url.com/api/tokens?limit=5
```
Expected: JSON with tokens array

### Step 3: WebSocket Test
1. Open browser: `https://your-deployed-url.com`
2. Open browser console
3. Run:
   ```javascript
   const socket = io('https://your-deployed-url.com');
   socket.on('connect', () => console.log('Connected!'));
   socket.on('tokens:update', (data) => console.log('Update:', data));
   ```

### Step 4: Performance Test
```bash
# Test 10 rapid requests
for i in {1..10}; do
  time curl -s "https://your-deployed-url.com/api/tokens?limit=10" > /dev/null
done
```

### Step 5: Multiple Browser Tabs
1. Open 3-4 tabs to your deployed URL
2. Connect WebSocket in each
3. Verify all receive updates

## Part 4: Creating Deliverables

### 1. GitHub Repository

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit: Meme Coin Aggregator service"

# Create GitHub repo and push
git remote add origin https://github.com/yourusername/meme-coin-aggregator.git
git branch -M main
git push -u origin main
```

### 2. Postman Collection

The `postman_collection.json` file is already created. Import it into Postman:
1. Open Postman
2. Click "Import"
3. Select `postman_collection.json`
4. Update `base_url` variable to your deployed URL

### 3. Video Demo (1-2 minutes)

Record a video showing:
- [ ] API working with live demo (curl or Postman)
- [ ] Multiple browser tabs showing WebSocket updates
- [ ] Making 5-10 rapid API calls showing response times
- [ ] Request flow through your system

**Video Script:**
1. (0:00-0:15) Show health check and API endpoints
2. (0:15-0:30) Demonstrate filtering and sorting
3. (0:30-0:45) Show WebSocket connection and real-time updates
4. (0:45-1:00) Multiple tabs receiving updates
5. (1:00-1:15) Rapid API calls showing caching performance
6. (1:15-1:30) Architecture overview

### 4. README Update

Add to README:
- [ ] Public deployment URL
- [ ] Link to video demo
- [ ] Architecture diagram (optional)
- [ ] Design decisions section

## Part 5: Testing Checklist

### Unit Tests
- [x] Aggregator filtering tests
- [x] Aggregator sorting tests
- [x] Aggregator pagination tests
- [x] Cache service tests
- [x] Retry utility tests

### Integration Tests
- [x] API route tests
- [x] Health check tests
- [x] DEX client tests (structure)

### Manual Tests
- [ ] Health endpoint returns 200
- [ ] Tokens endpoint returns data
- [ ] Filtering works correctly
- [ ] Sorting works correctly
- [ ] Pagination works correctly
- [ ] WebSocket connects
- [ ] WebSocket receives updates
- [ ] Multiple clients receive updates
- [ ] Caching improves performance
- [ ] Error handling works

## Troubleshooting

### Local Issues

**Redis not connecting:**
```bash
# Check if Redis is running
redis-cli ping

# Start Redis
redis-server
# OR
brew services start redis
```

**Port already in use:**
```bash
# Change PORT in .env
PORT=3001
```

**Build errors:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Deployment Issues

**Build fails:**
- Check Node.js version (needs 20+)
- Verify all dependencies in package.json
- Check build logs for specific errors

**Redis connection fails:**
- Verify Redis credentials in environment variables
- Check Redis service is running
- Verify network connectivity

**WebSocket not working:**
- Verify WebSocket is enabled on platform
- Check CORS settings
- Verify Socket.io version compatibility

## Next Steps

1. ✅ Set up local environment
2. ✅ Test locally
3. ✅ Deploy to hosting platform
4. ✅ Verify deployment
5. ✅ Create video demo
6. ✅ Update README with deployment URL
7. ✅ Submit deliverables

## Support

For issues:
1. Check logs: `npm run dev` shows detailed logs
2. Check Redis: `redis-cli ping`
3. Check health: `curl http://localhost:3000/api/health`
4. Review error messages in console/logs

