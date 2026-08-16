"use client";

import type { DataMessagePartProps } from "@assistant-ui/react";

export type Citation = { url: string; title?: string };

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function faviconUrl(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(url))}&sz=64`;
}

export function SourcesDataPart({
  data,
}: DataMessagePartProps<{ sources?: Citation[] }>) {
  const sources = data?.sources ?? [];
  if (sources.length === 0) return null;

  return (
    <div className="order-first -mt-1 flex flex-wrap items-center gap-1.5">
      {sources.map((source: Citation, index: number) => {
        const host = hostOf(source.url);
        return (
          <a
            key={`${source.url}-${index}`}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            title={source.title ?? source.url}
            className="group/source flex h-7 max-w-[220px] items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 text-xs text-zinc-600 shadow-sm transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700/80 dark:bg-[#2f2f2f] dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-white"
          >
            <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={faviconUrl(source.url)}
                alt=""
                width={14}
                height={14}
                className="h-3.5 w-3.5 rounded-[3px]"
              />
            </span>
            <span className="truncate">
              {index + 1} · {source.title?.trim() || host}
            </span>
          </a>
        );
      })}
    </div>
  );
}
