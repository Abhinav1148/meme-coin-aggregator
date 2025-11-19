import { DexScreenerClient } from '../dexscreener';

describe('DexScreenerClient', () => {
  let client: DexScreenerClient;

  beforeEach(() => {
    client = new DexScreenerClient();
  });

  it('should be instantiated', () => {
    expect(client).toBeInstanceOf(DexScreenerClient);
  });

  // Integration tests would go here, but we'll skip actual API calls in unit tests
  // to avoid rate limiting and external dependencies
});

