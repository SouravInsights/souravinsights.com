/**
 * Next.js runs this file once when the server starts, before any request. It is
 * the one place where Neatlogs is switched on.
 *
 * How it fits together: the AI SDK calls the agent makes are recorded by the
 * wrapped functions in `src/lib/observability/neatlogs.ts`. This file turns
 * Neatlogs on and says which "workflow" those records belong to.
 *
 * Docs: https://docs.neatlogs.com/sdk/typescript
 */
export async function register(): Promise<void> {
  // This only runs on the Node.js server, never in the browser.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Node 22+ exposes `localStorage` as a lazy global that prints an
  // ExperimentalWarning the first time it is read unless `--localstorage-file`
  // is set. `@trigger.dev/sdk` (via `@electric-sql/client`) probes
  // `typeof localStorage` at import, so `/api/v1/links` warned on every cold
  // start. Shadow it before any route module loads — nothing server-side uses
  // it. `defineProperty` never reads the getter, so the warning is not fired
  // by the fix itself.
  try {
    Object.defineProperty(globalThis, "localStorage", {
      value: undefined,
      configurable: true,
      writable: true,
    });
  } catch {
    // A non-configurable global is not worth failing startup over.
  }

  const apiKey = process.env.NEATLOGS_API_KEY;
  if (!apiKey) {
    // No key means tracing is off. The app still works normally.
    console.warn("[neatlogs] NEATLOGS_API_KEY unset — tracing disabled");
    return;
  }

  // `neatlogs` is in `serverExternalPackages`, so Next leaves it external but
  // still traces it into the serverless function. Do not add `webpackIgnore`:
  // that hides the import from the tracer, and the package is then missing at
  // runtime ("Cannot find package 'neatlogs'"), which crashes the hook and
  // every dynamic route with it.
  //
  // Tracing must never take the site down: if the import fails for any reason,
  // the app keeps serving without it.
  try {
    const { init } = await import("neatlogs");

    await init({
      apiKey,
      // A label that groups this app's traces in the Neatlogs dashboard.
      workflowName: "insights-agent",
    });
  } catch (error) {
    console.error("[neatlogs] init failed — tracing disabled", error);
  }
}
