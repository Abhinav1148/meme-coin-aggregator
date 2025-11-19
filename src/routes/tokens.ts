import { Router, Request, Response } from 'express';
import { TokenAggregator } from '../services/aggregator';
import { FilterOptions, SortOptions, PaginationOptions } from '../types/token';
import logger from '../utils/logger';

const router = Router();
const aggregator = new TokenAggregator();

router.get('/', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();

    // Parse query parameters
    const filterOptions: FilterOptions = {
      timePeriod: req.query.timePeriod as '1h' | '24h' | '7d' | undefined,
      minVolume: req.query.minVolume ? parseFloat(req.query.minVolume as string) : undefined,
      minLiquidity: req.query.minLiquidity
        ? parseFloat(req.query.minLiquidity as string)
        : undefined,
      protocol: req.query.protocol as string | undefined,
    };

    const sortOptions: SortOptions = {
      field: (req.query.sortBy as any) || 'volume',
      order: (req.query.order as 'asc' | 'desc') || 'desc',
    };

    const paginationOptions: PaginationOptions = {
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      cursor: req.query.cursor as string | undefined,
    };

    // Aggregate tokens
    let tokens = await aggregator.aggregateTokens();

    // Apply filters
    tokens = aggregator.filterTokens(tokens, filterOptions);

    // Apply sorting
    tokens = aggregator.sortTokens(tokens, sortOptions);

    // Apply pagination
    const { tokens: paginatedTokens, next_cursor } = aggregator.paginateTokens(
      tokens,
      paginationOptions
    );

    const responseTime = Date.now() - startTime;
    logger.info(`GET /tokens - ${paginatedTokens.length} tokens in ${responseTime}ms`);

    res.json({
      tokens: paginatedTokens,
      metadata: {
        total: tokens.length,
        returned: paginatedTokens.length,
        next_cursor,
        response_time_ms: responseTime,
      },
    });
  } catch (error) {
    logger.error('Error fetching tokens:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const tokens = await aggregator.aggregateTokens();
    const filtered = tokens.filter(
      (token) =>
        token.token_name.toLowerCase().includes(query.toLowerCase()) ||
        token.token_ticker.toLowerCase().includes(query.toLowerCase()) ||
        token.token_address.toLowerCase().includes(query.toLowerCase())
    );

    return res.json({
      tokens: filtered.slice(0, 20),
      metadata: {
        total: filtered.length,
        query,
      },
    });
  } catch (error) {
    logger.error('Error searching tokens:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/:address', async (req: Request, res: Response) => {
  try {
    const address = req.params.address;
    const tokens = await aggregator.aggregateTokens();
    const token = tokens.find(
      (t) => t.token_address.toLowerCase() === address.toLowerCase()
    );

    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    return res.json({ token });
  } catch (error) {
    logger.error('Error fetching token:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

