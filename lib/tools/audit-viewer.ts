import { readCSV, findInCSV } from '../csv-helper';
import { AuditEvent, AuditEventType, AuditSeverity } from '../audit-logger';

export interface AuditSearchParams {
  userEmail?: string;
  startDate?: Date;
  endDate?: Date;
  eventTypes?: AuditEventType[];
  severity?: AuditSeverity[];
  resourceType?: string;
  resourceName?: string;
  limit?: number;
  offset?: number;
}

export interface AuditSummary {
  totalEvents: number;
  securityEvents: number;
  failedAttempts: number;
  uniqueUsers: number;
  topActions: Array<{
    action: string;
    count: number;
  }>;
  topResources: Array<{
    resource: string;
    count: number;
  }>;
  severityBreakdown: Record<AuditSeverity, number>;
  recentHighRiskEvents: AuditEvent[];
}

export interface UserActivitySummary {
  userEmail: string;
  totalActions: number;
  lastActivity: string;
  riskScore: number;
  topActions: string[];
  accessRequests: number;
  securityViolations: number;
  complianceStatus: 'compliant' | 'warning' | 'violation';
}

/**
 * Search audit logs with comprehensive filtering
 */
export async function searchAuditLogs(params: AuditSearchParams = {}): Promise<{
  events: AuditEvent[];
  total: number;
  hasMore: boolean;
}> {
  try {
    const allEvents = await readCSV('audit_log.csv');

    let filteredEvents = allEvents.filter((event: any) => {
      // User filter
      if (params.userEmail && event.user_email !== params.userEmail) {
        return false;
      }

      // Date range filter
      const eventDate = new Date(event.timestamp);
      if (params.startDate && eventDate < params.startDate) {
        return false;
      }
      if (params.endDate && eventDate > params.endDate) {
        return false;
      }

      // Event type filter
      if (params.eventTypes && !params.eventTypes.includes(event.event_type as AuditEventType)) {
        return false;
      }

      // Severity filter
      if (params.severity && !params.severity.includes(event.severity as AuditSeverity)) {
        return false;
      }

      // Resource filter
      if (params.resourceType && event.resource_type !== params.resourceType) {
        return false;
      }
      if (params.resourceName && event.resource_name !== params.resourceName) {
        return false;
      }

      return true;
    });

    // Sort by timestamp descending (newest first)
    filteredEvents.sort((a: any, b: any) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const total = filteredEvents.length;
    const offset = params.offset || 0;
    const limit = params.limit || 50;

    // Pagination
    const paginatedEvents = filteredEvents.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    // Convert to AuditEvent objects
    const events: AuditEvent[] = paginatedEvents.map(expandAuditEvent);

    return {
      events,
      total,
      hasMore
    };

  } catch (error) {
    console.error('Failed to search audit logs:', error);
    return { events: [], total: 0, hasMore: false };
  }
}

/**
 * Get comprehensive audit summary for dashboards
 */
export async function getAuditSummary(days: number = 7): Promise<AuditSummary> {
  try {
    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    const { events } = await searchAuditLogs({ startDate, limit: 10000 });

    const summary: AuditSummary = {
      totalEvents: events.length,
      securityEvents: 0,
      failedAttempts: 0,
      uniqueUsers: new Set<string>(),
      topActions: [],
      topResources: [],
      severityBreakdown: {
        [AuditSeverity.LOW]: 0,
        [AuditSeverity.MEDIUM]: 0,
        [AuditSeverity.HIGH]: 0,
        [AuditSeverity.CRITICAL]: 0
      },
      recentHighRiskEvents: []
    } as any;

    const actionCounts: Record<string, number> = {};
    const resourceCounts: Record<string, number> = {};

    events.forEach(event => {
      // Count unique users
      (summary.uniqueUsers as Set<string>).add(event.user_email);

      // Count security events
      if (event.event_type === AuditEventType.SECURITY_VIOLATION ||
          event.compliance_tags?.includes('security')) {
        summary.securityEvents++;
      }

      // Count failed attempts
      if (event.action_result === 'FAILURE') {
        summary.failedAttempts++;
      }

      // Count actions
      if (actionCounts[event.action]) {
        actionCounts[event.action]++;
      } else {
        actionCounts[event.action] = 1;
      }

      // Count resources
      if (event.resource_type && event.resource_name) {
        const resourceKey = `${event.resource_type}:${event.resource_name}`;
        if (resourceCounts[resourceKey]) {
          resourceCounts[resourceKey]++;
        } else {
          resourceCounts[resourceKey] = 1;
        }
      }

      // Count severity
      summary.severityBreakdown[event.severity]++;

      // Collect high-risk events
      if ((event.severity === AuditSeverity.HIGH || event.severity === AuditSeverity.CRITICAL) &&
          summary.recentHighRiskEvents.length < 10) {
        summary.recentHighRiskEvents.push(event);
      }
    });

    // Convert unique users set to number
    summary.uniqueUsers = (summary.uniqueUsers as Set<string>).size;

    // Sort and limit top actions
    summary.topActions = Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));

    // Sort and limit top resources
    summary.topResources = Object.entries(resourceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([resource, count]) => ({ resource, count }));

    return summary;

  } catch (error) {
    console.error('Failed to get audit summary:', error);
    return {
      totalEvents: 0,
      securityEvents: 0,
      failedAttempts: 0,
      uniqueUsers: 0,
      topActions: [],
      topResources: [],
      severityBreakdown: {
        [AuditSeverity.LOW]: 0,
        [AuditSeverity.MEDIUM]: 0,
        [AuditSeverity.HIGH]: 0,
        [AuditSeverity.CRITICAL]: 0
      },
      recentHighRiskEvents: []
    };
  }
}

/**
 * Get user activity summary for monitoring specific users
 */
export async function getUserActivitySummary(
  userEmail: string,
  days: number = 30
): Promise<UserActivitySummary> {
  try {
    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    const { events } = await searchAuditLogs({ userEmail, startDate, limit: 10000 });

    const actionCounts: Record<string, number> = {};
    let accessRequests = 0;
    let securityViolations = 0;
    let riskScore = 0;
    let lastActivity = '';

    events.forEach(event => {
      // Count actions
      if (actionCounts[event.action]) {
        actionCounts[event.action]++;
      } else {
        actionCounts[event.action] = 1;
      }

      // Count access requests
      if (event.event_type === AuditEventType.ACCESS_REQUEST) {
        accessRequests++;
      }

      // Count security violations
      if (event.event_type === AuditEventType.SECURITY_VIOLATION) {
        securityViolations++;
      }

      // Calculate risk score
      if (event.risk_score) {
        riskScore = Math.max(riskScore, event.risk_score);
      }

      // Update last activity
      if (!lastActivity || new Date(event.timestamp) > new Date(lastActivity)) {
        lastActivity = event.timestamp;
      }
    });

    // Determine compliance status
    let complianceStatus: 'compliant' | 'warning' | 'violation' = 'compliant';
    if (securityViolations > 0) {
      complianceStatus = 'violation';
    } else if (riskScore > 70 || accessRequests > 10) {
      complianceStatus = 'warning';
    }

    // Get top 5 actions
    const topActions = Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([action]) => action);

    return {
      userEmail,
      totalActions: events.length,
      lastActivity,
      riskScore,
      topActions,
      accessRequests,
      securityViolations,
      complianceStatus
    };

  } catch (error) {
    console.error('Failed to get user activity summary:', error);
    return {
      userEmail,
      totalActions: 0,
      lastActivity: '',
      riskScore: 0,
      topActions: [],
      accessRequests: 0,
      securityViolations: 0,
      complianceStatus: 'compliant'
    };
  }
}

/**
 * Get security events that require attention
 */
export async function getSecurityAlerts(hours: number = 24): Promise<{
  criticalAlerts: AuditEvent[];
  suspiciousActivity: AuditEvent[];
  failedAttempts: AuditEvent[];
  complianceViolations: AuditEvent[];
}> {
  try {
    const startDate = new Date(Date.now() - (hours * 60 * 60 * 1000));
    const { events } = await searchAuditLogs({
      startDate,
      severity: [AuditSeverity.HIGH, AuditSeverity.CRITICAL],
      limit: 1000
    });

    const criticalAlerts = events.filter(e => e.severity === AuditSeverity.CRITICAL);

    const suspiciousActivity = events.filter(e =>
      e.event_type === AuditEventType.SECURITY_VIOLATION ||
      (e.risk_score && e.risk_score > 80)
    );

    const failedAttempts = events.filter(e => e.action_result === 'FAILURE');

    const complianceViolations = events.filter(e =>
      e.compliance_tags?.some(tag =>
        tag.includes('violation') || tag.includes('non_compliant')
      )
    );

    return {
      criticalAlerts,
      suspiciousActivity,
      failedAttempts,
      complianceViolations
    };

  } catch (error) {
    console.error('Failed to get security alerts:', error);
    return {
      criticalAlerts: [],
      suspiciousActivity: [],
      failedAttempts: [],
      complianceViolations: []
    };
  }
}

/**
 * Export audit logs for compliance reporting
 */
export async function exportAuditLogs(
  params: AuditSearchParams = {},
  format: 'csv' | 'json' = 'csv'
): Promise<string> {
  try {
    const { events } = await searchAuditLogs({ ...params, limit: 100000 });

    if (format === 'json') {
      return JSON.stringify(events, null, 2);
    }

    // CSV format
    const headers = [
      'Event ID', 'Timestamp', 'Event Type', 'Severity', 'User Email',
      'Action', 'Result', 'Description', 'Resource Type', 'Resource Name',
      'IP Address', 'Risk Score', 'Compliance Tags'
    ];

    const csvRows = [headers.join(',')];

    events.forEach(event => {
      const row = [
        event.event_id,
        event.timestamp,
        event.event_type,
        event.severity,
        event.user_email,
        event.action,
        event.action_result,
        `"${event.description.replace(/"/g, '""')}"`, // Escape quotes
        event.resource_type || '',
        event.resource_name || '',
        event.ip_address || '',
        event.risk_score || 0,
        event.compliance_tags?.join(';') || ''
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');

  } catch (error) {
    console.error('Failed to export audit logs:', error);
    return '';
  }
}

/**
 * Helper function to expand flat CSV row to AuditEvent object
 */
function expandAuditEvent(row: any): AuditEvent {
  return {
    event_id: row.event_id,
    timestamp: row.timestamp,
    event_type: row.event_type as AuditEventType,
    severity: row.severity as AuditSeverity,
    user_email: row.user_email,
    user_role: row.user_role || undefined,
    user_team: row.user_team || undefined,
    resource_type: row.resource_type || undefined,
    resource_name: row.resource_name || undefined,
    resource_id: row.resource_id || undefined,
    action: row.action,
    action_result: row.action_result as 'SUCCESS' | 'FAILURE' | 'PENDING',
    description: row.description,
    ip_address: row.ip_address || undefined,
    user_agent: row.user_agent || undefined,
    session_id: row.session_id || undefined,
    request_id: row.request_id || undefined,
    approver_email: row.approver_email || undefined,
    approval_status: row.approval_status || undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    before_state: row.before_state || undefined,
    after_state: row.after_state || undefined,
    risk_score: row.risk_score ? parseInt(row.risk_score) : undefined,
    compliance_tags: row.compliance_tags ? row.compliance_tags.split(',') : undefined
  };
}

/**
 * Generate compliance report for auditors
 */
export async function generateComplianceReport(
  startDate: Date,
  endDate: Date
): Promise<{
  summary: {
    totalEvents: number;
    complianceScore: number;
    violations: number;
    criticalEvents: number;
  };
  userActivity: UserActivitySummary[];
  violations: AuditEvent[];
  recommendations: string[];
}> {
  try {
    const { events } = await searchAuditLogs({ startDate, endDate, limit: 100000 });

    const violations = events.filter(e =>
      e.event_type === AuditEventType.SECURITY_VIOLATION ||
      e.severity === AuditSeverity.CRITICAL ||
      e.compliance_tags?.includes('violation')
    );

    const criticalEvents = events.filter(e => e.severity === AuditSeverity.CRITICAL);

    // Calculate compliance score (0-100)
    const complianceScore = Math.max(0, 100 - (violations.length * 2) - (criticalEvents.length * 5));

    // Get user activity summaries for all active users
    const uniqueUsers = [...new Set(events.map(e => e.user_email))];
    const userActivity = await Promise.all(
      uniqueUsers.map(email => getUserActivitySummary(email,
        Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
      ))
    );

    // Generate recommendations
    const recommendations: string[] = [];
    if (violations.length > 0) {
      recommendations.push('Address security violations immediately');
    }
    if (complianceScore < 80) {
      recommendations.push('Improve security training compliance');
    }
    if (criticalEvents.length > 0) {
      recommendations.push('Review critical security events and implement preventive measures');
    }

    return {
      summary: {
        totalEvents: events.length,
        complianceScore,
        violations: violations.length,
        criticalEvents: criticalEvents.length
      },
      userActivity,
      violations,
      recommendations
    };

  } catch (error) {
    console.error('Failed to generate compliance report:', error);
    throw error;
  }
}
