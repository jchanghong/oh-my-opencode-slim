#!/usr/bin/env bash
# sync_fork.sh — Merge upstream/master into fork and push
set -euo pipefail

log_info()  { echo -e "\033[32m[INFO]\033[0m  $*"; }
log_error() { echo -e "\033[31m[ERROR]\033[0m $*" >&2; }

# ── 1. Ensure on master and working tree is clean ────────────────────────────
if [ "$(git rev-parse --abbrev-ref HEAD)" != "master" ]; then
    log_error "Not on master branch. Run: git checkout master"
    exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
    log_error "Working tree has uncommitted changes. Please stash or commit first."
    exit 1
fi

# ── 2. Fetch both remotes ─────────────────────────────────────────────────────
log_info "Fetching remotes ..."
git fetch main
git fetch origin

# ── 3. Merge upstream into local master ───────────────────────────────────────
log_info "Merging main/master ..."
if ! git merge --no-edit main/master; then
    CONFLICTS=$(git diff --name-only --diff-filter=U)
    log_error "Merge conflicts in:\n${CONFLICTS}"
    log_error "Aborting. Resolve manually then re-run."
    git merge --abort
    exit 1
fi

# ── 4. Push to fork ───────────────────────────────────────────────────────────
log_info "Pushing to origin/master ..."
git push origin master

log_info "Done."
bun run build 

#bun run ./dist/cli/index.js install --skills=yes
