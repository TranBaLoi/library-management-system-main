/**
 * Cron Manager
 * Centralized cron job management system
 * Registers and manages all cron jobs in the application
 */

import cron from 'node-cron';

// #region Types

/**
 * Cron job task function
 */
export type CronTask = () => Promise<void> | void;

/**
 * Cron job configuration
 */
export interface CronJobConfig {
  /**
   * Unique name for the cron job
   */
  name: string;
  /**
   * Cron expression (e.g., '0 0 * * *' for daily at midnight)
   */
  schedule: string;
  /**
   * Task function to execute
   */
  task: CronTask;
  /**
   * Whether the job is enabled (default: true)
   */
  enabled?: boolean;
  /**
   * Timezone for the cron schedule (optional)
   */
  timezone?: string;
  /**
   * Description of what the cron job does
   */
  description?: string;
}

/**
 * Registered cron job
 */
interface RegisteredCronJob {
  config: CronJobConfig;
  scheduledTask: cron.ScheduledTask;
}

// #endregion

// #region Cron Manager Class

/**
 * Cron Manager class
 * Manages all cron jobs in the application
 */
export class CronManager {
  private static jobs: Map<string, RegisteredCronJob> = new Map();
  private static isInitialized = false;

  /**
   * Register a cron job
   */
  static register(config: CronJobConfig): void {
    if (this.jobs.has(config.name)) {
      console.warn(`[Cron] Job "${config.name}" is already registered. Skipping...`);
      return;
    }

    if (config.enabled === false) {
      console.log(`[Cron] Job "${config.name}" is disabled. Skipping...`);
      return;
    }

    try {
      // Validate cron expression
      if (!cron.validate(config.schedule)) {
        throw new Error(`Invalid cron expression: ${config.schedule}`);
      }

      // Schedule the task
      const scheduledTask = cron.schedule(
        config.schedule,
        async () => {
          const startTime = Date.now();
          console.log(`[Cron] [${config.name}] Starting execution...`);

          try {
            await config.task();
            const duration = Date.now() - startTime;
            console.log(`[Cron] [${config.name}] Completed successfully in ${duration}ms`);
          } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[Cron] [${config.name}] Failed after ${duration}ms:`, error);
          }
        },
        {
          scheduled: true,
          timezone: config.timezone,
        }
      );

      this.jobs.set(config.name, {
        config,
        scheduledTask,
      });

      console.log(
        `[Cron] ✓ Registered job "${config.name}" with schedule "${config.schedule}"${
          config.description ? ` - ${config.description}` : ''
        }`
      );
    } catch (error) {
      console.error(`[Cron] ✗ Failed to register job "${config.name}":`, error);
    }
  }

  /**
   * Unregister a cron job
   */
  static unregister(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.scheduledTask.stop();
      this.jobs.delete(name);
      console.log(`[Cron] Unregistered job "${name}"`);
    }
  }

  /**
   * Get all registered jobs
   */
  static getJobs(): CronJobConfig[] {
    return Array.from(this.jobs.values()).map(job => job.config);
  }

  /**
   * Get job status
   */
  static getJobStatus(name: string): { exists: boolean; running: boolean } | null {
    const job = this.jobs.get(name);
    if (!job) {
      return null;
    }

    // Check if task is running by checking if it's scheduled
    // Note: node-cron doesn't expose getStatus(), so we check if task exists
    return {
      exists: true,
      running: true, // If job exists in map, it's considered running
    };
  }

  /**
   * Start a specific job manually
   */
  static startJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.scheduledTask.start();
      console.log(`[Cron] Started job "${name}"`);
    } else {
      console.warn(`[Cron] Job "${name}" not found`);
    }
  }

  /**
   * Stop a specific job
   */
  static stopJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.scheduledTask.stop();
      console.log(`[Cron] Stopped job "${name}"`);
    } else {
      console.warn(`[Cron] Job "${name}" not found`);
    }
  }

  /**
   * Stop all cron jobs
   */
  static stopAll(): void {
    this.jobs.forEach((job, name) => {
      job.scheduledTask.stop();
    });
    console.log(`[Cron] Stopped all ${this.jobs.size} jobs`);
  }

  /**
   * Check if cron manager is initialized
   */
  static getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Mark as initialized
   */
  static markAsInitialized(): void {
    this.isInitialized = true;
  }
}

// #endregion
