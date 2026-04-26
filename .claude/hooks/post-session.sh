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

{
  echo ""
  echo "===== $(date -Is) post-session start ====="
} >> "${LOG_FILE}"

run_skill() {
  local skill_name="$1"
  echo "----- invoking ${skill_name} -----" >> "${LOG_FILE}"
  claude --print --dangerously-skip-permissions \
    "Invoke the ${skill_name} skill on the conversation that just ended in this repo (${REPO_DIR}). Find the most recently modified *.jsonl transcript under ~/.claude/projects/ whose path slug matches this repo. Follow the skill's hard rules exactly." \
    >> "${LOG_FILE}" 2>&1 \
    || echo "[warn] ${skill_name} exited non-zero (continuing)" >> "${LOG_FILE}"
}

run_skill "extract-insights"
run_skill "work-management"

echo "===== $(date -Is) post-session end ======" >> "${LOG_FILE}"
exit 0
