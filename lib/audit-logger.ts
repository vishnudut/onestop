import { appendToCSV, readCSV } from './csv-helper';

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

export interface AuditEvent {
  event_id: string;
  timestamp: string;
  event_type: AuditEventType;
  severity: AuditSeverity;
  user_email: string;
  user_role?: string;
  user_team?: string;

  // Resource Information
  resource_type?: string;
  resource_name?: string;
  resource_id?: string;

  // Action Details
  action: string;
  action_result: 'SUCCESS' | 'FAILURE' | 'PENDING';
  description: string;

  // Technical Details
  ip_address?: string;
  user_agent?: string;
  session_id?: string;

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

export class AuditLogger {
  private static instance: AuditLogger;
  private readonly auditFile = 'audit_log.csv';

  private constructor() {}

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log a comprehensive audit event
   */
  public async logEvent(event: Partial<AuditEvent>): Promise<void> {
    const auditEvent: AuditEvent = {
      event_id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      event_type: event.event_type || AuditEventType.SYSTEM_ACCESS,
      severity: event.severity || AuditSeverity.LOW,
      user_email: event.user_email || 'system',
      action: event.action || 'unknown_action',
      action_result: event.action_result || 'SUCCESS',
      description: event.description || 'No description provided',
      ...event
    };

    try {
      await appendToCSV(this.auditFile, this.flattenEvent(auditEvent));

      // Log to console for development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AUDIT] ${auditEvent.severity} | ${auditEvent.event_type} | ${auditEvent.user_email} | ${auditEvent.description}`);
      }

      // Check for security violations
      await this.checkSecurityViolations(auditEvent);

    } catch (error) {
      console.error('Failed to log audit event:', error);
      // In production, this should be sent to a monitoring service
    }
  }

  /**
   * Log user authentication events
   */
  public async logAuth(userEmail: string, action: 'LOGIN' | 'LOGOUT', ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      event_type: action === 'LOGIN' ? AuditEventType.LOGIN : AuditEventType.LOGOUT,
      severity: AuditSeverity.LOW,
      user_email: userEmail,
      action: action.toLowerCase(),
      description: `User ${action.toLowerCase()} attempt`,
      ip_address: ipAddress,
      user_agent: userAgent,
      compliance_tags: ['authentication', 'identity']
    });
  }

  /**
   * Log access requests with full context
   */
  public async logAccessRequest(
    userEmail: string,
    resourceType: string,
    resourceName: string,
    reason: string,
    result: 'SUCCESS' | 'FAILURE' | 'PENDING',
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      event_type: AuditEventType.ACCESS_REQUEST,
      severity: this.getSeverityForResource(resourceType, resourceName),
      user_email: userEmail,
      resource_type: resourceType,
      resource_name: resourceName,
      action: 'request_access',
      action_result: result,
      description: `Access request for ${resourceType}:${resourceName} - ${reason}`,
      metadata,
      compliance_tags: this.getComplianceTags(resourceType, resourceName),
      risk_score: this.calculateRiskScore(resourceType, resourceName, userEmail)
    });
  }

  /**
   * Log tool executions with parameters and results
   */
  public async logToolExecution(
    userEmail: string,
    toolName: string,
    parameters: Record<string, any>,
    result: 'SUCCESS' | 'FAILURE',
    executionTime?: number,
    error?: string
  ): Promise<void> {
    await this.logEvent({
      event_type: AuditEventType.TOOL_EXECUTED,
      severity: AuditSeverity.LOW,
      user_email: userEmail,
      action: `execute_tool_${toolName}`,
      action_result: result,
      description: `Tool ${toolName} executed ${result.toLowerCase()}`,
      metadata: {
        tool_name: toolName,
        parameters,
        execution_time_ms: executionTime,
        error_message: error
      },
      compliance_tags: ['automation', 'tool_usage']
    });
  }

  /**
   * Log UI component interactions
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
   * Log approval workflow events
   */
  public async logApproval(
    requestId: string,
    requesterEmail: string,
    approverEmail: string,
    action: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'ESCALATED',
    resourceType: string,
    resourceName: string,
    reason?: string
  ): Promise<void> {
    await this.logEvent({
      event_type: this.getApprovalEventType(action),
      severity: this.getSeverityForResource(resourceType, resourceName),
      user_email: requesterEmail,
      approver_email: approverEmail,
      resource_type: resourceType,
      resource_name: resourceName,
      request_id: requestId,
      action: `approval_${action.toLowerCase()}`,
      action_result: action === 'REQUESTED' ? 'PENDING' : 'SUCCESS',
      description: `Access request ${requestId} ${action.toLowerCase()} for ${resourceType}:${resourceName}`,
      metadata: {
        approval_reason: reason,
        workflow_step: action
      },
      compliance_tags: ['approval_workflow', 'governance']
    });
  }

  /**
   * Log security-sensitive events
   */
  public async logSecurityEvent(
    userEmail: string,
    eventType: string,
    description: string,
    severity: AuditSeverity = AuditSeverity.HIGH,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      event_type: AuditEventType.SECURITY_VIOLATION,
      severity,
      user_email: userEmail,
      action: eventType,
      action_result: 'SUCCESS',
      description,
      metadata,
      compliance_tags: ['security', 'violation', 'alert'],
      risk_score: severity === AuditSeverity.CRITICAL ? 100 : severity === AuditSeverity.HIGH ? 80 : 60
    });
  }

  /**
   * Log IP whitelisting events
   */
  public async logIPWhitelist(
    userEmail: string,
    ipAddress: string,
    action: 'WHITELISTED' | 'REMOVED' | 'ACCESS_ATTEMPT',
    result: 'SUCCESS' | 'FAILURE',
    reason?: string
  ): Promise<void> {
    await this.logEvent({
      event_type: AuditEventType.IP_WHITELISTED,
      severity: AuditSeverity.MEDIUM,
      user_email: userEmail,
      ip_address: ipAddress,
      action: `ip_${action.toLowerCase()}`,
      action_result: result,
      description: `IP ${ipAddress} ${action.toLowerCase()} for ${userEmail}`,
      metadata: {
        whitelist_reason: reason,
        network_action: action
      },
      compliance_tags: ['network_security', 'ip_management'],
      risk_score: this.calculateIPRiskScore(ipAddress, action)
    });
  }

  /**
   * Get audit trail for a specific user
   */
  public async getUserAuditTrail(
    userEmail: string,
    startDate?: Date,
    endDate?: Date,
    eventTypes?: AuditEventType[]
  ): Promise<AuditEvent[]> {
    try {
      const allEvents = await readCSV(this.auditFile);

      return allEvents
        .filter((event: any) => {
          if (event.user_email !== userEmail) return false;

          if (startDate && new Date(event.timestamp) < startDate) return false;
          if (endDate && new Date(event.timestamp) > endDate) return false;

          if (eventTypes && !eventTypes.includes(event.event_type)) return false;

          return true;
        })
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .map(this.expandEvent);

    } catch (error) {
      console.error('Failed to get user audit trail:', error);
      return [];
    }
  }

  /**
   * Get security events for monitoring
   */
  public async getSecurityEvents(
    severity: AuditSeverity = AuditSeverity.HIGH,
    hours: number = 24
  ): Promise<AuditEvent[]> {
    try {
      const allEvents = await readCSV(this.auditFile);
      const cutoffDate = new Date(Date.now() - (hours * 60 * 60 * 1000));

      return allEvents
        .filter((event: any) => {
          const eventDate = new Date(event.timestamp);
          const eventSeverity = event.severity as AuditSeverity;

          return eventDate >= cutoffDate &&
                 this.getSeverityWeight(eventSeverity) >= this.getSeverityWeight(severity);
        })
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .map(this.expandEvent);

    } catch (error) {
      console.error('Failed to get security events:', error);
      return [];
    }
  }

  // Private helper methods

  private generateEventId(): string {
    return `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

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

  private calculateIPRiskScore(ipAddress: string, action: string): number {
    let score = 20;

    if (action === 'ACCESS_ATTEMPT') score += 10;
    if (action === 'WHITELISTED') score += 30;

    // Check for suspicious IP patterns (this would be more sophisticated in production)
    if (ipAddress.startsWith('10.') || ipAddress.startsWith('192.168.')) {
      score -= 10; // Internal network, lower risk
    }

    return Math.min(score, 100);
  }

  private getApprovalEventType(action: string): AuditEventType {
    switch (action) {
      case 'REQUESTED': return AuditEventType.APPROVAL_REQUESTED;
      case 'APPROVED': return AuditEventType.APPROVAL_GRANTED;
      case 'REJECTED': return AuditEventType.APPROVAL_REJECTED;
      case 'ESCALATED': return AuditEventType.APPROVAL_ESCALATED;
      default: return AuditEventType.APPROVAL_REQUESTED;
    }
  }

  private getSeverityWeight(severity: AuditSeverity): number {
    switch (severity) {
      case AuditSeverity.LOW: return 1;
      case AuditSeverity.MEDIUM: return 2;
      case AuditSeverity.HIGH: return 3;
      case AuditSeverity.CRITICAL: return 4;
      default: return 1;
    }
  }

  private async checkSecurityViolations(event: AuditEvent): Promise<void> {
    // Check for suspicious patterns
    if (event.severity === AuditSeverity.CRITICAL) {
      // In production, this would trigger alerts to security team
      console.warn(`🚨 CRITICAL SECURITY EVENT: ${event.description}`);
    }

    // Check for failed access attempts
    if (event.action_result === 'FAILURE' && event.event_type === AuditEventType.ACCESS_REQUEST) {
      // Could implement rate limiting or account lockout here
    }
  }

  private flattenEvent(event: AuditEvent): Record<string, string> {
    return {
      event_id: event.event_id,
      timestamp: event.timestamp,
      event_type: event.event_type,
      severity: event.severity,
      user_email: event.user_email,
      user_role: event.user_role || '',
      user_team: event.user_team || '',
      resource_type: event.resource_type || '',
      resource_name: event.resource_name || '',
      resource_id: event.resource_id || '',
      action: event.action,
      action_result: event.action_result,
      description: event.description,
      ip_address: event.ip_address || '',
      user_agent: event.user_agent || '',
      session_id: event.session_id || '',
      request_id: event.request_id || '',
      approver_email: event.approver_email || '',
      approval_status: event.approval_status || '',
      metadata: event.metadata ? JSON.stringify(event.metadata) : '',
      before_state: event.before_state || '',
      after_state: event.after_state || '',
      risk_score: event.risk_score?.toString() || '0',
      compliance_tags: event.compliance_tags ? event.compliance_tags.join(',') : ''
    };
  }

  private expandEvent(flatEvent: Record<string, string>): AuditEvent {
    return {
      event_id: flatEvent.event_id,
      timestamp: flatEvent.timestamp,
      event_type: flatEvent.event_type as AuditEventType,
      severity: flatEvent.severity as AuditSeverity,
      user_email: flatEvent.user_email,
      user_role: flatEvent.user_role || undefined,
      user_team: flatEvent.user_team || undefined,
      resource_type: flatEvent.resource_type || undefined,
      resource_name: flatEvent.resource_name || undefined,
      resource_id: flatEvent.resource_id || undefined,
      action: flatEvent.action,
      action_result: flatEvent.action_result as 'SUCCESS' | 'FAILURE' | 'PENDING',
      description: flatEvent.description,
      ip_address: flatEvent.ip_address || undefined,
      user_agent: flatEvent.user_agent || undefined,
      session_id: flatEvent.session_id || undefined,
      request_id: flatEvent.request_id || undefined,
      approver_email: flatEvent.approver_email || undefined,
      approval_status: flatEvent.approval_status || undefined,
      metadata: flatEvent.metadata ? JSON.parse(flatEvent.metadata) : undefined,
      before_state: flatEvent.before_state || undefined,
      after_state: flatEvent.after_state || undefined,
      risk_score: flatEvent.risk_score ? parseInt(flatEvent.risk_score) : undefined,
      compliance_tags: flatEvent.compliance_tags ? flatEvent.compliance_tags.split(',') : undefined
    };
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();

// Helper functions for common audit scenarios
export const auditHelpers = {
  /**
   * Quick access request logging
   */
  logAccessRequest: (userEmail: string, resourceType: string, resourceName: string, reason: string, result: 'SUCCESS' | 'FAILURE' | 'PENDING') =>
    auditLogger.logAccessRequest(userEmail, resourceType, resourceName, reason, result),

  /**
   * Quick UI action logging
   */
  logUIAction: (userEmail: string, componentType: string, action: string, data?: Record<string, any>) =>
    auditLogger.logUIAction(userEmail, componentType, action, data),

  /**
   * Quick tool execution logging
   */
  logToolExecution: (userEmail: string, toolName: string, parameters: Record<string, any>, result: 'SUCCESS' | 'FAILURE', error?: string) =>
    auditLogger.logToolExecution(userEmail, toolName, parameters, result, undefined, error),

  /**
   * Quick security event logging
   */
  logSecurityEvent: (userEmail: string, eventType: string, description: string, severity: AuditSeverity = AuditSeverity.HIGH) =>
    auditLogger.logSecurityEvent(userEmail, eventType, description, severity)
};
