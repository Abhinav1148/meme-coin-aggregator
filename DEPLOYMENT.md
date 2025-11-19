# Deployment Guide

This guide provides step-by-step instructions for deploying the Meme Coin Aggregator service to various platforms.

## Prerequisites

- GitHub repository with the code
- Account on your chosen hosting platform
- Basic understanding of environment variables

## Quick Start: Railway (Easiest)

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository

### Step 3: Add Redis
1. Click "New" → "Database" → "Add Redis"
2. Railway will automatically provision Redis

### Step 4: Configure Environment Variables
1. Go to your service → "Variables"
2. Add the following (Railway auto-provides Redis vars):
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

### Step 5: Deploy
1. Railway automatically detects `package.json`
2. Set build command: `npm install && npm run build`
3. Set start command: `npm start`
4. Deploy will start automatically

### Step 6: Get Your URL
1. Go to "Settings" → "Domains"
2. Railway provides a default domain
3. Your API will be available at: `https://your-app.railway.app`

## Alternative: Render

### Step 1: Create Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub

### Step 2: Create Web Service
1. Click "New" → "Web Service"
2. Connect your GitHub repository
3. Select the repository

### Step 3: Configure Build
- **Name**: meme-coin-aggregator
- **Environment**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Plan**: Free (or paid for better performance)

### Step 4: Add Redis Database
1. Click "New" → "Redis"
2. Select "Free" plan
3. Note the connection details

### Step 5: Set Environment Variables
In your Web Service settings:
```
NODE_ENV=production
PORT=10000
REDIS_HOST=<from Redis service>
REDIS_PORT=<from Redis service>
REDIS_PASSWORD=<from Redis service>
REDIS_TTL=30
```

### Step 6: Deploy
1. Click "Create Web Service"
2. Render will build and deploy automatically
3. Wait for deployment to complete

## Alternative: Heroku

### Step 1: Install Heroku CLI
```bash
npm install -g heroku-cli
```

### Step 2: Login
```bash
heroku login
```

### Step 3: Create App
```bash
heroku create meme-coin-aggregator
```

### Step 4: Add Redis
```bash
heroku addons:create heroku-redis:hobby-dev
```

### Step 5: Set Environment Variables
```bash
heroku config:set NODE_ENV=production
heroku config:set REDIS_TTL=30
```

### Step 6: Deploy
```bash
git push heroku main
```

## Alternative: DigitalOcean App Platform

### Step 1: Create App
1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Connect GitHub repository

### Step 2: Configure App
- **Type**: Web Service
- **Build Command**: `npm install && npm run build`
- **Run Command**: `npm start`
- **HTTP Port**: 3000

### Step 3: Add Database
1. Click "Add Resource" → "Database"
2. Select "Redis"
3. Choose plan

### Step 4: Set Environment Variables
Link Redis database and set:
```
NODE_ENV=production
REDIS_TTL=30
```

### Step 5: Deploy
Click "Create Resources" and wait for deployment.

## Post-Deployment Checklist

- [ ] Health check endpoint works: `GET /api/health`
- [ ] Tokens endpoint returns data: `GET /api/tokens`
- [ ] WebSocket connection works (test with browser console)
- [ ] Redis is connected (check health endpoint)
- [ ] Environment variables are set correctly
- [ ] Logs show no errors

## Testing Your Deployment

### 1. Health Check
```bash
curl https://your-app-url.com/api/health
```

### 2. Get Tokens
```bash
curl https://your-app-url.com/api/tokens?limit=5
```

### 3. Test WebSocket
Open browser console and run:
```javascript
const socket = io('https://your-app-url.com');
socket.on('connect', () => console.log('Connected!'));
socket.on('tokens:update', (data) => console.log('Update:', data));
```

## Monitoring

### Railway
- View logs in the Railway dashboard
- Monitor resource usage
- Set up alerts

### Render
- View logs in service dashboard
- Monitor metrics
- Set up health checks

### Heroku
```bash
# View logs
heroku logs --tail

# Check status
heroku ps
```

## Troubleshooting

### Build Fails
- Check Node.js version (needs 20+)
- Verify all dependencies in package.json
- Check build logs for specific errors

### Redis Connection Fails
- Verify Redis credentials
- Check Redis service is running
- Verify network connectivity

### API Returns Empty Results
- Check external API rate limits
- Verify API endpoints are accessible
- Check logs for API errors

### WebSocket Not Working
- Verify WebSocket is enabled on platform
- Check CORS settings
- Verify Socket.io version compatibility

## Cost Estimates

### Free Tiers
- **Railway**: $5/month free credit
- **Render**: Free tier available (with limitations)
- **Heroku**: No free tier (paid only)
- **DigitalOcean**: $5/month minimum

### Paid Tiers
- **Railway**: Pay-as-you-go, ~$5-20/month
- **Render**: $7/month for standard
- **Heroku**: $7/month for hobby dyno
- **DigitalOcean**: $5/month for basic app

## Security Recommendations

1. **Environment Variables**: Never commit `.env` file
2. **CORS**: Restrict CORS in production
3. **Rate Limiting**: Add API rate limiting middleware
4. **HTTPS**: Always use HTTPS in production
5. **Monitoring**: Set up error tracking (Sentry, etc.)

## Next Steps

1. Set up custom domain
2. Configure SSL certificate
3. Set up monitoring and alerts
4. Implement CI/CD pipeline
5. Add API documentation (Swagger/OpenAPI)

