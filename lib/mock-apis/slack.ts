/**
 * Mock Slack API - simulates sending messages
 */

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface SlackMessage {
  ok: boolean;
  channel: string;
  ts: string;
  message: {
    text: string;
    user: string;
  };
}

export async function sendSlackMessage(
  channel: string,
  text: string,
  user: string = 'bot'
): Promise<SlackMessage> {
  // Simulate API delay
  await sleep(800);
  
  const message: SlackMessage = {
    ok: true,
    channel: channel,
    ts: Date.now().toString(),
    message: {
      text: text,
      user: user,
    },
  };
  
  console.log(`[MOCK SLACK] Sent message to ${channel}`);
  console.log(`  Text: ${text}`);
  
  return message;
}

export async function sendSlackDM(
  userEmail: string,
  text: string
): Promise<SlackMessage> {
  await sleep(800);
  
  console.log(`[MOCK SLACK] Sent DM to ${userEmail}`);
  console.log(`  Text: ${text}`);
  
  return {
    ok: true,
    channel: `dm-${userEmail}`,
    ts: Date.now().toString(),
    message: {
      text: text,
      user: 'bot',
    },
  };
}
