export const JOB_TYPES = [
  'welcome-email',
  'delayed-reminder',
  'report-export',
] as const;

export type JobType = (typeof JOB_TYPES)[number];

export const isValidJobType = (value: unknown): value is JobType => {
  return typeof value === 'string' && JOB_TYPES.includes(value as JobType);
};