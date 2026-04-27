# src/skills/cppcodemap/

## Responsibility

- Provide a C/C++/Python/CMake-focused repository mapping skill that is independent from the generic `codemap` skill.
- Define an Orchestrator workflow for mixed native-code repositories, including build targets, package metadata, bindings, and cross-language flow.
- Generate and maintain `.slim/cppcodemap.json` state plus `codemap.md` templates for affected directories.

## Design

- Contract layer: `SKILL.md` describes when to use the skill and how to write C/C++/Python/CMake-aware codemaps.
- Execution layer: `scripts/cppcodemap.mjs` implements deterministic scanning, pattern matching, hash state, change detection, and template creation.
- Default profile: source and build metadata patterns cover common C/C++ extensions, CMake, Meson, Make, Conan, vcpkg, and Python packaging files while excluding build outputs, caches, tests, docs, translations, and binary artifacts.
- Persistence model: `.slim/cppcodemap.json` stores `metadata`, `file_hashes`, and `folder_hashes` under a profile name of `cpp-python-cmake`.
- Testing layer: `scripts/cppcodemap.test.ts` validates matching, default file selection, hash stability, and initialization outputs.

## Flow

- `main(argv)` parses `init|changes|update`, `--root`, and optional pattern flags, then dispatches to command handlers.
- `cmdInit()` applies the C++ profile defaults, selects files with `.gitignore` filtering, writes state, and creates `codemap.md` templates for folders that contain selected files.
- `cmdChanges()` reloads `.slim/cppcodemap.json`, recomputes hashes, and emits added, removed, modified, and affected-folder lists.
- `cmdUpdate()` rebuilds state from the saved metadata after humans or agents finish updating affected codemaps.

## Integration

- Installed through `src/cli/custom-skills.ts` as `name: 'cppcodemap'`, `sourcePath: 'src/skills/cppcodemap'`.
- Permission defaults are derived through `src/cli/skills.ts` from `CUSTOM_SKILLS`; the orchestrator is the default owner.
- Release completeness is checked by `scripts/verify-release-artifact.ts`, which requires `src/skills/cppcodemap/SKILL.md` in packed artifacts.
