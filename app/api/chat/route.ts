import { openai } from "@ai-sdk/openai";
import {
	streamText,
	tool,
	convertToModelMessages,
	UIMessage,
	stepCountIs,
} from "ai";
import { z } from "zod";
import {
	checkUserAccess,
	requestAccess,
	getPendingApprovals,
	getUserRequestHistory,
	hasPendingRequestFor,
} from "@/lib/tools/access";
import {
	getCurrentIP,
	whitelistIP,
	getUserWhitelistedIPs,
} from "@/lib/tools/network";
import {
	listAPIKeys,
	requestAPIKey,
	getServiceInfo,
} from "@/lib/tools/api-keys";
import {
	checkUserTrainingStatus,
	getUserAllTrainingStatus,
	hasSecurityTraining,
} from "@/lib/tools/training";

export const maxDuration = 30;

export async function POST(req: Request) {
	const { messages, userEmail }: { messages: UIMessage[]; userEmail?: string } =
		await req.json();

	const result = streamText({
		model: openai("gpt-4o-mini"),
		messages: convertToModelMessages(messages),
		stopWhen: stepCountIs(5), // Allow up to 5 steps for tool calls and responses
		system: `You are a helpful IT support agent for software engineers at a tech company.
Your role is to help developers with:
- Checking their current access permissions
- Requesting access to databases, APIs, tools
- IP whitelisting for VPN access
- API key generation and management
- Finding service owners and on-call engineers
- Answering questions about company policies

The current user's email is: ${userEmail || "unknown"}

SECURITY POLICY - ALWAYS FOLLOW THESE RULES:
1. ALWAYS check user access with checkUserAccess FIRST before performing any privileged operations
2. NEVER whitelist IPs, generate API keys, or grant access without verifying the user has permission
3. If a user lacks required access, guide them to request it through proper channels
4. For sensitive operations (production access, API keys), verify the user's role and team
5. Always validate that the requesting user has completed required training/onboarding

MANDATORY WORKFLOW FOR ALL ACCESS REQUESTS:
1. Check user's current access: checkUserAccess(userEmail)
2. Check training requirements: checkUserTrainingStatus(userEmail, resourceType, resourceName)
3. Check existing requests: getUserRequestHistory(userEmail)
4. Generate interactive UI components using generateAccessRequestUI tool
5. Display training status with clear visual indicators
6. Only proceed if training is complete and access is appropriate

UI COMPONENT GENERATION:
- For access requests: Use generateAccessRequestUI with uiType="access_request_form"
- For request status: Use generateAccessRequestUI with uiType="request_status_dashboard"
- For training overview: Use generateAccessRequestUI with uiType="training_status_card"
- For access summary: Use generateAccessRequestUI with uiType="access_summary"
- Always follow up UI generation with explanatory text

TRAINING STATUS DISPLAY FORMAT:
✅ Security Training (Completed 2024-01-15, Expires 2027-01-15)
❌ Git Best Practices (Missing - [Complete Here](training_url))
⚠️ Data Privacy Training (Expired 2024-06-01 - [Renew Here](training_url))

REQUEST STATUS DISPLAY FORMAT:
🟡 Backend Git Repo Access (Pending) - Submitted 2 days ago to Bob Smith
✅ Staging Database (Approved) - Active since 2024-10-15
❌ Production API Keys (Rejected) - Reason: Need senior approval

Always be friendly, professional, and guide users through the proper approval processes.

MANDATORY UI GENERATION RULES:
1. When a user asks about their access, FIRST use checkUserAccess, THEN generateAccessRequestUI with uiType="access_summary"
2. When they request access to resources, FIRST check training with checkUserTrainingStatus, THEN generateAccessRequestUI with uiType="access_request_form"
3. When users ask "Can you check if I have raised a request", FIRST use getUserRequestHistory, THEN generateAccessRequestUI with uiType="request_status_dashboard"
4. When showing training status, use generateAccessRequestUI with uiType="training_status_card"
5. When they need to whitelist an IP, FIRST check their access AND training, THEN get their current IP
6. When creating API keys, FIRST verify permissions AND training, THEN ask for environment and project details

ALWAYS GENERATE UI COMPONENTS FOR THESE SCENARIOS:
- "What access do I have?" → access_summary UI
- "I need access to [resource]" → access_request_form UI
- "Check my request status" → request_status_dashboard UI
- "Show my training status" → training_status_card UI

CRITICAL: You MUST respond with text after every tool call. Never end your response with just a tool call result.
After calling any tool and receiving its result, you MUST analyze the result and provide a clear, friendly,
human-readable summary explaining the information to the user. Do not just call the tool - always follow up with text.

SPECIAL RULE FOR UI COMPONENTS:
When you use generateAccessRequestUI, ALWAYS follow up with explanatory text that describes what the user can do with the interface.
For example: "I've created an interactive form above where you can submit your access request. Please fill out the details and click submit."

Use emojis occasionally to make responses friendly: ✅ ❌ 🔑 🔒 📋 🚀`,
		tools: {
			checkUserAccess: tool({
				description:
					"Check what resources and permissions a user currently has access to",
				inputSchema: z.object({
					userEmail: z
						.string()
						.email()
						.describe("User email address")
						.default(userEmail || ""),
				}),
				execute: async ({ userEmail: toolUserEmail }) => {
					const emailToUse = toolUserEmail || userEmail;
					if (!emailToUse) {
						throw new Error("User email is required");
					}
					return await checkUserAccess(emailToUse);
				},
			}),

			requestAccess: tool({
				description:
					"Request access to a resource (database, tool, cloud service)",
				inputSchema: z.object({
					userEmail: z
						.string()
						.email()
						.describe("User email address")
						.default(userEmail || ""),
					resourceType: z
						.string()
						.describe(
							"Type of resource: database, api_key, tool, cloud, network, etc.",
						),
					resourceName: z
						.string()
						.describe(
							"Name of the resource: production_db, staging_db, aws_dev, etc.",
						),
					reason: z.string().describe("Why the user needs this access"),
				}),
				execute: async ({
					userEmail: toolUserEmail,
					resourceType,
					resourceName,
					reason,
				}) => {
					const emailToUse = toolUserEmail || userEmail;
					if (!emailToUse) {
						throw new Error("User email is required");
					}
					return await requestAccess(
						emailToUse,
						resourceType,
						resourceName,
						reason,
					);
				},
			}),

			getCurrentIP: tool({
				description: "Get the user current public IP address",
				inputSchema: z.object({}),
				execute: async () => {
					const ip = await getCurrentIP();
					return { ip };
				},
			}),

			whitelistIP: tool({
				description: "Add an IP address to the VPN whitelist",
				inputSchema: z.object({
					userEmail: z
						.string()
						.email()
						.describe("User email address")
						.default(userEmail || ""),
					ip: z.string().describe("IP address to whitelist"),
					reason: z
						.string()
						.describe("Reason for whitelisting (e.g., home office, traveling)"),
				}),
				execute: async ({ userEmail: toolUserEmail, ip, reason }) => {
					const emailToUse = toolUserEmail || userEmail;
					if (!emailToUse) {
						throw new Error("User email is required");
					}
					return await whitelistIP(emailToUse, ip, reason);
				},
			}),

			getUserWhitelistedIPs: tool({
				description: "Get all whitelisted IPs for a user",
				inputSchema: z.object({
					userEmail: z
						.string()
						.email()
						.describe("User email address")
						.default(userEmail || ""),
				}),
				execute: async ({ userEmail: toolUserEmail }) => {
					const emailToUse = toolUserEmail || userEmail;
					if (!emailToUse) {
						throw new Error("User email is required");
					}
					return await getUserWhitelistedIPs(emailToUse);
				},
			}),

			listAPIKeys: tool({
				description: "List all API keys owned by a user",
				inputSchema: z.object({
					userEmail: z
						.string()
						.email()
						.describe("User email address")
						.default(userEmail || ""),
				}),
				execute: async ({ userEmail: toolUserEmail }) => {
					const emailToUse = toolUserEmail || userEmail;
					if (!emailToUse) {
						throw new Error("User email is required");
					}
					return await listAPIKeys(emailToUse);
				},
			}),

			requestAPIKey: tool({
				description:
					"Request a new API key for a service (OpenAI, Stripe, AWS, etc.)",
				inputSchema: z.object({
					userEmail: z
						.string()
						.email()
						.describe("User email address")
						.default(userEmail || ""),
					service: z
						.string()
						.describe(
							"Service name: openai, stripe, aws, twilio, datadog, etc.",
						),
					environment: z
						.string()
						.describe("Environment: test, staging, or production"),
					project: z.string().describe("Project or use case for this API key"),
					reason: z
						.string()
						.describe("Detailed reason why this API key is needed"),
				}),
				execute: async ({
					userEmail: toolUserEmail,
					service,
					environment,
					project,
					reason,
				}) => {
					const emailToUse = toolUserEmail || userEmail;
					if (!emailToUse) {
						throw new Error("User email is required");
					}
					return await requestAPIKey(
						emailToUse,
						service,
						environment,
						project,
						reason,
					);
				},
			}),

			getServiceInfo: tool({
				description:
					"Get information about a service including owner, team, docs, and on-call",
				inputSchema: z.object({
					serviceName: z
						.string()
						.describe(
							"Service name: user-service, payment-service, frontend-web, etc.",
						),
				}),
				execute: async ({ serviceName }) => {
					return await getServiceInfo(serviceName);
				},
			}),

			getPendingApprovals: tool({
				description:
					"Get pending approval requests that need review (for managers)",
				inputSchema: z.object({
					approverEmail: z
						.string()
						.email()
						.describe("Approver email address")
						.default(userEmail || ""),
				}),
				execute: async ({ approverEmail }) => {
					const emailToUse = approverEmail || userEmail;
					if (!emailToUse) {
						throw new Error("User email is required");
					}
					return await getPendingApprovals(emailToUse);
				},
			}),

			getUserRequestHistory: tool({
				description:
					"Get the user's access request history (pending, approved, rejected requests)",
				inputSchema: z.object({
					userEmail: z
						.string()
						.email()
						.describe("User email address")
						.default(userEmail || ""),
				}),
				execute: async ({ userEmail: toolUserEmail }) => {
					const emailToUse = toolUserEmail || userEmail;
					if (!emailToUse) {
						throw new Error("User email is required");
					}
					return await getUserRequestHistory(emailToUse);
				},
			}),

			checkUserTrainingStatus: tool({
				description:
					"Check if user has completed required training for a specific resource",
				inputSchema: z.object({
					userEmail: z
						.string()
						.email()
						.describe("User email address")
						.default(userEmail || ""),
					resourceType: z
						.string()
						.describe(
							"Type of resource: database, api_key, github, cloud, etc.",
						),
					resourceName: z
						.string()
						.describe(
							"Name of the resource: production_db, openai, aws_prod, etc.",
						),
				}),
				execute: async ({
					userEmail: toolUserEmail,
					resourceType,
					resourceName,
				}) => {
					const emailToUse = toolUserEmail || userEmail;
					if (!emailToUse) {
						throw new Error("User email is required");
					}
					return await checkUserTrainingStatus(
						emailToUse,
						resourceType,
						resourceName,
					);
				},
			}),

			getUserAllTrainingStatus: tool({
				description: "Get all completed and expired training for a user",
				inputSchema: z.object({
					userEmail: z
						.string()
						.email()
						.describe("User email address")
						.default(userEmail || ""),
				}),
				execute: async ({ userEmail: toolUserEmail }) => {
					const emailToUse = toolUserEmail || userEmail;
					if (!emailToUse) {
						throw new Error("User email is required");
					}
					return await getUserAllTrainingStatus(emailToUse);
				},
			}),

			generateAccessRequestUI: tool({
				description:
					"Generate interactive UI components for access requests, training status, and request management",
				inputSchema: z.object({
					uiType: z
						.string()
						.describe(
							"Type of UI to generate: access_request_form, request_status_dashboard, training_status_card, access_summary",
						),
					userEmail: z
						.string()
						.email()
						.describe("User email address")
						.default(userEmail || ""),
					resourceType: z
						.string()
						.optional()
						.describe("Resource type for the request"),
					resourceName: z
						.string()
						.optional()
						.describe("Specific resource name"),
				}),
				execute: async ({
					uiType,
					userEmail: toolUserEmail,
					resourceType,
					resourceName,
				}) => {
					const emailToUse = toolUserEmail || userEmail;
					if (!emailToUse) {
						throw new Error("User email is required");
					}

					switch (uiType) {
						case "access_request_form":
							// Get training status for the specific resource
							let trainingStatus = null;
							if (resourceType && resourceName) {
								trainingStatus = await checkUserTrainingStatus(
									emailToUse,
									resourceType,
									resourceName,
								);
							}

							return {
								componentType: "access_request_form",
								data: {
									resourceType: resourceType || "",
									resourceName: resourceName || "",
									trainingStatus,
								},
							};

						case "request_status_dashboard":
							const requestHistory = await getUserRequestHistory(emailToUse);
							return {
								componentType: "request_status_dashboard",
								data: {
									requests: requestHistory,
								},
							};

						case "training_status_card":
							const allTraining = await getUserAllTrainingStatus(emailToUse);
							return {
								componentType: "training_status_card",
								data: allTraining,
							};

						case "access_summary":
							const currentAccess = await checkUserAccess(emailToUse);
							return {
								componentType: "access_summary",
								data: {
									access: currentAccess,
								},
							};

						default:
							return {
								componentType: "notification_card",
								data: {
									type: "error",
									title: "Unknown UI Type",
									message: `UI type "${uiType}" is not supported`,
								},
							};
					}
				},
			}),
		},
	});

	return result.toUIMessageStreamResponse();
}
