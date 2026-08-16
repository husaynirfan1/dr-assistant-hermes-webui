"use client";

import { generateId, type AttachmentAdapter } from "@assistant-ui/react";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Images are inlined as data URLs (OpenAI vision format).
 * Everything else is uploaded to the Hermes upload API and referenced by
 * server path so the agent can read it with its file tools. If the upload
 * service is unreachable, non-image files fall back to inline data URLs.
 */
export const hermesAttachmentAdapter: AttachmentAdapter = {
  accept: "*",

  async add({ file }) {
    return {
      id: generateId(),
      type: file.type.startsWith("image/") ? "image" : "document",
      name: file.name,
      contentType: file.type,
      file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  },

  async send(attachment) {
    const file = attachment.file as File;
    const filename = attachment.name;
    const mimeType = attachment.contentType || file.type || "application/octet-stream";

    if (mimeType.startsWith("image/")) {
      return {
        ...attachment,
        status: { type: "complete" },
        content: [
          { type: "file", mimeType, filename, data: await readFileAsDataUrl(file) },
        ],
      };
    }

    try {
      const form = new FormData();
      form.append("file", file, filename);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { path, name } = (await res.json()) as { path: string; name: string };
      // file:// scheme keeps the path a valid URL through the wire format
      return {
        ...attachment,
        status: { type: "complete" },
        content: [{ type: "file", mimeType, filename: name, data: `file://${path}` }],
      };
    } catch {
      return {
        ...attachment,
        status: { type: "complete" },
        content: [
          { type: "file", mimeType, filename, data: await readFileAsDataUrl(file) },
        ],
      };
    }
  },

  async remove() {},
};
