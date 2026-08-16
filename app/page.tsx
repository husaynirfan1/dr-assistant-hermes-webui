"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useMemo } from "react";
import { hermesAttachmentAdapter } from "./assistant-ui/attachments";
import { Thread } from "./assistant-ui/thread";

export default function Page() {
  const runtime = useChatRuntime(
    useMemo(
      () => ({
        transport: new DefaultChatTransport<UIMessage>({ api: "/api/chat" }),
        adapters: { attachments: hermesAttachmentAdapter },
      }),
      [],
    ),
  );

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
