import 'dotenv/config';
import { Worker } from 'bullmq';
import { prisma } from '../lib/prisma';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
};

type NotificationJobData = {
  dbJobId: string;
  type: string;
  payload: Record<string, unknown>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const worker = new Worker<NotificationJobData>(
  'notifications',
  async (job) => {
    const { dbJobId, type, payload } = job.data;

    await prisma.job.update({
      where: { id: dbJobId },
      data: {
        status: 'processing',
        attempts: job.attemptsStarted,
        errorMessage: null,
      },
    });

    await job.updateProgress(10);

    if (type === 'welcome-email') {
      await sleep(1500);
    } else if (type === 'delayed-reminder') {
      await sleep(2000);
    } else if (type === 'report-export') {
      await sleep(3000);
    } else {
      throw new Error(`Unsupported job type: ${type}`);
    }

    if (payload.shouldFail === true) {
      throw new Error('Simulated processing failure');
    }

    await job.updateProgress(100);

    await prisma.job.update({
      where: { id: dbJobId },
      data: {
        status: 'completed',
        processedAt: new Date(),
      },
    });

    return {
      success: true,
      processedType: type,
    };
  },
  { connection },
);

worker.on('completed', (job) => {
  console.log(`Job completed: ${job?.id}`);
});

worker.on('failed', async (job, err) => {
  console.error(`Job failed: ${job?.id}`, err.message);

  if (!job) return;

  const maxAttempts = job.opts.attempts ?? 3;

  await prisma.job.update({
    where: { id: job.data.dbJobId },
    data: {
      status: job.attemptsMade >= maxAttempts ? 'failed' : 'queued',
      attempts: job.attemptsMade,
      errorMessage: err.message,
    },
  });
});

console.log('Notification worker is running');