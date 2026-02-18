import type { ToolInvocation, StrReplaceEditorArgs, FileManagerArgs } from "./tool-invocation-types";

/**
 * Formats a tool invocation into a user-friendly message
 *
 * @param toolInvocation - The tool invocation data from the AI SDK
 * @returns A human-readable message describing the tool action
 *
 * @example
 * formatToolMessage({ toolName: "str_replace_editor", args: { command: "create", path: "App.jsx" } })
 * // Returns: "Creating App.jsx"
 */
export function formatToolMessage(toolInvocation: ToolInvocation): string {
  const { toolName, args } = toolInvocation;

  // If no args, return the tool name as fallback
  if (!args) {
    return formatFallbackMessage(toolName);
  }

  // Handle str_replace_editor tool
  if (toolName === "str_replace_editor") {
    return formatStrReplaceMessage(args as StrReplaceEditorArgs);
  }

  // Handle file_manager tool
  if (toolName === "file_manager") {
    return formatFileManagerMessage(args as FileManagerArgs);
  }

  // Unknown tool - return formatted tool name
  return formatFallbackMessage(toolName);
}

function formatStrReplaceMessage(args: StrReplaceEditorArgs): string {
  const { command, path } = args;

  // Fallback if path is missing
  const filePath = path || "file";

  switch (command) {
    case "create":
      return `Creating ${filePath}`;

    case "str_replace":
      return `Editing ${filePath}`;

    case "insert":
      return `Editing ${filePath}`;

    case "view":
      return `Reading ${filePath}`;

    case "undo_edit":
      return `Undoing changes to ${filePath}`;

    default:
      return `Editing ${filePath}`;
  }
}

function formatFileManagerMessage(args: FileManagerArgs): string {
  const { command, path, new_path } = args;

  // Fallback if path is missing
  const filePath = path || "file";

  switch (command) {
    case "rename":
      if (new_path) {
        return `Renaming ${filePath} to ${new_path}`;
      }
      return `Renaming ${filePath}`;

    case "delete":
      return `Deleting ${filePath}`;

    default:
      return `Managing ${filePath}`;
  }
}

function formatFallbackMessage(toolName: string): string {
  // Convert snake_case to Title Case
  return toolName
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
