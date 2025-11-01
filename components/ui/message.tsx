"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { UIComponentRenderer } from "@/components/ui-component-renderer";
import {
	BotIcon,
	UserIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	Loader2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface MessageProps {
	message: any;
	isUser: boolean;
	isLoading?: boolean;
	userEmail?: string;
	onUIAction?: (action: string, data: any) => void;
}

export function Message({
	message,
	isUser,
	isLoading,
	userEmail = "",
	onUIAction,
}: MessageProps) {
	const [showToolCalls, setShowToolCalls] = useState(false);

	// Separate text content from tool calls and UI components
	const textParts =
		message.parts?.filter((part: any) => part.type === "text") || [];
	const toolParts =
		message.parts?.filter((part: any) => part.type?.startsWith("tool-")) || [];
	const reasoningParts =
		message.parts?.filter((part: any) => part.type === "reasoning") || [];

	// Check if any tools are still executing
	const hasExecutingTools = toolParts.some(
		(part: any) =>
			part.state === "input-streaming" || part.state === "input-available",
	);

	// Show tool calls inline if they're executing, otherwise show them collapsed
	const shouldShowToolCallsInline = hasExecutingTools;
	const completedToolCalls = toolParts.filter(
		(part: any) =>
			part.state === "output-available" || part.state === "output-error",
	);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			className={cn(
				"flex gap-4 group",
				isUser ? "flex-row-reverse" : "flex-row",
			)}
		>
			{/* Avatar */}
			<Avatar className="size-8 shrink-0">
				{isUser ? (
					<AvatarFallback className="bg-blue-600 text-white">
						<UserIcon className="size-4" />
					</AvatarFallback>
				) : (
					<AvatarFallback className="bg-gray-100">
						<BotIcon className="size-4 text-gray-600" />
					</AvatarFallback>
				)}
			</Avatar>

			{/* Content */}
			<div
				className={cn(
					"flex flex-col max-w-2xl w-full space-y-3",
					isUser ? "items-end" : "items-start",
				)}
			>
				{/* Main message bubble */}
				<div
					className={cn(
						"rounded-2xl px-4 py-3 text-sm",
						isUser
							? "bg-blue-600 text-white"
							: "bg-gray-100 text-gray-900 w-full",
					)}
				>
					{/* Text content with markdown rendering */}
					{textParts.map((part: any, partIndex: number) => (
						<div key={`text-${partIndex}`}>
							{isUser ? (
								<div className="whitespace-pre-wrap break-words">
									{part.text}
								</div>
							) : (
								<Markdown className="prose-sm">{part.text}</Markdown>
							)}
						</div>
					))}

					{/* Reasoning sections */}
					{reasoningParts.map((part: any, partIndex: number) => (
						<motion.div
							key={`reasoning-${partIndex}`}
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm"
						>
							<div className="flex items-center gap-2 mb-2">
								<span className="text-lg">🧠</span>
								<span className="font-semibold text-purple-900">Reasoning</span>
							</div>
							<p className="text-xs text-purple-700 whitespace-pre-wrap">
								{part.reasoning}
							</p>
						</motion.div>
					))}

					{/* Show executing tool calls inline */}
					{shouldShowToolCallsInline &&
						toolParts.map((part: any, partIndex: number) => {
							const toolName = part.type.replace("tool-", "");

							if (
								part.state === "input-streaming" ||
								part.state === "input-available"
							) {
								return (
									<motion.div
										key={`tool-input-${partIndex}`}
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm"
									>
										<div className="flex items-center gap-2 mb-2">
											<Loader2Icon className="w-4 h-4 animate-spin text-blue-600" />
											<span className="font-semibold text-blue-900">
												Calling {toolName}...
											</span>
										</div>
										{part.input && (
											<pre className="text-xs text-blue-700 overflow-x-auto bg-blue-50/50 p-2 rounded border">
												{JSON.stringify(part.input, null, 2)}
											</pre>
										)}
									</motion.div>
								);
							}
							return null;
						})}

					{/* Render UI components from generateAccessRequestUI tool results */}
					{toolParts.map((part: any, partIndex: number) => {
						const toolName = part.type.replace("tool-", "");

						if (
							part.state === "output-available" &&
							toolName === "generateAccessRequestUI" &&
							part.output?.componentType
						) {
							return (
								<motion.div
									key={`ui-component-${partIndex}`}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									className="mt-3"
								>
									<UIComponentRenderer
										type={part.output.componentType}
										data={part.output.data}
										userEmail={userEmail}
										onAction={onUIAction}
									/>
								</motion.div>
							);
						}
						return null;
					})}
				</div>

				{/* Collapsible completed tool calls */}
				{!shouldShowToolCallsInline && completedToolCalls.length > 0 && (
					<div className="text-sm w-full">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowToolCalls(!showToolCalls)}
							className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 p-2 h-auto"
						>
							{showToolCalls ? (
								<ChevronDownIcon className="w-4 h-4" />
							) : (
								<ChevronRightIcon className="w-4 h-4" />
							)}
							<span>
								View result from{" "}
								{completedToolCalls
									.map((part) => part.type.replace("tool-", ""))
									.join(", ")}
							</span>
						</Button>

						{showToolCalls && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: "auto" }}
								exit={{ opacity: 0, height: 0 }}
								className="mt-2 space-y-2 overflow-hidden"
							>
								{completedToolCalls.map((part: any, partIndex: number) => {
									const toolName = part.type.replace("tool-", "");

									if (part.state === "output-available") {
										return (
											<motion.div
												key={`tool-output-${partIndex}`}
												initial={{ opacity: 0, scale: 0.95 }}
												animate={{ opacity: 1, scale: 1 }}
												className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm"
											>
												<div className="flex items-center gap-2 mb-2">
													<span className="text-lg">✅</span>
													<span className="font-semibold text-green-900">
														{toolName} Result
													</span>
												</div>
												<pre className="text-xs text-green-700 overflow-x-auto bg-green-50/50 p-2 rounded border">
													{JSON.stringify(part.output, null, 2)}
												</pre>
											</motion.div>
										);
									}

									if (part.state === "output-error") {
										return (
											<motion.div
												key={`tool-error-${partIndex}`}
												initial={{ opacity: 0, scale: 0.95 }}
												animate={{ opacity: 1, scale: 1 }}
												className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm"
											>
												<div className="flex items-center gap-2 mb-2">
													<span className="text-lg">❌</span>
													<span className="font-semibold text-red-900">
														{toolName} Error
													</span>
												</div>
												<p className="text-xs text-red-700">
													{part.errorText || "Unknown error"}
												</p>
											</motion.div>
										);
									}

									return null;
								})}
							</motion.div>
						)}
					</div>
				)}

				{/* Loading indicator */}
				{isLoading && !isUser && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="bg-gray-100 rounded-2xl px-4 py-3"
					>
						<div className="flex items-center gap-2 text-gray-600">
							<Loader2Icon className="w-4 h-4 animate-spin" />
							<span className="text-sm">Thinking...</span>
						</div>
					</motion.div>
				)}
			</div>
		</motion.div>
	);
}
