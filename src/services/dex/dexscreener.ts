import axios, { AxiosInstance } from 'axios';
import { Token } from '../../types/token';
import { retryWithBackoff } from '../../utils/retry';
import logger from '../../utils/logger';

const MAX_TOKENS_PER_QUERY = parseInt(process.env.DEXSCREENER_TOKENS_PER_QUERY || '40', 10);
const MAX_TOTAL_TOKENS = parseInt(process.env.DEXSCREENER_MAX_TOKENS || '250', 10);

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd?: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    m5: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity?: {
    usd?: number;
    base?: number;
    quote?: number;
  };
  fdv?: number;
  pairCreatedAt?: number;
}

interface DexScreenerResponse {
  pairs: DexScreenerPair[];
}

export class DexScreenerClient {
  private client: AxiosInstance;
  private baseURL = 'https://api.dexscreener.com/latest/dex';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
      },
    });
  }

  async searchTokens(query: string): Promise<Token[]> {
    try {
      const response = await retryWithBackoff<DexScreenerResponse>(
        async () => {
          const res = await this.client.get(`/search?q=${encodeURIComponent(query)}`);
          return res.data;
        },
        {
          maxRetries: 3,
          baseDelay: 1000,
        }
      );

      return this.transformPairs(response.pairs || []);
    } catch (error) {
      logger.error('DexScreener search error:', error);
      return [];
    }
  }

  async getTokenData(tokenAddress: string): Promise<Token[]> {
    try {
      const response = await retryWithBackoff<DexScreenerResponse>(
        async () => {
          const res = await this.client.get(`/tokens/${tokenAddress}`);
          return res.data;
        },
        {
          maxRetries: 3,
          baseDelay: 1000,
        }
      );

      return this.transformPairs(response.pairs || []);
    } catch (error) {
      logger.error('DexScreener token data error:', error);
      return [];
    }
  }

  async getPopularTokens(): Promise<Token[]> {
    const allTokens: Token[] = [];
    
    try {
      // Method 1: Get trending/popular pairs from Solana
      const trendingResponse = await retryWithBackoff<DexScreenerResponse>(
        async () => {
          // Fetch popular Solana pairs - using search with common terms
          const res = await this.client.get('/search?q=SOL');
          return res.data;
        },
        {
          maxRetries: 3,
          baseDelay: 1000,
        }
      );

      if (trendingResponse.pairs) {
        const trendingTokens = this.transformPairs(trendingResponse.pairs).slice(0, MAX_TOKENS_PER_QUERY);
        allTokens.push(...trendingTokens);
      }

      // Rate limit: wait 200ms
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      logger.warn('Error fetching trending tokens from DexScreener:', error);
    }

    // Method 2: Search for popular Solana meme coins
    const queries = [
      'SOL', 'USDC', 'BONK', 'WIF', 'POPCAT', 
      'MYRO', 'SAMO', 'COPE', 'RAY', 'ORCA',
      'JTO', 'PYTH', 'JUP', 'WEN', 'MEW'
    ];
    
    const seenAddresses = new Set<string>();
    for (const query of queries) {
      try {
        const tokens = await this.searchTokens(query);
        // Filter out duplicates
        for (const token of tokens.slice(0, MAX_TOKENS_PER_QUERY)) {
          if (!seenAddresses.has(token.token_address.toLowerCase())) {
            seenAddresses.add(token.token_address.toLowerCase());
            allTokens.push(token);
          }
        }
        // Rate limit: 300 requests/min = 5 requests/sec, so wait 200ms between requests
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        logger.error(`Error fetching popular tokens for ${query}:`, error);
      }
    }

    const limited = allTokens.slice(0, MAX_TOTAL_TOKENS);
    logger.info(`DexScreener: Fetched ${limited.length} unique tokens (capped)`);
    return limited;
  }

  private transformPairs(pairs: DexScreenerPair[]): Token[] {
    return pairs
      .filter((pair) => {
        // Filter for Solana chain and valid pairs
        return (
          pair.chainId === 'solana' &&
          pair.baseToken &&
          pair.quoteToken &&
          parseFloat(pair.priceNative) > 0
        );
      })
      .map((pair) => {
        const priceSol = parseFloat(pair.priceNative);
        const volume24h = pair.volume?.h24 || 0;
        const liquidity = pair.liquidity?.base || 0;
        const marketCap = pair.fdv || volume24h * 10; // Estimate if not available
        const transactionCount =
          (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0);

        return {
          token_address: pair.baseToken.address,
          token_name: pair.baseToken.name,
          token_ticker: pair.baseToken.symbol,
          price_sol: priceSol,
          market_cap_sol: marketCap,
          volume_sol: volume24h,
          liquidity_sol: liquidity,
          transaction_count: transactionCount,
          price_1hr_change: pair.priceChange?.h1,
          price_24hr_change: pair.priceChange?.h24,
          price_7d_change: undefined, // DexScreener doesn't provide 7d
          protocol: pair.dexId,
          source: 'dexscreener',
          last_updated: Date.now(),
        };
      });
  }
}

