import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";
import type { ToolInvocation } from "../tool-invocation-types";

afterEach(() => {
  cleanup();
});

// Test: Rendering formatted messages
test("renders formatted message for str_replace_editor create command", () => {
  const invocation: ToolInvocation = {
    toolName: "str_replace_editor",
    state: "call",
    args: {
      command: "create",
      path: "App.jsx",
    },
  };

  render(<ToolInvocationBadge toolInvocation={invocation} />);

  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("renders formatted message for str_replace_editor str_replace command", () => {
  const invocation: ToolInvocation = {
    toolName: "str_replace_editor",
    state: "call",
    args: {
      command: "str_replace",
      path: "components/Button.tsx",
    },
  };

  render(<ToolInvocationBadge toolInvocation={invocation} />);

  expect(screen.getByText("Editing components/Button.tsx")).toBeDefined();
});

test("renders formatted message for file_manager rename command", () => {
  const invocation: ToolInvocation = {
    toolName: "file_manager",
    state: "call",
    args: {
      command: "rename",
      path: "old.js",
      new_path: "new.js",
    },
  };

  render(<ToolInvocationBadge toolInvocation={invocation} />);

  expect(screen.getByText("Renaming old.js to new.js")).toBeDefined();
});

test("renders formatted message for file_manager delete command", () => {
  const invocation: ToolInvocation = {
    toolName: "file_manager",
    state: "call",
    args: {
      command: "delete",
      path: "temp.txt",
    },
  };

  render(<ToolInvocationBadge toolInvocation={invocation} />);

  expect(screen.getByText("Deleting temp.txt")).toBeDefined();
});

// Test: State indicators
test("shows spinner for in-progress action (state: call)", () => {
  const invocation: ToolInvocation = {
    toolName: "str_replace_editor",
    state: "call",
    args: {
      command: "create",
      path: "test.js",
    },
  };

  const { container } = render(<ToolInvocationBadge toolInvocation={invocation} />);

  const badge = screen.getByRole("status");
  expect(badge).toBeDefined();
  expect(badge.getAttribute("aria-label")).toBe("In progress: Creating test.js");

  // Check for spinner
  const spinner = container.querySelector(".animate-spin");
  expect(spinner).toBeDefined();
});

test("shows spinner for partial-call state", () => {
  const invocation: ToolInvocation = {
    toolName: "file_manager",
    state: "partial-call",
    args: {
      command: "delete",
      path: "temp.txt",
    },
  };

  const { container } = render(<ToolInvocationBadge toolInvocation={invocation} />);

  const badge = screen.getByRole("status");
  expect(badge.getAttribute("aria-label")).toBe("In progress: Deleting temp.txt");

  const spinner = container.querySelector(".animate-spin");
  expect(spinner).toBeDefined();
});

test("shows green dot for completed action (state: result)", () => {
  const invocation: ToolInvocation = {
    toolName: "str_replace_editor",
    state: "result",
    args: {
      command: "create",
      path: "App.jsx",
    },
    result: { success: true },
  };

  const { container } = render(<ToolInvocationBadge toolInvocation={invocation} />);

  const badge = screen.getByRole("status");
  expect(badge.getAttribute("aria-label")).toBe("Completed: Creating App.jsx");

  // Check for green dot
  const dot = container.querySelector(".bg-emerald-500");
  expect(dot).toBeDefined();

  // Spinner should not be present
  const spinner = container.querySelector(".animate-spin");
  expect(spinner).toBeNull();
});

test("shows spinner when result is undefined even if state is result", () => {
  const invocation: ToolInvocation = {
    toolName: "str_replace_editor",
    state: "result",
    args: {
      command: "create",
      path: "App.jsx",
    },
    result: undefined,
  };

  const { container } = render(<ToolInvocationBadge toolInvocation={invocation} />);

  const badge = screen.getByRole("status");
  expect(badge.getAttribute("aria-label")).toBe("In progress: Creating App.jsx");

  const spinner = container.querySelector(".animate-spin");
  expect(spinner).toBeDefined();
});

// Test: Different tool operations
test("renders view operation", () => {
  const invocation: ToolInvocation = {
    toolName: "str_replace_editor",
    state: "result",
    args: {
      command: "view",
      path: "README.md",
    },
    result: "file contents",
  };

  render(<ToolInvocationBadge toolInvocation={invocation} />);

  expect(screen.getByText("Reading README.md")).toBeDefined();
});

test("renders insert operation", () => {
  const invocation: ToolInvocation = {
    toolName: "str_replace_editor",
    state: "call",
    args: {
      command: "insert",
      path: "utils/helper.js",
    },
  };

  render(<ToolInvocationBadge toolInvocation={invocation} />);

  expect(screen.getByText("Editing utils/helper.js")).toBeDefined();
});

// Test: Edge cases
test("handles missing args gracefully", () => {
  const invocation: ToolInvocation = {
    toolName: "str_replace_editor",
    state: "call",
  };

  render(<ToolInvocationBadge toolInvocation={invocation} />);

  expect(screen.getByText("Str Replace Editor")).toBeDefined();
});

test("handles unknown tool names", () => {
  const invocation: ToolInvocation = {
    toolName: "unknown_tool",
    state: "call",
    args: {},
  };

  render(<ToolInvocationBadge toolInvocation={invocation} />);

  expect(screen.getByText("Unknown Tool")).toBeDefined();
});

test("handles long file paths", () => {
  const invocation: ToolInvocation = {
    toolName: "str_replace_editor",
    state: "call",
    args: {
      command: "create",
      path: "src/components/features/authentication/forms/LoginForm.tsx",
    },
  };

  render(<ToolInvocationBadge toolInvocation={invocation} />);

  expect(
    screen.getByText("Creating src/components/features/authentication/forms/LoginForm.tsx")
  ).toBeDefined();
});

test("handles empty path with fallback", () => {
  const invocation: ToolInvocation = {
    toolName: "str_replace_editor",
    state: "call",
    args: {
      command: "create",
      path: "",
    },
  };

  render(<ToolInvocationBadge toolInvocation={invocation} />);

  expect(screen.getByText("Creating file")).toBeDefined();
});

// Test: Accessibility
test("has proper role attribute", () => {
  const invocation: ToolInvocation = {
    toolName: "str_replace_editor",
    state: "call",
    args: {
      command: "create",
      path: "test.js",
    },
  };

  render(<ToolInvocationBadge toolInvocation={invocation} />);

  expect(screen.getByRole("status")).toBeDefined();
});

test("has descriptive aria-label for in-progress state", () => {
  const invocation: ToolInvocation = {
    toolName: "str_replace_editor",
    state: "call",
    args: {
      command: "create",
      path: "App.jsx",
    },
  };

  render(<ToolInvocationBadge toolInvocation={invocation} />);

  const badge = screen.getByRole("status");
  expect(badge.getAttribute("aria-label")).toBe("In progress: Creating App.jsx");
});

test("has descriptive aria-label for completed state", () => {
  const invocation: ToolInvocation = {
    toolName: "str_replace_editor",
    state: "result",
    args: {
      command: "create",
      path: "test.js",
    },
    result: {},
  };

  render(<ToolInvocationBadge toolInvocation={invocation} />);

  const badge = screen.getByRole("status");
  expect(badge.getAttribute("aria-label")).toBe("Completed: Creating test.js");
});

test("hides decorative icons from screen readers", () => {
  const invocation: ToolInvocation = {
    toolName: "str_replace_editor",
    state: "result",
    args: {
      command: "create",
      path: "test.js",
    },
    result: {},
  };

  const { container } = render(<ToolInvocationBadge toolInvocation={invocation} />);

  const icons = container.querySelectorAll('[aria-hidden="true"]');
  expect(icons.length).toBeGreaterThan(0);
});

// Test: CSS classes
test("applies correct styling classes", () => {
  const invocation: ToolInvocation = {
    toolName: "str_replace_editor",
    state: "call",
    args: {
      command: "create",
      path: "test.js",
    },
  };

  render(<ToolInvocationBadge toolInvocation={invocation} />);

  const badge = screen.getByRole("status");
  expect(badge.className).toContain("inline-flex");
  expect(badge.className).toContain("items-center");
  expect(badge.className).toContain("gap-2");
  expect(badge.className).toContain("rounded-lg");
});
