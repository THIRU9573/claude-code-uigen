# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. It uses Claude AI to generate React components through a chat interface, displays them in a live preview with hot reload, and stores generated code in a virtual file system.

## Development Commands

### Setup and Running
```bash
npm run setup        # Install dependencies, generate Prisma client, run migrations
npm run dev          # Start development server with turbopack
npm run dev:daemon   # Start dev server in background (logs to logs.txt)
npm run build        # Build for production
npm run start        # Start production server
```

### Testing and Linting
```bash
npm test             # Run Vitest tests
npm run lint         # Run ESLint
```

### Database
```bash
npx prisma generate  # Generate Prisma client (outputs to src/generated/prisma)
npx prisma migrate dev  # Run migrations
npm run db:reset     # Reset database (WARNING: destructive)
```

## Architecture

### Core Concepts

**Virtual File System**: All generated code lives in memory (`VirtualFileSystem` class). No files are written to disk during component generation. The file system serializes to JSON and persists in the database (`Project.data` field) for authenticated users.

**AI Flow**: User sends message → API route (`/api/chat`) → streamText with AI SDK → AI uses tools (`str_replace_editor`, `file_manager`) to manipulate virtual file system → Preview frame renders with Babel standalone.

**Mock Provider**: When `ANTHROPIC_API_KEY` is not set, a `MockLanguageModel` provides static responses to demonstrate the UI without requiring API access.

### Key Directories

- **`src/app`**: Next.js App Router pages and API routes
  - `api/chat/route.ts`: Main AI endpoint using Vercel AI SDK
  - `[projectId]/page.tsx`: Dynamic project page

- **`src/actions`**: Next.js Server Actions for database operations (create-project, get-project, get-projects)

- **`src/components`**: React components organized by feature
  - `auth/`: Sign in/up forms and auth dialog
  - `chat/`: Chat interface, message list, markdown renderer
  - `editor/`: Code editor (Monaco) and file tree
  - `preview/`: Preview frame with sandboxed iframe
  - `ui/`: shadcn/ui components (button, dialog, tabs, etc.)

- **`src/lib`**: Core utilities and business logic
  - `file-system.ts`: VirtualFileSystem class - in-memory file tree with CRUD operations
  - `provider.ts`: Language model configuration (Anthropic or Mock)
  - `auth.ts`: JWT-based session management
  - `tools/`: AI tool definitions for file manipulation
  - `transform/`: JSX transformer for preview rendering
  - `contexts/`: React contexts (chat, file system)
  - `prompts/`: System prompts for AI generation

- **`prisma`**: Database schema (User, Project models) and migrations

### Virtual File System

The `VirtualFileSystem` class is the heart of code generation:
- Path-based file tree with directories and files
- Methods: `createFile`, `updateFile`, `deleteFile`, `rename`, `viewFile`, `replaceInFile`, `insertInFile`
- Serialization methods for database persistence
- Tool wrappers expose operations to AI (`str_replace_editor`, `file_manager`)

All generated components must have a root `/App.jsx` file. Imports use `@/` alias for local files (e.g., `@/components/Counter`).

### AI Tools

Two tools are exposed to Claude:
1. **`str_replace_editor`**: Text editor operations (view, create, str_replace, insert)
2. **`file_manager`**: File operations (rename, delete)

The AI receives a system prompt from `src/lib/prompts/generation.tsx` instructing it to create React components styled with Tailwind CSS.

### Preview System

Preview uses an iframe with a sandboxed React runtime:
- `PreviewFrame` component manages iframe communication
- Files from virtual FS are bundled on-the-fly
- Babel standalone transforms JSX in the browser
- Hot reload when file system changes

### Authentication

- JWT-based sessions stored in cookies (uses `jose` library)
- Anonymous users can create projects (stored with `userId: null`)
- Authenticated users own their projects
- Server Actions verify auth before database writes

### Database

Prisma with SQLite (`prisma/dev.db`):
- **User**: id, email, password (bcrypt), timestamps
- **Project**: id, name, userId (nullable), messages (JSON), data (JSON - serialized VFS), timestamps
- Generated Prisma client outputs to `src/generated/prisma` (non-standard location)

## Configuration Notes

### Node.js 25+ Compatibility
`node-compat.cjs` is required via NODE_OPTIONS to fix Web Storage SSR issues in Node 25+. It removes global localStorage/sessionStorage during SSR.

### Path Aliases
- `@/` maps to `src/` (configured in tsconfig.json)
- shadcn/ui components use `@/components/ui`, `@/lib/utils`, `@/hooks`

### Styling
- Tailwind CSS v4 with @tailwindcss/typography
- shadcn/ui with Radix UI primitives
- CSS variables for theming (see components.json)

## Code Style

**Comments**: Use sparingly. Only comment complex code that isn't self-explanatory. Prefer clear naming and simple logic over explanatory comments.

## Testing

Tests use Vitest with jsdom environment:
- Component tests in `__tests__` directories alongside source files
- Example: `src/components/chat/__tests__/ChatInterface.test.tsx`
- Run single test file: `npm test <filename>`

## Common Workflows

### Adding a New AI Tool
1. Create tool definition in `src/lib/tools/`
2. Build tool function that accepts VirtualFileSystem instance
3. Register tool in `src/app/api/chat/route.ts` tools object

### Modifying AI Behavior
Edit `src/lib/prompts/generation.tsx` to change system prompt. Use Anthropic prompt caching (ephemeral cache) to reduce costs.

### Adding UI Components
Use shadcn/ui CLI (configured via components.json):
```bash
npx shadcn@latest add <component-name>
```

### Debugging Preview Issues
1. Check browser console in preview iframe
2. Verify all imports use `@/` alias for local files
3. Check `src/lib/transform/jsx-transformer.ts` for transformation errors
