export interface Token {
  token_address: string;
  token_name: string;
  token_ticker: string;
  price_sol: number;
  market_cap_sol: number;
  volume_sol: number;
  liquidity_sol: number;
  transaction_count: number;
  price_1hr_change?: number;
  price_24hr_change?: number;
  price_7d_change?: number;
  protocol: string;
  source?: string; // Which DEX API provided this data
  last_updated?: number; // Timestamp
}

export interface TokenResponse {
  tokens: Token[];
  next_cursor?: string;
  total?: number;
}

export interface FilterOptions {
  timePeriod?: '1h' | '24h' | '7d';
  minVolume?: number;
  minLiquidity?: number;
  protocol?: string;
}

export interface SortOptions {
  field: 'volume' | 'price_change' | 'market_cap' | 'liquidity' | 'transaction_count';
  order: 'asc' | 'desc';
}

export interface PaginationOptions {
  limit?: number;
  cursor?: string;
}

export interface AggregatedTokenData {
  tokens: Token[];
  metadata: {
    total: number;
    next_cursor?: string;
    last_updated: number;
  };
}

