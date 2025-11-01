import { appendToCSV, findInCSV, findOneInCSV } from '../csv-helper';
import { createJiraTicket } from '../mock-apis/jira';
import { sendSlackDM } from '../mock-apis/slack';

/**
 * List all API keys for a user
 */
export async function listAPIKeys(userEmail: string): Promise<any[]> {
  const keys = await findInCSV('api_keys.csv', (row) =>
    row.user_email === userEmail
  );
  
  return keys;
}

/**
 * Request a new API key
 */
export async function requestAPIKey(
  userEmail: string,
  service: string,
  environment: string,
  project: string,
  reason: string
): Promise<any> {
  // Get policy for this API key
  const policy = await findOneInCSV('access_policies.csv', (row) =>
    row.resource_type === 'api_key' && row.resource_name === service
  );
  
  if (!policy) {
    return {
      success: false,
      error: `No policy found for ${service} API keys`,
    };
  }
  
  // Get user info
  const user = await findOneInCSV('employees.csv', (row) => row.email === userEmail);
  
  if (!user) {
    return {
      success: false,
      error: 'User not found',
    };
  }
  
  // Check if approval is required
  if (policy.requires_approval === 'true') {
    // Create Jira ticket
    const ticket = await createJiraTicket(
      `API Key Request: ${service} (${environment})`,
      `**Requester:** ${user.name} (${userEmail})\n` +
      `**Service:** ${service}\n` +
      `**Environment:** ${environment}\n` +
      `**Project:** ${project}\n` +
      `**Reason:** ${reason}\n\n` +
      `**Team:** ${user.team}\n` +
      `**Manager:** ${user.manager_email}`
    );
    
    // Create approval request
    const requestId = `REQ-${Date.now()}`;
    await appendToCSV('approval_requests.csv', {
      request_id: requestId,
      requester_email: userEmail,
      resource_type: 'api_key',
      resource_name: service,
      reason: reason,
      approver_email: user.manager_email,
      status: 'pending',
      created_at: new Date().toISOString(),
      resolved_at: 'null',
      ticket_id: ticket.key,
    });
    
    // Notify manager
    await sendSlackDM(
      user.manager_email,
      `🔑 API Key Request from ${user.name}\n\n` +
      `Service: ${service} (${environment})\n` +
      `Project: ${project}\n` +
      `Reason: ${reason}\n\n` +
      `Jira Ticket: ${ticket.url}`
    );
    
    return {
      success: true,
      requiresApproval: true,
      requestId: requestId,
      ticketUrl: ticket.url,
      ticketKey: ticket.key,
      message: `Approval request created. Jira ticket: ${ticket.key}`,
    };
  } else {
    // Auto-generate for test environment
    const keyId = `KEY-${Date.now()}`;
    const apiKey = `sk_${environment}_${Math.random().toString(36).substr(2, 24)}`;
    
    await appendToCSV('api_keys.csv', {
      key_id: keyId,
      service: service,
      environment: environment,
      user_email: userEmail,
      created_date: new Date().toISOString(),
      expires_at: environment === 'test' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : 'null',
      last_used: 'never',
      status: 'active',
      project: project,
      approval_ticket: 'auto',
    });
    
    return {
      success: true,
      requiresApproval: false,
      keyId: keyId,
      apiKey: apiKey,
      message: `API key generated for ${service} (${environment})`,
    };
  }
}

/**
 * Get service ownership information
 */
export async function getServiceInfo(serviceName: string): Promise<any> {
  const service = await findOneInCSV('services.csv', (row) =>
    row.service_name === serviceName
  );
  
  if (!service) {
    return {
      success: false,
      error: `Service ${serviceName} not found`,
    };
  }
  
  // Get on-call info
  const onCall = await findOneInCSV('oncall_schedule.csv', (row) => {
    const today = new Date();
    const weekStart = new Date(row.week_start);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    return row.team === service.team && today >= weekStart && today < weekEnd;
  });
  
  return {
    success: true,
    service: service,
    onCall: onCall || null,
  };
}
