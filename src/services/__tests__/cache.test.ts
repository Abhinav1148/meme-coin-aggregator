import { CacheService } from '../cache';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService();
  });

  afterEach(async () => {
    await cacheService.close();
  });

  it('should set and get a value', async () => {
    const key = 'test:key';
    const value = { test: 'data' };

    await cacheService.set(key, value, 60);
    const retrieved = await cacheService.get(key);

    expect(retrieved).toEqual(value);
  });

  it('should return null for non-existent key', async () => {
    const retrieved = await cacheService.get('non:existent');
    expect(retrieved).toBeNull();
  });

  it('should delete a key', async () => {
    const key = 'test:delete';
    await cacheService.set(key, { data: 'test' }, 60);
    await cacheService.del(key);
    const retrieved = await cacheService.get(key);
    expect(retrieved).toBeNull();
  });

  it('should generate cache keys correctly', () => {
    const key = cacheService.generateKey('prefix', 'part1', 'part2', 123);
    expect(key).toBe('prefix:part1:part2:123');
  });

  it('should get or set with fetch function', async () => {
    const key = 'test:getorset';
    let fetchCount = 0;

    const fetchFn = async () => {
      fetchCount++;
      return { data: 'fetched' };
    };

    // First call should fetch
    const result1 = await cacheService.getOrSet(key, fetchFn, 60);
    expect(result1).toEqual({ data: 'fetched' });
    expect(fetchCount).toBe(1);

    // Second call should use cache
    const result2 = await cacheService.getOrSet(key, fetchFn, 60);
    expect(result2).toEqual({ data: 'fetched' });
    expect(fetchCount).toBe(1); // Should not increment
  });
});

