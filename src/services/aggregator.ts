import { Token, FilterOptions, SortOptions, PaginationOptions } from '../types/token';
import { DexScreenerClient } from './dex/dexscreener';
import { JupiterClient } from './dex/jupiter';
import { cacheService } from './cache';
import logger from '../utils/logger';

const MAX_AGGREGATED_TOKENS = parseInt(process.env.MAX_AGGREGATED_TOKENS || '200', 10);

export class TokenAggregator {
  private dexscreener: DexScreenerClient;
  private jupiter?: JupiterClient;
  private enableJupiter: boolean;

  constructor() {
    this.dexscreener = new DexScreenerClient();
    this.enableJupiter = process.env.ENABLE_JUPITER !== 'false';

    if (this.enableJupiter) {
      this.jupiter = new JupiterClient();
    } else {
      logger.info('Jupiter source disabled via ENABLE_JUPITER flag');
    }
  }

  async aggregateTokens(): Promise<Token[]> {
    const cacheKey = cacheService.generateKey('tokens', 'aggregated');
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        logger.info('Fetching tokens from multiple DEX sources...');
        
        const sources: { name: string; fetch: () => Promise<Token[]> }[] = [
          { name: 'DexScreener', fetch: () => this.dexscreener.getPopularTokens() },
        ];

        if (this.enableJupiter && this.jupiter) {
          sources.push({ name: 'Jupiter', fetch: () => this.jupiter!.getPopularTokens() });
        }

        const results = await Promise.allSettled(sources.map((src) => src.fetch()));

        const aggregatedTokens = results.flatMap((result, index) => {
          const sourceName = sources[index].name;
          if (result.status === 'fulfilled') {
            logger.info(`${sourceName}: fetched ${result.value.length} tokens`);
            return result.value;
          }

          logger.error(`${sourceName} fetch failed:`, result.reason);
          return [];
        });

        if (aggregatedTokens.length === 0) {
          logger.warn('No tokens fetched from any enabled source');
          return [];
        }

        const merged = this.mergeTokens(aggregatedTokens);
        const limited = this.limitTokens(merged);
        logger.info(
          `Merged into ${merged.length} unique tokens (returning ${limited.length}) from ${sources.length} source(s)`
        );

        return limited;
      },
      30 // 30 second cache TTL
    );
  }

  private mergeTokens(tokens: Token[]): Token[] {
    const tokenMap = new Map<string, Token>();

    for (const token of tokens) {
      const key = token.token_address.toLowerCase();
      const existing = tokenMap.get(key);

      if (!existing) {
        tokenMap.set(key, { ...token });
      } else {
        // Merge strategy: prefer data from source with more complete information
        const merged = this.mergeTokenData(existing, token);
        tokenMap.set(key, merged);
      }
    }

    return Array.from(tokenMap.values());
  }

  private limitTokens(tokens: Token[]): Token[] {
    if (tokens.length <= MAX_AGGREGATED_TOKENS) {
      return tokens;
    }

    return [...tokens]
      .sort((a, b) => (b.volume_sol || 0) - (a.volume_sol || 0))
      .slice(0, MAX_AGGREGATED_TOKENS);
  }

  private mergeTokenData(token1: Token, token2: Token): Token {
    // Prefer token with more complete data (higher volume, liquidity, etc.)
    const score1 = this.calculateDataCompleteness(token1);
    const score2 = this.calculateDataCompleteness(token2);

    const primary = score1 >= score2 ? token1 : token2;
    const secondary = score1 >= score2 ? token2 : token1;

    return {
      ...primary,
      // Merge sources
      source: `${primary.source},${secondary.source}`,
      // Use best available data
      volume_sol: Math.max(primary.volume_sol, secondary.volume_sol),
      liquidity_sol: Math.max(primary.liquidity_sol, secondary.liquidity_sol),
      market_cap_sol: primary.market_cap_sol || secondary.market_cap_sol,
      transaction_count: Math.max(primary.transaction_count, secondary.transaction_count),
      // Prefer more recent price
      price_sol: primary.last_updated && secondary.last_updated
        ? (primary.last_updated > secondary.last_updated ? primary.price_sol : secondary.price_sol)
        : primary.price_sol,
    };
  }

  private calculateDataCompleteness(token: Token): number {
    let score = 0;
    if (token.volume_sol > 0) score += 3;
    if (token.liquidity_sol > 0) score += 2;
    if (token.market_cap_sol > 0) score += 2;
    if (token.transaction_count > 0) score += 1;
    if (token.price_1hr_change !== undefined) score += 1;
    if (token.price_24hr_change !== undefined) score += 1;
    return score;
  }

  filterTokens(tokens: Token[], options: FilterOptions): Token[] {
    let filtered = [...tokens];

    if (options.timePeriod) {
      const changeField = `price_${options.timePeriod}_change` as keyof Token;
      filtered = filtered.filter((token) => {
        const change = token[changeField] as number | undefined;
        return change !== undefined;
      });
    }

    if (options.minVolume !== undefined) {
      filtered = filtered.filter((token) => token.volume_sol >= options.minVolume!);
    }

    if (options.minLiquidity !== undefined) {
      filtered = filtered.filter((token) => token.liquidity_sol >= options.minLiquidity!);
    }

    if (options.protocol) {
      filtered = filtered.filter((token) =>
        token.protocol.toLowerCase().includes(options.protocol!.toLowerCase())
      );
    }

    return filtered;
  }

  sortTokens(tokens: Token[], options: SortOptions): Token[] {
    const sorted = [...tokens];

    sorted.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (options.field) {
        case 'volume':
          aValue = a.volume_sol;
          bValue = b.volume_sol;
          break;
        case 'price_change':
          aValue = a.price_24hr_change || a.price_1hr_change || 0;
          bValue = b.price_24hr_change || b.price_1hr_change || 0;
          break;
        case 'market_cap':
          aValue = a.market_cap_sol;
          bValue = b.market_cap_sol;
          break;
        case 'liquidity':
          aValue = a.liquidity_sol;
          bValue = b.liquidity_sol;
          break;
        case 'transaction_count':
          aValue = a.transaction_count;
          bValue = b.transaction_count;
          break;
        default:
          return 0;
      }

      if (options.order === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    return sorted;
  }

  paginateTokens(
    tokens: Token[],
    options: PaginationOptions
  ): { tokens: Token[]; next_cursor?: string } {
    const limit = options.limit || 20;
    let startIndex = 0;

    if (options.cursor) {
      try {
        startIndex = parseInt(options.cursor, 10);
        if (isNaN(startIndex) || startIndex < 0) {
          startIndex = 0;
        }
      } catch {
        startIndex = 0;
      }
    }

    const endIndex = startIndex + limit;
    const paginatedTokens = tokens.slice(startIndex, endIndex);
    const next_cursor = endIndex < tokens.length ? endIndex.toString() : undefined;

    return { tokens: paginatedTokens, next_cursor };
  }
}

