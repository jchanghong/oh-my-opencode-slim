# src/skills/codemap/

## Responsibility

Provide a command-style skill package that standardizes repository mapping workflows for unfamiliar codebases. Defines the task contract used by Orchestrator/fixer agents via `SKILL.md` and operational guidance via `README.md`. Generates and evolves change-aware codemap state artifacts (`.slim/codemap.json`) and scaffolds new-contributor-oriented root Repository Atlas and per-folder Module Codemap templates. The writing workflow is bottom-up: leaf codemaps are written from full direct-file reads, parent codemaps are written from full direct-file reads plus direct child codemaps, and the root atlas is finalized last from root direct files plus top-level codemaps.

## Key Types / Entities

- **CodemapState** — JSON object with `metadata` (version, patterns, timestamp), `file_hashes` (path→MD5), `folder_hashes` (folder→aggregate hash)
- **PatternMatcher** — glob-like matcher compiled from include/exclude pattern lists
- **Command** — one of `init|changes|update`, dispatched by `main()` via strict branches

## Entry Points

- `main(argv)` — CLI entry, parses args and dispatches to `cmdInit`/`cmdChanges`/`cmdUpdate`
- Exported functions: `createEmptyCodemap`, `selectFiles`, `computeFileHash`, `computeFolderHash`, `loadState`, `saveState`, `migrateLegacyState`

## Design / Patterns

- **Contract + Execution separation**: `SKILL.md` (prompt contract) + `README.md` (human docs) vs `scripts/codemap.mjs` (deterministic logic)
- **Stateful change detection**: JSON state at `.slim/codemap.json` tracks file/folder hashes; subsequent runs diff against saved state to identify affected folders
- **Template generation**: `createEmptyCodemap()` writes a root Repository Atlas template for `.` and Module Codemap templates for subfolders. Both template types require an internal module relationship Mermaid diagram and a normal business flow Mermaid diagram.
- **Bottom-up synthesis**: one `codemap.md` has one writer. Parents do not recursively reread every descendant source file; child codemaps are the authoritative input for child internals and collaboration summaries.
- **No-network principle**: The script intentionally avoids network and mutates only filesystem-local state and codemap templates
- **Testing layer**: `scripts/codemap.test.ts` validates pattern matching, hash determinism, and migration behavior

## Flow

- `main(argv)` parses command → dispatches to `cmdInit`/`cmdChanges`/`cmdUpdate`
- `cmdInit()` → `selectFiles()` with include/exclude/gitignore → `buildState()` → `saveState()` + `createEmptyCodemap()` per folder
- Content writing → deepest leaf directories read all selected direct files → parent directories read all selected direct files plus direct child `codemap.md` files → root atlas reads selected root direct files plus top-level `codemap.md` files
- `cmdChanges()` → `loadState()` + `migrateLegacyState()` → recompute current hashes → diff against saved → emit added/removed/modified + affected folders
- `cmdUpdate()` → recompute full state from existing metadata → `saveState()`

## Dependencies

- **Depends on:** Node.js built-ins (`crypto`, `fs`, `path`, `url`); no external packages
- **Consumed by:** OpenCode plugin via `src/cli/custom-skills.ts` (installed as skill `codemap`); executed from user skill directory

## Configuration

- Include/exclude patterns passed via CLI `--include`/`--exclude`/`--exception` flags
- `.gitignore` auto-respected at repo root
- State stored at `.slim/codemap.json`

## Error Handling

- Missing state on `changes`/`update` → exits with code 1 and message "No codemap state found. Run 'init' first."
- Invalid state JSON → returns `null` (treated as absent)
- Missing directory on `init` → exits with code 1
- Hash computation failure → returns empty string for individual file, silently

## Key Decisions

- **Problem:** How to detect which codemaps need updating after file changes?
  - **Solution:** MD5-based file/folder hash tracking in JSON state; subsequent runs diff against saved state
  - **Rejected:** Git-based diff (requires git history, breaks on shallow clones)
- **Problem:** What template format should codemaps use?
  - **Solution:** Two explicit templates: a comprehensive root Repository Atlas for project-level onboarding and a Folder / Module Codemap for module-level understanding, both with mandatory Mermaid diagrams and prose explanations.
  - **Rejected:** Free-form single-section (too vague), language-specific templates (not portable), and short 9-section summaries (not enough for new contributors)
- **Problem:** How should large directories be documented without splitting one `codemap.md` across multiple writers or losing completeness?
  - **Solution:** Use a bottom-up workflow. Leaf writers read every selected direct file. Parent writers read every selected direct file in the parent plus every selected direct child `codemap.md`. Root is written last from selected root direct files plus top-level codemaps.
  - **Rejected:** One agent recursively reading an entire large subtree (too much context pressure and duplicate work), splitting one directory's final document across multiple writers (conflicting edits and style drift), and parent summaries based only on filenames or sampled files (unreliable documentation).
