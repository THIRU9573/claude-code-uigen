import { Loader2 } from "lucide-react";
import { formatToolMessage } from "./formatToolMessage";
import type { ToolInvocation } from "./tool-invocation-types";

interface ToolInvocationBadgeProps {
  toolInvocation: ToolInvocation;
}

/**
 * Displays a badge showing the current status and user-friendly description
 * of an AI tool invocation (e.g., "Creating App.jsx")
 *
 * Shows a spinner for in-progress actions and a green dot for completed actions.
 */
export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const message = formatToolMessage(toolInvocation);
  const isComplete = toolInvocation.state === "result" && toolInvocation.result !== undefined;

  return (
    <div
      className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200"
      role="status"
      aria-label={isComplete ? `Completed: ${message}` : `In progress: ${message}`}
    >
      {isComplete ? (
        <>
          <div
            className="w-2 h-2 rounded-full bg-emerald-500"
            aria-hidden="true"
          />
          <span className="text-neutral-700 font-medium">{message}</span>
        </>
      ) : (
        <>
          <Loader2
            className="w-3 h-3 animate-spin text-blue-600"
            aria-hidden="true"
          />
          <span className="text-neutral-700 font-medium">{message}</span>
        </>
      )}
    </div>
  );
}
