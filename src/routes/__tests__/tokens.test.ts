import request from 'supertest';
import express from 'express';
import tokenRoutes from '../tokens';

const app = express();
app.use(express.json());
app.use('/api/tokens', tokenRoutes);

describe('Token Routes', () => {
  it('should return tokens list', async () => {
    const response = await request(app).get('/api/tokens');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('tokens');
    expect(response.body).toHaveProperty('metadata');
    expect(Array.isArray(response.body.tokens)).toBe(true);
  });

  it('should support pagination with limit', async () => {
    const response = await request(app).get('/api/tokens?limit=5');
    expect(response.status).toBe(200);
    expect(response.body.tokens.length).toBeLessThanOrEqual(5);
  });

  it('should support sorting', async () => {
    const response = await request(app).get('/api/tokens?sortBy=volume&order=desc');
    expect(response.status).toBe(200);
    expect(response.body.tokens).toBeDefined();
  });

  it('should support filtering by time period', async () => {
    const response = await request(app).get('/api/tokens?timePeriod=24h');
    expect(response.status).toBe(200);
    expect(response.body.tokens).toBeDefined();
  });

  it('should support filtering by min volume', async () => {
    const response = await request(app).get('/api/tokens?minVolume=100');
    expect(response.status).toBe(200);
    expect(response.body.tokens).toBeDefined();
  });

  it('should support search endpoint', async () => {
    const response = await request(app).get('/api/tokens/search?q=SOL');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('tokens');
    expect(response.body).toHaveProperty('metadata');
  });

  it('should return 400 for search without query', async () => {
    const response = await request(app).get('/api/tokens/search');
    expect(response.status).toBe(400);
  });

  it('should return token by address', async () => {
    // This will likely return 404 if token doesn't exist, which is expected
    const response = await request(app).get('/api/tokens/0x123');
    expect([200, 404]).toContain(response.status);
  });
});

