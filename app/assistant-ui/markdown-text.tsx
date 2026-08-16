"use client";

import { useMessagePartText } from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";

export function AssistantText() {
  const part = useMessagePartText();
  const isRunning = part.status?.type === "running";
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className={`prose prose-zinc dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-7 prose-code:before:content-none prose-code:after:content-none prose-code:rounded prose-code:bg-zinc-200/70 prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.85em] dark:prose-code:bg-zinc-700/60 prose-pre:border prose-pre:border-zinc-200 dark:prose-pre:border-zinc-700/60 max-w-none text-[15px] ${
        isRunning ? "streaming-caret" : ""
      }`}
    />
  );
}
