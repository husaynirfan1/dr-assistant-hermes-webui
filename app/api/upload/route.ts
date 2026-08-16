import { cookies } from "next/headers";

const UPLOAD_API = (process.env.UPLOAD_API_URL ?? "http://100.116.108.51:8643").replace(
  /\/+$/,
  "",
);
const UPLOAD_BASE = process.env.UPLOAD_BASE_PATH ?? "/home/husaynirfan/.hermes/uploads";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Missing or empty file" }, { status: 400 });
  }

  const createSession = async (): Promise<string> => {
    const res = await fetch(`${UPLOAD_API}/sessions`, { method: "POST" });
    if (!res.ok) throw new Error(`Session creation failed (${res.status})`);
    const data = (await res.json()) as { session_id?: string };
    if (!data.session_id) throw new Error("Session creation returned no session_id");
    return data.session_id;
  };

  const uploadFile = (sessionId: string): Promise<Response> => {
    const uploadForm = new FormData();
    uploadForm.append("file", file, file.name);
    return fetch(`${UPLOAD_API}/sessions/${sessionId}/upload`, {
      method: "POST",
      body: uploadForm,
    });
  };

  const cookieStore = await cookies();
  let sessionId = cookieStore.get("hermes_upload_session")?.value;

  let response = sessionId
    ? await uploadFile(sessionId).catch(() => null)
    : null;

  // Session missing / expired / service restarted -> recreate once and retry
  if (!response || response.status === 404 || response.status === 410) {
    try {
      sessionId = await createSession();
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      return Response.json({ error: `Upload API unavailable: ${message}` }, { status: 502 });
    }
    cookieStore.set("hermes_upload_session", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    response = await uploadFile(sessionId);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return Response.json(
      { error: `Upload failed (${response.status}): ${detail.slice(0, 300)}` },
      { status: 502 },
    );
  }

  const info = (await response.json().catch(() => null)) as
    | {
        file?: { stored_name?: string; original_name?: string; path?: string };
        path?: string;
      }
    | null;
  const storedName = info?.file?.stored_name ?? info?.file?.original_name ?? file.name;
  const path = info?.file?.path ?? info?.path ?? `${UPLOAD_BASE}/${sessionId}/${storedName}`;

  return Response.json({ path, name: storedName, sessionId });
}
