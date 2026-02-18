/**
 * Type definitions for tool invocations
 */

export interface StrReplaceEditorArgs {
  command: "view" | "create" | "str_replace" | "insert" | "undo_edit";
  path: string;
  file_text?: string;
  insert_line?: number;
  new_str?: string;
  old_str?: string;
  view_range?: [number, number];
}

export interface FileManagerArgs {
  command: "rename" | "delete";
  path: string;
  new_path?: string;
}

export type ToolArgs = StrReplaceEditorArgs | FileManagerArgs | Record<string, unknown>;

export interface ToolInvocation {
  toolName: string;
  state: "partial-call" | "call" | "result";
  args?: ToolArgs;
  result?: unknown;
}
