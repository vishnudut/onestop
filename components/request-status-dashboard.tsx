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
import { Badge } from "@/components/ui/badge";
import {
	CheckCircleIcon,
	XCircleIcon,
	ClockIcon,
	MessageCircleIcon,
	RefreshCwIcon,
	TrashIcon,
	CopyIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RequestStatusDashboardProps {
	requests: {
		pending: Array<{
			request_id: string;
			resource_type: string;
			resource_name: string;
			reason: string;
			approver_email: string;
			created_at: string;
		}>;
		approved: Array<{
			request_id: string;
			resource_type: string;
			resource_name: string;
			reason: string;
			approver_email: string;
			created_at: string;
			resolved_at: string;
		}>;
		rejected: Array<{
			request_id: string;
			resource_type: string;
			resource_name: string;
			reason: string;
			approver_email: string;
			created_at: string;
			resolved_at: string;
		}>;
		total: number;
	};
	userEmail: string;
	onBumpRequest: (requestId: string) => void;
	onCancelRequest: (requestId: string) => void;
	onDuplicateRequest: (request: any) => void;
}

export function RequestStatusDashboard({
	requests,
	userEmail,
	onBumpRequest,
	onCancelRequest,
	onDuplicateRequest,
}: RequestStatusDashboardProps) {
	const [loadingStates, setLoadingStates] = useState<Record<string, string>>(
		{},
	);

	const handleAction = async (
		requestId: string,
		action: string,
		callback: (id: string) => void,
	) => {
		setLoadingStates((prev) => ({ ...prev, [requestId]: action }));
		try {
			await callback(requestId);
		} finally {
			setLoadingStates((prev) => ({ ...prev, [requestId]: "" }));
		}
	};

	const formatResourceName = (name: string) => {
		return name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
	};

	const getStatusBadge = (status: "pending" | "approved" | "rejected") => {
		switch (status) {
			case "pending":
				return (
					<Badge className="bg-yellow-100 text-yellow-800">
						<ClockIcon className="h-3 w-3 mr-1" />
						Pending
					</Badge>
				);
			case "approved":
				return (
					<Badge className="bg-green-100 text-green-800">
						<CheckCircleIcon className="h-3 w-3 mr-1" />
						Approved
					</Badge>
				);
			case "rejected":
				return (
					<Badge className="bg-red-100 text-red-800">
						<XCircleIcon className="h-3 w-3 mr-1" />
						Rejected
					</Badge>
				);
		}
	};

	if (requests.total === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Access Request Status</CardTitle>
					<CardDescription>
						You haven't submitted any access requests yet
					</CardDescription>
				</CardHeader>
				<CardContent className="text-center py-8">
					<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<ClockIcon className="h-8 w-8 text-gray-400" />
					</div>
					<p className="text-gray-600 mb-4">No requests found</p>
					<Button onClick={() => window.location.reload()}>
						Submit Your First Request
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{/* Summary Stats */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Request Summary</CardTitle>
					<CardDescription>Overview of your access requests</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-4 gap-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-gray-900">
								{requests.total}
							</div>
							<div className="text-sm text-gray-600">Total</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-yellow-600">
								{requests.pending.length}
							</div>
							<div className="text-sm text-gray-600">Pending</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-green-600">
								{requests.approved.length}
							</div>
							<div className="text-sm text-gray-600">Approved</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-red-600">
								{requests.rejected.length}
							</div>
							<div className="text-sm text-gray-600">Rejected</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Pending Requests */}
			{requests.pending.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg flex items-center gap-2">
							<ClockIcon className="h-5 w-5 text-yellow-600" />
							Pending Requests ({requests.pending.length})
						</CardTitle>
						<CardDescription>
							Requests waiting for approval from your manager
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{requests.pending.map((request) => (
							<div
								key={request.request_id}
								className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg"
							>
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-2">
											{getStatusBadge("pending")}
											<h4 className="font-medium text-gray-900">
												{formatResourceName(request.resource_name)}
											</h4>
										</div>
										<p className="text-sm text-gray-700 mb-2">
											{request.reason}
										</p>
										<div className="flex items-center gap-4 text-xs text-gray-500">
											<span>
												Submitted{" "}
												{formatDistanceToNow(new Date(request.created_at), {
													addSuffix: true,
												})}
											</span>
											<span>Approver: {request.approver_email}</span>
										</div>
									</div>
									<div className="flex gap-2 ml-4">
										<Button
											size="sm"
											variant="outline"
											onClick={() =>
												handleAction(request.request_id, "bump", onBumpRequest)
											}
											disabled={loadingStates[request.request_id] === "bump"}
										>
											{loadingStates[request.request_id] === "bump" ? (
												<RefreshCwIcon className="h-4 w-4 animate-spin" />
											) : (
												<MessageCircleIcon className="h-4 w-4" />
											)}
											Bump
										</Button>
										<Button
											size="sm"
											variant="outline"
											className="text-red-600 hover:text-red-700"
											onClick={() =>
												handleAction(
													request.request_id,
													"cancel",
													onCancelRequest,
												)
											}
											disabled={loadingStates[request.request_id] === "cancel"}
										>
											{loadingStates[request.request_id] === "cancel" ? (
												<RefreshCwIcon className="h-4 w-4 animate-spin" />
											) : (
												<TrashIcon className="h-4 w-4" />
											)}
											Cancel
										</Button>
									</div>
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			)}

			{/* Approved Requests */}
			{requests.approved.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg flex items-center gap-2">
							<CheckCircleIcon className="h-5 w-5 text-green-600" />
							Approved Requests ({requests.approved.length})
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{requests.approved.map((request) => (
							<div
								key={request.request_id}
								className="p-4 border border-green-200 bg-green-50 rounded-lg"
							>
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-2">
											{getStatusBadge("approved")}
											<h4 className="font-medium text-gray-900">
												{formatResourceName(request.resource_name)}
											</h4>
										</div>
										<p className="text-sm text-gray-700 mb-2">
											{request.reason}
										</p>
										<div className="flex items-center gap-4 text-xs text-gray-500">
											<span>
												Approved{" "}
												{formatDistanceToNow(new Date(request.resolved_at), {
													addSuffix: true,
												})}
											</span>
											<span>By: {request.approver_email}</span>
										</div>
									</div>
									<Button
										size="sm"
										variant="outline"
										onClick={() => onDuplicateRequest(request)}
									>
										<CopyIcon className="h-4 w-4" />
										Duplicate
									</Button>
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			)}

			{/* Rejected Requests */}
			{requests.rejected.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg flex items-center gap-2">
							<XCircleIcon className="h-5 w-5 text-red-600" />
							Rejected Requests ({requests.rejected.length})
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{requests.rejected.map((request) => (
							<div
								key={request.request_id}
								className="p-4 border border-red-200 bg-red-50 rounded-lg"
							>
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-2">
											{getStatusBadge("rejected")}
											<h4 className="font-medium text-gray-900">
												{formatResourceName(request.resource_name)}
											</h4>
										</div>
										<p className="text-sm text-gray-700 mb-2">
											{request.reason}
										</p>
										<div className="flex items-center gap-4 text-xs text-gray-500">
											<span>
												Rejected{" "}
												{formatDistanceToNow(new Date(request.resolved_at), {
													addSuffix: true,
												})}
											</span>
											<span>By: {request.approver_email}</span>
										</div>
									</div>
									<Button
										size="sm"
										variant="outline"
										onClick={() => onDuplicateRequest(request)}
									>
										<CopyIcon className="h-4 w-4" />
										Resubmit
									</Button>
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
