import { api } from "encore.dev/api";
import db from "../db";

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum AlertType {
  SYSTEM_ERROR = 'system_error',
  BUSINESS_CRITICAL = 'business_critical',
  SECURITY_BREACH = 'security_breach',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  USER_ACTION = 'user_action',
  PAYMENT_FAILURE = 'payment_failure',
  DATA_INCONSISTENCY = 'data_inconsistency'
}

interface LogEntry {
  level: LogLevel;
  service: string;
  action: string;
  userId?: number;
  sessionId?: string;
  metadata?: Record<string, any>;
  error?: Error;
  timestamp: Date;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AlertEntry {
  type: AlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metadata?: Record<string, any>;
  affectedUserId?: number;
  resolved: boolean;
  timestamp: Date;
}

class Logger {
  private static instance: Logger;
  private requestId: string = '';

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setRequestId(requestId: string) {
    this.requestId = requestId;
  }

  async log(entry: Omit<LogEntry, 'timestamp'>) {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date(),
      requestId: this.requestId
    };

    try {
      // Store in database
      await db.exec`
        INSERT INTO system_logs (
          level, service, action, user_id, session_id, metadata, 
          error_message, error_stack, timestamp, request_id, ip_address, user_agent
        ) VALUES (
          ${logEntry.level}, ${logEntry.service}, ${logEntry.action}, 
          ${logEntry.userId}, ${logEntry.sessionId}, ${JSON.stringify(logEntry.metadata || {})},
          ${logEntry.error?.message}, ${logEntry.error?.stack}, 
          ${logEntry.timestamp}, ${logEntry.requestId}, ${logEntry.ipAddress}, ${logEntry.userAgent}
        )
      `;

      // Console logging for development
      const logMessage = `[${logEntry.level.toUpperCase()}] ${logEntry.service}:${logEntry.action} - ${JSON.stringify(logEntry.metadata || {})}`;
      
      switch (logEntry.level) {
        case LogLevel.DEBUG:
          console.debug(logMessage);
          break;
        case LogLevel.INFO:
          console.info(logMessage);
          break;
        case LogLevel.WARN:
          console.warn(logMessage);
          break;
        case LogLevel.ERROR:
        case LogLevel.CRITICAL:
          console.error(logMessage, logEntry.error);
          break;
      }

      // Trigger alerts for critical logs
      if (logEntry.level === LogLevel.CRITICAL || logEntry.level === LogLevel.ERROR) {
        await this.triggerAlert({
          type: AlertType.SYSTEM_ERROR,
          severity: logEntry.level === LogLevel.CRITICAL ? 'critical' : 'high',
          title: `${logEntry.level.toUpperCase()}: ${logEntry.service}`,
          description: `${logEntry.action} - ${logEntry.error?.message || 'Unknown error'}`,
          metadata: logEntry.metadata,
          affectedUserId: logEntry.userId,
          resolved: false,
          timestamp: new Date()
        });
      }

    } catch (error) {
      // Fallback to console if database logging fails
      console.error('Failed to write log to database:', error);
      console.error('Original log entry:', logEntry);
    }
  }

  async debug(service: string, action: string, metadata?: Record<string, any>, userId?: number) {
    await this.log({ level: LogLevel.DEBUG, service, action, metadata, userId });
  }

  async info(service: string, action: string, metadata?: Record<string, any>, userId?: number) {
    await this.log({ level: LogLevel.INFO, service, action, metadata, userId });
  }

  async warn(service: string, action: string, metadata?: Record<string, any>, userId?: number) {
    await this.log({ level: LogLevel.WARN, service, action, metadata, userId });
  }

  async error(service: string, action: string, error: Error, metadata?: Record<string, any>, userId?: number) {
    await this.log({ level: LogLevel.ERROR, service, action, error, metadata, userId });
  }

  async critical(service: string, action: string, error: Error, metadata?: Record<string, any>, userId?: number) {
    await this.log({ level: LogLevel.CRITICAL, service, action, error, metadata, userId });
  }

  async triggerAlert(alert: AlertEntry) {
    try {
      // Store alert in database
      const alertRecord = await db.queryRow`
        INSERT INTO system_alerts (
          type, severity, title, description, metadata, 
          affected_user_id, resolved, timestamp
        ) VALUES (
          ${alert.type}, ${alert.severity}, ${alert.title}, ${alert.description},
          ${JSON.stringify(alert.metadata || {})}, ${alert.affectedUserId}, 
          ${alert.resolved}, ${alert.timestamp}
        ) RETURNING *
      `;

      // Send immediate notifications for critical alerts
      if (alert.severity === 'critical' || alert.severity === 'high') {
        await this.sendCriticalAlert(alertRecord);
      }

      // Log the alert creation
      await this.info('AlertSystem', 'alert_created', {
        alertId: alertRecord.id,
        type: alert.type,
        severity: alert.severity
      });

    } catch (error) {
      console.error('Failed to create alert:', error);
    }
  }

  private async sendCriticalAlert(alert: any) {
    try {
      // Get all super admins
      const superAdmins = await db.queryAll`
        SELECT u.id, u.email, u.phone
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN roles r ON ur.role_id = r.id
        WHERE r.name = 'super_admin' AND u.is_active = true
      `;

      // Create notifications for super admins
      for (const admin of superAdmins) {
        await db.exec`
          INSERT INTO notifications (
            user_id, title, content, type, reference_type, reference_id, priority
          ) VALUES (
            ${admin.id}, ${alert.title}, ${alert.description},
            'system_alert', 'alert', ${alert.id}, 'urgent'
          )
        `;
      }

      // In production, also send SMS/Email for critical alerts
      if (alert.severity === 'critical') {
        await this.sendEmergencyNotifications(superAdmins, alert);
      }

    } catch (error) {
      console.error('Failed to send critical alert notifications:', error);
    }
  }

  private async sendEmergencyNotifications(admins: any[], alert: any) {
    // This would integrate with SMS/Email services in production
    console.warn('CRITICAL ALERT - Emergency notifications should be sent:', {
      alert: alert.title,
      admins: admins.map(a => a.email),
      timestamp: new Date()
    });
  }

  // Business-specific logging methods
  async logUserAction(userId: number, action: string, entity: string, entityId?: number, metadata?: Record<string, any>) {
    await this.info('UserAction', action, {
      entity,
      entityId,
      ...metadata
    }, userId);
  }

  async logPaymentEvent(userId: number, action: string, amount: number, paymentId?: number, metadata?: Record<string, any>) {
    await this.info('PaymentSystem', action, {
      amount,
      paymentId,
      ...metadata
    }, userId);
  }

  async logSecurityEvent(userId: number | undefined, action: string, severity: 'low' | 'medium' | 'high', metadata?: Record<string, any>) {
    const logLevel = severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
    await this.log({
      level: logLevel,
      service: 'Security',
      action,
      userId,
      metadata
    });

    // Trigger security alert
    if (severity === 'high') {
      await this.triggerAlert({
        type: AlertType.SECURITY_BREACH,
        severity: 'high',
        title: 'Security Alert',
        description: `Security event detected: ${action}`,
        metadata,
        affectedUserId: userId,
        resolved: false,
        timestamp: new Date()
      });
    }
  }

  async logBusinessEvent(action: string, metadata?: Record<string, any>) {
    await this.info('Business', action, metadata);
  }
}

export const logger = Logger.getInstance();

// Middleware for request logging
export const requestLoggingMiddleware = (req: any, res: any, next: any) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  logger.setRequestId(requestId);
  
  const startTime = Date.now();
  
  // Log request start
  logger.debug('HTTP', 'request_start', {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log request completion
    logger.info('HTTP', 'request_complete', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Alert on slow requests
    if (duration > 5000) { // 5 seconds
      logger.triggerAlert({
        type: AlertType.PERFORMANCE_DEGRADATION,
        severity: 'medium',
        title: 'Slow Request Detected',
        description: `Request to ${req.path} took ${duration}ms`,
        metadata: { method: req.method, path: req.path, duration },
        resolved: false,
        timestamp: new Date()
      });
    }
  });

  next();
};