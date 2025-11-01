import { appendToCSV, findInCSV, findOneInCSV } from '../csv-helper';

/**
 * Get user's current IP address
 */
export async function getCurrentIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    // Fallback to mock IP
    return `192.0.2.${Math.floor(Math.random() * 255)}`;
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
  // Check if user exists and has completed security training
  const user = await findOneInCSV('employees.csv', (row) => row.email === userEmail);
  
  if (!user) {
    return {
      success: false,
      error: 'User not found',
    };
  }
  
  if (user.security_training_complete !== 'true') {
    return {
      success: false,
      error: 'Security training required before IP whitelisting',
      action: 'Please complete security training at https://training.company.com/security-101',
    };
  }
  
  // Check if IP is already whitelisted
  const isWhitelisted = await checkIPWhitelist(ip);
  if (isWhitelisted) {
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
  const ips = await findInCSV('ip_whitelist.csv', (row) =>
    row.user_email === userEmail && row.status === 'active'
  );
  
  return ips;
}
