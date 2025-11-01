"use client";

import { AccessRequestForm } from "@/components/access-request-form";
import { RequestStatusDashboard } from "@/components/request-status-dashboard";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	CheckCircleIcon,
	XCircleIcon,
	ClockIcon,
	AlertTriangleIcon,
} from "lucide-react";

interface UIComponentProps {
	type: string;
	data: any;
	userEmail: string;
	onAction?: (action: string, data: any) => void;
}

export function UIComponentRenderer({
	type,
	data,
	userEmail,
	onAction,
}: UIComponentProps) {
	const handleAction = (action: string, payload: any) => {
		if (onAction) {
			onAction(action, payload);
		} else {
			console.log(`Action: ${action}`, payload);
		}
	};

	switch (type) {
		case "access_request_form":
			return (
				<AccessRequestForm
					resourceType={data.resourceType}
					resourceName={data.resourceName}
					userEmail={userEmail}
					trainingStatus={data.trainingStatus}
					onSubmit={(formData) =>
						handleAction("submit_access_request", formData)
					}
				/>
			);

		case "request_status_dashboard":
			return (
				<RequestStatusDashboard
					requests={data.requests}
					userEmail={userEmail}
					onBumpRequest={(requestId) =>
						handleAction("bump_request", { requestId })
					}
					onCancelRequest={(requestId) =>
						handleAction("cancel_request", { requestId })
					}
					onDuplicateRequest={(request) =>
						handleAction("duplicate_request", { request })
					}
				/>
			);

		case "training_status_card":
			return (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Training Status</CardTitle>
						<CardDescription>
							Your current training completion status
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{data.completedTraining?.map((training: any) => (
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
										{training.expires_at && (
											<p className="text-sm text-green-700">
												Expires:{" "}
												{new Date(training.expires_at).toLocaleDateString()}
											</p>
										)}
									</div>
								</div>
								<Badge className="bg-green-100 text-green-800">Completed</Badge>
							</div>
						))}

						{data.expiredTraining?.map((training: any) => (
							<div
								key={training.training_id}
								className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg"
							>
								<div className="flex items-center gap-3">
									<AlertTriangleIcon className="h-5 w-5 text-amber-600" />
									<div>
										<p className="font-medium text-amber-900">
											{training.training_name}
										</p>
										<p className="text-sm text-amber-700">
											Expired:{" "}
											{new Date(training.expires_at).toLocaleDateString()}
										</p>
									</div>
								</div>
								<Button
									size="sm"
									onClick={() =>
										handleAction("renew_training", {
											trainingId: training.training_id,
										})
									}
									className="bg-amber-600 hover:bg-amber-700"
								>
									Renew
								</Button>
							</div>
						))}

						{data.missingTraining?.map((training: any) => (
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
										<p className="text-sm text-red-700">
											Required for resource access
										</p>
									</div>
								</div>
								<Button
									size="sm"
									onClick={() => window.open(training.training_url, "_blank")}
									className="bg-red-600 hover:bg-red-700"
								>
									Start Training
								</Button>
							</div>
						))}
					</CardContent>
				</Card>
			);

		case "quick_actions":
			return (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Quick Actions</CardTitle>
						<CardDescription>Common tasks you might need</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-3">
							{data.actions?.map((action: any, index: number) => (
								<Button
									key={index}
									variant={action.variant || "outline"}
									onClick={() =>
										handleAction("quick_action", {
											action: action.id,
											data: action.data,
										})
									}
									className="h-auto p-4 flex flex-col items-start text-left"
								>
									<div className="font-medium">{action.title}</div>
									<div className="text-xs text-muted-foreground mt-1">
										{action.description}
									</div>
								</Button>
							))}
						</div>
					</CardContent>
				</Card>
			);

		case "access_summary":
			return (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Your Access Summary</CardTitle>
						<CardDescription>
							Current permissions and access levels
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{data.access?.map((access: any, index: number) => (
								<div
									key={index}
									className="flex items-center justify-between p-3 border rounded-lg"
								>
									<div>
										<p className="font-medium">
											{access.resource_name.replace(/_/g, " ")}
										</p>
										<p className="text-sm text-gray-600">
											{access.resource_type}
										</p>
									</div>
									<Badge
										className={
											access.access_level === "admin"
												? "bg-red-100 text-red-800"
												: access.access_level === "write"
													? "bg-yellow-100 text-yellow-800"
													: "bg-green-100 text-green-800"
										}
									>
										{access.access_level}
									</Badge>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			);

		case "notification_card":
			return (
				<Card
					className={`border-l-4 ${
						data.type === "success"
							? "border-l-green-500 bg-green-50"
							: data.type === "warning"
								? "border-l-yellow-500 bg-yellow-50"
								: data.type === "error"
									? "border-l-red-500 bg-red-50"
									: "border-l-blue-500 bg-blue-50"
					}`}
				>
					<CardContent className="pt-6">
						<div className="flex items-start gap-3">
							{data.type === "success" && (
								<CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
							)}
							{data.type === "warning" && (
								<AlertTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
							)}
							{data.type === "error" && (
								<XCircleIcon className="h-5 w-5 text-red-600 mt-0.5" />
							)}
							{data.type === "info" && (
								<ClockIcon className="h-5 w-5 text-blue-600 mt-0.5" />
							)}

							<div>
								<h3 className="font-medium">{data.title}</h3>
								<p className="text-sm text-gray-700 mt-1">{data.message}</p>
								{data.actions && (
									<div className="flex gap-2 mt-3">
										{data.actions.map((action: any, index: number) => (
											<Button
												key={index}
												size="sm"
												variant={action.variant || "outline"}
												onClick={() =>
													handleAction("notification_action", {
														action: action.id,
														data: action.data,
													})
												}
											>
												{action.label}
											</Button>
										))}
									</div>
								)}
							</div>
						</div>
					</CardContent>
				</Card>
			);

		default:
			return (
				<Card>
					<CardContent className="pt-6">
						<p className="text-sm text-gray-500">
							Unknown UI component type: {type}
						</p>
						<pre className="mt-2 text-xs bg-gray-100 p-2 rounded">
							{JSON.stringify(data, null, 2)}
						</pre>
					</CardContent>
				</Card>
			);
	}
}
