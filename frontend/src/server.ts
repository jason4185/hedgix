import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { DEFAULT_REGISTRY_URL } from "./config/env";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

async function proxyRegistry(): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const upstreamUrl = import.meta.env.VITE_HEDGIX_REGISTRY_URL?.trim() || DEFAULT_REGISTRY_URL;

  try {
    const response = await fetch(upstreamUrl, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    const body = await response.text();
    const headers = new Headers({
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-hedgix-registry-url": upstreamUrl,
    });

    if (!response.ok) {
      console.error(`Hedgix registry fetch failed: ${response.status} ${upstreamUrl}`);
      return new Response(
        JSON.stringify({
          error: "REGISTRY_FETCH_FAILED",
          status: response.status,
          registry_url: upstreamUrl,
        }),
        { status: 502, headers },
      );
    }

    return new Response(body, { status: 200, headers });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    console.error("Hedgix registry proxy error", error);
    return new Response(
      JSON.stringify({
        error: aborted ? "REGISTRY_FETCH_TIMEOUT" : "REGISTRY_FETCH_FAILED",
        registry_url: upstreamUrl,
      }),
      {
        status: aborted ? 504 : 502,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store, max-age=0",
          "x-hedgix-registry-url": upstreamUrl,
        },
      },
    );
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/registry") {
        return await proxyRegistry();
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
