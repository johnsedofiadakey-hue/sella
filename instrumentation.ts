import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initSentryServer } = await import("./lib/monitoring");
    initSentryServer();
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    const { initSentryEdge } = await import("./lib/monitoring");
    initSentryEdge();
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error) => {
  const { captureError } = await import("./lib/monitoring");
  captureError(error);
};
