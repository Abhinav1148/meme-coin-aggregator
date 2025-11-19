import { TokenAggregator } from '../aggregator';
import { Token, FilterOptions, SortOptions } from '../../types/token';

describe('TokenAggregator', () => {
  let aggregator: TokenAggregator;

  beforeEach(() => {
    aggregator = new TokenAggregator();
  });

  const mockTokens: Token[] = [
    {
      token_address: '0x123',
      token_name: 'Token A',
      token_ticker: 'TKA',
      price_sol: 0.001,
      market_cap_sol: 1000,
      volume_sol: 500,
      liquidity_sol: 200,
      transaction_count: 100,
      price_1hr_change: 10,
      price_24hr_change: 20,
      protocol: 'Raydium',
      source: 'dexscreener',
    },
    {
      token_address: '0x456',
      token_name: 'Token B',
      token_ticker: 'TKB',
      price_sol: 0.002,
      market_cap_sol: 2000,
      volume_sol: 1000,
      liquidity_sol: 400,
      transaction_count: 200,
      price_1hr_change: -5,
      price_24hr_change: 15,
      protocol: 'Jupiter',
      source: 'jupiter',
    },
    {
      token_address: '0x789',
      token_name: 'Token C',
      token_ticker: 'TKC',
      price_sol: 0.003,
      market_cap_sol: 3000,
      volume_sol: 1500,
      liquidity_sol: 600,
      transaction_count: 300,
      price_1hr_change: 25,
      price_24hr_change: 30,
      protocol: 'Raydium',
      source: 'dexscreener',
    },
  ];

  describe('filterTokens', () => {
    it('should filter by time period', () => {
      const options: FilterOptions = { timePeriod: '1h' };
      const filtered = aggregator.filterTokens(mockTokens, options);
      expect(filtered.length).toBe(3);
      expect(filtered.every((t) => t.price_1hr_change !== undefined)).toBe(true);
    });

    it('should filter by minimum volume', () => {
      const options: FilterOptions = { minVolume: 1000 };
      const filtered = aggregator.filterTokens(mockTokens, options);
      expect(filtered.length).toBe(2);
      expect(filtered.every((t) => t.volume_sol >= 1000)).toBe(true);
    });

    it('should filter by minimum liquidity', () => {
      const options: FilterOptions = { minLiquidity: 300 };
      const filtered = aggregator.filterTokens(mockTokens, options);
      expect(filtered.length).toBe(2);
      expect(filtered.every((t) => t.liquidity_sol >= 300)).toBe(true);
    });

    it('should filter by protocol', () => {
      const options: FilterOptions = { protocol: 'Raydium' };
      const filtered = aggregator.filterTokens(mockTokens, options);
      expect(filtered.length).toBe(2);
      expect(filtered.every((t) => t.protocol.includes('Raydium'))).toBe(true);
    });

    it('should apply multiple filters', () => {
      const options: FilterOptions = {
        minVolume: 1000,
        protocol: 'Raydium',
      };
      const filtered = aggregator.filterTokens(mockTokens, options);
      expect(filtered.length).toBe(1);
      expect(filtered[0].token_ticker).toBe('TKC');
    });
  });

  describe('sortTokens', () => {
    it('should sort by volume descending', () => {
      const options: SortOptions = { field: 'volume', order: 'desc' };
      const sorted = aggregator.sortTokens(mockTokens, options);
      expect(sorted[0].token_ticker).toBe('TKC');
      expect(sorted[2].token_ticker).toBe('TKA');
    });

    it('should sort by volume ascending', () => {
      const options: SortOptions = { field: 'volume', order: 'asc' };
      const sorted = aggregator.sortTokens(mockTokens, options);
      expect(sorted[0].token_ticker).toBe('TKA');
      expect(sorted[2].token_ticker).toBe('TKC');
    });

    it('should sort by price change descending', () => {
      const options: SortOptions = { field: 'price_change', order: 'desc' };
      const sorted = aggregator.sortTokens(mockTokens, options);
      expect(sorted[0].token_ticker).toBe('TKC');
    });

    it('should sort by market cap descending', () => {
      const options: SortOptions = { field: 'market_cap', order: 'desc' };
      const sorted = aggregator.sortTokens(mockTokens, options);
      expect(sorted[0].token_ticker).toBe('TKC');
      expect(sorted[2].token_ticker).toBe('TKA');
    });
  });

  describe('paginateTokens', () => {
    it('should paginate with default limit', () => {
      const result = aggregator.paginateTokens(mockTokens, {});
      expect(result.tokens.length).toBe(3);
      expect(result.next_cursor).toBeUndefined();
    });

    it('should paginate with custom limit', () => {
      const result = aggregator.paginateTokens(mockTokens, { limit: 2 });
      expect(result.tokens.length).toBe(2);
      expect(result.next_cursor).toBe('2');
    });

    it('should handle cursor pagination', () => {
      const result = aggregator.paginateTokens(mockTokens, { limit: 2, cursor: '2' });
      expect(result.tokens.length).toBe(1);
      expect(result.next_cursor).toBeUndefined();
    });

    it('should handle invalid cursor', () => {
      const result = aggregator.paginateTokens(mockTokens, { limit: 2, cursor: 'invalid' });
      expect(result.tokens.length).toBe(2);
      expect(result.next_cursor).toBe('2');
    });
  });
});

