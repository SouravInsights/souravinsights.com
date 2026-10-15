import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "proj_xytvpvrtpxgounfqlevp",
  runtime: "node",
  logLevel: "log",
  // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
  // You can override this on an individual task.
  // See https://trigger.dev/docs/runs/max-duration
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./src/trigger"],
  build: {
    // jsdom loads ./xhr-sync-worker.js at runtime, which esbuild cannot see.
    // defuddle/node is a CommonJS file behind an import-only export map entry,
    // and this repo is CommonJS — bundled, its Defuddle export comes out
    // malformed. Keep both out of the bundle; Node loads them correctly.
    external: ["jsdom", "defuddle"],
  },
});
