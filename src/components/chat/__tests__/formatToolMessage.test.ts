import { describe, it, expect } from "vitest";
import { formatToolMessage } from "../formatToolMessage";
import type { ToolInvocation } from "../tool-invocation-types";

describe("formatToolMessage", () => {
  describe("str_replace_editor tool", () => {
    it("formats create command", () => {
      const invocation: ToolInvocation = {
        toolName: "str_replace_editor",
        state: "call",
        args: {
          command: "create",
          path: "App.jsx",
        },
      };

      expect(formatToolMessage(invocation)).toBe("Creating App.jsx");
    });

    it("formats str_replace command", () => {
      const invocation: ToolInvocation = {
        toolName: "str_replace_editor",
        state: "call",
        args: {
          command: "str_replace",
          path: "components/Button.tsx",
          old_str: "old text",
          new_str: "new text",
        },
      };

      expect(formatToolMessage(invocation)).toBe("Editing components/Button.tsx");
    });

    it("formats insert command", () => {
      const invocation: ToolInvocation = {
        toolName: "str_replace_editor",
        state: "call",
        args: {
          command: "insert",
          path: "utils/helper.js",
          insert_line: 10,
          new_str: "console.log('test');",
        },
      };

      expect(formatToolMessage(invocation)).toBe("Editing utils/helper.js");
    });

    it("formats view command", () => {
      const invocation: ToolInvocation = {
        toolName: "str_replace_editor",
        state: "call",
        args: {
          command: "view",
          path: "README.md",
        },
      };

      expect(formatToolMessage(invocation)).toBe("Reading README.md");
    });

    it("formats undo_edit command", () => {
      const invocation: ToolInvocation = {
        toolName: "str_replace_editor",
        state: "call",
        args: {
          command: "undo_edit",
          path: "index.html",
        },
      };

      expect(formatToolMessage(invocation)).toBe("Undoing changes to index.html");
    });

    it("handles missing path with fallback", () => {
      const invocation: ToolInvocation = {
        toolName: "str_replace_editor",
        state: "call",
        args: {
          command: "create",
          path: "",
        },
      };

      expect(formatToolMessage(invocation)).toBe("Creating file");
    });

    it("handles paths with special characters", () => {
      const invocation: ToolInvocation = {
        toolName: "str_replace_editor",
        state: "call",
        args: {
          command: "create",
          path: "src/components/User Profile.tsx",
        },
      };

      expect(formatToolMessage(invocation)).toBe("Creating src/components/User Profile.tsx");
    });
  });

  describe("file_manager tool", () => {
    it("formats rename command", () => {
      const invocation: ToolInvocation = {
        toolName: "file_manager",
        state: "call",
        args: {
          command: "rename",
          path: "old-name.js",
          new_path: "new-name.js",
        },
      };

      expect(formatToolMessage(invocation)).toBe("Renaming old-name.js to new-name.js");
    });

    it("formats rename without new_path", () => {
      const invocation: ToolInvocation = {
        toolName: "file_manager",
        state: "call",
        args: {
          command: "rename",
          path: "old-name.js",
        },
      };

      expect(formatToolMessage(invocation)).toBe("Renaming old-name.js");
    });

    it("formats delete command", () => {
      const invocation: ToolInvocation = {
        toolName: "file_manager",
        state: "call",
        args: {
          command: "delete",
          path: "temp.txt",
        },
      };

      expect(formatToolMessage(invocation)).toBe("Deleting temp.txt");
    });

    it("handles missing path with fallback", () => {
      const invocation: ToolInvocation = {
        toolName: "file_manager",
        state: "call",
        args: {
          command: "delete",
          path: "",
        },
      };

      expect(formatToolMessage(invocation)).toBe("Deleting file");
    });
  });

  describe("edge cases", () => {
    it("handles missing args", () => {
      const invocation: ToolInvocation = {
        toolName: "str_replace_editor",
        state: "call",
      };

      expect(formatToolMessage(invocation)).toBe("Str Replace Editor");
    });

    it("handles unknown tool name", () => {
      const invocation: ToolInvocation = {
        toolName: "unknown_tool",
        state: "call",
        args: {},
      };

      expect(formatToolMessage(invocation)).toBe("Unknown Tool");
    });

    it("converts snake_case tool names to Title Case", () => {
      const invocation: ToolInvocation = {
        toolName: "some_custom_tool_name",
        state: "call",
      };

      expect(formatToolMessage(invocation)).toBe("Some Custom Tool Name");
    });

    it("handles undefined args property", () => {
      const invocation: ToolInvocation = {
        toolName: "file_manager",
        state: "call",
        args: undefined,
      };

      expect(formatToolMessage(invocation)).toBe("File Manager");
    });
  });

  describe("different states", () => {
    it("formats messages regardless of state", () => {
      const states: Array<"partial-call" | "call" | "result"> = ["partial-call", "call", "result"];

      states.forEach((state) => {
        const invocation: ToolInvocation = {
          toolName: "str_replace_editor",
          state,
          args: {
            command: "create",
            path: "test.js",
          },
        };

        expect(formatToolMessage(invocation)).toBe("Creating test.js");
      });
    });
  });
});
