import { afterEach, describe, expect, test } from 'bun:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const {
  cmdInit,
  computeFolderHash,
  DEFAULT_EXCLUDE_PATTERNS,
  DEFAULT_INCLUDE_PATTERNS,
  loadState,
  PatternMatcher,
  selectFiles,
} = await import('./cppcodemap.mjs');

const tempDirs: string[] = [];

function createTempDir() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'cppcodemap-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

describe('PatternMatcher', () => {
  test('matches C++ and CMake paths', () => {
    const matcher = new PatternMatcher([
      '**/*.cpp',
      '**/*.hpp',
      '**/CMakeLists.txt',
      'cmake/**/*.cmake',
    ]);

    expect(matcher.matches('src/app.cpp')).toBe(true);
    expect(matcher.matches('include/app.hpp')).toBe(true);
    expect(matcher.matches('CMakeLists.txt')).toBe(true);
    expect(matcher.matches('src/CMakeLists.txt')).toBe(true);
    expect(matcher.matches('cmake/toolchain/linux.cmake')).toBe(true);
    expect(matcher.matches('README.md')).toBe(false);
  });
});

describe('default file selection', () => {
  test('keeps mixed-language source and excludes generated/test/doc files', () => {
    const root = createTempDir();
    mkdirSync(path.join(root, 'src'), { recursive: true });
    mkdirSync(path.join(root, 'include'), { recursive: true });
    mkdirSync(path.join(root, 'python', 'pkg'), { recursive: true });
    mkdirSync(path.join(root, 'cmake'), { recursive: true });
    mkdirSync(path.join(root, 'build'), { recursive: true });
    mkdirSync(path.join(root, 'tests'), { recursive: true });
    mkdirSync(path.join(root, 'docs'), { recursive: true });

    writeFileSync(path.join(root, 'CMakeLists.txt'), 'project(sample)');
    writeFileSync(path.join(root, 'src', 'engine.cpp'), 'int main() {}');
    writeFileSync(path.join(root, 'include', 'engine.hpp'), '#pragma once');
    writeFileSync(path.join(root, 'python', 'pkg', '__init__.py'), '');
    writeFileSync(path.join(root, 'cmake', 'FindFoo.cmake'), '');
    writeFileSync(path.join(root, 'build', 'generated.cpp'), '');
    writeFileSync(path.join(root, 'tests', 'engine_test.cpp'), '');
    writeFileSync(path.join(root, 'docs', 'api.md'), '');

    const selected = selectFiles(
      root,
      DEFAULT_INCLUDE_PATTERNS,
      DEFAULT_EXCLUDE_PATTERNS,
      [],
      [],
    ).map((filePath) =>
      path.relative(root, filePath).split(path.sep).join('/'),
    );

    expect(selected).toEqual([
      'CMakeLists.txt',
      'cmake/FindFoo.cmake',
      'include/engine.hpp',
      'python/pkg/__init__.py',
      'src/engine.cpp',
    ]);
  });
});

describe('hash helpers', () => {
  test('computes stable folder hash', () => {
    const fileHashes = {
      'include/api.hpp': 'hash-api',
      'src/a.cpp': 'hash-a',
      'src/b.cpp': 'hash-b',
    };

    const hash1 = computeFolderHash('src', fileHashes);
    const hash2 = computeFolderHash('src', fileHashes);
    const hash3 = computeFolderHash('src', {
      'src/a.cpp': 'hash-a-modified',
      'src/b.cpp': 'hash-b',
    });

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });
});

describe('cmdInit', () => {
  test('creates independent state and codemap templates', () => {
    const root = createTempDir();
    mkdirSync(path.join(root, 'src'), { recursive: true });
    writeFileSync(path.join(root, 'CMakeLists.txt'), 'project(sample)');
    writeFileSync(path.join(root, 'src', 'main.cpp'), 'int main() {}');

    expect(cmdInit({ root })).toBe(0);

    const state = loadState(root);
    expect(state?.metadata?.profile).toBe('cpp-python-cmake');
    expect(state?.file_hashes?.['CMakeLists.txt']).toBeDefined();
    expect(state?.file_hashes?.['src/main.cpp']).toBeDefined();
    expect(existsSync(path.join(root, '.slim', 'cppcodemap.json'))).toBe(true);
    expect(readFileSync(path.join(root, 'codemap.md'), 'utf8')).toContain(
      '## Build & Targets',
    );
    expect(
      readFileSync(path.join(root, 'src', 'codemap.md'), 'utf8'),
    ).toContain('## API & Data Flow');
  });

  test('adds explicit includes to the default profile', () => {
    const root = createTempDir();
    mkdirSync(path.join(root, 'src'), { recursive: true });
    mkdirSync(path.join(root, 'cuda'), { recursive: true });
    writeFileSync(path.join(root, 'CMakeLists.txt'), 'project(sample)');
    writeFileSync(path.join(root, 'src', 'main.cpp'), 'int main() {}');
    writeFileSync(
      path.join(root, 'cuda', 'kernel.cu'),
      '__global__ void k() {}',
    );

    expect(cmdInit({ root, include: ['**/*.cu'] })).toBe(0);

    const state = loadState(root);
    expect(state?.file_hashes?.['CMakeLists.txt']).toBeDefined();
    expect(state?.file_hashes?.['src/main.cpp']).toBeDefined();
    expect(state?.file_hashes?.['cuda/kernel.cu']).toBeDefined();
  });
});
