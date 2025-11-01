"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircleIcon, XCircleIcon, ClockIcon } from "lucide-react";

interface AccessRequestFormProps {
	resourceType?: string;
	resourceName?: string;
	userEmail: string;
	trainingStatus?: {
		hasRequiredTraining: boolean;
		trainingStatus: Array<{
			training_id: string;
			training_name: string;
			completed: boolean;
			expired: boolean;
			training_url: string;
		}>;
		missingTraining: Array<{
			training_id: string;
			training_name: string;
			training_url: string;
		}>;
	};
	onSubmit: (data: {
		resourceType: string;
		resourceName: string;
		reason: string;
		urgency: string;
	}) => void;
}

const RESOURCE_OPTIONS = [
	{
		value: "database",
		label: "Database Access",
		options: ["production_db", "staging_db"],
	},
	{ value: "api_key", label: "API Key", options: ["openai", "stripe", "aws"] },
	{
		value: "github",
		label: "GitHub Repository",
		options: ["backend_team_org", "frontend_team_org"],
	},
	{ value: "cloud", label: "Cloud Access", options: ["aws_dev", "aws_prod"] },
	{ value: "tool", label: "Tool Access", options: ["pagerduty", "datadog"] },
];

const URGENCY_OPTIONS = [
	{
		value: "low",
		label: "Low - Can wait a week",
		color: "bg-green-100 text-green-800",
	},
	{
		value: "medium",
		label: "Medium - Needed this week",
		color: "bg-yellow-100 text-yellow-800",
	},
	{
		value: "high",
		label: "High - Needed today",
		color: "bg-orange-100 text-orange-800",
	},
	{
		value: "urgent",
		label: "Urgent - Blocking work",
		color: "bg-red-100 text-red-800",
	},
];

export function AccessRequestForm({
	resourceType: initialResourceType = "",
	resourceName: initialResourceName = "",
	userEmail,
	trainingStatus,
	onSubmit,
}: AccessRequestFormProps) {
	const [resourceType, setResourceType] = useState(initialResourceType);
	const [resourceName, setResourceName] = useState(initialResourceName);
	const [reason, setReason] = useState("");
	const [urgency, setUrgency] = useState("medium");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const selectedResourceOptions =
		RESOURCE_OPTIONS.find((r) => r.value === resourceType)?.options || [];

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!resourceType || !resourceName || !reason.trim()) return;

		setIsSubmitting(true);
		try {
			await onSubmit({
				resourceType,
				resourceName,
				reason: reason.trim(),
				urgency,
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const canSubmit =
		resourceType &&
		resourceName &&
		reason.trim() &&
		trainingStatus?.hasRequiredTraining;

	return (
		<div className="space-y-4">
			{/* Training Status */}
			{trainingStatus && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Training Requirements</CardTitle>
						<CardDescription>
							Complete required training before submitting your request
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{trainingStatus.trainingStatus.map((training) => (
							<div
								key={training.training_id}
								className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
							>
								<div className="flex items-center gap-3">
									<CheckCircleIcon className="h-5 w-5 text-green-600" />
									<div>
										<p className="font-medium text-green-900">
											{training.training_name}
										</p>
										{training.expired && (
											<Badge className="mt-1 bg-red-100 text-red-800">
												Expired - Renewal Required
											</Badge>
										)}
									</div>
								</div>
								<Badge className="bg-green-100 text-green-800 border-transparent">
									Completed
								</Badge>
							</div>
						))}

						{trainingStatus.missingTraining.map((training) => (
							<div
								key={training.training_id}
								className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
							>
								<div className="flex items-center gap-3">
									<XCircleIcon className="h-5 w-5 text-red-600" />
									<div>
										<p className="font-medium text-red-900">
											{training.training_name}
										</p>
										<p className="text-sm text-red-700">Required for access</p>
									</div>
								</div>
								<Button
									size="sm"
									onClick={() => window.open(training.training_url, "_blank")}
									className="bg-red-600 hover:bg-red-700 text-white"
								>
									Start Training
								</Button>
							</div>
						))}
					</CardContent>
				</Card>
			)}

			{/* Request Form */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Submit Access Request</CardTitle>
					<CardDescription>
						Provide details about the access you need
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						{/* Resource Type */}
						<div className="space-y-2">
							<label className="text-sm font-medium text-gray-900">
								Resource Type
							</label>
							<Select value={resourceType} onValueChange={setResourceType}>
								<SelectTrigger>
									<SelectValue placeholder="Select resource type" />
								</SelectTrigger>
								<SelectContent>
									{RESOURCE_OPTIONS.map((resource) => (
										<SelectItem key={resource.value} value={resource.value}>
											{resource.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Resource Name */}
						{resourceType && (
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-900">
									Specific Resource
								</label>
								<Select value={resourceName} onValueChange={setResourceName}>
									<SelectTrigger>
										<SelectValue placeholder="Select specific resource" />
									</SelectTrigger>
									<SelectContent>
										{selectedResourceOptions.map((option) => (
											<SelectItem key={option} value={option}>
												{option
													.replace(/_/g, " ")
													.replace(/\b\w/g, (l) => l.toUpperCase())}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						{/* Reason */}
						<div className="space-y-2">
							<label className="text-sm font-medium text-gray-900">
								Business Justification
							</label>
							<Textarea
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								placeholder="Explain why you need this access and how it relates to your work..."
								rows={4}
								className="resize-none"
							/>
						</div>

						{/* Urgency */}
						<div className="space-y-2">
							<label className="text-sm font-medium text-gray-900">
								Urgency Level
							</label>
							<Select value={urgency} onValueChange={setUrgency}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{URGENCY_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											<div className="flex items-center gap-2">
												<Badge className={`${option.color} border-transparent`}>
													{option.value.toUpperCase()}
												</Badge>
												<span className="text-gray-900">{option.label}</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Submit Button */}
						<div className="flex gap-3 pt-4">
							<Button
								type="submit"
								disabled={!canSubmit || isSubmitting}
								className="flex-1"
							>
								{isSubmitting ? (
									<>
										<ClockIcon className="h-4 w-4 mr-2 animate-spin" />
										Submitting Request...
									</>
								) : (
									"Submit Access Request"
								)}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setResourceType("");
									setResourceName("");
									setReason("");
									setUrgency("medium");
								}}
							>
								Clear Form
							</Button>
						</div>

						{/* Warning if training incomplete */}
						{trainingStatus && !trainingStatus.hasRequiredTraining && (
							<div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
								<div className="flex items-center gap-2">
									<XCircleIcon className="h-5 w-5 text-amber-600" />
									<p className="text-sm font-medium text-amber-800">
										Complete all required training before submitting your
										request
									</p>
								</div>
							</div>
						)}
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
