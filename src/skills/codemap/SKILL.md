---
name: codemap
description: Generate comprehensive hierarchical codemaps for UNFAMILIAR repositories. Expensive operation - only use when explicitly asked for codebase documentation or initial repository mapping
---

# Codemap Skill

You help users create and maintain a complete repository atlas for new
contributors. The output is not a token-saving directory summary. It is a
human-readable architecture map that lets someone understand the project,
modules, entry points, workflows, configuration, state, dependencies, error
handling, and common change paths before reading source code.

## When to Use

- User asks to understand/map a repository
- User wants codebase documentation or onboarding documentation
- Starting work on an unfamiliar codebase
- User explicitly asks for a repository atlas, codemap, architecture map, or
  module map

## Quality Target

Every finished `codemap.md` must be useful to a new contributor. It must explain:

- what the project or module does,
- where execution enters,
- how the normal request/task/business flow moves through the code,
- how internal directories/files collaborate,
- what each major module owns,
- how state, configuration, data models, and errors are handled,
- where to look when modifying common features.

Prioritize completeness over brevity. Do not constrain sections to a short line
count when more explanation is needed.

## Workflow

### Step 1: Check for Existing State

**First, check if `.slim/codemap.json` exists in the repo root.**

If it does not exist, check for legacy state at `.slim/cartography.json`.

If legacy state exists: move `.slim/cartography.json` to `.slim/codemap.json`,
then continue with change detection.

If `.slim/codemap.json` exists: Skip to Step 3 (Detect Changes) - no need to
re-initialize.

If neither file exists: Continue to Step 2 (Initialize).

### Step 2: Initialize (Only if no state exists)

1. **Analyze the repository structure** - list files and understand the main
   directories, runtime surfaces, and documentation sources.
2. **Infer patterns** for files that should inform the atlas:
   - **Include first**: core source code, runtime configuration, package
     manifests, build scripts, CLI entry points, schema files, generated-schema
     sources, and other files that define how the project works.
   - **Documentation is allowed**: read `README.md`, important `docs/*.md`,
     architecture notes, configuration examples, and script docs when they
     explain features, commands, or usage.
   - **Scripts are allowed**: read maintenance/build/release scripts when they
     are part of the contributor workflow or runtime lifecycle.
   - **Tests are excluded by default**, but representative tests may be read
     when source files do not make behavior, edge cases, or expected failures
     clear enough.
   - **Exclude by default**: dependency/build artifacts and generated/minified
     output such as `node_modules/**`, `dist/**`, `build/**`, coverage output,
     and `*.min.js`.
   - Respect `.gitignore` automatically.
3. **Run codemap.mjs init** with project-specific include/exclude patterns:

```bash
node ~/.agents/skills/codemap/scripts/codemap.mjs init \
  --root ./ \
  --include "src/**/*.ts" \
  --include "package.json" \
  --include "README.md" \
  --include "docs/**/*.md" \
  --exclude "**/*.test.ts" \
  --exclude "dist/**" \
  --exclude "node_modules/**"
```

This creates:

- `.slim/codemap.json` - file and folder hashes for change detection
- starter `codemap.md` files in relevant directories without overwriting
  existing hand-written codemaps

4. **Delegate folder codemap writing to Fixer agents when useful** - spawn one
   fixer per independent folder. Each fixer must read enough code/docs/scripts
   to replace the starter skeleton with a complete Module Codemap.

### Step 3: Detect Changes (If state already exists)

1. **Run codemap.mjs changes** to see what changed:

```bash
node ~/.agents/skills/codemap/scripts/codemap.mjs changes \
  --root ./
```

2. **Review the output** - it shows added, removed, modified, and affected
   folders.
3. **Only update affected codemaps** - update the root atlas plus affected
   folders whose files, dependencies, flows, or responsibilities changed.
4. **Run update** to save new state:

```bash
node ~/.agents/skills/codemap/scripts/codemap.mjs update \
  --root ./
```

### Step 4: Write Folder / Module Codemaps

For every non-root directory with selected files, write a complete Module
Codemap. It must contain these sections:

- **模块职责** — the module's responsibility in the larger system.
- **解决的问题** — why this module exists and what user/developer/system problem
  it solves.
- **关键文件与实体** — important files, public types, data structures, classes,
  functions, schemas, scripts, and runtime concepts described in natural
  language.
- **对外入口** — public APIs, CLI commands, exported functions, hooks, event
  handlers, routes, scripts, or files other modules call.
- **当前目录下各个子目录或文件的模块关系图** — Mermaid diagram of internal
  directory/file calls, dependencies, and collaboration.
- **正常业务流程图** — Mermaid sequence or flowchart for the successful path.
- **内部控制流/数据流** — step-by-step explanation of how data/control moves
  through this module.
- **依赖关系** — inbound dependencies, outbound dependencies, external services,
  libraries, and cross-module coupling.
- **配置与状态** — relevant config, state stores, caches, persistence, env vars,
  defaults, and lifecycle rules.
- **错误处理** — known failure modes, propagation, retries, fallbacks, recovery,
  validation, and user/developer-visible errors.
- **设计决策** — important design choices, rationale, constraints, rejected
  alternatives, and trade-offs.
- **修改指南** — where to edit for common tasks, what tests/checks to run, and
  risks to watch for.

### Step 5: Finalize Root Repository Atlas

Once important directories are mapped, create or update the root `codemap.md` as
the first document a new contributor reads. It must not be only an aggregation
table. It must include explanatory narrative, flow descriptions, diagrams, and
links to deeper maps.

The root Repository Atlas must contain these sections:

- **项目定位** — what the repository is, who uses it, and its boundaries.
- **功能能力清单** — major user-facing and developer-facing capabilities.
- **新贡献者快速导览** — a concise guided tour for first-time readers.
- **系统入口** — package scripts, CLI commands, plugin entry points, runtime
  hooks, public APIs, and important root files.
- **当前目录下各个子目录或文件的模块关系图** — Mermaid diagram showing how
  root-level directories/files collaborate.
- **正常业务流程图** — Mermaid sequence or flowchart of the ordinary successful
  project/runtime flow.
- **端到端流程** — deeper prose walkthrough from startup/input to output/effects.
- **架构分层** — layers, ownership boundaries, and how they communicate.
- **模块地图** — each major directory/module with responsibility, entry points,
  dependencies, and links to child codemaps.
- **配置/状态/数据模型** — runtime config, persisted state, schemas, caches,
  domain entities, and lifecycle state.
- **外部依赖** — libraries, services, CLIs, MCPs, tools, platforms, and why they
  matter.
- **错误处理与恢复** — validation, fallback, retry, cleanup, user recovery, and
  operational failure paths.
- **常见开发任务导航** — “to change X, start with these files” guidance.
- **术语表** — project-specific terms and abbreviations.
- **推荐阅读顺序** — ordered reading paths for new contributors and common tasks.

### Step 6: Register Codemap in AGENTS.md

**OpenCode auto-loads `AGENTS.md` into agent context on every session.** To ensure
agents automatically discover and use the codemap, update (or create)
`AGENTS.md` at the repo root:

1. If `AGENTS.md` already exists and already contains a `## Repository Map`
   section, **skip this step** — the reference is already set up.
2. If `AGENTS.md` exists but has no `## Repository Map` section, **append** the
   section below.
3. If `AGENTS.md` doesn't exist, **create** it with the section below.

```markdown
## Repository Map

A full codemap is available at `codemap.md` in the project root.

Before working on any task, read `codemap.md` to understand:
- Project architecture and entry points
- Directory responsibilities and design patterns
- Data flow and integration points between modules
- Key data types and entities
- Error handling and recovery strategies

For deep work on a specific folder, also read that folder's `codemap.md`.
```

This is idempotent — repeated codemap runs will detect the existing section and
skip. No duplication.

## Diagram Requirements

Every finished `codemap.md` must contain two Mermaid diagrams:

1. **当前目录下各个子目录或文件的模块关系图**
   - Prefer `flowchart LR` or `graph LR`.
   - Show this directory's subdirectories and key files as nodes.
   - Draw edges for calls, imports, configuration flow, data flow, orchestration,
     ownership, or collaboration.
   - If the directory is small, still draw the relationships that exist.
2. **正常业务流程图**
   - Prefer `sequenceDiagram` for actor-to-component interactions or
     `flowchart TD` for pipeline/control flow.
   - Show the successful normal path, not only failures or alternatives.

Each diagram must be followed by prose explaining what nodes and arrows mean.

## Prohibited Low-Quality Output

Do not finish a codemap that:

- only lists directories or files,
- only gives one-sentence responsibilities,
- leaves starter skeleton text, template notes, placeholders, or TODOs,
- omits either required diagram,
- uses a root atlas as only an aggregation table,
- fails to explain how normal work flows through the project/module,
- fails to tell contributors where to edit common features.

## Final Quality Checklist

Before considering the codemap complete, verify that a new contributor can
answer:

- What does this project/module do?
- Where does it start or how is it invoked?
- How does one normal request/task flow through it?
- Can the relationship diagram reveal how files/directories in this directory
  collaborate?
- Which files should be read or edited for common feature changes?
- Does every major module explain responsibility, entry points, dependencies,
  and risks?
