import express, { Request, Response } from 'express';
import { prisma } from './lib/prisma';
import { notificationQueue } from './queues/notificationQueue';
import { isValidJobType } from './constants/jobTypes';

const app = express();

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
  });
});

app.post('/jobs', async (req: Request, res: Response) => {
  let createdJobId: string | null = null;

  try {
    const { type, payload, scheduledAt } = req.body;

    if (!type || !payload) {
      return res.status(400).json({
        success: false,
        message: 'type and payload are required',
      });
    }

       if (!isValidJobType(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job type',
      });
    }

    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    const delay =
      scheduledDate && scheduledDate.getTime() > Date.now()
        ? scheduledDate.getTime() - Date.now()
        : 0;

    const job = await prisma.job.create({
      data: {
        type,
        payload,
        scheduledAt: scheduledDate,
      },
    });

    createdJobId = job.id;

    await notificationQueue.add(
      type,
      {
        dbJobId: job.id,
        type,
        payload,
      },
      {
        jobId: job.id,
        delay,
      },
    );

    const queuedJob = await prisma.job.update({
      where: { id: job.id },
      data: {
        status: 'queued',
      },
    });

    return res.status(201).json({
      success: true,
      data: queuedJob,
    });
  } catch (error) {
    console.error('Failed to create job:', error);

    if (createdJobId) {
      await prisma.job.update({
        where: { id: createdJobId },
        data: {
          status: 'failed',
          errorMessage:
            error instanceof Error ? error.message : 'Failed to enqueue job',
        },
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

app.get('/jobs/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    const job = await prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error('Failed to get job:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

app.get('/jobs', async (_req: Request, res: Response) => {
  try {
    const jobs = await prisma.job.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    console.error('Failed to get jobs:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default app;