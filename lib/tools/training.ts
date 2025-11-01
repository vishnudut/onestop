import { findInCSV, findOneInCSV } from "../csv-helper";

export interface TrainingRequirement {
	resource_type: string;
	resource_name: string;
	required_training: string;
	training_name: string;
	training_url: string;
	description: string;
}

export interface UserTraining {
	user_email: string;
	training_id: string;
	training_name: string;
	completed: string;
	completed_date: string | null;
	expires_at: string | null;
	certificate_url: string | null;
}

export interface TrainingStatus {
	training_id: string;
	training_name: string;
	completed: boolean;
	completed_date: string | null;
	expires_at: string | null;
	expired: boolean;
	training_url: string;
	certificate_url: string | null;
}

/**
 * Get training requirements for a specific resource
 */
export async function getTrainingRequirements(
	resourceType: string,
	resourceName: string,
): Promise<TrainingRequirement | null> {
	const requirement = await findOneInCSV(
		"training_requirements.csv",
		(row) =>
			row.resource_type === resourceType && row.resource_name === resourceName,
	);

	return requirement as TrainingRequirement | null;
}

/**
 * Check a user's training status for a specific resource
 */
export async function checkUserTrainingStatus(
	userEmail: string,
	resourceType: string,
	resourceName: string,
): Promise<{
	hasRequiredTraining: boolean;
	trainingStatus: TrainingStatus[];
	missingTraining: TrainingStatus[];
}> {
	// Get training requirements for this resource
	const requirements = await getTrainingRequirements(
		resourceType,
		resourceName,
	);

	if (!requirements) {
		return {
			hasRequiredTraining: true,
			trainingStatus: [],
			missingTraining: [],
		};
	}

	// Parse required training IDs
	const requiredTrainingIds = requirements.required_training.split(";");
	const trainingNames = requirements.training_name.split(";");
	const trainingUrls = requirements.training_url.split(";");

	// Get user's training records
	const userTrainings = (await findInCSV(
		"user_training.csv",
		(row) => row.user_email === userEmail,
	)) as UserTraining[];

	const trainingStatus: TrainingStatus[] = [];
	const missingTraining: TrainingStatus[] = [];

	// Check each required training
	for (let i = 0; i < requiredTrainingIds.length; i++) {
		const trainingId = requiredTrainingIds[i];
		const trainingName = trainingNames[i];
		const trainingUrl = trainingUrls[i];

		const userTraining = userTrainings.find(
			(t) => t.training_id === trainingId,
		);

		if (userTraining && userTraining.completed === "true") {
			// Check if training has expired
			const expired = userTraining.expires_at
				? new Date(userTraining.expires_at) < new Date()
				: false;

			trainingStatus.push({
				training_id: trainingId,
				training_name: trainingName,
				completed: true,
				completed_date: userTraining.completed_date,
				expires_at: userTraining.expires_at,
				expired: expired,
				training_url: trainingUrl,
				certificate_url: userTraining.certificate_url,
			});
		} else {
			missingTraining.push({
				training_id: trainingId,
				training_name: trainingName,
				completed: false,
				completed_date: null,
				expires_at: null,
				expired: false,
				training_url: trainingUrl,
				certificate_url: null,
			});
		}
	}

	// Check if all required training is completed and not expired
	const hasRequiredTraining =
		missingTraining.length === 0 && trainingStatus.every((t) => !t.expired);

	return {
		hasRequiredTraining,
		trainingStatus,
		missingTraining,
	};
}

/**
 * Get all training status for a user (completed and missing)
 */
export async function getUserAllTrainingStatus(userEmail: string): Promise<{
	completedTraining: TrainingStatus[];
	expiredTraining: TrainingStatus[];
}> {
	// Get all user's training records
	const userTrainings = (await findInCSV(
		"user_training.csv",
		(row) => row.user_email === userEmail,
	)) as UserTraining[];

	const completedTraining: TrainingStatus[] = [];
	const expiredTraining: TrainingStatus[] = [];

	for (const training of userTrainings) {
		if (training.completed === "true") {
			const expired = training.expires_at
				? new Date(training.expires_at) < new Date()
				: false;

			const status: TrainingStatus = {
				training_id: training.training_id,
				training_name: training.training_name,
				completed: true,
				completed_date: training.completed_date,
				expires_at: training.expires_at,
				expired: expired,
				training_url: "", // We don't have this in user_training.csv
				certificate_url: training.certificate_url,
			};

			if (expired) {
				expiredTraining.push(status);
			} else {
				completedTraining.push(status);
			}
		}
	}

	return {
		completedTraining,
		expiredTraining,
	};
}

/**
 * Check if user has completed basic security training
 */
export async function hasSecurityTraining(userEmail: string): Promise<boolean> {
	const userTraining = await findOneInCSV(
		"user_training.csv",
		(row) =>
			row.user_email === userEmail &&
			row.training_id === "security_training" &&
			row.completed === "true",
	);

	if (!userTraining) return false;

	// Check if expired
	if (userTraining.expires_at) {
		return new Date(userTraining.expires_at) >= new Date();
	}

	return true;
}
