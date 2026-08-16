"use client";

import {
  ActionBarPrimitive,
  AttachmentPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
  useMessagePartText,
  type ToolCallMessagePartProps,
} from "@assistant-ui/react";
import {
  ArrowDown,
  ArrowUp,
  Brain,
  Check,
  ChevronRight,
  Copy,
  FileText,
  ImageIcon,
  Loader2,
  Paperclip,
  Plus,
  Square,
  Stethoscope,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AssistantText } from "./markdown-text";
import { SourcesDataPart } from "./citations";

export function Thread() {
  return (
    <ThreadPrimitive.Root className="flex h-dvh flex-col bg-white text-zinc-900 dark:bg-[#212121] dark:text-zinc-100">
      <ThreadHeader />

      <ThreadPrimitive.Viewport
        autoScroll
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        <ThreadPrimitive.Empty>
          <ThreadWelcome />
        </ThreadPrimitive.Empty>

        <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-8 md:px-6">
          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              AssistantMessage,
            }}
          />
        </div>
      </ThreadPrimitive.Viewport>

      <div className="relative mx-auto w-full max-w-3xl shrink-0 px-4 pb-4 md:px-6">
        <ThreadPrimitive.ScrollToBottom className="absolute -top-12 left-1/2 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-md transition-colors hover:text-zinc-900 dark:border-zinc-700 dark:bg-[#303030] dark:text-zinc-300 dark:hover:text-white">
          <ArrowDown className="h-4 w-4" />
        </ThreadPrimitive.ScrollToBottom>

        <Composer />
      </div>

      <Footer />
    </ThreadPrimitive.Root>
  );
}

function Footer() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleDateString());
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="shrink-0 overflow-hidden text-ellipsis whitespace-nowrap pb-2.5 pt-0.5 text-center text-[10px] tracking-wide text-zinc-400 dark:text-zinc-500">
      « Engineered with purpose by Husayn »{" "}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icon/simeye.svg"
        alt="SimEye"
        className="inline-block align-middle mx-0.5"
        style={{ height: 13, width: 13 }}
      />{" "}
      SIMEYE &nbsp;•&nbsp; <span id="footer-time">{time}</span> &nbsp;•{" "}

    </footer>
  );
}

function ThreadHeader() {
  const modelName = process.env.NEXT_PUBLIC_MODEL_NAME?.trim();
  return (
    <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-zinc-200/80 px-4 dark:border-zinc-800/80 md:px-6">
      <div className="flex items-center gap-2.5">
        <img src="/icon/simeye.svg" alt="" className="h-4 w-4" />
   
        <span className="text-[15px] font-semibold tracking-tight">
          SSE Assistant
        </span>
      </div>
      <div className="flex items-center gap-2">
        {modelName ? (
          <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-[#303030] dark:text-zinc-400">
            {modelName}
          </span>
        ) : null}
        <ThreadPrimitive.If empty>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="hidden h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white md:flex"
            aria-label="New thread"
            title="New thread"
          >
            <Plus className="h-4 w-4" />
          </button>
        </ThreadPrimitive.If>
      </div>
    </header>
  );
}

const SUGGESTIONS = [
  {
    title: "Formidable Ship Visual Glitch + Flight Freeze",
    prompt: "During shipdeck landing on moving Formidable ship (15 knots, sea state 3), engaging flight freeze causes visual stuttering/glitching. Unfreeze returns to normal. Static ship works fine. Check DR 3252 (2022) - same issue. Provide troubleshooting steps and known workaround."
  },
  {
    title: "Shipdeck Landing - Aircraft Drifts with Flight Freeze ON",
    prompt: "Hover engaging scenario to platform 4 PAD 1, aircraft continues to drift on deck even with flight freeze ON. Check DR 852 (2016) and DR 3076 - related to scenario platform 4 TAD 14. Determine if reposition workaround exists."
  },
  {
    title: "Visual Blank / Misalignment After Session Reset",
    prompt: "After instructor session reset, visual becomes blank or misaligned. Check: IG channel config, SyncGen power cycle, DDAT geometry correction, visual reload procedure. Reference DR 4417 (2026)."
  },
  {
    title: "VOR/ILS/DME Missing or Wrong Frequency",
    prompt: "Navigation aid issues: VOR freq wrong (MIRI VMI 112.40 vs VMY 113.60), DME missing (YMML, NZAA), ILS freq wrong (LIRF 34C shows 108.3), LOC not capturing (IPR at RPVP). Check DR 1115, 1820, 1872, 1873, 1555."
  },
  {
    title: "Weather Radar Not Painting Ships (Formidable/FPSO)",
    prompt: "Weather radar on MFD paints rigs but not ships (Formidable, FPSO). Sweep rate very slow (~1 min). Check DR 1432 (2017). Verify radar scenario player detection logic."
  },
  {
    title: "QTG Motion Cue - Jack Position Graphs Mismatch",
    prompt: "Load Engineering Test QTG 4.f.d Motion Cue - all Jack Position graphs don't match QTG reference. Load 125. Check DR 2545. Verify motion system calibration and data collection."
  },
];
function ThreadWelcome() {
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center gap-8 px-4 pb-24 pt-16 text-center">
      <img src="/icon/simeye.svg" alt="" className="h-12 w-12" />
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Ask anything
        </h1>
        <p className="text-[15px] text-zinc-500 dark:text-zinc-400">
          Troubleshooting steps, previous issues and manuals findings. Just try to ask.
        </p>
      </div>

      <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
        {SUGGESTIONS.map((suggestion) => (
          <ThreadPrimitive.Suggestion
            key={suggestion.title}
            prompt={suggestion.prompt}
            send
            className="group flex h-auto flex-col items-start gap-1.5 rounded-xl border border-zinc-200 bg-white p-4 text-left text-sm shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-400 hover:shadow-md dark:border-zinc-700/80 dark:bg-[#2f2f2f] dark:hover:border-zinc-500"
          >
            <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
              {suggestion.title}
            </span>
            <span className="line-clamp-2 text-zinc-500 dark:text-zinc-400">
              {suggestion.prompt}
            </span>
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </div>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="mb-8 flex w-full flex-col items-end">
      <MessagePrimitive.Attachments
        components={{
          Image: UserImageAttachment,
          File: UserFileAttachment,
          Document: UserFileAttachment,
        }}
      />
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#f4f4f4] px-4 py-2.5 text-[15px] leading-relaxed text-zinc-900 dark:bg-[#2f2f2f] dark:text-zinc-100">
        <MessagePrimitive.Parts
          components={{ Text: UserText }}
        />
      </div>
    </MessagePrimitive.Root>
  );
}

function attachmentImageUrl(): string | null {
  const attachment = useAuiState((s) => s.attachment);

  // 1. Completed attachment content: image part (message scope) or file part
  //    holding a data URL (adapter send format)
  const content = attachment?.content ?? [];
  for (const part of content) {
    if (part.type === "image" && typeof part.image === "string") {
      return part.image;
    }
    const maybeFile = part as { type: string; data?: unknown };
    if (
      part.type === "file" &&
      typeof maybeFile.data === "string" &&
      maybeFile.data.startsWith("data:image/")
    ) {
      return maybeFile.data;
    }
  }

  // 2. Pending attachment: create a preview URL from the raw File.
  //    StrictMode-safe: only revoke the *previous* URL when the file changes,
  //    never on unmount (revoking on unmount breaks previews in dev).
  const file = (attachment as { file?: File } | undefined)?.file;
  const objectUrl = useMemo(
    () => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null),
    [file],
  );
  const previousUrl = useRef<string | null>(null);
  useEffect(() => {
    const previous = previousUrl.current;
    if (previous && previous !== objectUrl) URL.revokeObjectURL(previous);
    previousUrl.current = objectUrl;
  }, [objectUrl]);

  return objectUrl;
}

function UserImageAttachment() {
  const url = attachmentImageUrl();
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="attachment"
      className="mb-1.5 max-h-48 max-w-full rounded-xl border border-zinc-200 object-contain dark:border-zinc-700"
    />
  );
}

function UserFileAttachment() {
  const name = useAuiState((s) => s.attachment?.name) ?? "file";
  return (
    <div className="mb-1.5 flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-[#2f2f2f] dark:text-zinc-300">
      <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
      <span className="max-w-[180px] truncate font-medium">{name}</span>
    </div>
  );
}

function UserText() {
  const part = useMessagePartText();
  return <p className="whitespace-pre-wrap break-words">{part?.text}</p>;
}

function ReasoningPart() {
  const part = useMessagePartText();
  if (!part?.text) return null;
  return (
    <details className="group rounded-lg border border-zinc-200/80 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/40">
      <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
        <Brain className="h-3.5 w-3.5" />
        Reasoning
      </summary>
      <div className="whitespace-pre-wrap border-t border-zinc-200/80 px-3 py-2.5 text-xs leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        {part.text}
      </div>
    </details>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 py-1 text-sm">
      <Loader2 className="h-4 w-4 animate-spin text-zinc-500 dark:text-zinc-400" />
      <span className="thinking-shimmer font-medium">
        Searching &amp; thinking…
      </span>
    </div>
  );
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function ToolFallback({ toolName, argsText, args, result }: ToolCallMessagePartProps) {
  const hasResult = result !== undefined && result !== null;
  const showArgs = argsText && argsText !== "{}" ? argsText : prettyJson(args);

  return (
    <details className="group/tool rounded-lg border border-zinc-200/80 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/40">
      <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
        <ChevronRight className="h-3 w-3 shrink-0 transition-transform group-open/tool:rotate-90" />
        <Wrench className="h-3.5 w-3.5 shrink-0" />
        <span className="font-mono">{toolName}</span>
        {hasResult ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />
        ) : (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-zinc-400" />
        )}
        {showArgs ? (
          <span className="truncate font-normal text-zinc-400 dark:text-zinc-500">
            {showArgs.replace(/\s+/g, " ").slice(0, 80)}
          </span>
        ) : null}
      </summary>

      <div className="flex flex-col gap-2 border-t border-zinc-200/80 px-3 py-2.5 dark:border-zinc-800">
        {showArgs ? (
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Input
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
              {showArgs}
            </pre>
          </div>
        ) : null}

        {hasResult ? (
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Result
            </div>
            <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
              {prettyJson(result).slice(0, 4000)}
            </pre>
          </div>
        ) : (
          <div className="text-xs text-zinc-400 dark:text-zinc-500">
            Running…
          </div>
        )}
      </div>
    </details>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="group/message mb-12 w-full">
      <div className="flex gap-3.5">
        <img src="/icon/simeye.svg" alt="" className="h-4 w-4" />
      

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-baseline gap-2">
            <span className="text-sm font-semibold">SSE Assistant</span>
          </div>

          <div className="flex flex-col gap-3">
            <MessagePrimitive.Parts
              components={{
                Text: AssistantText,
                Reasoning: ReasoningPart,
                Empty: ThinkingIndicator,
                data: { by_name: { sources: SourcesDataPart } },
                tools: { Fallback: ToolFallback },
              }}
            />
          </div>

          <MessagePrimitive.Error>
            <div className="mt-2 rounded-lg border border-red-300/60 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              <ErrorPrimitive.Message />
            </div>
          </MessagePrimitive.Error>

          <div className="mt-2.5 flex h-8 items-center gap-1 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover/message:opacity-100">
            <ActionBarPrimitive.Copy className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-200/70 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
              <MessagePrimitive.If copied={false}>
                <Copy className="h-3.5 w-3.5" />
              </MessagePrimitive.If>
              <MessagePrimitive.If copied>
                <Check className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300" />
              </MessagePrimitive.If>
            </ActionBarPrimitive.Copy>
          </div>
        </div>
      </div>
    </MessagePrimitive.Root>
  );
}

const LONG_PASTE_THRESHOLD = 280;

function Composer() {
  const aui = useAui();
  const pasteCount = useRef(0);

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Pasted files/images (e.g. screenshots) -> attachments
    const files = Array.from(event.clipboardData?.files ?? []);
    if (files.length > 0) {
      event.preventDefault();
      for (const file of files) void aui.composer.addAttachment(file);
      return;
    }

    // Long text pastes -> text attachment chip instead of flooding the input
    const text = event.clipboardData?.getData("text/plain") ?? "";
    if (text.trim().length >= LONG_PASTE_THRESHOLD) {
      event.preventDefault();
      pasteCount.current += 1;
      const name =
        text.split("\n")[0]?.trim().slice(0, 24).replace(/[^\w\s-]/g, "").trim() || "pasted";
      const file = new File([text], `${name}${pasteCount.current > 1 ? `-${pasteCount.current}` : ""}.txt`, {
        type: "text/plain",
      });
      void aui.composer.addAttachment(file);
    }
  };

  return (
    <ComposerPrimitive.AttachmentDropzone className="rounded-2xl outline-none ring-0 transition-shadow focus-within:ring-2 focus-within:ring-zinc-400/40 data-[dragging]:ring-2 data-[dragging]:ring-zinc-500/60">
      <ComposerPrimitive.Root className="rounded-2xl border border-zinc-300/90 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-colors focus-within:border-zinc-500 dark:border-zinc-700 dark:bg-[#2f2f2f] dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)] dark:focus-within:border-zinc-500">
        <ComposerPrimitive.Attachments
          components={{
            Image: ComposerImageAttachment,
            File: ComposerFileAttachment,
            Document: ComposerFileAttachment,
          }}
        />

        <ComposerPrimitive.Input
          rows={1}
          placeholder="Ask anything…"
          onPaste={handlePaste}
          className="max-h-52 w-full resize-none bg-transparent px-4 pb-1 pt-3.5 text-[15px] leading-relaxed outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
        />

        <div className="flex items-center justify-between px-3 pb-2.5">
          <div className="flex items-center gap-1">
            <ComposerPrimitive.AddAttachment className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-200/70 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700/60 dark:hover:text-zinc-200">
              <Paperclip className="h-4 w-4" />
            </ComposerPrimitive.AddAttachment>
            <span className="hidden text-[11px] text-zinc-400 dark:text-zinc-500 sm:inline">
              AI can make mistakes. Please verify and cross check any critical information.
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <ThreadPrimitive.If running>
              <ComposerPrimitive.Cancel
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white transition-opacity hover:opacity-80 dark:bg-white dark:text-zinc-900"
                aria-label="Stop generating"
              >
                <Square className="h-3 w-3 fill-current" />
              </ComposerPrimitive.Cancel>
            </ThreadPrimitive.If>

            <ThreadPrimitive.If running={false}>
              <ComposerPrimitive.Send
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white transition-all hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-25 dark:bg-white dark:text-zinc-900"
                aria-label="Send message"
              >
                <ArrowUp className="h-4 w-4" />
              </ComposerPrimitive.Send>
            </ThreadPrimitive.If>
          </div>
        </div>
      </ComposerPrimitive.Root>
    </ComposerPrimitive.AttachmentDropzone>
  );
}

function ComposerImageAttachment() {
  const url = attachmentImageUrl();
  if (!url) return null;
  return (
    <AttachmentPrimitive.Root className="group/att relative m-2.5 mb-0 inline-flex">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="attachment"
        className="h-16 w-16 rounded-lg border border-zinc-200 object-cover dark:border-zinc-700"
      />
      <AttachmentPrimitive.Remove className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm transition-colors hover:text-zinc-900 dark:border-zinc-600 dark:bg-[#2f2f2f] dark:text-zinc-300 dark:hover:text-white">
        <X className="h-3 w-3" />
      </AttachmentPrimitive.Remove>
    </AttachmentPrimitive.Root>
  );
}

function ComposerFileAttachment() {
  const name = useAuiState((s) => s.attachment?.name) ?? "file";
  const isImageType = useAuiState((s) => {
    const att = s.attachment;
    if (!att) return false;
    return (att.contentType ?? att.type) === "image";
  });

  return (
    <AttachmentPrimitive.Root className="group/att inline-flex m-2.5 mb-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 pl-2.5 pr-1.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-[#2f2f2f] dark:text-zinc-300">
      {isImageType ? (
        <ImageIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
      ) : (
        <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
      )}
      <span className="max-w-[180px] truncate font-medium">{name}</span>
      <AttachmentPrimitive.Remove className="flex h-5 w-5 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-200/70 hover:text-zinc-700 dark:hover:bg-zinc-700/60 dark:hover:text-zinc-200">
        <X className="h-3 w-3" />
      </AttachmentPrimitive.Remove>
    </AttachmentPrimitive.Root>
  );
}
