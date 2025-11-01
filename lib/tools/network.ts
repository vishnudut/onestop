import { appendToCSV, findInCSV, findOneInCSV } from '../csv-helper';
import { auditLogger, auditHelpers, AuditSeverity } from '../audit-logger';

/**
 * Get user's current IP address
 */
export async function getCurrentIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();

    // Log IP retrieval
    await auditLogger.logEvent({
      user_email: 'system',
      action: 'get_current_ip',
      description: `Retrieved current IP address: ${data.ip}`,
      ip_address: data.ip,
      metadata: {
        source: 'ipify_api',
        method: 'fetch'
      }
    });

    return data.ip;
  } catch (error) {
    // Fallback to mock IP
    const mockIP = `192.0.2.${Math.floor(Math.random() * 255)}`;

    // Log fallback IP usage
    await auditLogger.logEvent({
      user_email: 'system',
      action: 'get_current_ip_fallback',
      action_result: 'FAILURE',
      description: `Failed to retrieve IP from API, using mock IP: ${mockIP}`,
      ip_address: mockIP,
      metadata: {
        source: 'mock',
        error: error.message
      }
    });

    return mockIP;
  }
}

/**
 * Check if an IP is already whitelisted
 */
export async function checkIPWhitelist(ip: string): Promise<boolean> {
  const existing = await findOneInCSV('ip_whitelist.csv', (row) =>
    row.ip_address === ip && row.status === 'active'
  );

  return !!existing;
}

/**
 * Whitelist an IP address for VPN access
 */
export async function whitelistIP(
  userEmail: string,
  ip: string,
  reason: string
): Promise<any> {
  // Log the IP whitelist attempt
  await auditLogger.logIPWhitelist(userEmail, ip, 'WHITELISTED', 'PENDING', reason);

  // Check if user exists and has completed security training
  const user = await findOneInCSV('employees.csv', (row) => row.email === userEmail);

  if (!user) {
    await auditLogger.logIPWhitelist(userEmail, ip, 'WHITELISTED', 'FAILURE', 'User not found');
    return {
      success: false,
      error: 'User not found',
    };
  }

  if (user.security_training_complete !== 'true') {
    await auditLogger.logIPWhitelist(userEmail, ip, 'WHITELISTED', 'FAILURE', 'Security training incomplete');
    await auditLogger.logSecurityEvent(
      userEmail,
      'ip_whitelist_denied',
      `IP whitelist denied for ${userEmail} - security training not completed`,
      AuditSeverity.MEDIUM,
      {
        requested_ip: ip,
        reason: reason,
        training_status: user.security_training_complete
      }
    );
    return {
      success: false,
      error: 'Security training required before IP whitelisting',
      action: 'Please complete security training at https://training.company.com/security-101',
    };
  }

  // Check if IP is already whitelisted
  const isWhitelisted = await checkIPWhitelist(ip);
  if (isWhitelisted) {
    await auditLogger.logIPWhitelist(userEmail, ip, 'WHITELISTED', 'FAILURE', 'IP already whitelisted');
    return {
      success: false,
      error: `IP ${ip} is already whitelisted`,
    };
  }

  // Add to whitelist
  await appendToCSV('ip_whitelist.csv', {
    ip_address: ip,
    user_email: userEmail,
    location: 'Unknown',
    added_date: new Date().toISOString(),
    added_by: 'auto',
    status: 'active',
    expires_at: 'null',
    reason: reason,
  });

  console.log(`[IP WHITELIST] Added ${ip} for ${userEmail}`);

  // Log successful IP whitelisting
  await auditLogger.logIPWhitelist(userEmail, ip, 'WHITELISTED', 'SUCCESS', reason);

  await auditLogger.logEvent({
    user_email: userEmail,
    user_role: user.role,
    user_team: user.team,
    resource_type: 'network',
    resource_name: 'vpn_whitelist',
    action: 'ip_address_whitelisted',
    action_result: 'SUCCESS',
    description: `IP address ${ip} whitelisted for VPN access`,
    ip_address: ip,
    metadata: {
      whitelist_reason: reason,
      user_location: 'Unknown',
      granted_by: 'auto',
      security_training_status: user.security_training_complete
    },
    compliance_tags: ['network_security', 'ip_management', 'vpn_access']
  });

  return {
    success: true,
    ip: ip,
    message: `IP ${ip} has been whitelisted for VPN access`,
  };
}

/**
 * Get all whitelisted IPs for a user
 */
export async function getUserWhitelistedIPs(userEmail: string): Promise<any[]> {
  // Log the whitelist lookup
  await auditHelpers.logToolExecution(
    userEmail,
    'getUserWhitelistedIPs',
    { userEmail },
    'SUCCESS'
  );

  const ips = await findInCSV('ip_whitelist.csv', (row) =>
    row.user_email === userEmail && row.status === 'active'
  );

  // Log what IPs were returned
  await auditLogger.logEvent({
    user_email: userEmail,
    action: 'whitelist_lookup_completed',
    description: `Retrieved ${ips.length} whitelisted IPs for user`,
    metadata: {
      ip_count: ips.length,
      ip_addresses: ips.map(ip => ip.ip_address).join(',')
    },
    compliance_tags: ['network_security', 'data_access']
  });

  return ips;
}
