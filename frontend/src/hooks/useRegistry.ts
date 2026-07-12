import { useQuery } from "@tanstack/react-query";
import { runtimeEnv } from "@/config/env";
import { validateRegistry } from "@/lib/genlayer/parsing";

export const REGISTRY_PROXY_PATH = "/api/registry";

export function useRegistry() {
  return useQuery({
    queryKey: ["hedgix", "registry", runtimeEnv.registryUrl, REGISTRY_PROXY_PATH],
    queryFn: async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      let response: Response;
      try {
        response = await fetch(REGISTRY_PROXY_PATH, {
          cache: "no-store",
          headers: { accept: "application/json" },
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error(`REGISTRY_UNAVAILABLE: request timed out for ${runtimeEnv.registryUrl}`);
        }
        throw new Error(
          `REGISTRY_UNAVAILABLE: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        const details = await response.text().catch(() => "");
        throw new Error(
          `REGISTRY_FETCH_FAILED: ${response.status} ${runtimeEnv.registryUrl}\n${details}`,
        );
      }

      const json = await response.json();
      const validated = validateRegistry(json);
      if (!validated.ok) {
        throw new Error(
          `INVALID_REGISTRY_RESPONSE: ${validated.error}\n${validated.raw.slice(0, 1000)}`,
        );
      }
      return validated.value;
    },
    staleTime: 30_000,
    retry: 1,
  });
}
