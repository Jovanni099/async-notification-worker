import express, { Request, Response } from 'express';
import { prisma } from './lib/prisma';

const app = express();

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
  });
});

app.post('/jobs', async (req: Request, res: Response) => {
  try {
    const { type, payload, scheduledAt } = req.body;

    if (!type || !payload) {
      return res.status(400).json({
        success: false,
        message: 'type and payload are required',
      });
    }

    const job = await prisma.job.create({
      data: {
        type,
        payload,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });

    return res.status(201).json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error('Failed to create job:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

app.get('/jobs/:id', async (req: Request, res: Response) => {
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