---
name: cppcodemap
description: Generate and maintain hierarchical codemaps for C, C++, Python, and CMake mixed repositories. Use when explicitly asked to map native-code architecture, CMake targets, bindings, tooling, or cross-language module flow.
---

# Cppcodemap Skill

You help users understand mixed C/C++/Python/CMake repositories by creating
hierarchical codemaps focused on source layout, build targets, bindings, and
cross-language integration.

## When to Use

- User asks to map or document a C, C++, Python, or CMake repository
- User needs architecture context for native modules, CMake targets, bindings,
  generated code, or packaging layers
- Starting work on an unfamiliar mixed-language codebase

## Workflow

### Step 1: Check Existing State

First check whether `.slim/cppcodemap.json` exists in the repository root.

If it exists, skip initialization and continue to Step 3.

If it does not exist, continue to Step 2.

### Step 2: Initialize

1. Inspect the repository layout before running the script. Identify source
   roots, build directories, vendored dependencies, generated files, Python
   packages, and CMake entry points.
2. Run the bundled script:

```bash
node ~/.config/opencode/skills/cppcodemap/scripts/cppcodemap.mjs init \
  --root ./
```

The default profile includes common C/C++/Python/CMake project files:

- C/C++ sources and headers: `*.c`, `*.cc`, `*.cpp`, `*.cxx`, `*.h`, `*.hpp`,
  `*.hxx`, `*.ipp`, `*.inl`
- Build metadata: `CMakeLists.txt`, `*.cmake`, `CMakePresets.json`,
  `conanfile.*`, `vcpkg.json`
- Python/package metadata: `*.py`, `pyproject.toml`, `setup.py`, `setup.cfg`,
  `requirements*.txt`, `tox.ini`, `pytest.ini`

The default profile excludes build outputs, virtual environments, dependency
folders, generated binary artifacts, caches, tests, docs, and translations.

Use explicit `--include`, `--exclude`, and `--exception` flags only when the
repository has important files outside the defaults. Examples:

```bash
node ~/.config/opencode/skills/cppcodemap/scripts/cppcodemap.mjs init \
  --root ./ \
  --include "modules/**/*.cu" \
  --include "modules/**/*.cuh" \
  --exception "README.md"
```

Initialization creates:

- `.slim/cppcodemap.json` for selected-file hashes and folder hashes
- `codemap.md` templates in relevant folders

### Step 3: Detect Changes

Run:

```bash
node ~/.config/opencode/skills/cppcodemap/scripts/cppcodemap.mjs changes \
  --root ./
```

Review the added, removed, modified, and affected-folder output.

Only update the affected `codemap.md` files. Do not rewrite unrelated maps.

### Step 4: Write Directory Codemaps

For each affected directory, read enough implementation to document the real
architecture. Prefer CMake files and package entry points first, then source and
header files.

Each directory codemap should cover:

- **Responsibility**: What this directory owns in the system
- **Build & Targets**: Relevant CMake targets, libraries, executables, options,
  generated artifacts, and install/export behavior
- **API & Data Flow**: Main classes, functions, modules, ownership boundaries,
  threading/state, and Python/native crossings
- **Integration**: Upstream/downstream directories, external dependencies,
  bindings, plugins, tests or tools that exercise the module

For mixed-language modules, explicitly state where control crosses language
boundaries, for example Python extension import -> pybind/C API wrapper ->
C++ service -> C library.

### Step 5: Finalize Root Codemap

Update the root `codemap.md` as the repository atlas:

- Describe the project purpose and supported platforms/toolchains
- List system entry points such as `CMakeLists.txt`, package metadata,
  executable sources, extension module definitions, and CLI entry points
- Aggregate subdirectory summaries and links to each detailed `codemap.md`
- Summarize build/configuration flow and cross-language integration points

### Step 6: Update State

After codemaps are updated, save the new hash state:

```bash
node ~/.config/opencode/skills/cppcodemap/scripts/cppcodemap.mjs update \
  --root ./
```

### Step 7: Register in AGENTS.md

If `AGENTS.md` already has a `## Repository Map` section, leave it unchanged.

If it is missing, add:

```markdown
## Repository Map

A full codemap is available at `codemap.md` in the project root.

Before working on any task, read `codemap.md` to understand:
- Project architecture and entry points
- Directory responsibilities and design patterns
- Build, packaging, and cross-language integration flow

For deep work on a specific folder, also read that folder's `codemap.md`.
```
