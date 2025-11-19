import { Router, Request, Response } from 'express';
import { cacheService } from '../services/cache';
import logger from '../utils/logger';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    // Check cache (works with both Redis and in-memory fallback)
    const testKey = 'health:check';
    const testValue = { timestamp: Date.now() };
    
    await cacheService.set(testKey, testValue, 10);
    const cached = await cacheService.get<{ timestamp: number }>(testKey);
    await cacheService.del(testKey);

    // Cache is working (either Redis or in-memory)
    const cacheWorking = cached !== null;
    const redisAvailable = cacheService.isRedisAvailable();

    // API is healthy if cache is working (even if Redis is not available)
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        redis: redisAvailable ? 'connected' : 'disconnected (using in-memory cache)',
        cache: cacheWorking ? 'working' : 'not working',
        api: 'running',
      },
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

