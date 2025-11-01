# 🛠️ Dev Concierge

An AI-powered IT support assistant for software engineers. Get instant help with access permissions, API keys, IP whitelisting, and more.

## Features

- **Access Management**: Check your current permissions and request new access
- **IP Whitelisting**: Automatically whitelist your IP for VPN access
- **API Key Generation**: Request API keys with automated approval workflows
- **Service Information**: Find service owners and on-call engineers
- **Smart Workflows**: Automatic approval routing based on policies

## Tech Stack

- **Next.js 16** with App Router
- **Vercel AI SDK** for streaming chat with tool calling
- **OpenAI GPT-4o-mini** for intelligent reasoning
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **CSV files** as data storage (easy to inspect/modify)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Add OpenAI API Key

Edit `.env.local` and add your OpenAI API key:

```bash
OPENAI_API_KEY=sk-proj-your-actual-key-here
```

Get your API key from: https://platform.openai.com/api-keys

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Try These Queries:

1. **"What access do I have?"** - See your current permissions
2. **"Whitelist my IP"** - Add your IP to VPN whitelist
3. **"I need an OpenAI API key"** - Request a new API key
4. **"Who owns the payment service?"** - Find service owners
5. **"Request access to production database"** - Submit access request

### Available Test Users:

- `alice@company.com` - Senior SDE, Backend team
- `charlie@company.com` - SDE, Frontend team (no security training)
- `eve@company.com` - SDE Intern (limited access)
- `bob@company.com` - Engineering Manager
- `diana@company.com` - Staff SDE, Platform team

## How It Works

1. **User sends message** in chat interface
2. **AI agent analyzes** the request using GPT-4o-mini
3. **Agent calls tools** to check policies, fetch data, or make changes
4. **Tool results** are shown in real-time
5. **Response streams** back to the user

## Project Structure

```
dev-concierge/
├── app/
│   ├── api/chat/route.ts          # Chat API with tool definitions
│   ├── page.tsx                   # Main chat UI
│   └── layout.tsx                 # Root layout
├── lib/
│   ├── tools/
│   │   ├── access.ts              # Access management
│   │   ├── network.ts             # IP whitelisting
│   │   └── api-keys.ts            # API key management
│   ├── mock-apis/
│   │   ├── jira.ts                # Mock Jira API
│   │   ├── slack.ts               # Mock Slack API
│   │   └── github.ts              # Mock GitHub API
│   └── csv-helper.ts              # CSV utilities
├── data/
│   ├── employees.csv              # Employee database
│   ├── access_policies.csv        # Access policies
│   ├── user_access.csv            # Current access grants
│   ├── ip_whitelist.csv           # Whitelisted IPs
│   ├── api_keys.csv               # API keys
│   ├── approval_requests.csv      # Pending approvals
│   ├── services.csv               # Service ownership
│   ├── oncall_schedule.csv        # On-call rotation
│   ├── deployment_history.csv     # Deployment history
│   └── licenses.csv               # Software licenses
└── components/                    # (Future) UI components
```

## Workflow Examples

### IP Whitelisting
1. User: "Whitelist my IP"
2. Agent calls `getCurrentIP()` → Gets user's IP
3. Agent calls `whitelistIP()` → Checks security training
4. If passed → Adds to `ip_whitelist.csv`
5. Returns success message

### API Key Request
1. User: "I need an OpenAI API key for production"
2. Agent calls `requestAPIKey()`
3. Checks `access_policies.csv` → Requires approval
4. Creates Jira ticket via `createJiraTicket()`
5. Adds entry to `approval_requests.csv`
6. Sends Slack DM to manager via `sendSlackDM()`
7. Returns approval request status

## Data Persistence

All changes are written to CSV files in the `data/` directory. This makes it easy to:
- Inspect what happened
- Reset to initial state
- Add new test data
- Debug issues

## Mock APIs

External services are mocked for demo purposes:
- **Jira**: Simulated ticket creation
- **Slack**: Console logs instead of real messages
- **GitHub**: Simulated org invites

To use real APIs, replace the mock functions in `lib/mock-apis/` with actual API clients.

## Demo Video Script

1. Show chat interface
2. Ask "What access do I have?" → See current permissions
3. Ask "Whitelist my IP" → Auto-approval flow
4. Ask "I need an OpenAI API key for my chatbot project" → Approval workflow
5. Show tool calls in real-time
6. Inspect `data/` directory to show CSV updates

## Future Enhancements

- [ ] Real Jira/Slack/GitHub integration
- [ ] Approval button UI for managers
- [ ] Database instead of CSV files
- [ ] Multi-step forms with rich UI components
- [ ] Deployment automation
- [ ] License management workflows
- [ ] Analytics dashboard

## License

MIT
