import request from 'supertest';
import express from 'express';
import healthRoutes from '../health';

const app = express();
app.use('/api/health', healthRoutes);

describe('Health Routes', () => {
  it('should return health status', async () => {
    const response = await request(app).get('/api/health');
    expect([200, 503]).toContain(response.status);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('services');
  });
});

