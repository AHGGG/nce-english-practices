/**
 * Log Bridge
 * Intercepts console logs and sends them to the backend.
 */

type ConsoleLevel = "log" | "warn" | "error" | "info" | "debug";
type LogCategory =
  | "user_input"
  | "agent_output"
  | "function_call"
  | "audio"
  | "network"
  | "lifecycle"
  | "general";

interface LogPayload {
  level: ConsoleLevel;
  message: string;
  data: Record<string, string | undefined>;
  category: LogCategory;
  timestamp: string;
}

const originalConsole: Pick<Console, ConsoleLevel> = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
};

const BRIDGE_ENDPOINT = "/api/logs";

function formatError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }
  return error;
}

function detectCategory(message: string): LogCategory {
  const msg = String(message).toLowerCase();

  if (
    [
      "connected",
      "disconnected",
      "initialized",
      "closed",
      "started",
      "stopped",
      "ready",
      "session",
    ].some((kw) => msg.includes(kw))
  ) {
    return "lifecycle";
  }

  if (
    [
      "transcript",
      "user said",
      "user input",
      "speech-to-text",
      "stt",
      "recognition",
    ].some((kw) => msg.includes(kw))
  ) {
    return "user_input";
  }

  if (
    [
      "agent",
      "assistant",
      "response",
      "text-to-speech",
      "tts",
      "speaking",
    ].some((kw) => msg.includes(kw))
  ) {
    return "agent_output";
  }

  if (
    [
      "audio",
      "playback",
      "chunk",
      "sample rate",
      "buffer",
      "pcm",
      "mp3",
      "wav",
    ].some((kw) => msg.includes(kw))
  ) {
    return "audio";
  }

  if (
    ["function", "tool", "calling", "invoke", "execute"].some((kw) =>
      msg.includes(kw),
    )
  ) {
    return "function_call";
  }

  if (
    ["websocket", "api", "fetch", "request", "latency", "timeout"].some((kw) =>
      msg.includes(kw),
    )
  ) {
    return "network";
  }

  return "general";
}

function sendToBackend(
  level: ConsoleLevel,
  message: unknown,
  ...args: unknown[]
) {
  const timestamp = new Date().toISOString();

  let data: Record<string, string | undefined> = {};
  let finalMessage = "";
  let stackTrace: string | undefined;
  let errName: string | undefined;

  if (message instanceof Error) {
    const formatted = formatError(message) as {
      message: string;
      name: string;
      stack?: string;
    };
    finalMessage = formatted.message;
    stackTrace = formatted.stack;
    errName = formatted.name;
  } else {
    finalMessage = String(message);
  }

  args.forEach((arg) => {
    if (!stackTrace && arg instanceof Error) {
      const formatted = formatError(arg) as {
        name: string;
        stack?: string;
      };
      stackTrace = formatted.stack;
      errName = formatted.name;
    }

    if (
      !stackTrace &&
      typeof arg === "object" &&
      arg !== null &&
      "stack" in arg &&
      typeof (arg as { stack?: unknown }).stack === "string"
    ) {
      stackTrace = (arg as { stack: string }).stack;
      if (
        "name" in arg &&
        typeof (arg as { name?: unknown }).name === "string"
      ) {
        errName = (arg as { name: string }).name;
      } else if (
        "errorName" in arg &&
        typeof (arg as { errorName?: unknown }).errorName === "string"
      ) {
        errName = (arg as { errorName: string }).errorName;
      } else {
        errName = "Error";
      }
    }
  });

  if (stackTrace) {
    data.stack = stackTrace;
    data.errorName = errName;
  }

  if (args.length > 0) {
    try {
      const argsData = args.reduce<Record<string, string>>(
        (acc, arg, index) => {
          const value = arg instanceof Error ? formatError(arg) : arg;

          try {
            acc[`arg${index}`] =
              typeof value === "object" ? JSON.stringify(value) : String(value);
          } catch {
            acc[`arg${index}`] = "[Circular/Unserializable]";
          }

          return acc;
        },
        {},
      );

      data = { ...data, ...argsData };
    } catch {
      data = { ...data, serializationError: "Could not serialize args" };
    }
  }

  const payload: LogPayload = {
    level,
    message: finalMessage,
    data,
    category: detectCategory(finalMessage),
    timestamp,
  };

  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });
    navigator.sendBeacon(BRIDGE_ENDPOINT, blob);
    return;
  }

  fetch(BRIDGE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).catch((error) => {
    originalConsole.error("[LogBridge] Failed to send log:", error);
  });
}

export function initLogBridge() {
  const windowWithFlag = window as Window & {
    __LOG_BRIDGE_INITIALIZED__?: boolean;
  };
  if (windowWithFlag.__LOG_BRIDGE_INITIALIZED__) return;
  windowWithFlag.__LOG_BRIDGE_INITIALIZED__ = true;
  (["log", "warn", "error", "info", "debug"] as ConsoleLevel[]).forEach(
    (level) => {
      console[level] = (...args: unknown[]) => {
        originalConsole[level].apply(console, args);

        try {
          sendToBackend(level, args[0], ...args.slice(1));
        } catch {
          // ignore
        }
      };
    },
  );

  window.addEventListener("error", (event) => {
    try {
      sendToBackend("error", `[Uncaught] ${event.message}`, event.error);
    } catch {
      // ignore
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    try {
      const reason = event.reason as { message?: string } | string | undefined;
      const reasonText =
        typeof reason === "string" ? reason : reason?.message || String(reason);
      sendToBackend(
        "error",
        `[Unhandled Rejection] ${reasonText}`,
        event.reason,
      );
    } catch {
      // ignore
    }
  });

  if (import.meta.env.DEV) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;

          if (
            node.id === "vite-error-overlay" ||
            node.shadowRoot?.querySelector(".message-body")
          ) {
            try {
              const errorBody =
                node.shadowRoot?.querySelector(".message-body")?.textContent ||
                node.shadowRoot?.querySelector("pre")?.textContent ||
                node.textContent;

              const errorTitle =
                node.shadowRoot?.querySelector(".message")?.textContent ||
                "Vite Build Error";

              if (errorBody) {
                sendToBackend("error", `[Vite] ${errorTitle}`, {
                  stack: errorBody,
                  source: "vite-overlay",
                  timestamp: new Date().toISOString(),
                });
              }
            } catch (error) {
              originalConsole.error(
                "[LogBridge] Failed to capture Vite error:",
                error,
              );
            }
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: false });

    window.addEventListener("vite:error", (event: Event) => {
      try {
        const detail =
          (event as CustomEvent<Record<string, unknown>>).detail || {};
        sendToBackend(
          "error",
          `[Vite Event] ${String(detail.message || "Build Error")}`,
          {
            stack:
              typeof detail.stack === "string"
                ? detail.stack
                : String(
                    (detail.error as { stack?: string } | undefined)?.stack ||
                      "",
                  ),
            file:
              typeof detail.filename === "string" ? detail.filename : undefined,
            source: "vite-event",
          },
        );
      } catch {
        // ignore
      }
    });
  }

  console.log("Log Bridge initialized. Logs are now streaming to backend.");
  sendToBackend("info", "LogBridge Connection Test: Initialized successfully");
}
