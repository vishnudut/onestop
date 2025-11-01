/**
 * Mock GitHub API - simulates org invites and repo access
 */

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface GitHubInvite {
  state: string;
  role: string;
  organization: string;
  team: string;
  inviteUrl: string;
}

export async function addToGitHubOrg(
  username: string,
  org: string,
  team: string
): Promise<GitHubInvite> {
  // Simulate API delay
  await sleep(1200);
  
  const invite: GitHubInvite = {
    state: 'pending',
    role: 'member',
    organization: org,
    team: team,
    inviteUrl: `https://github.com/orgs/${org}/invitation`,
  };
  
  console.log(`[MOCK GITHUB] Added ${username} to ${org}/${team}`);
  
  return invite;
}

export async function createRepository(
  name: string,
  org: string,
  isPrivate: boolean = true
): Promise<{ url: string; name: string }> {
  await sleep(1500);
  
  console.log(`[MOCK GITHUB] Created repository ${org}/${name}`);
  
  return {
    url: `https://github.com/${org}/${name}`,
    name: name,
  };
}
