# Codemap Skill

Repository understanding and hierarchical codemap generation for new
contributors.

## Overview

Codemap helps orchestrators build a complete repository atlas that explains a
project without requiring readers to inspect source first. A finished codemap
should describe capabilities, entry points, architecture, normal flows, module
responsibilities, configuration/state, dependencies, error handling, and common
change paths.

The script in this directory is intentionally narrow in scope:

1. It selects files from include/exclude patterns.
2. It creates `.slim/codemap.json` for change tracking.
3. It creates starter `codemap.md` skeletons without overwriting existing files.
4. It reports changed files/folders for targeted updates.

The script does **not** guarantee documentation quality. Content quality comes
from the codemap skill workflow and the agent reading, synthesizing, and filling
the generated skeletons with project-specific explanations.

Legacy `.slim/cartography.json` state is migrated to `.slim/codemap.json`
automatically.

## Commands

```bash
# Initialize mapping
node codemap.mjs init --root /repo --include "src/**/*.ts" --exclude "node_modules/**"

# Check what changed
node codemap.mjs changes --root /repo

# Update hashes
node codemap.mjs update --root /repo
```

## Outputs

### .slim/codemap.json

```json
{
  "metadata": {
    "version": "1.0.0",
    "last_run": "2026-01-25T19:00:00Z",
    "include_patterns": ["src/**/*.ts"],
    "exclude_patterns": ["node_modules/**"]
  },
  "file_hashes": {
    "src/index.ts": "abc123..."
  },
  "folder_hashes": {
    "src": "def456..."
  }
}
```

### codemap.md (per folder)

`init` creates two kinds of starter documents:

- **Root Repository Atlas** at the repository root. It should become the first
  document a new contributor reads, covering project positioning, capabilities,
  entry points, end-to-end flow, architecture layers, module map,
  configuration/state/data models, dependencies, recovery, task navigation,
  glossary, and recommended reading order.
- **Folder / Module Codemap** in each selected subdirectory. It should explain
  module responsibility, the problem solved, key files/entities, external entry
  points, internal control/data flow, dependencies, configuration/state, error
  handling, design decisions, and modification guidance.

Every finished `codemap.md` must contain two Mermaid diagrams:

1. **当前目录下各个子目录或文件的模块关系图** — usually `flowchart LR` or
   `graph LR`, showing how this directory's child directories and key files
   call, depend on, configure, or collaborate with each other.
2. **正常业务流程图** — usually `sequenceDiagram` or `flowchart TD`, showing the
   successful normal path for the project/module.

Each diagram must be followed by prose explaining node and arrow meanings. A
finished codemap must not be only a directory list, one-sentence summary, empty
skeleton, or aggregation table.

## Installation

Installed automatically via oh-my-opencode-slim installer when custom skills are
enabled.
