import { readCSV, appendToCSV, findInCSV, findOneInCSV } from "../csv-helper";
import { sendSlackDM } from "../mock-apis/slack";

export interface UserAccess {
	user_email: string;
	resource_type: string;
	resource_name: string;
	access_level: string;
	granted_date: string;
	granted_by: string;
	expires_at: string | null;
	status: string;
}

export interface AccessPolicy {
	policy_id: string;
	resource_type: string;
	resource_name: string;
	required_role: string;
	requires_approval: string;
	approver_role: string;
	auto_approve_conditions: string;
	description: string;
}

/**
 * Check what access a user currently has
 */
export async function checkUserAccess(
	userEmail: string,
): Promise<UserAccess[]> {
	const access = await findInCSV(
		"user_access.csv",
		(row) => row.user_email === userEmail && row.status === "active",
	);

	return access as UserAccess[];
}

/**
 * Request access to a resource
 */
export async function requestAccess(
	userEmail: string,
	resourceType: string,
	resourceName: string,
	reason: string,
): Promise<any> {
	// Get the policy for this resource
	const policy = await findOneInCSV(
		"access_policies.csv",
		(row) =>
			row.resource_type === resourceType && row.resource_name === resourceName,
	);

	if (!policy) {
		return {
			success: false,
			error: `No policy found for ${resourceType}:${resourceName}`,
		};
	}

	// Get user info
	const user = await findOneInCSV(
		"employees.csv",
		(row) => row.email === userEmail,
	);

	if (!user) {
		return {
			success: false,
			error: "User not found",
		};
	}

	// Check if approval is required
	if (policy.requires_approval === "true") {
		// Create approval request
		const requestId = `REQ-${Date.now()}`;
		await appendToCSV("approval_requests.csv", {
			request_id: requestId,
			requester_email: userEmail,
			resource_type: resourceType,
			resource_name: resourceName,
			reason: reason,
			approver_email: user.manager_email,
			status: "pending",
			created_at: new Date().toISOString(),
			resolved_at: "null",
			ticket_id: "null",
		});

		// Notify manager via Slack
		await sendSlackDM(
			user.manager_email,
			`🔔 Access Request from ${user.name}\n\n` +
				`Resource: ${resourceName} (${resourceType})\n` +
				`Reason: ${reason}\n\n` +
				`Please approve or reject this request.`,
		);

		return {
			success: true,
			requiresApproval: true,
			requestId: requestId,
			approver: user.manager_email,
			message: `Approval request sent to ${user.manager_email}`,
		};
	} else {
		// Check auto-approve conditions
		const conditions = policy.auto_approve_conditions;
		let canAutoApprove = true;

		if (conditions !== "none" && conditions) {
			// Parse conditions like "onboarding_complete=true" or "team=Backend|Platform"
			const conditionPairs = conditions.split(",");
			for (const condition of conditionPairs) {
				const [key, value] = condition.split("=");
				if (key === "team") {
					const allowedTeams = value.split("|");
					if (!allowedTeams.includes(user.team)) {
						canAutoApprove = false;
						break;
					}
				} else if (user[key.trim()] !== value.trim()) {
					canAutoApprove = false;
					break;
				}
			}
		}

		if (!canAutoApprove) {
			return {
				success: false,
				error: `Auto-approval conditions not met. Required: ${conditions}`,
			};
		}

		// Auto-approve and grant access
		await appendToCSV("user_access.csv", {
			user_email: userEmail,
			resource_type: resourceType,
			resource_name: resourceName,
			access_level: "read_only",
			granted_date: new Date().toISOString(),
			granted_by: "auto",
			expires_at: "null",
			status: "active",
		});

		return {
			success: true,
			requiresApproval: false,
			message: `Access granted to ${resourceName}`,
		};
	}
}

/**
 * Validate if a user has permission to perform a specific action
 */
export async function validateUserPermission(
	userEmail: string,
	resourceType: string,
	resourceName: string,
	action: string = "read",
): Promise<{ hasPermission: boolean; reason?: string; requiredRole?: string }> {
	// Get user info
	const user = await findOneInCSV(
		"employees.csv",
		(row) => row.email === userEmail,
	);

	if (!user) {
		return {
			hasPermission: false,
			reason: "User not found in system",
		};
	}

	// Check if user has completed required training
	if (user.security_training_complete !== "true") {
		return {
			hasPermission: false,
			reason: "Security training must be completed before accessing resources",
		};
	}

	// Check current access
	const userAccess = await checkUserAccess(userEmail);
	const hasDirectAccess = userAccess.some(
		(access) =>
			access.resource_type === resourceType &&
			access.resource_name === resourceName &&
			(action === "read" ||
				access.access_level === "admin" ||
				access.access_level.includes(action)),
	);

	if (hasDirectAccess) {
		return { hasPermission: true };
	}

	// Check policy requirements
	const policy = await findOneInCSV(
		"access_policies.csv",
		(row) =>
			row.resource_type === resourceType && row.resource_name === resourceName,
	);

	if (!policy) {
		return {
			hasPermission: false,
			reason: `No access policy defined for ${resourceType}:${resourceName}`,
		};
	}

	// For high-privilege actions, check role requirements
	if (
		action === "write" ||
		action === "admin" ||
		resourceName.includes("production")
	) {
		const allowedRoles = policy.required_role
			? policy.required_role.split("|")
			: [];
		if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
			return {
				hasPermission: false,
				reason: `Insufficient role. Required: ${policy.required_role}, Current: ${user.role}`,
				requiredRole: policy.required_role,
			};
		}
	}

	return {
		hasPermission: false,
		reason: "No direct access found. Use requestAccess to request permission.",
		requiredRole: policy.required_role,
	};
}

/**
 * Get all pending approval requests for a user (as approver)
 */
export async function getPendingApprovals(
	approverEmail: string,
): Promise<any[]> {
	const requests = await findInCSV(
		"approval_requests.csv",
		(row) => row.approver_email === approverEmail && row.status === "pending",
	);

	return requests;
}

/**
 * Get all access requests submitted by a user (pending, approved, rejected)
 */
export async function getUserRequestHistory(userEmail: string): Promise<{
	pending: any[];
	approved: any[];
	rejected: any[];
	total: number;
}> {
	const allRequests = await findInCSV(
		"approval_requests.csv",
		(row) => row.requester_email === userEmail,
	);

	const pending = allRequests.filter((req) => req.status === "pending");
	const approved = allRequests.filter((req) => req.status === "approved");
	const rejected = allRequests.filter((req) => req.status === "rejected");

	// Sort by created date (newest first)
	const sortByDate = (a: any, b: any) =>
		new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

	return {
		pending: pending.sort(sortByDate),
		approved: approved.sort(sortByDate),
		rejected: rejected.sort(sortByDate),
		total: allRequests.length,
	};
}

/**
 * Get details of a specific request by ID
 */
export async function getRequestDetails(
	requestId: string,
): Promise<any | null> {
	const request = await findOneInCSV(
		"approval_requests.csv",
		(row) => row.request_id === requestId,
	);

	return request;
}

/**
 * Check if user has any pending requests for a specific resource
 */
export async function hasPendingRequestFor(
	userEmail: string,
	resourceType: string,
	resourceName: string,
): Promise<any | null> {
	const pendingRequest = await findOneInCSV(
		"approval_requests.csv",
		(row) =>
			row.requester_email === userEmail &&
			row.resource_type === resourceType &&
			row.resource_name === resourceName &&
			row.status === "pending",
	);

	return pendingRequest;
}
