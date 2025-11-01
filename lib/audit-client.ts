/**
 * Client-side audit logging helper
 * This module handles audit logging from client components by sending events to the server API
 */

export enum AuditEventType {
  // User Actions
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  ACCESS_REQUEST = 'ACCESS_REQUEST',
  ACCESS_GRANTED = 'ACCESS_GRANTED',
  ACCESS_DENIED = 'ACCESS_DENIED',

  // Resource Access
  RESOURCE_ACCESSED = 'RESOURCE_ACCESSED',
  RESOURCE_MODIFIED = 'RESOURCE_MODIFIED',

  // IP & Network
  IP_WHITELISTED = 'IP_WHITELISTED',
  IP_ACCESS_ATTEMPT = 'IP_ACCESS_ATTEMPT',
  VPN_ACCESS = 'VPN_ACCESS',

  // API Keys
  API_KEY_GENERATED = 'API_KEY_GENERATED',
  API_KEY_REQUESTED = 'API_KEY_REQUESTED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',
  API_KEY_USED = 'API_KEY_USED',

  // Training & Compliance
  TRAINING_COMPLETED = 'TRAINING_COMPLETED',
  TRAINING_EXPIRED = 'TRAINING_EXPIRED',
  COMPLIANCE_CHECK = 'COMPLIANCE_CHECK',

  // Approvals
  APPROVAL_REQUESTED = 'APPROVAL_REQUESTED',
  APPROVAL_GRANTED = 'APPROVAL_GRANTED',
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',
  APPROVAL_ESCALATED = 'APPROVAL_ESCALATED',

  // System Events
  SYSTEM_ACCESS = 'SYSTEM_ACCESS',
  DATA_EXPORT = 'DATA_EXPORT',
  POLICY_CHANGE = 'POLICY_CHANGE',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',

  // UI Interactions
  UI_FORM_SUBMITTED = 'UI_FORM_SUBMITTED',
  UI_ACTION_PERFORMED = 'UI_ACTION_PERFORMED',
  TOOL_EXECUTED = 'TOOL_EXECUTED'
}

export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ClientAuditEvent {
  event_type?: AuditEventType;
  severity?: AuditSeverity;
  user_email: string;
  user_role?: string;
  user_team?: string;

  // Resource Information
  resource_type?: string;
  resource_name?: string;
  resource_id?: string;

  // Action Details
  action: string;
  action_result?: 'SUCCESS' | 'FAILURE' | 'PENDING';
  description: string;

  // Context
  request_id?: string;
  approver_email?: string;
  approval_status?: string;

  // Additional Data
  metadata?: Record<string, any>;
  before_state?: string;
  after_state?: string;

  // Risk Assessment
  risk_score?: number;
  compliance_tags?: string[];
}

class ClientAuditLogger {
  private static instance: ClientAuditLogger;
  private apiEndpoint = '/api/audit';
  private pendingEvents: ClientAuditEvent[] = [];
  private isOnline = true;

  private constructor() {
    // Listen for online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushPendingEvents();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  public static getInstance(): ClientAuditLogger {
    if (!ClientAuditLogger.instance) {
      ClientAuditLogger.instance = new ClientAuditLogger();
    }
    return ClientAuditLogger.instance;
  }

  /**
   * Log an audit event from the client
   */
  public async logEvent(event: ClientAuditEvent): Promise<boolean> {
    const auditEvent: ClientAuditEvent = {
      event_type: event.event_type || AuditEventType.SYSTEM_ACCESS,
      severity: event.severity || AuditSeverity.LOW,
      action_result: event.action_result || 'SUCCESS',
      ...event
    };

    // Add browser context
    if (typeof window !== 'undefined') {
      auditEvent.metadata = {
        ...auditEvent.metadata,
        browser_url: window.location.href,
        browser_referrer: document.referrer || 'direct',
        browser_user_agent: navigator.userAgent,
        browser_timestamp: new Date().toISOString()
      };
    }

    try {
      if (this.isOnline) {
        const success = await this.sendEventToServer(auditEvent);
        if (success) {
          return true;
        } else {
          // If server request fails, queue for later
          this.pendingEvents.push(auditEvent);
          return false;
        }
      } else {
        // If offline, queue the event
        this.pendingEvents.push(auditEvent);
        return false;
      }
    } catch (error) {
      console.error('Failed to log audit event:', error);
      this.pendingEvents.push(auditEvent);
      return false;
    }
  }

  /**
   * Send event to server
   */
  private async sendEventToServer(event: ClientAuditEvent): Promise<boolean> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send audit event to server:', error);
      return false;
    }
  }

  /**
   * Flush pending events when connection is restored
   */
  private async flushPendingEvents(): Promise<void> {
    if (this.pendingEvents.length === 0) return;

    const events = [...this.pendingEvents];
    this.pendingEvents = [];

    for (const event of events) {
      const success = await this.sendEventToServer(event);
      if (!success) {
        // Re-queue failed events
        this.pendingEvents.push(event);
      }
    }
  }

  /**
   * Log user authentication events
   */
  public async logAuth(
    userEmail: string,
    action: 'LOGIN' | 'LOGOUT'
  ): Promise<void> {
    await this.logEvent({
      event_type: action === 'LOGIN' ? AuditEventType.LOGIN : AuditEventType.LOGOUT,
      severity: AuditSeverity.LOW,
      user_email: userEmail,
      action: action.toLowerCase(),
      description: `User ${action.toLowerCase()} attempt`,
      compliance_tags: ['authentication', 'identity']
    });
  }

  /**
   * Log UI interactions
   */
  public async logUIAction(
    userEmail: string,
    componentType: string,
    action: string,
    data?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      event_type: AuditEventType.UI_ACTION_PERFORMED,
      severity: AuditSeverity.LOW,
      user_email: userEmail,
      action: `ui_${componentType}_${action}`,
      description: `UI interaction: ${componentType} - ${action}`,
      metadata: {
        component_type: componentType,
        ui_action: action,
        form_data: data
      },
      compliance_tags: ['user_interaction', 'ui']
    });
  }

  /**
   * Log access requests
   */
  public async logAccessRequest(
    userEmail: string,
    resourceType: string,
    resourceName: string,
    reason: string,
    result: 'SUCCESS' | 'FAILURE' | 'PENDING'
  ): Promise<void> {
    const severity = this.getSeverityForResource(resourceType, resourceName);

    await this.logEvent({
      event_type: AuditEventType.ACCESS_REQUEST,
      severity,
      user_email: userEmail,
      resource_type: resourceType,
      resource_name: resourceName,
      action: 'request_access',
      action_result: result,
      description: `Access request for ${resourceType}:${resourceName} - ${reason}`,
      metadata: { reason },
      compliance_tags: this.getComplianceTags(resourceType, resourceName),
      risk_score: this.calculateRiskScore(resourceType, resourceName, userEmail)
    });
  }

  /**
   * Log security events
   */
  public async logSecurityEvent(
    userEmail: string,
    eventType: string,
    description: string,
    severity: AuditSeverity = AuditSeverity.HIGH
  ): Promise<void> {
    await this.logEvent({
      event_type: AuditEventType.SECURITY_VIOLATION,
      severity,
      user_email: userEmail,
      action: eventType,
      description,
      compliance_tags: ['security', 'violation', 'alert'],
      risk_score: severity === AuditSeverity.CRITICAL ? 100 : severity === AuditSeverity.HIGH ? 80 : 60
    });
  }

  // Helper methods
  private getSeverityForResource(resourceType: string, resourceName: string): AuditSeverity {
    if (resourceName.includes('production') || resourceName.includes('prod')) {
      return AuditSeverity.HIGH;
    }
    if (resourceType === 'api_key' && resourceName === 'stripe') {
      return AuditSeverity.HIGH;
    }
    if (resourceType === 'database' || resourceType === 'api_key') {
      return AuditSeverity.MEDIUM;
    }
    return AuditSeverity.LOW;
  }

  private getComplianceTags(resourceType: string, resourceName: string): string[] {
    const tags = ['access_control'];

    if (resourceName.includes('production')) tags.push('production_access');
    if (resourceType === 'database') tags.push('data_access', 'gdpr');
    if (resourceType === 'api_key') tags.push('api_security', 'credentials');
    if (resourceName === 'stripe') tags.push('pci_compliance', 'payment_data');

    return tags;
  }

  private calculateRiskScore(resourceType: string, resourceName: string, userEmail: string): number {
    let score = 10; // Base score

    if (resourceName.includes('production')) score += 40;
    if (resourceType === 'database') score += 30;
    if (resourceType === 'api_key') score += 25;
    if (resourceName === 'stripe') score += 35;
    if (userEmail.includes('intern')) score += 20;

    return Math.min(score, 100);
  }
}

// Export singleton instance
export const clientAuditLogger = ClientAuditLogger.getInstance();

// Helper functions for common audit scenarios
export const auditHelpers = {
  /**
   * Quick access request logging
   */
  logAccessRequest: (userEmail: string, resourceType: string, resourceName: string, reason: string, result: 'SUCCESS' | 'FAILURE' | 'PENDING') =>
    clientAuditLogger.logAccessRequest(userEmail, resourceType, resourceName, reason, result),

  /**
   * Quick UI action logging
   */
  logUIAction: (userEmail: string, componentType: string, action: string, data?: Record<string, any>) =>
    clientAuditLogger.logUIAction(userEmail, componentType, action, data),

  /**
   * Quick security event logging
   */
  logSecurityEvent: (userEmail: string, eventType: string, description: string, severity: AuditSeverity = AuditSeverity.HIGH) =>
    clientAuditLogger.logSecurityEvent(userEmail, eventType, description, severity)
};
