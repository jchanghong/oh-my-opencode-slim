#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const VERSION = '1.0.0';
export const STATE_DIR = '.slim';
export const STATE_FILE = 'codemap.json';
export const LEGACY_STATE_FILE = 'cartography.json';
export const CODEMAP_FILE = 'codemap.md';

export class PatternMatcher {
  regex;

  constructor(patterns) {
    if (!patterns.length) {
      this.regex = null;
      return;
    }

    const regexParts = patterns.map((pattern) => {
      let reg = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      reg = reg.replace(/\\\*\\\*\//g, '(?:.*/)?');
      reg = reg.replace(/\\\*\\\*/g, '.*');
      reg = reg.replace(/\\\*/g, '[^/]*');
      reg = reg.replace(/\\\?/g, '.');

      if (pattern.endsWith('/')) {
        reg += '.*';
      }

      if (pattern.startsWith('/')) {
        reg = `^${reg.slice(1)}`;
      } else {
        reg = `(?:^|.*/)${reg}`;
      }

      return `(?:${reg}$)`;
    });

    this.regex = new RegExp(regexParts.join('|'));
  }

  matches(filePath) {
    if (!this.regex) return false;
    return this.regex.test(filePath);
  }
}

export function loadGitignore(root) {
  const gitignorePath = path.join(root, '.gitignore');
  if (!existsSync(gitignorePath)) return [];

  return readFileSync(gitignorePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

function walkFiles(root) {
  const files = [];

  function visit(currentDir) {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.')) {
          visit(fullPath);
        }
        continue;
      }

      if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  visit(root);
  return files.sort();
}

export function selectFiles(
  root,
  includePatterns,
  excludePatterns,
  exceptions,
  gitignorePatterns,
) {
  const includeMatcher = new PatternMatcher(includePatterns);
  const excludeMatcher = new PatternMatcher(excludePatterns);
  const gitignoreMatcher = new PatternMatcher(gitignorePatterns);
  const exceptionSet = new Set(exceptions);

  return walkFiles(root).filter((fullPath) => {
    let relPath = path.relative(root, fullPath).replaceAll(path.sep, '/');
    if (relPath.startsWith('./')) {
      relPath = relPath.slice(2);
    }

    if (gitignoreMatcher.matches(relPath)) return false;
    if (excludeMatcher.matches(relPath) && !exceptionSet.has(relPath)) {
      return false;
    }

    return includeMatcher.matches(relPath) || exceptionSet.has(relPath);
  });
}

export function computeFileHash(filePath) {
  try {
    const buffer = readFileSync(filePath);
    return createHash('md5').update(buffer).digest('hex');
  } catch {
    return '';
  }
}

export function computeFolderHash(folder, fileHashes) {
  const folderFiles = Object.entries(fileHashes)
    .filter(
      ([filePath]) =>
        filePath.startsWith(`${folder}/`) ||
        (folder === '.' && !filePath.includes('/')),
    )
    .sort(([a], [b]) => a.localeCompare(b));

  if (!folderFiles.length) return '';

  const hasher = createHash('md5');
  for (const [filePath, hash] of folderFiles) {
    hasher.update(`${filePath}:${hash}\n`);
  }
  return hasher.digest('hex');
}

export function getFoldersWithFiles(files, root) {
  const folders = new Set(['.']);

  for (const filePath of files) {
    const relPath = path.relative(root, filePath).replaceAll(path.sep, '/');
    const parts = relPath.split('/').slice(0, -1);
    for (let i = 0; i < parts.length; i++) {
      folders.add(parts.slice(0, i + 1).join('/'));
    }
  }

  return folders;
}

export function migrateLegacyState(root) {
  const stateDir = path.join(root, STATE_DIR);
  const legacyPath = path.join(stateDir, LEGACY_STATE_FILE);
  const statePath = path.join(stateDir, STATE_FILE);

  if (existsSync(statePath) || !existsSync(legacyPath)) {
    return false;
  }

  mkdirSync(stateDir, { recursive: true });
  renameSync(legacyPath, statePath);
  console.log(
    `Migrated ${STATE_DIR}/${LEGACY_STATE_FILE} -> ${STATE_DIR}/${STATE_FILE}`,
  );
  return true;
}

export function loadState(root) {
  migrateLegacyState(root);
  const statePath = path.join(root, STATE_DIR, STATE_FILE);
  if (!existsSync(statePath)) return null;

  try {
    return JSON.parse(readFileSync(statePath, 'utf8'));
  } catch {
    return null;
  }
}

export function saveState(root, state) {
  const stateDir = path.join(root, STATE_DIR);
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(
    path.join(stateDir, STATE_FILE),
    `${JSON.stringify(state, null, 2)}\n`,
  );
}

function createRootCodemapTemplate(folderName) {
  return `# Repository Atlas: ${folderName}

本文件面向第一次进入仓库的新贡献者。请用完整叙述替换这些写作指引，目标是让读者在不先阅读源码的情况下理解项目能力、入口、流程、架构和常见修改路径。

## 项目定位

- 说明这个仓库是什么、服务于谁、解决什么问题，以及哪些内容不属于本仓库边界。
- 交代运行环境、发布/安装形态、主要用户和贡献者需要知道的上下文。

## 功能能力清单

- 列出主要用户能力、开发者能力、自动化能力和维护能力。
- 对每项能力说明它由哪些顶层目录或关键文件支撑。

## 新贡献者快速导览

- 用 5-10 分钟阅读路径介绍仓库：先看哪些入口，再看哪些核心模块，最后看哪些扩展点。
- 标明构建、测试、运行、调试和发布相关命令。

## 系统入口

- 列出 CLI、包入口、插件入口、服务入口、脚本入口、配置入口和重要根文件。
- 对每个入口说明谁调用它、何时调用它、它会移交给哪个模块。

## 当前目录下各个子目录或文件的模块关系图

\`\`\`mermaid
flowchart LR
  Root[仓库根目录]
  Src[src/ 核心实现]
  Docs[docs/ 使用与架构文档]
  Scripts[scripts/ 构建与维护脚本]
  Config[配置/清单文件]

  Root --> Src
  Root --> Docs
  Root --> Scripts
  Root --> Config
  Config --> Src
  Scripts --> Src
\`\`\`

解释图中的节点和箭头：说明每个顶层目录或根文件组承担什么职责，箭头表示调用、配置输入、构建依赖、文档支撑或维护协作关系。即使仓库较小，也要保留能反映真实协作关系的节点和边。

## 正常业务流程图

\`\`\`mermaid
flowchart TD
  Contributor[贡献者/用户]
  Entry[入口命令或运行时入口]
  ConfigLoad[加载配置与环境]
  Core[核心模块执行]
  Output[产生输出/副作用]
  Verify[测试或运行验证]

  Contributor --> Entry --> ConfigLoad --> Core --> Output --> Verify
\`\`\`

解释图中的正常路径：说明一次成功使用、请求、任务或启动流程如何从入口进入系统，经过配置/状态准备、核心模块协作，最终产生用户可见结果或系统副作用。

## 端到端流程

- 用分步骤叙述补充业务流程图，覆盖启动、输入解析、配置/状态加载、核心执行、输出、清理与验证。
- 标明关键交接点和读者应该跳转到的子目录 codemap。

## 架构分层

- 描述表现层/入口层、编排层、领域逻辑层、集成层、持久化或状态层、工具脚本层等分层。
- 说明层与层之间允许的依赖方向和禁止跨越的边界。

## 模块地图

- 为每个主要目录或关键根文件列出职责、入口、关键实体、依赖、风险和对应 codemap 链接。
- 不要只列目录；每项都要解释它为什么存在以及何时需要阅读。

## 配置/状态/数据模型

- 说明配置文件、环境变量、schema、缓存、持久化状态、运行时状态和核心数据模型。
- 说明状态生命周期、默认值来源、迁移或兼容策略。

## 外部依赖

- 列出关键库、框架、CLI、服务、协议、运行时平台和工具链。
- 说明每个依赖承担的角色、失败影响和替代/隔离策略。

## 错误处理与恢复

- 描述验证失败、配置缺失、外部工具失败、IO 失败、网络失败、权限失败和并发/生命周期失败的处理方式。
- 说明错误如何传递给用户或调用方，以及可恢复路径。

## 常见开发任务导航

- 用“如果要修改 X，先看 A，再看 B，最后验证 C”的形式列出常见任务。
- 覆盖新增入口、改配置、改核心流程、改文档、改测试、排查错误等路径。

## 术语表

- 定义项目特有名词、缩写、运行时概念、状态名称和外部系统名称。

## 推荐阅读顺序

- 给出新贡献者默认阅读顺序。
- 给出按任务分类的阅读顺序，例如调试、加功能、改配置、发布或扩展集成。
`;
}

function createModuleCodemapTemplate(folderName) {
  return `# Module Codemap: ${folderName}/

本文件面向第一次阅读该目录的新贡献者。请用完整叙述替换这些写作指引，目标是让读者理解模块职责、入口、内部协作、正常流程、依赖、配置状态、错误处理和修改风险。

## 模块职责

- 说明该目录在上层系统中的职责边界、拥有的能力和不负责的内容。
- 交代它与父级模块、兄弟模块、下游模块之间的关系。

## 解决的问题

- 说明该模块为什么存在，解决什么用户问题、开发者问题或系统集成问题。
- 如果有历史约束或兼容目标，也在这里说明。

## 关键文件与实体

- 列出关键文件、子目录、类型、函数、类、schema、脚本、资源和运行时概念。
- 用自然语言解释实体的职责和协作方式，不贴大段源码。

## 对外入口

- 列出其他模块如何进入本模块：导出函数、类、CLI、hook、事件、脚本、配置文件或资源文件。
- 对每个入口说明调用者、输入、输出和后续移交对象。

## 当前目录下各个子目录或文件的模块关系图

\`\`\`mermaid
flowchart LR
  Parent[父级/调用方]
  Entry[入口文件或导出]
  Core[核心实现文件]
  Helpers[辅助文件/子目录]
  State[配置或状态]

  Parent --> Entry
  Entry --> Core
  Core --> Helpers
  State --> Entry
\`\`\`

解释图中的节点和箭头：说明当前目录内关键文件或子目录如何调用、依赖、传递数据、共享配置或共同完成职责。目录很小时也要画出真实存在的关系。

## 正常业务流程图

\`\`\`mermaid
sequenceDiagram
  participant Caller as 调用方
  participant Entry as 模块入口
  participant Core as 核心逻辑
  participant Dependency as 依赖模块/外部工具

  Caller->>Entry: 提交正常输入
  Entry->>Core: 校验并转换为内部操作
  Core->>Dependency: 请求协作或读取状态
  Dependency-->>Core: 返回成功结果
  Core-->>Entry: 生成模块结果
  Entry-->>Caller: 返回输出或完成副作用
\`\`\`

解释图中的正常路径：说明一次成功调用如何经过入口、核心逻辑、依赖协作和结果返回。若该模块不是请求/响应形态，可改为 flowchart TD 展示构建、事件或批处理流程。

## 内部控制流/数据流

- 用步骤说明输入如何转换为内部数据、如何分派、如何组合结果、如何写入状态或产生副作用。
- 标明同步/异步边界、重要生命周期和跨文件交接点。

## 依赖关系

- 说明本模块依赖的内部模块、外部库、CLI、服务、协议和文件资源。
- 说明哪些上游模块依赖本模块，以及这些依赖造成的耦合或兼容约束。

## 配置与状态

- 说明配置来源、默认值、环境变量、schema、缓存、持久化文件、内存状态和生命周期。
- 说明状态如何初始化、更新、失效、清理或迁移。

## 错误处理

- 列出主要失败模式、验证规则、异常传播、日志/提示、重试、回退和清理策略。
- 标明调用方能看到什么错误，以及贡献者排查时应该检查哪些文件。

## 设计决策

- 说明关键架构选择、约束、取舍、被拒绝方案和未来扩展方向。
- 对复杂模块解释为什么采用当前文件拆分和依赖方向。

## 修改指南

- 用任务导向方式说明常见修改该看哪些文件、保持哪些约束、运行哪些测试或检查。
- 标明高风险区域、兼容性要求和容易遗漏的文档/配置同步点。
`;
}

export function createEmptyCodemap(folderPath, folderName, isRoot = false) {
  const codemapPath = path.join(folderPath, CODEMAP_FILE);
  if (existsSync(codemapPath)) return;

  const content = isRoot
    ? createRootCodemapTemplate(folderName)
    : createModuleCodemapTemplate(folderName);

  writeFileSync(codemapPath, content);
}

function buildState(
  root,
  includePatterns,
  excludePatterns,
  exceptions,
  selectedFiles,
) {
  const fileHashes = {};
  for (const filePath of selectedFiles) {
    const relPath = path.relative(root, filePath).replaceAll(path.sep, '/');
    fileHashes[relPath] = computeFileHash(filePath);
  }

  const folders = getFoldersWithFiles(selectedFiles, root);
  const folderHashes = {};
  for (const folder of folders) {
    folderHashes[folder] = computeFolderHash(folder, fileHashes);
  }

  const state = {
    metadata: {
      version: VERSION,
      last_run: new Date().toISOString(),
      root,
      include_patterns: includePatterns,
      exclude_patterns: excludePatterns,
      exceptions,
    },
    file_hashes: fileHashes,
    folder_hashes: folderHashes,
  };

  return { state, folders };
}

export function cmdInit({ root, include = [], exclude = [], exception = [] }) {
  const resolvedRoot = path.resolve(root);
  if (!existsSync(resolvedRoot) || !statSync(resolvedRoot).isDirectory()) {
    console.error(`Error: ${resolvedRoot} is not a directory`);
    return 1;
  }

  const includePatterns = include.length ? include : ['**/*'];
  const excludePatterns = exclude;
  const exceptions = exception;
  const gitignore = loadGitignore(resolvedRoot);

  console.log(`Scanning ${resolvedRoot}...`);
  console.log(`Include patterns: ${JSON.stringify(includePatterns)}`);
  console.log(`Exclude patterns: ${JSON.stringify(excludePatterns)}`);
  console.log(`Exceptions: ${JSON.stringify(exceptions)}`);

  const selectedFiles = selectFiles(
    resolvedRoot,
    includePatterns,
    excludePatterns,
    exceptions,
    gitignore,
  );

  console.log(`Selected ${selectedFiles.length} files`);

  const { state, folders } = buildState(
    resolvedRoot,
    includePatterns,
    excludePatterns,
    exceptions,
    selectedFiles,
  );

  saveState(resolvedRoot, state);
  console.log(`Created ${STATE_DIR}/${STATE_FILE}`);

  for (const folder of folders) {
    const folderPath =
      folder === '.' ? resolvedRoot : path.join(resolvedRoot, folder);
    const folderName = folder === '.' ? path.basename(resolvedRoot) : folder;
    createEmptyCodemap(folderPath, folderName, folder === '.');
  }

  console.log(`Created ${folders.size} empty codemap.md files`);
  return 0;
}

export function cmdChanges({ root }) {
  const resolvedRoot = path.resolve(root);
  const state = loadState(resolvedRoot);
  if (!state) {
    console.error("No codemap state found. Run 'init' first.");
    return 1;
  }

  const metadata = state.metadata ?? {};
  const includePatterns = metadata.include_patterns ?? ['**/*'];
  const excludePatterns = metadata.exclude_patterns ?? [];
  const exceptions = metadata.exceptions ?? [];
  const gitignore = loadGitignore(resolvedRoot);

  const currentFiles = selectFiles(
    resolvedRoot,
    includePatterns,
    excludePatterns,
    exceptions,
    gitignore,
  );

  const currentHashes = Object.fromEntries(
    currentFiles.map((filePath) => [
      path.relative(resolvedRoot, filePath).replaceAll(path.sep, '/'),
      computeFileHash(filePath),
    ]),
  );

  const savedHashes = state.file_hashes ?? {};
  const currentPaths = new Set(Object.keys(currentHashes));
  const savedPaths = new Set(Object.keys(savedHashes));

  const added = [...currentPaths]
    .filter((filePath) => !savedPaths.has(filePath))
    .sort();
  const removed = [...savedPaths]
    .filter((filePath) => !currentPaths.has(filePath))
    .sort();
  const modified = [...currentPaths]
    .filter((filePath) => savedPaths.has(filePath))
    .filter((filePath) => currentHashes[filePath] !== savedHashes[filePath])
    .sort();

  if (!added.length && !removed.length && !modified.length) {
    console.log('No changes detected.');
    return 0;
  }

  if (added.length) {
    console.log(`\n${added.length} added:`);
    for (const filePath of added) console.log(`  + ${filePath}`);
  }

  if (removed.length) {
    console.log(`\n${removed.length} removed:`);
    for (const filePath of removed) console.log(`  - ${filePath}`);
  }

  if (modified.length) {
    console.log(`\n${modified.length} modified:`);
    for (const filePath of modified) console.log(`  ~ ${filePath}`);
  }

  const affectedFolders = new Set(['.']);
  for (const filePath of [...added, ...removed, ...modified]) {
    const parts = filePath.split('/').slice(0, -1);
    for (let i = 0; i < parts.length; i++) {
      affectedFolders.add(parts.slice(0, i + 1).join('/'));
    }
  }

  const sortedFolders = [...affectedFolders].sort();
  console.log(`\n${sortedFolders.length} folders affected:`);
  for (const folder of sortedFolders) {
    console.log(`  ${folder}/`);
  }

  return 0;
}

export function cmdUpdate({ root }) {
  const resolvedRoot = path.resolve(root);
  const state = loadState(resolvedRoot);
  if (!state) {
    console.error("No codemap state found. Run 'init' first.");
    return 1;
  }

  const metadata = state.metadata ?? {};
  const includePatterns = metadata.include_patterns ?? ['**/*'];
  const excludePatterns = metadata.exclude_patterns ?? [];
  const exceptions = metadata.exceptions ?? [];
  const gitignore = loadGitignore(resolvedRoot);

  const selectedFiles = selectFiles(
    resolvedRoot,
    includePatterns,
    excludePatterns,
    exceptions,
    gitignore,
  );

  const { state: nextState } = buildState(
    resolvedRoot,
    includePatterns,
    excludePatterns,
    exceptions,
    selectedFiles,
  );

  saveState(resolvedRoot, nextState);
  console.log(
    `Updated ${STATE_DIR}/${STATE_FILE} with ${selectedFiles.length} files`,
  );
  return 0;
}

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = { include: [], exclude: [], exception: [] };

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    const value = rest[i + 1];

    if (!arg?.startsWith('--')) continue;
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for ${arg}`);
    }

    const key = arg.slice(2);
    if (key === 'include' || key === 'exclude' || key === 'exception') {
      options[key].push(value);
    } else if (key === 'root') {
      options.root = value;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }

    i++;
  }

  return { command, options };
}

export function main(argv = process.argv.slice(2)) {
  try {
    const { command, options } = parseArgs(argv);

    if (!command || !options.root) {
      console.error(
        'Usage: codemap.mjs <init|changes|update> --root /path [--include glob] [--exclude glob] [--exception path]',
      );
      return 1;
    }

    if (command === 'init') return cmdInit(options);
    if (command === 'changes') return cmdChanges(options);
    if (command === 'update') return cmdUpdate(options);

    console.error(`Unknown command: ${command}`);
    return 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFilePath) {
  process.exit(main());
}
