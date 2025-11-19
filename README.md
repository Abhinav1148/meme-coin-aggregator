# Meme Coin Aggregator Service

A real-time data aggregation service that fetches and merges meme coin data from multiple DEX sources (DexScreener, Jupiter) with efficient caching, WebSocket support, and advanced filtering capabilities.

## 🚀 Features

- **Multi-Source Aggregation**: Fetches token data from DexScreener and Jupiter APIs
- **Intelligent Merging**: Automatically merges duplicate tokens from different sources
- **Real-time Updates**: WebSocket support for live price and volume updates
- **Efficient Caching**: Redis-based caching with configurable TTL (default: 30s)
- **Rate Limiting**: Exponential backoff retry logic for API calls
- **Advanced Filtering**: Filter by time period, volume, liquidity, and protocol
- **Flexible Sorting**: Sort by volume, price change, market cap, liquidity, or transaction count
- **Cursor-based Pagination**: Efficient pagination for large token lists
- **Health Monitoring**: Built-in health check endpoint

## 📋 Prerequisites

- Node.js 20+ 
- Redis 7+
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd meme-coin-aggregator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   PORT=3000
   NODE_ENV=development
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_TTL=30
   ```

4. **Start Redis** (if not using Docker)
   ```bash
   # On macOS with Homebrew
   brew install redis
   brew services start redis
   
   # On Linux
   sudo apt-get install redis-server
   sudo systemctl start redis
   ```

## 🏃 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Using Docker Compose
```bash
docker-compose up -d
```

This will start both the application and Redis in containers.

## 📡 API Endpoints

### Base URL
- Local: `http://localhost:3000`
- Production: `https://your-domain.com`

### Endpoints

#### 1. Health Check
```http
GET /api/health
```

**Response:**
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

#### 2. Get All Tokens
```http
GET /api/tokens
```

**Query Parameters:**
- `limit` (number): Number of tokens to return (default: 20)
- `cursor` (string): Pagination cursor
- `sortBy` (string): Sort field (`volume`, `price_change`, `market_cap`, `liquidity`, `transaction_count`)
- `order` (string): Sort order (`asc` or `desc`, default: `desc`)
- `timePeriod` (string): Filter by time period (`1h`, `24h`, `7d`)
- `minVolume` (number): Minimum volume filter
- `minLiquidity` (number): Minimum liquidity filter
- `protocol` (string): Filter by protocol name

**Example:**
```bash
curl "http://localhost:3000/api/tokens?limit=10&sortBy=volume&order=desc&timePeriod=24h"
```

**Response:**
```json
{
  "tokens": [
    {
      "token_address": "576P1t7XsRL4ZVj38LV2eYWxXRPguBADA8BxcNz1xo8y",
      "token_name": "PIPE CTO",
      "token_ticker": "PIPE",
      "price_sol": 4.4141209798877615e-7,
      "market_cap_sol": 441.41209798877617,
      "volume_sol": 1322.4350391679925,
      "liquidity_sol": 149.359428555,
      "transaction_count": 2205,
      "price_1hr_change": 120.61,
      "price_24hr_change": 150.25,
      "protocol": "Raydium CLMM",
      "source": "dexscreener",
      "last_updated": 1704067200000
    }
  ],
  "metadata": {
    "total": 50,
    "returned": 10,
    "next_cursor": "10",
    "response_time_ms": 45
  }
}
```

#### 3. Search Tokens
```http
GET /api/tokens/search?q={query}
```

**Example:**
```bash
curl "http://localhost:3000/api/tokens/search?q=SOL"
```

#### 4. Get Token by Address
```http
GET /api/tokens/{address}
```

**Example:**
```bash
curl "http://localhost:3000/api/tokens/576P1t7XsRL4ZVj38LV2eYWxXRPguBADA8BxcNz1xo8y"
```

## 🔌 WebSocket API

### Connection
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
  
  // Subscribe to updates
  socket.emit('subscribe');
});

// Listen for token updates
socket.on('tokens:update', (data) => {
  console.log('Token update:', data);
  // data.tokens - array of updated tokens
  // data.timestamp - update timestamp
  // data.type - 'full' or 'delta'
});

socket.on('subscribed', (data) => {
  console.log('Subscribed:', data.message);
});

socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

### Events

**Client → Server:**
- `subscribe`: Subscribe to real-time token updates

**Server → Client:**
- `tokens:update`: Token data update (sent every 5 seconds by default)
- `subscribed`: Confirmation of subscription
- `error`: Error message

## 🧪 Testing

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Test Coverage
The project includes comprehensive test coverage:
- Unit tests for aggregation logic
- Unit tests for caching service
- Unit tests for retry utilities
- Integration tests for API routes
- Integration tests for health checks

## 📦 Project Structure

```
meme-coin-aggregator/
├── src/
│   ├── index.ts                 # Main server entry point
│   ├── types/
│   │   └── token.ts             # TypeScript interfaces
│   ├── services/
│   │   ├── aggregator.ts        # Token aggregation logic
│   │   ├── cache.ts             # Redis cache service
│   │   ├── websocket.ts         # WebSocket service
│   │   ├── scheduler.ts         # Background job scheduler
│   │   └── dex/
│   │       ├── dexscreener.ts   # DexScreener API client
│   │       └── jupiter.ts       # Jupiter API client
│   ├── routes/
│   │   ├── tokens.ts            # Token API routes
│   │   └── health.ts            # Health check route
│   └── utils/
│       ├── logger.ts            # Winston logger
│       └── retry.ts             # Retry with backoff utility
├── postman_collection.json      # Postman/Insomnia collection
├── Dockerfile                   # Docker configuration
├── docker-compose.yml           # Docker Compose setup
└── README.md                    # This file
```

## 🏗️ Architecture Decisions

### 1. **Caching Strategy**
- **Redis** is used for caching aggregated token data
- Default TTL of 30 seconds balances freshness with API rate limits
- Cache keys are namespaced for easy management
- Cache-aside pattern: check cache first, fetch if miss, then store

### 2. **Rate Limiting & Retry Logic**
- Exponential backoff with jitter prevents thundering herd
- Configurable retry attempts (default: 3)
- Retries only on retryable status codes (429, 5xx)
- Rate limit awareness: 200ms delay between DexScreener requests

### 3. **Token Merging Strategy**
- Tokens are merged by address (case-insensitive)
- Data completeness score determines primary source
- Best available data is selected (highest volume, liquidity, etc.)
- Sources are tracked for transparency

### 4. **WebSocket Updates**
- Periodic updates every 5 seconds (configurable)
- Only sends updates when clients are connected
- Detects significant changes (price >5% or volume >1000)
- Supports both full and delta updates

### 5. **Pagination**
- Cursor-based pagination for efficient navigation
- Simple integer-based cursors (can be enhanced with opaque tokens)
- Prevents issues with large datasets

## 🚀 Deployment

### Option 1: Railway (Recommended - Free Tier Available)

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login and initialize**
   ```bash
   railway login
   railway init
   ```

3. **Add Redis service**
   ```bash
   railway add redis
   ```

4. **Set environment variables**
   ```bash
   railway variables set REDIS_HOST=${{Redis.REDIS_HOST}}
   railway variables set REDIS_PORT=${{Redis.REDIS_PORT}}
   railway variables set REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
   ```

5. **Deploy**
   ```bash
   railway up
   ```

### Option 2: Render

1. Create a new **Web Service** on Render
2. Connect your GitHub repository
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add **Redis** service
6. Set environment variables:
   - `REDIS_HOST`: From Redis service
   - `REDIS_PORT`: From Redis service
   - `REDIS_PASSWORD`: From Redis service

### Option 3: Heroku

1. **Install Heroku CLI**
   ```bash
   heroku login
   ```

2. **Create app**
   ```bash
   heroku create meme-coin-aggregator
   ```

3. **Add Redis addon**
   ```bash
   heroku addons:create heroku-redis:hobby-dev
   ```

4. **Set environment variables**
   ```bash
   heroku config:set NODE_ENV=production
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

### Option 4: DigitalOcean App Platform

1. Create new app from GitHub
2. Select Node.js buildpack
3. Add Redis database
4. Configure environment variables
5. Deploy

### Option 5: Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build and run manually
docker build -t meme-coin-aggregator .
docker run -p 3000:3000 --env-file .env meme-coin-aggregator
```

## 📊 Performance Considerations

- **Caching**: Reduces API calls by ~95% with 30s TTL
- **Concurrent Fetching**: Parallel API calls to multiple DEX sources
- **Efficient Merging**: O(n) token merging algorithm
- **WebSocket**: Only updates when clients connected
- **Pagination**: Limits data transfer for large result sets

## 🔒 Security Considerations

- Input validation on all query parameters
- Rate limiting on external API calls
- Error handling prevents information leakage
- CORS configured (adjust for production)
- Environment variables for sensitive data

## 📝 API Rate Limits

- **DexScreener**: 300 requests/minute
- **Jupiter**: ~100 requests/minute (estimated)

The service implements automatic rate limiting and retry logic to handle these limits gracefully.

## 🐛 Troubleshooting

### Redis Connection Issues
```bash
# Check if Redis is running
redis-cli ping

# Should return: PONG
```

### Port Already in Use
```bash
# Change PORT in .env file
PORT=3001
```

### API Rate Limit Errors
- Increase cache TTL to reduce API calls
- Reduce update frequency
- Check rate limit headers in responses

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

**Note**: This service is designed for educational and demonstration purposes. For production use, consider:
- Adding authentication/authorization
- Implementing more sophisticated rate limiting
- Adding monitoring and alerting
- Implementing data persistence
- Adding more DEX sources
- Enhancing error recovery mechanisms

