import axios, { AxiosInstance } from 'axios';
import { Token } from '../../types/token';
import { retryWithBackoff } from '../../utils/retry';
import logger from '../../utils/logger';

const TOKENS_PER_QUERY = parseInt(process.env.JUPITER_TOKENS_PER_QUERY || '20', 10);
const JUPITER_MAX_TOKENS = parseInt(process.env.JUPITER_MAX_TOKENS || '200', 10);

interface JupiterToken {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logoURI?: string;
  tags?: string[];
  verified?: boolean;
}

interface JupiterPriceData {
  id: string;
  mintSymbol: string;
  vsToken: string;
  vsTokenSymbol: string;
  price: number;
}

export class JupiterClient {
  private client: AxiosInstance;
  private baseURL = 'https://lite-api.jup.ag';

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
      const response = await retryWithBackoff<JupiterToken[]>(
        async () => {
          const res = await this.client.get(`/tokens/v2/search?query=${encodeURIComponent(query)}`);
          return res.data;
        },
        {
          maxRetries: 3,
          baseDelay: 1000,
        }
      );

      const tokens = (response || []).filter((token) => Boolean(token.address));
      const tokensWithPrice = await Promise.all(
        tokens.slice(0, TOKENS_PER_QUERY).map((token) => this.enrichTokenWithPrice(token))
      );

      return tokensWithPrice.filter((token) => token !== null) as Token[];
    } catch (error) {
      logger.error('Jupiter search error:', error);
      return [];
    }
  }

  async getPopularTokens(): Promise<Token[]> {
    // Search for popular Solana tokens
    const queries = [
      'SOL', 'USDC', 'BONK', 'WIF', 'POPCAT',
      'MYRO', 'SAMO', 'COPE', 'RAY', 'ORCA',
      'JTO', 'PYTH', 'JUP', 'WEN', 'MEW',
      'FIDA', 'STEP', 'MEDIA', 'COPE', 'ROPE'
    ];
    const allTokens: Token[] = [];
    const seenAddresses = new Set<string>();

    for (const query of queries) {
      try {
        const tokens = await this.searchTokens(query);
        // Filter out duplicates
        for (const token of tokens.slice(0, TOKENS_PER_QUERY)) {
          if (!seenAddresses.has(token.token_address.toLowerCase())) {
            seenAddresses.add(token.token_address.toLowerCase());
            allTokens.push(token);
          }
        }
        // Rate limit: wait between requests
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        logger.error(`Error fetching popular tokens for ${query}:`, error);
      }
    }

    const limited = allTokens.slice(0, JUPITER_MAX_TOKENS);
    logger.info(`Jupiter: Fetched ${limited.length} unique tokens (capped)`);
    return limited;
  }

  private async enrichTokenWithPrice(token: JupiterToken): Promise<Token | null> {
    try {
      // Get price data for the token
      const priceResponse = await retryWithBackoff<Record<string, JupiterPriceData>>(
        async () => {
          const res = await this.client.get(`/price/v2?ids=${token.address}`);
          return res.data;
        },
        {
          maxRetries: 2,
          baseDelay: 500,
        }
      );

      const priceData = priceResponse?.[token.address];
      if (!priceData || !priceData.price) {
        return null;
      }

      // Convert price to SOL (assuming price is in USD, and SOL is ~$100)
      // This is a simplification - in production, you'd fetch actual SOL price
      const solPrice = 100; // Approximate SOL price in USD
      const priceSol = priceData.price / solPrice;

      return {
        token_address: token.address,
        token_name: token.name,
        token_ticker: token.symbol,
        price_sol: priceSol,
        market_cap_sol: 0, // Jupiter doesn't provide market cap
        volume_sol: 0, // Jupiter doesn't provide volume
        liquidity_sol: 0, // Jupiter doesn't provide liquidity
        transaction_count: 0,
        protocol: 'Jupiter',
        source: 'jupiter',
        last_updated: Date.now(),
      };
    } catch (error) {
      logger.error(`Error enriching token ${token.address}:`, error);
      return null;
    }
  }
}

