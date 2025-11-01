"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export const Conversation = forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn("flex min-w-0 flex-col", className)}
		{...props}
	/>
));

Conversation.displayName = "Conversation";

export const ConversationContent = forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn("flex flex-col", className)} {...props} />
));

ConversationContent.displayName = "ConversationContent";
