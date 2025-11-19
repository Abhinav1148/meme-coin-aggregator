import * as cron from 'node-cron';
import { TokenAggregator } from './aggregator';
import logger from '../utils/logger';

export class SchedulerService {
  private aggregator: TokenAggregator;
  private jobs: cron.ScheduledTask[] = [];

  constructor() {
    this.aggregator = new TokenAggregator();
  }

  start(): void {
    // Update token data every 30 seconds
    const updateJob = cron.schedule('*/30 * * * * *', async () => {
      try {
        logger.info('Scheduled token update started...');
        await this.aggregator.aggregateTokens();
        logger.info('Scheduled token update completed');
      } catch (error) {
        logger.error('Scheduled token update failed:', error);
      }
    });

    // Clear old cache entries every 5 minutes
    const cacheCleanupJob = cron.schedule('*/5 * * * *', async () => {
      try {
        logger.debug('Cache cleanup job running...');
        // Redis TTL handles expiration automatically, but we can add custom cleanup here if needed
      } catch (error) {
        logger.error('Cache cleanup job failed:', error);
      }
    });

    this.jobs.push(updateJob, cacheCleanupJob);
    logger.info('Scheduler service started');
  }

  stop(): void {
    this.jobs.forEach((job) => job.stop());
    this.jobs = [];
    logger.info('Scheduler service stopped');
  }
}

