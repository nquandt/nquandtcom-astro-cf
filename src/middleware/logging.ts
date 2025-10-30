import { defineMiddleware } from "astro:middleware";

export const loggingMiddleware = defineMiddleware(async (context, next) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  const { request, url } = context;

  // Log incoming request
  console.log(
    JSON.stringify({
      type: "request",
      requestId,
      timestamp: new Date().toISOString(),
      method: request.method,
      url: url.pathname + url.search,
      userAgent: request.headers.get("user-agent"),
      referer: request.headers.get("referer"),
      ip: request.headers.get("cf-connecting-ip"),
      country: request.headers.get("cf-ipcountry"),
    }),
  );

  try {
    const response = await next();
    const duration = Date.now() - startTime;

    // Log outgoing response
    console.log(
      JSON.stringify({
        type: "response",
        requestId,
        timestamp: new Date().toISOString(),
        method: request.method,
        url: url.pathname + url.search,
        status: response.status,
        duration,
      }),
    );

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log error details
    console.error(
      JSON.stringify({
        type: "error",
        requestId,
        timestamp: new Date().toISOString(),
        method: request.method,
        url: url.pathname + url.search,
        duration,
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : "Unknown",
        },
      }),
    );

    // Re-throw to let the framework handle the error upstream
    throw error;
  }
});