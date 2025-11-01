"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import {
	Conversation,
	ConversationContent,
} from "@/components/ui/conversation";
import { Message } from "@/components/ui/message";
import {
	SendIcon,
	Loader2Icon,
	UserIcon,
	BotIcon,
	ChevronDownIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Demo users with different access levels
const DEMO_USERS = [
	{
		email: "alice@company.com",
		name: "Alice Johnson",
		role: "Senior SDE",
		description: "Has staging DB, production read-only, AWS dev access",
		avatar: "AJ",
	},
	{
		email: "eve@company.com",
		name: "Eve Chen",
		role: "SDE Intern",
		description: "Limited access - only staging DB (temporary)",
		avatar: "EC",
	},
	{
		email: "diana@company.com",
		name: "Diana Prince",
		role: "Staff SDE",
		description: "High access - production DB write, AWS admin",
		avatar: "DP",
	},
	{
		email: "charlie@company.com",
		name: "Charlie Davis",
		role: "SDE Frontend",
		description: "Frontend developer - staging DB, GitHub, AWS dev",
		avatar: "CD",
	},
	{
		email: "mike@company.com",
		name: "Mike Chen",
		role: "DevOps Manager",
		description: "Full admin access - all resources",
		avatar: "MC",
	},
];

const SUGGESTED_QUERIES = [
	"What access do I have?",
	"Whitelist my IP",
	"I need an OpenAI API key",
	"Who owns the payment service?",
	"Request access to production database",
];

export default function Home() {
	const [userEmail, setUserEmail] = useState("alice@company.com");
	const [input, setInput] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Configure useChat with explicit transport
	const { messages, sendMessage, status } = useChat({
		transport: new DefaultChatTransport({
			api: "/api/chat",
		}),
	});

	const isLoading = status === "submitted" || status === "streaming";
	const selectedUser = DEMO_USERS.find((u) => u.email === userEmail);

	// Custom scroll hook to handle UI component rendering
	const useScrollToBottom = () => {
		const scrollToBottom = useCallback(() => {
			const scrollElement = messagesEndRef.current;
			if (!scrollElement) return;

			const scrollContainer = scrollElement.closest(".overflow-y-auto");
			if (scrollContainer) {
				// Use requestAnimationFrame to ensure DOM is fully updated
				requestAnimationFrame(() => {
					scrollContainer.scrollTop = scrollContainer.scrollHeight;
				});
			}
		}, []);

		// Detect if message contains UI components
		const hasUIComponents = useMemo(() => {
			return messages.some((message) =>
				message.parts?.some(
					(part: any) =>
						part.type?.startsWith("tool-") &&
						part.type.includes("generateAccessRequestUI") &&
						part.state === "output-available",
				),
			);
		}, [messages]);

		useEffect(() => {
			// Delay scroll more for UI components, less for text-only
			const delay = hasUIComponents ? 500 : 100;

			const timer = setTimeout(() => {
				scrollToBottom();
			}, delay);

			return () => clearTimeout(timer);
		}, [messages, scrollToBottom, hasUIComponents]);

		return scrollToBottom;
	};

	const scrollToBottomFn = useScrollToBottom();

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim() || isLoading) return;

		sendMessage(
			{ text: input },
			{
				body: {
					userEmail: userEmail,
				},
			},
		);
		setInput("");
	};

	const handleSuggestionClick = (query: string) => {
		sendMessage(
			{ text: query },
			{
				body: {
					userEmail: userEmail,
				},
			},
		);
	};

	const handleUIAction = async (action: string, data: any) => {
		console.log("UI Action:", action, data);

		switch (action) {
			case "submit_access_request":
				// Send a message to the AI that a request was submitted
				sendMessage(
					{
						text: `I've submitted an access request for ${data.resourceType}:${data.resourceName}. Reason: ${data.reason}. Urgency: ${data.urgency}`,
					},
					{
						body: {
							userEmail: userEmail,
						},
					},
				);
				break;
			case "bump_request":
				sendMessage(
					{
						text: `Please send a reminder about my pending request: ${data.requestId}`,
					},
					{
						body: {
							userEmail: userEmail,
						},
					},
				);
				break;
			case "cancel_request":
				sendMessage(
					{ text: `I want to cancel my request: ${data.requestId}` },
					{
						body: {
							userEmail: userEmail,
						},
					},
				);
				break;
			case "duplicate_request":
				sendMessage(
					{
						text: `I want to submit a similar request to: ${data.request.resource_name}`,
					},
					{
						body: {
							userEmail: userEmail,
						},
					},
				);
				break;
			default:
				console.log("Unhandled UI action:", action, data);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e);
		}
	};

	return (
		<div className="flex flex-col h-screen bg-white">
			{/* Header */}
			<header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
				<div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
							<BotIcon className="w-5 h-5 text-white" />
						</div>
						<div>
							<h1 className="text-lg font-semibold text-gray-900">One Stop</h1>
						</div>
					</div>

					{/* User Selection */}
					<div className="flex items-center gap-3">
						<div className="text-right hidden sm:block">
							<p className="text-sm font-medium text-gray-900">
								{selectedUser?.name}
							</p>
							<p className="text-xs text-gray-500">{selectedUser?.role}</p>
						</div>
						<Select value={userEmail} onValueChange={setUserEmail}>
							<SelectTrigger className="w-auto gap-2 border border-gray-300 bg-white hover:bg-gray-50 shadow-sm">
								<Avatar className="size-6">
									<AvatarFallback className="text-xs bg-gray-100 text-gray-700">
										{selectedUser?.avatar}
									</AvatarFallback>
								</Avatar>
								<ChevronDownIcon className="size-4 opacity-50" />
							</SelectTrigger>
							<SelectContent
								align="end"
								className="w-80 bg-white border border-gray-200 shadow-lg z-[9999]"
							>
								{DEMO_USERS.map((user) => (
									<SelectItem
										key={user.email}
										value={user.email}
										className="focus:bg-gray-50"
									>
										<div className="flex items-center gap-3 py-2">
											<Avatar className="size-8">
												<AvatarFallback className="bg-gray-100 text-gray-700">
													{user.avatar}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1 min-w-0">
												<p className="font-medium text-sm text-gray-900">
													{user.name}
												</p>
												<p className="text-xs text-gray-500">{user.role}</p>
												<p className="text-xs text-gray-400 mt-1 line-clamp-2">
													{user.description}
												</p>
											</div>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</header>

			{/* Messages */}
			<div
				className="flex-1 overflow-y-auto overscroll-behavior-contain"
				style={{ scrollBehavior: "smooth" }}
			>
				<div className="min-h-full">
					<Conversation className="mx-auto flex min-w-0 max-w-4xl flex-col gap-4 md:gap-6">
						<ConversationContent className="flex flex-col gap-4 px-2 py-4 md:gap-6 md:px-4 pb-8">
							{messages.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-20">
									<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
										<BotIcon className="w-8 h-8 text-gray-600" />
									</div>
									<div className="space-y-3">
										<h2 className="text-2xl font-semibold text-gray-900">
											Welcome to One Stop
										</h2>
										<p className="text-gray-600 max-w-md text-lg">
											Your AI-powered IT support assistant. Ask about access
											permissions, API keys, or any other development needs.
										</p>
									</div>
									<div className="flex flex-wrap gap-2 justify-center max-w-2xl">
										{SUGGESTED_QUERIES.map((query) => (
											<Button
												key={query}
												variant="outline"
												size="sm"
												className="text-sm border-gray-300 hover:bg-gray-50 text-gray-700 bg-white"
												onClick={() => handleSuggestionClick(query)}
											>
												{query}
											</Button>
										))}
									</div>
								</div>
							) : (
								<>
									{messages.map((message, index) => (
										<Message
											key={message.id}
											message={message}
											isUser={message.role === "user"}
											isLoading={
												isLoading &&
												index === messages.length - 1 &&
												message.role === "assistant"
											}
											userEmail={userEmail}
											onUIAction={handleUIAction}
										/>
									))}

									{isLoading &&
										messages[messages.length - 1]?.role === "user" && (
											<Message
												message={{ parts: [] }}
												isUser={false}
												isLoading={true}
												userEmail={userEmail}
												onUIAction={handleUIAction}
											/>
										)}
									<div
										ref={messagesEndRef}
										className="h-8 w-full flex-shrink-0"
									/>
								</>
							)}
						</ConversationContent>
					</Conversation>
				</div>
			</div>

			{/* Input */}
			<div className="border-t border-gray-200 bg-white/80 backdrop-blur-sm sticky bottom-0">
				<div className="max-w-4xl mx-auto p-4">
					<form onSubmit={handleSubmit} className="relative">
						<div className="flex items-end gap-2 p-3 border border-gray-300 rounded-3xl bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
							<Textarea
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Ask about access, API keys, or IT support..."
								disabled={isLoading}
								className="flex-1 min-h-5 max-h-32 resize-none border-none shadow-none focus-visible:ring-0 p-0 text-sm text-gray-900 placeholder:text-gray-500 bg-transparent"
								rows={1}
								style={{
									height: "auto",
									background: "transparent",
								}}
								onInput={(e) => {
									const target = e.target as HTMLTextAreaElement;
									target.style.height = "auto";
									target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
								}}
							/>
							<Button
								type="submit"
								disabled={isLoading || !input.trim()}
								size="sm"
								className="shrink-0 rounded-full w-8 h-8 p-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
							>
								{isLoading ? (
									<Loader2Icon className="w-4 h-4 animate-spin" />
								) : (
									<SendIcon className="w-4 h-4" />
								)}
							</Button>
						</div>
					</form>
					<p className="text-xs text-gray-400 text-center mt-3">
						Powered by OpenAI & Vercel AI SDK • Demo data only
					</p>
				</div>
			</div>
		</div>
	);
}
