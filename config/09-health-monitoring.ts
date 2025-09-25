import { EnhancedEnvironmentValidator } from './08-enhanced-validator';

export interface HealthCheckEndpoint {
  path: string;
  method: 'GET' | 'POST';
  requiresAuth: boolean;
  handler: () => Promise<HealthCheckResponse>;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'warning' | 'critical' | 'maintenance';
  timestamp: string;
  version?: string;
  uptime: number;
  checks: HealthCheck[];
  metrics?: {
    environment: {
      validationCount: number;
      successRate: number;
      averageValidationTime: number;
      lastValidation: string;
    };
    system?: {
      memoryUsage?: number;
      cpuUsage?: number;
    };
  };
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail' | 'unknown';
  message: string;
  duration: number;
  timestamp: string;
  details?: Record<string, any>;
}

export interface AlertConfiguration {
  enabled: boolean;
  thresholds: {
    validationFailureRate: number; // 0-1, e.g., 0.1 for 10%
    responseTime: number; // milliseconds
    consecutiveFailures: number;
  };
  notifications: {
    webhook?: string;
    email?: string[];
    slack?: {
      webhook: string;
      channel: string;
    };
  };
}

export class EnvironmentHealthMonitor {
  private static instance: EnvironmentHealthMonitor | null = null;
  private validator: EnhancedEnvironmentValidator;
  private startTime: Date;
  private alertConfig: AlertConfiguration;
  private alertHistory: Array<{
    timestamp: Date;
    level: 'warning' | 'critical';
    message: string;
    resolved?: Date;
  }> = [];

  private constructor() {
    this.validator = EnhancedEnvironmentValidator.getInstance();
    this.startTime = new Date();
    this.alertConfig = {
      enabled: process.env.NODE_ENV === 'production',
      thresholds: {
        validationFailureRate: 0.1, // 10%
        responseTime: 5000, // 5 seconds
        consecutiveFailures: 3
      },
      notifications: {
        webhook: process.env.HEALTH_WEBHOOK_URL,
        email: process.env.HEALTH_ALERT_EMAILS?.split(','),
        slack: process.env.SLACK_WEBHOOK_URL ? {
          webhook: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_CHANNEL || '#alerts'
        } : undefined
      }
    };
  }

  public static getInstance(): EnvironmentHealthMonitor {
    if (!EnvironmentHealthMonitor.instance) {
      EnvironmentHealthMonitor.instance = new EnvironmentHealthMonitor();
    }
    return EnvironmentHealthMonitor.instance;
  }

  public async performHealthCheck(): Promise<HealthCheckResponse> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      // Run comprehensive health check
      const validatorHealth = await this.validator.healthCheck();
      const metrics = this.validator.getMetrics();

      // Additional system checks
      const systemChecks = await this.performSystemChecks();

      // Combine all checks
      const allChecks = [
        ...validatorHealth.checks.map(check => ({
          ...check,
          timestamp: new Date().toISOString()
        })),
        ...systemChecks
      ];

      // Determine overall status
      const overallStatus = this.determineOverallStatus(allChecks);

      // Check for alerting conditions
      await this.checkAlertConditions(overallStatus, allChecks, metrics);

      const response: HealthCheckResponse = {
        status: overallStatus,
        timestamp,
        version: process.env.APP_VERSION || '1.0.0',
        uptime: Date.now() - this.startTime.getTime(),
        checks: allChecks,
        metrics: {
          environment: {
            validationCount: metrics.totalValidations,
            successRate: metrics.totalValidations > 0
              ? metrics.successfulValidations / metrics.totalValidations
              : 1,
            averageValidationTime: metrics.averageValidationTime,
            lastValidation: metrics.lastValidationTime.toISOString()
          }
        }
      };

      return response;
    } catch (error) {
      return {
        status: 'critical',
        timestamp,
        uptime: Date.now() - this.startTime.getTime(),
        checks: [{
          name: 'Health Check Execution',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Health check failed',
          duration: Date.now() - startTime,
          timestamp
        }]
      };
    }
  }

  private async performSystemChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];
    const timestamp = new Date().toISOString();

    // Check 1: Memory usage (if available)
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memCheckStart = Date.now();
      try {
        const memUsage = process.memoryUsage();
        const memUsageMB = memUsage.heapUsed / 1024 / 1024;
        const memLimitMB = memUsage.heapTotal / 1024 / 1024;
        const memPercentage = (memUsageMB / memLimitMB) * 100;

        checks.push({
          name: 'Memory Usage',
          status: memPercentage > 90 ? 'fail' : memPercentage > 75 ? 'warn' : 'pass',
          message: `Memory usage: ${memUsageMB.toFixed(1)}MB (${memPercentage.toFixed(1)}%)`,
          duration: Date.now() - memCheckStart,
          timestamp,
          details: {
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            rss: memUsage.rss
          }
        });
      } catch (error) {
        checks.push({
          name: 'Memory Usage',
          status: 'unknown',
          message: 'Could not retrieve memory usage',
          duration: Date.now() - memCheckStart,
          timestamp
        });
      }
    }

    // Check 2: Environment variable completeness
    const envCheckStart = Date.now();
    const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
    const missingVars = requiredVars.filter(varName => {
      const value = process.env[varName] || (typeof import !== 'undefined' && import.meta?.env?.[varName]);
      return !value;
    });

    checks.push({
      name: 'Required Environment Variables',
      status: missingVars.length === 0 ? 'pass' : 'fail',
      message: missingVars.length === 0
        ? 'All required environment variables are present'
        : `Missing variables: ${missingVars.join(', ')}`,
      duration: Date.now() - envCheckStart,
      timestamp,
      details: {
        required: requiredVars,
        missing: missingVars
      }
    });

    // Check 3: Configuration consistency
    const configCheckStart = Date.now();
    try {
      const isDev = process.env.NODE_ENV === 'development';
      const isDebugEnabled = process.env.ENABLE_DEBUG_MODE === 'true';

      let configStatus: 'pass' | 'warn' | 'fail' = 'pass';
      let message = 'Configuration is consistent';

      if (!isDev && isDebugEnabled) {
        configStatus = 'warn';
        message = 'Debug mode is enabled in non-development environment';
      }

      checks.push({
        name: 'Configuration Consistency',
        status: configStatus,
        message,
        duration: Date.now() - configCheckStart,
        timestamp,
        details: {
          nodeEnv: process.env.NODE_ENV,
          debugMode: isDebugEnabled
        }
      });
    } catch (error) {
      checks.push({
        name: 'Configuration Consistency',
        status: 'unknown',
        message: 'Could not check configuration consistency',
        duration: Date.now() - configCheckStart,
        timestamp
      });
    }

    return checks;
  }

  private determineOverallStatus(checks: HealthCheck[]): 'healthy' | 'warning' | 'critical' | 'maintenance' {
    const failedChecks = checks.filter(check => check.status === 'fail');
    const warningChecks = checks.filter(check => check.status === 'warn');

    if (failedChecks.length > 0) {
      return 'critical';
    }

    if (warningChecks.length > 0) {
      return 'warning';
    }

    return 'healthy';
  }

  private async checkAlertConditions(
    status: 'healthy' | 'warning' | 'critical' | 'maintenance',
    checks: HealthCheck[],
    metrics: any
  ): Promise<void> {
    if (!this.alertConfig.enabled) {
      return;
    }

    const shouldAlert =
      status === 'critical' ||
      (metrics.totalValidations > 10 &&
       (metrics.successfulValidations / metrics.totalValidations) < (1 - this.alertConfig.thresholds.validationFailureRate)) ||
      checks.some(check => check.duration > this.alertConfig.thresholds.responseTime);

    if (shouldAlert) {
      await this.sendAlert({
        level: status === 'critical' ? 'critical' : 'warning',
        message: this.buildAlertMessage(status, checks, metrics),
        timestamp: new Date(),
        details: { status, checks, metrics }
      });
    }
  }

  private buildAlertMessage(status: string, checks: HealthCheck[], metrics: any): string {
    const failedChecks = checks.filter(check => check.status === 'fail');
    const warningChecks = checks.filter(check => check.status === 'warn');

    let message = `Environment Health Alert: ${status.toUpperCase()}\n\n`;

    if (failedChecks.length > 0) {
      message += `Failed Checks (${failedChecks.length}):\n`;
      failedChecks.forEach(check => {
        message += `- ${check.name}: ${check.message}\n`;
      });
      message += '\n';
    }

    if (warningChecks.length > 0) {
      message += `Warning Checks (${warningChecks.length}):\n`;
      warningChecks.forEach(check => {
        message += `- ${check.name}: ${check.message}\n`;
      });
      message += '\n';
    }

    message += `Metrics:\n`;
    message += `- Validation Success Rate: ${((metrics.successfulValidations / metrics.totalValidations) * 100).toFixed(1)}%\n`;
    message += `- Average Validation Time: ${metrics.averageValidationTime.toFixed(2)}ms\n`;
    message += `- Total Validations: ${metrics.totalValidations}\n`;

    message += `\nTimestamp: ${new Date().toISOString()}`;

    return message;
  }

  private async sendAlert(alert: {
    level: 'warning' | 'critical';
    message: string;
    timestamp: Date;
    details?: any;
  }): Promise<void> {
    // Add to history
    this.alertHistory.push(alert);

    // Keep only last 100 alerts
    if (this.alertHistory.length > 100) {
      this.alertHistory = this.alertHistory.slice(-100);
    }

    try {
      // Send webhook notification
      if (this.alertConfig.notifications.webhook) {
        await this.sendWebhookAlert(this.alertConfig.notifications.webhook, alert);
      }

      // Send Slack notification
      if (this.alertConfig.notifications.slack) {
        await this.sendSlackAlert(this.alertConfig.notifications.slack, alert);
      }

      // Log the alert
      console.error(`🚨 Environment Alert [${alert.level.toUpperCase()}]:`, alert.message);
    } catch (error) {
      console.error('Failed to send alert notification:', error);
    }
  }

  private async sendWebhookAlert(webhookUrl: string, alert: any): Promise<void> {
    if (typeof fetch === 'undefined') return;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alert_type: 'environment_health',
          level: alert.level,
          message: alert.message,
          timestamp: alert.timestamp.toISOString(),
          service: 'ai-models-dashboard',
          details: alert.details
        })
      });
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }

  private async sendSlackAlert(slackConfig: { webhook: string; channel: string }, alert: any): Promise<void> {
    if (typeof fetch === 'undefined') return;

    const color = alert.level === 'critical' ? '#ff0000' : '#ffaa00';
    const emoji = alert.level === 'critical' ? '🚨' : '⚠️';

    try {
      await fetch(slackConfig.webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: slackConfig.channel,
          username: 'Environment Monitor',
          icon_emoji: ':warning:',
          attachments: [{
            color,
            title: `${emoji} Environment Health Alert`,
            text: alert.message,
            footer: 'AI Models Dashboard',
            ts: Math.floor(alert.timestamp.getTime() / 1000)
          }]
        })
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  public getAlertHistory(): Array<{
    timestamp: Date;
    level: 'warning' | 'critical';
    message: string;
    resolved?: Date;
  }> {
    return [...this.alertHistory];
  }

  public updateAlertConfiguration(config: Partial<AlertConfiguration>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
  }

  public async createHealthCheckEndpoint(): Promise<HealthCheckEndpoint> {
    return {
      path: '/health',
      method: 'GET',
      requiresAuth: false,
      handler: async () => {
        return await this.performHealthCheck();
      }
    };
  }

  public static reset(): void {
    EnvironmentHealthMonitor.instance = null;
  }
}