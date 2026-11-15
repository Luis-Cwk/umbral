import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  accountId: "599c749c2464f3ba0f3ae848fab54a94",
  worker: defineWorker({
    name: "umbral",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-14",
    compatibilityFlags: ["nodejs_compat"],
    workersDev: true,
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      PEY_API_BASE: bindings.text("https://api.pey.mx"),
      DEMO_MODE: bindings.text("true"),
      // STAFF_PIN solo como secret: npx wrangler secret put STAFF_PIN --name umbral
      NEXT_PUBLIC_APP_URL: bindings.text("https://umbral.petrasynthetic.workers.dev"),
    },
  }),
});
