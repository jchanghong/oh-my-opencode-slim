# Codemap Skill

Codemap is a **custom skill** bundled with this repo.

It helps agents create a new-contributor-readable architecture map for an
unfamiliar repository. The goal is not a concise file index. The goal is a
hierarchical set of `codemap.md` files that explain what the project does, where
it starts, how normal work flows through it, how modules collaborate, and where
contributors should edit common features.

## What it does

Codemap is designed for repository understanding and hierarchical codemap
generation:

1. Selects relevant code, configuration, documentation, and script files using
   LLM judgment.
2. Creates `.slim/codemap.json` for change tracking.
3. Generates starter `codemap.md` skeletons for root and module maps without
   overwriting existing codemaps.
4. Migrates legacy `.slim/cartography.json` state to `.slim/codemap.json`.
5. Guides agents to fill those skeletons with complete architecture narrative,
   diagrams, flow explanations, and change navigation.

The script handles state tracking and template generation. The skill workflow and
the agent's reading/synthesis are responsible for documentation quality.

## How to use

Codemap is installed automatically by the `oh-my-opencode-slim` installer when
custom skills are enabled.

### Run it (manual / local)

From a repo root (or with an explicit `--root`):

```bash
# Initialize mapping
node codemap.mjs init --root /repo --include "src/**/*.ts" --exclude "node_modules/**"

# Check what changed
node codemap.mjs changes --root /repo

# Update hashes
node codemap.mjs update --root /repo
```

## Outputs

### `.slim/codemap.json`

A change-tracking file with hashes for selected files and affected folders.

### Root Repository Atlas

The root `codemap.md` should be the first document a new contributor reads. It
is expected to explain:

- project positioning and boundaries,
- feature/capability inventory,
- quick tour for new contributors,
- system entry points,
- root-level module/file relationship diagram,
- normal business/runtime flow diagram,
- end-to-end flow,
- architecture layers,
- module map with links to child codemaps,
- configuration, state, and data models,
- external dependencies,
- error handling and recovery,
- common development task navigation,
- glossary,
- recommended reading order.

### Folder / Module Codemap

Each subdirectory `codemap.md` should explain:

- module responsibility,
- problem solved,
- key files and entities,
- external entry points,
- internal child-directory/file relationship diagram,
- normal business flow diagram,
- internal control/data flow,
- dependencies,
- configuration and state,
- error handling,
- design decisions,
- modification guidance.

## Required Mermaid diagrams

Every finished `codemap.md` must contain both diagrams below:

1. **当前目录下各个子目录或文件的模块关系图**
   - Prefer `flowchart LR` or `graph LR`.
   - Show current-directory child directories and key files as nodes.
   - Use arrows for calls, imports, data flow, configuration flow, ownership, or
     collaboration.
2. **正常业务流程图**
   - Prefer `sequenceDiagram` or `flowchart TD`.
   - Show the successful normal path for a request, task, startup, build,
     command, or module operation.

Each diagram must be followed by text explaining the nodes and arrows. A
codemap is not complete if it only lists files, contains short summaries, leaves
starter skeleton text, or omits either diagram.

## Screenshot

The existing screenshot lives in `img/cartography.png`.

![Codemap screenshot](../img/cartography.png)

## Related

- `src/skills/codemap/README.md` and `src/skills/codemap/SKILL.md` contain the
  skill's internal docs.
- `codemap.md` at the repo root is an example output/starting point.
