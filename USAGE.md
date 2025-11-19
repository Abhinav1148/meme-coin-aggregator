# Usage Guide

This guide explains how to use the Meme Coin Aggregator service once it's running.

## Quick Start

### 1. Start the Service

```bash
# Development
npm run dev

# Production
npm run build
npm start

# Docker
docker-compose up -d
```

### 2. Test the API

```bash
# Health check
curl http://localhost:3000/api/health

# Get tokens
curl http://localhost:3000/api/tokens?limit=5
```

### 3. Test WebSocket

Open `http://localhost:3000` in your browser to see the WebSocket test page, or use the JavaScript example below.

## API Usage Examples

### Get All Tokens (Paginated)

```bash
curl "http://localhost:3000/api/tokens?limit=20&cursor=0"
```

**Response:**
```json
{
  "tokens": [...],
  "metadata": {
    "total": 50,
    "returned": 20,
    "next_cursor": "20",
    "response_time_ms": 45
  }
}
```

### Filter by Time Period

```bash
# Get tokens with 24h price change data
curl "http://localhost:3000/api/tokens?timePeriod=24h"
```

### Filter by Volume

```bash
# Get tokens with volume >= 1000 SOL
curl "http://localhost:3000/api/tokens?minVolume=1000"
```

### Sort by Price Change

```bash
# Get top gainers (24h)
curl "http://localhost:3000/api/tokens?sortBy=price_change&order=desc&timePeriod=24h&limit=10"
```

### Combine Filters

```bash
# High volume tokens on Raydium, sorted by volume
curl "http://localhost:3000/api/tokens?minVolume=5000&protocol=Raydium&sortBy=volume&order=desc"
```

### Search Tokens

```bash
curl "http://localhost:3000/api/tokens/search?q=BONK"
```

### Get Token by Address

```bash
curl "http://localhost:3000/api/tokens/576P1t7XsRL4ZVj38LV2eYWxXRPguBADA8BxcNz1xo8y"
```

## WebSocket Usage

### JavaScript/TypeScript

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Connect
socket.on('connect', () => {
  console.log('Connected!');
  socket.emit('subscribe');
});

// Listen for updates
socket.on('tokens:update', (data) => {
  console.log('Received update:', data);
  // data.tokens - array of updated tokens
  // data.timestamp - update timestamp
  // data.type - 'full' or 'delta'
});

// Handle errors
socket.on('error', (error) => {
  console.error('Error:', error);
});

// Disconnect
socket.on('disconnect', () => {
  console.log('Disconnected');
});
```

### Python

```python
import socketio

sio = socketio.Client()

@sio.on('connect')
def on_connect():
    print('Connected!')
    sio.emit('subscribe')

@sio.on('tokens:update')
def on_update(data):
    print('Received update:', data)

@sio.on('error')
def on_error(error):
    print('Error:', error)

sio.connect('http://localhost:3000')
```

### cURL (for testing)

WebSocket connections require a WebSocket client. Use the browser test page or a WebSocket client tool.

## Performance Testing

### Test Response Times

```bash
# Single request
time curl "http://localhost:3000/api/tokens?limit=10"

# Multiple rapid requests (10 requests)
for i in {1..10}; do
  time curl -s "http://localhost:3000/api/tokens?limit=10" > /dev/null
done
```

### Test Caching

```bash
# First request (cache miss)
time curl "http://localhost:3000/api/tokens?limit=10"

# Second request (cache hit - should be faster)
time curl "http://localhost:3000/api/tokens?limit=10"
```

### Test WebSocket Updates

1. Open multiple browser tabs to `http://localhost:3000`
2. Connect to WebSocket in each tab
3. Observe real-time updates across all tabs
4. Updates should appear every 5 seconds (configurable)

## Common Use Cases

### 1. Get Trending Tokens

```bash
curl "http://localhost:3000/api/tokens?sortBy=volume&order=desc&timePeriod=24h&limit=20"
```

### 2. Find High Liquidity Tokens

```bash
curl "http://localhost:3000/api/tokens?minLiquidity=10000&sortBy=liquidity&order=desc"
```

### 3. Monitor Price Changes

Use WebSocket to get real-time price updates:

```javascript
socket.on('tokens:update', (data) => {
  data.tokens.forEach(token => {
    const change = token.price_24hr_change || token.price_1hr_change || 0;
    if (Math.abs(change) > 10) {
      console.log(`Alert: ${token.token_ticker} changed ${change}%`);
    }
  });
});
```

### 4. Build a Dashboard

```javascript
// Fetch initial data
const response = await fetch('http://localhost:3000/api/tokens?limit=30');
const { tokens } = await response.json();

// Connect to WebSocket for updates
const socket = io('http://localhost:3000');
socket.on('tokens:update', (data) => {
  // Update dashboard with new data
  updateDashboard(data.tokens);
});
```

## Error Handling

### API Errors

```javascript
try {
  const response = await fetch('http://localhost:3000/api/tokens');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
} catch (error) {
  console.error('Error fetching tokens:', error);
}
```

### WebSocket Errors

```javascript
socket.on('error', (error) => {
  console.error('WebSocket error:', error);
  // Implement reconnection logic
});

socket.on('disconnect', () => {
  console.log('Disconnected, attempting to reconnect...');
  socket.connect();
});
```

## Rate Limiting

The service respects external API rate limits:
- **DexScreener**: 300 requests/minute
- **Jupiter**: ~100 requests/minute

The service implements:
- Caching (30s TTL) to reduce API calls
- Exponential backoff retry logic
- Automatic rate limit handling

## Best Practices

1. **Use Pagination**: Always use `limit` and `cursor` for large datasets
2. **Cache Client-Side**: Cache API responses on the client side
3. **Use WebSocket**: For real-time updates, use WebSocket instead of polling
4. **Handle Errors**: Always implement error handling
5. **Monitor Health**: Regularly check `/api/health` endpoint

## Troubleshooting

### No Tokens Returned

- Check if external APIs are accessible
- Verify Redis is running and connected
- Check logs for API errors
- Verify rate limits haven't been exceeded

### WebSocket Not Connecting

- Verify server is running
- Check CORS settings
- Ensure Socket.io client version is compatible
- Check browser console for errors

### Slow Response Times

- Check Redis connection
- Verify cache is working (second request should be faster)
- Check external API response times
- Monitor server resources

## Integration Examples

### React Hook

```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function useTokenUpdates() {
  const [tokens, setTokens] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io('http://localhost:3000');
    
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('subscribe');
    });
    
    socket.on('tokens:update', (data) => {
      setTokens(data.tokens);
    });
    
    socket.on('disconnect', () => {
      setConnected(false);
    });
    
    return () => socket.disconnect();
  }, []);

  return { tokens, connected };
}
```

### Next.js API Route

```javascript
// pages/api/tokens.js
export default async function handler(req, res) {
  const response = await fetch('http://localhost:3000/api/tokens');
  const data = await response.json();
  res.json(data);
}
```

## Advanced Usage

### Custom Filtering

```javascript
// Fetch all tokens and filter client-side
const response = await fetch('http://localhost:3000/api/tokens?limit=100');
const { tokens } = await response.json();

const filtered = tokens.filter(token => {
  return token.volume_sol > 5000 && 
         token.liquidity_sol > 1000 &&
         (token.price_24hr_change || 0) > 20;
});
```

### Batch Operations

```javascript
// Fetch multiple token addresses
const addresses = ['addr1', 'addr2', 'addr3'];
const promises = addresses.map(addr => 
  fetch(`http://localhost:3000/api/tokens/${addr}`)
);
const results = await Promise.all(promises);
```

