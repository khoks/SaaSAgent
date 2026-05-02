#!/usr/bin/env bash
# Stop-hook entrypoint for the SaaS Agent project.
#
# Invokes two skills sequentially against the just-ended session:
#   1. extract-insights  — appends to architecture/decisions/novel-ideas/future-requirements docs
#   2. work-management   — maintains initiative/epic/story/task hierarchy
#
# Both skills open their own PRs.
#
# Recursion guard: this script is itself a Stop-hook, and it spawns sub-`claude`
# processes that will also fire their own Stop-hooks. We set SAAS_AGENT_HOOK_RUNNING
# to short-circuit nested invocations.

set -u

# Drain stdin (hook input JSON) — currently unused; skills find the transcript on their own.
cat > /dev/null 2>&1 || true

if [ "${SAAS_AGENT_HOOK_RUNNING:-}" = "1" ]; then
  exit 0
fi

export SAAS_AGENT_HOOK_RUNNING=1

REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
LOG_DIR="${REPO_DIR}/.claude/.local/logs"
mkdir -p "${LOG_DIR}"
LOG_FILE="${LOG_DIR}/post-session-$(date +%Y%m%d).log"

cd "${REPO_DIR}"
ORIGINAL_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'main')"

{
  echo ""
  echo "===== $(date -Is) post-session start (original branch: ${ORIGINAL_BRANCH}) ====="
} >> "${LOG_FILE}"

run_skill() {
  local skill_name="$1"
  echo "----- invoking ${skill_name} -----" >> "${LOG_FILE}"
  claude --print --dangerously-skip-permissions \
    "Invoke the ${skill_name} skill on the conversation that just ended in this repo (${REPO_DIR}). Find the most recently modified *.jsonl transcript under ~/.claude/projects/ whose path slug matches this repo. Follow the skill's hard rules exactly. After you finish, do NOT switch the workspace back to main — the hook will restore the original branch." \
    >> "${LOG_FILE}" 2>&1 \
    || echo "[warn] ${skill_name} exited non-zero (continuing)" >> "${LOG_FILE}"
}

run_skill "extract-insights"
run_skill "work-management"

# Restore the workspace to whatever branch the user was on when the hook fired.
# Skills that PR'd their work checked out side-branches; without this, the next
# interactive session would start on the wrong branch and accidental commits
# would land there.
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
if [ -n "${ORIGINAL_BRANCH}" ] && [ "${CURRENT_BRANCH}" != "${ORIGINAL_BRANCH}" ]; then
  echo "----- restoring workspace from ${CURRENT_BRANCH} to ${ORIGINAL_BRANCH} -----" >> "${LOG_FILE}"
  git checkout "${ORIGINAL_BRANCH}" >> "${LOG_FILE}" 2>&1 \
    || echo "[warn] could not restore ${ORIGINAL_BRANCH} (working tree may have uncommitted changes)" >> "${LOG_FILE}"
fi

echo "===== $(date -Is) post-session end ======" >> "${LOG_FILE}"
exit 0
