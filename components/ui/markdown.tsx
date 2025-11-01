"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";

interface MarkdownProps {
	children: string;
	className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
	return (
		<div
			className={cn(
				"prose prose-neutral max-w-none dark:prose-invert",
				className,
			)}
		>
			<ReactMarkdown
				remarkPlugins={[remarkGfm, remarkMath]}
				rehypePlugins={[rehypeKatex, rehypeHighlight]}
				components={{
					// Headings
					h1: ({ className, ...props }) => (
						<h1
							className={cn(
								"mt-6 mb-4 text-2xl font-semibold text-gray-900",
								className,
							)}
							{...props}
						/>
					),
					h2: ({ className, ...props }) => (
						<h2
							className={cn(
								"mt-5 mb-3 text-xl font-semibold text-gray-900",
								className,
							)}
							{...props}
						/>
					),
					h3: ({ className, ...props }) => (
						<h3
							className={cn(
								"mt-4 mb-2 text-lg font-semibold text-gray-900",
								className,
							)}
							{...props}
						/>
					),
					// Paragraphs
					p: ({ className, ...props }) => (
						<p
							className={cn("mb-3 leading-relaxed text-gray-900", className)}
							{...props}
						/>
					),
					// Links
					a: ({ className, ...props }) => (
						<a
							className={cn(
								"text-blue-600 hover:text-blue-700 underline underline-offset-2",
								className,
							)}
							target="_blank"
							rel="noopener noreferrer"
							{...props}
						/>
					),
					// Lists
					ul: ({ className, ...props }) => (
						<ul
							className={cn("mb-3 ml-4 space-y-1 list-disc", className)}
							{...props}
						/>
					),
					ol: ({ className, ...props }) => (
						<ol
							className={cn("mb-3 ml-4 space-y-1 list-decimal", className)}
							{...props}
						/>
					),
					li: ({ className, ...props }) => (
						<li className={cn("text-gray-900", className)} {...props} />
					),
					// Code
					code: ({ className, inline, ...props }) => {
						if (inline) {
							return (
								<code
									className={cn(
										"rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono text-gray-800",
										className,
									)}
									{...props}
								/>
							);
						}
						return (
							<code
								className={cn(
									"block rounded-lg bg-gray-100 p-4 text-sm font-mono overflow-x-auto",
									className,
								)}
								{...props}
							/>
						);
					},
					pre: ({ className, ...props }) => (
						<pre
							className={cn(
								"mb-3 rounded-lg bg-gray-100 p-4 overflow-x-auto",
								className,
							)}
							{...props}
						/>
					),
					// Blockquotes
					blockquote: ({ className, ...props }) => (
						<blockquote
							className={cn(
								"mb-3 border-l-4 border-gray-300 pl-4 italic text-gray-700",
								className,
							)}
							{...props}
						/>
					),
					// Tables
					table: ({ className, ...props }) => (
						<div className="mb-3 overflow-x-auto">
							<table
								className={cn(
									"min-w-full border-collapse border border-gray-300",
									className,
								)}
								{...props}
							/>
						</div>
					),
					thead: ({ className, ...props }) => (
						<thead className={cn("bg-gray-50", className)} {...props} />
					),
					tbody: ({ className, ...props }) => (
						<tbody className={cn("bg-white", className)} {...props} />
					),
					tr: ({ className, ...props }) => (
						<tr
							className={cn("border-b border-gray-200", className)}
							{...props}
						/>
					),
					th: ({ className, ...props }) => (
						<th
							className={cn(
								"border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900",
								className,
							)}
							{...props}
						/>
					),
					td: ({ className, ...props }) => (
						<td
							className={cn(
								"border border-gray-300 px-4 py-2 text-gray-900",
								className,
							)}
							{...props}
						/>
					),
					// Horizontal rule
					hr: ({ className, ...props }) => (
						<hr
							className={cn("my-6 border-t border-gray-300", className)}
							{...props}
						/>
					),
					// Strong/Bold
					strong: ({ className, ...props }) => (
						<strong
							className={cn("font-semibold text-gray-900", className)}
							{...props}
						/>
					),
					// Emphasis/Italic
					em: ({ className, ...props }) => (
						<em className={cn("italic text-gray-800", className)} {...props} />
					),
				}}
			>
				{children}
			</ReactMarkdown>
		</div>
	);
}
