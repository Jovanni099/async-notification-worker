import { prisma } from '../lib/prisma';
import { notificationQueue } from '../queues/notificationQueue';
import { isValidJobType, JobType } from '../constants/jobTypes';

type CreateJobInput = {
  type: unknown;
  payload: unknown;
  scheduledAt?: unknown;
};

type CreateJobResult =
  | {
      success: true;
      data: unknown;
    }
  | {
      success: false;
      statusCode: number;
      message: string;
    };

export const createJobAndEnqueue = async (
  input: CreateJobInput,
): Promise<CreateJobResult> => {
  let createdJobId: string | null = null;

  const { type, payload, scheduledAt } = input;

  if (!type || !payload) {
    return {
      success: false,
      statusCode: 400,
      message: 'type and payload are required',
    };
  }

  if (!isValidJobType(type)) {
    return {
      success: false,
      statusCode: 400,
      message: 'Invalid job type',
    };
  }

  try {
    const scheduledDate =
      typeof scheduledAt === 'string' || scheduledAt instanceof Date
        ? new Date(scheduledAt)
        : null;

    const delay =
      scheduledDate && !Number.isNaN(scheduledDate.getTime()) && scheduledDate.getTime() > Date.now()
        ? scheduledDate.getTime() - Date.now()
        : 0;

    const job = await prisma.job.create({
      data: {
        type,
        payload,
        scheduledAt:
          scheduledDate && !Number.isNaN(scheduledDate.getTime())
            ? scheduledDate
            : null,
      },
    });

    createdJobId = job.id;

    await notificationQueue.add(
      type as JobType,
      {
        dbJobId: job.id,
        type: type as JobType,
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

    return {
      success: true,
      data: queuedJob,
    };
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

    return {
      success: false,
      statusCode: 500,
      message: 'Internal server error',
    };
  }
};