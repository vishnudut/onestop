/**
 * Mock Jira API - simulates ticket creation
 */

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface JiraTicket {
  key: string;
  id: string;
  url: string;
  status: string;
  created: string;
}

export async function createJiraTicket(
  summary: string,
  description: string,
  issueType: string = 'Task'
): Promise<JiraTicket> {
  // Simulate API delay
  await sleep(1000);
  
  const ticketNumber = Math.floor(Math.random() * 10000);
  const ticket: JiraTicket = {
    key: `SDE-${ticketNumber}`,
    id: `${ticketNumber}`,
    url: `https://jira.company.com/browse/SDE-${ticketNumber}`,
    status: 'Open',
    created: new Date().toISOString(),
  };
  
  console.log(`[MOCK JIRA] Created ticket: ${ticket.key}`);
  console.log(`  Summary: ${summary}`);
  console.log(`  URL: ${ticket.url}`);
  
  return ticket;
}

export async function getJiraTicket(ticketKey: string): Promise<JiraTicket | null> {
  await sleep(500);
  
  // Simulate ticket lookup
  return {
    key: ticketKey,
    id: ticketKey.split('-')[1],
    url: `https://jira.company.com/browse/${ticketKey}`,
    status: Math.random() > 0.5 ? 'Open' : 'In Progress',
    created: new Date(Date.now() - 86400000).toISOString(),
  };
}
