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

export default app;