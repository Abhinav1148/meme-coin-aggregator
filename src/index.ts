import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import tokenRoutes from './routes/tokens';
import healthRoutes from './routes/health';
import { WebSocketService } from './services/websocket';
import { SchedulerService } from './services/scheduler';
import logger from './utils/logger';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (WebSocket test page)
app.use(express.static('public'));

// Request logging middleware
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/tokens', tokenRoutes);
app.use('/api/health', healthRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: 'Meme Coin Aggregator API',
    version: '1.0.0',
    endpoints: {
      tokens: '/api/tokens',
      health: '/api/health',
      websocket: '/socket.io',
    },
  });
});

// Initialize WebSocket service
const wsService = new WebSocketService(httpServer);
const updateInterval = parseInt(process.env.WEBSOCKET_UPDATE_INTERVAL || '5', 10);
wsService.startPeriodicUpdates(updateInterval);

// Initialize scheduler
const scheduler = new SchedulerService();
scheduler.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  wsService.stop();
  scheduler.stop();
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  wsService.stop();
  scheduler.stop();
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Start server
httpServer.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  logger.info(`WebSocket server available at ws://localhost:${port}`);
  logger.info(`API available at http://localhost:${port}/api`);
});

export default app;

