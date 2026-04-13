#!/bin/bash
# ============================================================================
# process-spec.sh — Spec Processing Pipeline
#
# Chains five Claude Code invocations with true context isolation:
#   Phase 1: REFINER       — Reconcile spec against real codebase
#   Phase 2: CRITIC        — Independent critique of refined spec
#   Phase 3: ASSEMBLER     — Merge findings into final spec
#   Phase 4: SECOND CRITIC — Fresh review of final spec for implementation readiness
#   Phase 5: RESOLVER      — Classify and resolve second critic findings
#
# Usage:
#   ./process-spec.sh path/to/your-spec.md
#   ./process-spec.sh path/to/your-spec.md --skip-assembly
#   ./process-spec.sh path/to/your-spec.md --full
#   ./process-spec.sh path/to/your-spec.md --verbose
#
# Output:
#   .spec-pipeline/
#     refined-spec.md          — Phase 1 output
#     reconciliation-report.md — Phase 1 findings
#     critique-report.md       — Phase 2 findings
#     final-spec.md            — Phase 3 assembled output (updated by Phase 5)
#     final-review.md          — Phase 4 findings
#     resolution-log.md        — Phase 5 disposition of each finding
#
# Requirements:
#   - Claude Code CLI (claude) installed and authenticated
#   - Run from the root of your project (where CLAUDE.md lives)
# ============================================================================

set -uo pipefail

# ── Args ─────────────────────────────────────────────────────────────────────

SPEC_PATH="${1:?Usage: ./process-spec.sh path/to/spec.md [--skip-assembly] [--full] [--verbose]}"
SKIP_ASSEMBLY=false
FULL=false
VERBOSE=false

for arg in "$@"; do
  case "$arg" in
    --skip-assembly) SKIP_ASSEMBLY=true ;;
    --full) FULL=true ;;
    --verbose) VERBOSE=true ;;
  esac
done

if [ ! -f "$SPEC_PATH" ]; then
  echo "Error: Spec file not found: $SPEC_PATH"
  exit 1
fi

command -v jq >/dev/null || { echo "Error: jq is required (install via 'brew install jq')"; exit 1; }

SPEC_NAME=$(basename "$SPEC_PATH" .md)
OUTPUT_DIR=".spec-pipeline"
mkdir -p "$OUTPUT_DIR"

PROJECT_ROOT="$(pwd)"

# jq filter that consumes stream-json line-by-line and emits one short line per
# tool-call, plus banners for session init and run result. Tolerates malformed
# lines via try/catch.
read -r -d '' JQ_FILTER <<'JQ_EOF' || true
def strip_root($r):
  if type != "string" then ""
  elif startswith($r + "/") then .[($r|length)+1:]
  else . end;

def truncate($n):
  if type != "string" then ""
  elif (. | length) > $n then (.[0:$n-1]) + "…"
  else . end;

def file_path_of(input):
  (input.file_path // input.filePath // "") | strip_root($root);

def target(tool; input):
  if   tool == "Read"         then file_path_of(input)
  elif tool == "Edit"         then file_path_of(input)
  elif tool == "Write"        then file_path_of(input)
  elif tool == "MultiEdit"    then file_path_of(input)
  elif tool == "NotebookEdit" then (input.notebook_path // input.notebookPath // "") | strip_root($root)
  elif tool == "Grep"         then "\"" + (input.pattern // "") + "\""
  elif tool == "Glob"         then "\"" + (input.pattern // "") + "\""
  elif tool == "Bash"         then (input.command // "" | gsub("\n"; " ⏎ ") | truncate(60))
  elif tool == "WebFetch"     then input.url // ""
  elif tool == "WebSearch"    then "\"" + (input.query // "") + "\""
  elif tool == "Task"         then (input.description // input.subagent_type // "")
  elif tool == "TodoWrite"    then "updated todo list"
  else (input | tostring | truncate(60))
  end;

( try fromjson catch null ) as $e
| if $e == null then empty
  elif $e.type == "system" and $e.subtype == "init" then
       "    (session \($e.session_id // "?" | .[0:8]))"
  elif $e.type == "assistant" then
       ( $e.message.content // [] )
       | map(select(.type == "tool_use"))
       | .[]
       | "    → \(.name) \( target(.name; (.input // {})) )"
  elif $e.type == "result" and $e.subtype == "success" and ($e.is_error != true) then
       "    ✓ done  (\($e.num_turns // 0) turns, $\($e.total_cost_usd // 0 | tostring))"
  elif $e.type == "result" then
       "    ✗ \($e.subtype // "error")\(if $e.is_error then " [is_error]" else "" end) (\($e.num_turns // 0) turns)"
  else empty end
JQ_EOF

# stream_claude_phase <slug>
#   Reads stream-json on stdin.
#   Tees raw JSONL to $OUTPUT_DIR/<slug>-events.jsonl (faithful record).
#   Emits formatted tool-call lines to stdout AND $OUTPUT_DIR/<slug>-log.txt.
stream_claude_phase() {
  local slug="$1"
  tee "$OUTPUT_DIR/${slug}-events.jsonl" \
    | jq --unbuffered -rR --arg root "$PROJECT_ROOT" "$JQ_FILTER" \
    | tee "$OUTPUT_DIR/${slug}-log.txt"
}

echo ""
echo "======================================================"
echo "  SPEC PROCESSING PIPELINE"
echo "======================================================"
echo ""
echo "  Spec:   $SPEC_PATH"
echo "  Output: $OUTPUT_DIR/"
echo ""

# ── Phase 1: REFINER ────────────────────────────────────────────────────────

echo "------------------------------------------------------"
echo "  PHASE 1: REFINER — Reconciling spec against codebase"
echo "------------------------------------------------------"
echo ""

IFS= read -r -d '' REFINER_PROMPT <<'REFINER_EOF' || true
You are the REFINER. Your job is to reconcile a feature spec against the real codebase.

Read the spec file at: SPEC_PATH_PLACEHOLDER

Then systematically verify every claim the spec makes against the actual code. You have full read access to the codebase. Use the project's CLAUDE.md and any documentation files for context.

CHECK EACH OF THESE:

1. TYPE ACCURACY
   - Every interface/type referenced — do the field names match the real code? Are nullability assumptions correct?
   - Are there fields the spec assumes exist that don't? Fields that exist but the spec doesn't account for?

2. COMPONENT & SERVICE EXISTENCE
   - Every component, hook, service, or utility the spec references — does it actually exist in the codebase?
   - If it doesn't exist, is it clearly marked as "to be created" in the spec?
   - Are import paths plausible given the actual file structure?

3. NAVIGATION & ROUTING
   - Route names, screen names, navigation params — do they match the real navigator/router setup?
   - Are route param types correct?

4. STORAGE & DATA PATTERNS
   - Storage keys, database tables, or cache keys referenced — do they match the real code?
   - Storage service method signatures — do they match?
   - Data sync behavior — is the spec correct about what persists where?

5. ANALYTICS & TELEMETRY
   - Event names — are they consistent with the naming conventions used elsewhere in the codebase?
   - Property names and types — do they follow existing patterns?
   - Are there missing events that similar features track?

6. API CONTRACTS
   - Request/response shapes for any API routes — do they match the actual route handlers?
   - Are rate limits, timeouts, and error codes accurate?

7. FILE MANIFEST
   - The list of files to create/modify — is it complete?
   - Are there files that would obviously need changes but aren't listed?

8. EXISTING PATTERNS
   - Does the spec follow patterns established elsewhere in the codebase, or does it introduce unnecessary divergence?
   - Are there existing utilities or helpers the spec should use but doesn't mention?

FOLLOW THIS ORDER STRICTLY — the report is the most valuable artifact, so write it BEFORE touching the spec:

STEP 1 — VERIFY
  Do all your verification work first: Read the spec, Read relevant source files, Grep for symbols and patterns, confirm every claim.

STEP 2 — WRITE THE REPORT (do this BEFORE any edits)
  Write the reconciliation report to: OUTPUT_DIR_PLACEHOLDER/reconciliation-report.md
  Format: grouped by category above, each finding tagged as:
  - MISMATCH: spec says X, code says Y (must fix)
  - MISSING: spec references something that doesn't exist yet (flag for creation)
  - SUGGESTION: spec works but could be better
  - VERIFIED: spot-checked and correct

  This report MUST exist before you do any editing. If you run low on turns, the report is the thing that must survive — the edits can be redone from it later.

STEP 3 — WRITE THE REFINED SPEC
  Write the refined spec to: OUTPUT_DIR_PLACEHOLDER/refined-spec.md
  This is the original spec with all MISMATCH issues fixed inline.
  Do NOT fix MISSING or SUGGESTION items — just flag them in the report.

Be thorough. Read actual source files. Don't guess — verify.
REFINER_EOF

REFINER_PROMPT="${REFINER_PROMPT//SPEC_PATH_PLACEHOLDER/$SPEC_PATH}"
REFINER_PROMPT="${REFINER_PROMPT//OUTPUT_DIR_PLACEHOLDER/$OUTPUT_DIR}"

rm -f "$OUTPUT_DIR/reconciliation-report.md"

claude -p "$REFINER_PROMPT" \
  --allowedTools "Read,Grep,Glob,Write" \
  --max-turns 80 \
  --verbose --output-format stream-json \
  2> "$OUTPUT_DIR/refiner-stderr.txt" \
  | stream_claude_phase refiner \
  || true

if [ "$VERBOSE" = true ] && [ -f "$OUTPUT_DIR/refiner-events.jsonl" ]; then
  echo "  [verbose] Last 20 events of refiner stream:"
  tail -20 "$OUTPUT_DIR/refiner-events.jsonl"
  echo ""
fi

if [ ! -f "$OUTPUT_DIR/reconciliation-report.md" ]; then
  echo "  Warning: Refiner didn't produce reconciliation-report.md"
  echo "  Check $OUTPUT_DIR/refiner-events.jsonl and $OUTPUT_DIR/refiner-stderr.txt for details"
else
  echo "  Phase 1 complete"
  echo "    -> $OUTPUT_DIR/reconciliation-report.md"
  echo "    -> $OUTPUT_DIR/refined-spec.md"
fi
echo ""

# ── Phase 2: CRITIC ─────────────────────────────────────────────────────────

echo "------------------------------------------------------"
echo "  PHASE 2: CRITIC — Independent review of refined spec"
echo "------------------------------------------------------"
echo ""

CRITIC_INPUT="$OUTPUT_DIR/refined-spec.md"
if [ ! -f "$CRITIC_INPUT" ]; then
  CRITIC_INPUT="$SPEC_PATH"
  echo "  (Using original spec — refiner didn't produce refined version)"
fi

IFS= read -r -d '' CRITIC_PROMPT <<'CRITIC_EOF' || true
You are the CRITIC. You are reviewing a feature spec that has already been through a codebase reconciliation pass. You did NOT do that reconciliation — you are a fresh reviewer with no prior context.

Read the spec at: CRITIC_INPUT_PLACEHOLDER
Also read the reconciliation report at: OUTPUT_DIR_PLACEHOLDER/reconciliation-report.md (if it exists)

Read the project's CLAUDE.md and any relevant documentation to understand established patterns and conventions.

Your job is to find problems the Refiner missed. You're looking for DIFFERENT things than the Refiner:

1. STORY ATOMICITY
   - Are implementation stories actually atomic? (2-5 files per story is the sweet spot)
   - Can each story be implemented and tested independently?
   - Are there hidden dependencies between stories that aren't declared?

2. EDGE CASES
   - What happens on first use (empty state)?
   - What happens with no network?
   - What happens if the user is unauthenticated?
   - What happens if data is in an unexpected shape?
   - What happens if the user does things out of order?

3. ACCEPTANCE CRITERIA
   - Does every story have clear "done" criteria?
   - Could two developers disagree on whether a story is complete?
   - Are there implicit UX decisions that should be explicit?

4. SCOPE
   - Is anything over-scoped for what the feature actually needs?
   - Are there gold-plated requirements that could be deferred?
   - Conversely, is anything critical missing?

5. GUARDRAILS
   - Do "do not touch" guardrails make sense?
   - Are they too broad (blocking necessary changes) or too narrow (missing things that shouldn't change)?

6. SEQUENCING
   - If stories are ordered, does the order make sense?
   - Does story N depend on something from story N+2?
   - Could any stories be parallelized?

7. UX GAPS
   - Loading states — are they specified?
   - Error states — what does the user see?
   - Transitions — how does the user get into and out of this feature?
   - Accessibility — touch targets, contrast, screen reader considerations?

8. ANALYTICS GAPS
   - Are there user decisions that should be tracked but aren't?
   - Do the events answer the product questions the feature is trying to answer?

9. CODEBASE CONVENTIONS
   - Does the spec follow existing naming conventions used in the codebase?
   - Does the spec reuse existing components/hooks where it should, or does it reinvent something that already exists?
   - Are guardrails consistent with how other specs in this project scope their boundaries?

10. UX INTENT CLARITY
    - Are interaction patterns explicit enough that the Assembler can't accidentally change them?
    - Where the spec says "toast" does it mean toast, or could someone interpret it as a banner?
    - Are transitions described precisely (e.g., "bottom sheet slides up" vs "modal opens")?
    - Flag any UX behavior that's implied but not stated — these are where drift happens downstream.

PRODUCE ONE OUTPUT:

Write your critique to: OUTPUT_DIR_PLACEHOLDER/critique-report.md

Format each finding as:
- CRITICAL: Must fix before implementation
- IMPORTANT: Should fix, but won't block implementation
- NICE-TO-HAVE: Worth considering for a future pass
- WELL DONE: Call out things the spec does right (reinforce good patterns)

End with a SUMMARY section: your overall assessment of spec readiness.
Is it ready for implementation? Ready with minor fixes? Needs another pass?

Be constructive. The goal is to make the spec better, not to find fault.
CRITIC_EOF

CRITIC_PROMPT="${CRITIC_PROMPT//CRITIC_INPUT_PLACEHOLDER/$CRITIC_INPUT}"
CRITIC_PROMPT="${CRITIC_PROMPT//OUTPUT_DIR_PLACEHOLDER/$OUTPUT_DIR}"

rm -f "$OUTPUT_DIR/critique-report.md"

claude -p "$CRITIC_PROMPT" \
  --allowedTools "Read,Grep,Glob,Write" \
  --max-turns 80 \
  --verbose --output-format stream-json \
  2> "$OUTPUT_DIR/critic-stderr.txt" \
  | stream_claude_phase critic \
  || true

if [ "$VERBOSE" = true ] && [ -f "$OUTPUT_DIR/critic-events.jsonl" ]; then
  echo "  [verbose] Last 20 events of critic stream:"
  tail -20 "$OUTPUT_DIR/critic-events.jsonl"
  echo ""
fi

if [ ! -f "$OUTPUT_DIR/critique-report.md" ]; then
  echo "  Warning: Critic didn't produce critique-report.md"
  echo "  Check $OUTPUT_DIR/critic-events.jsonl and $OUTPUT_DIR/critic-stderr.txt for details"
else
  echo "  Phase 2 complete"
  echo "    -> $OUTPUT_DIR/critique-report.md"
fi
echo ""

# ── Phase 3: ASSEMBLER (optional) ───────────────────────────────────────────

if [ "$SKIP_ASSEMBLY" = true ]; then
  echo "------------------------------------------------------"
  echo "  PHASE 3: SKIPPED (--skip-assembly)"
  echo "------------------------------------------------------"
else
  echo "------------------------------------------------------"
  echo "  PHASE 3: ASSEMBLER — Producing final spec"
  echo "------------------------------------------------------"
  echo ""

  IFS= read -r -d '' ASSEMBLER_PROMPT <<'ASSEMBLER_EOF' || true
You are the ASSEMBLER. Your job is to produce the final, implementation-ready spec.

You have three inputs:
1. The refined spec: OUTPUT_DIR_PLACEHOLDER/refined-spec.md
2. The reconciliation report: OUTPUT_DIR_PLACEHOLDER/reconciliation-report.md
3. The critique report: OUTPUT_DIR_PLACEHOLDER/critique-report.md

If the refined spec doesn't exist, use the original spec at: SPEC_PATH_PLACEHOLDER

Read all three.

YOUR TASK:

1. Start from the refined spec as the base.

2. Address all CRITICAL findings from the critique report:
   - Fix them directly in the spec

3. For IMPORTANT findings from the critique:
   - If the fix is small and obvious, apply it
   - If it requires a design decision, add a DECISION NEEDED comment

4. For MISSING findings from the reconciliation report:
   - Ensure they're clearly called out in the file manifest as "to be created"

5. Add a Pipeline Metadata section at the bottom with:
   - Date processed
   - Count of findings by severity from both reports
   - Any unresolved DECISION NEEDED items
   - Overall readiness assessment

CONSTRAINTS — The Assembler may only change:
- Type names, field names, storage keys, API contracts (factual corrections)
- Missing edge case documentation (additive)
- Story sequencing and dependency declarations (structural)
- Acceptance criteria (additive)

The Assembler may NOT change:
- UX behavior (interaction patterns, navigation flows, what the user sees)
- Component hierarchy or screen layout
- Copy or messaging
- Which analytics events fire and when

Any finding that would change UX behavior must become a DECISION NEEDED comment.

Write the final spec to: OUTPUT_DIR_PLACEHOLDER/final-spec.md

This spec should be ready to hand directly to an AI coding assistant for implementation.
ASSEMBLER_EOF

  ASSEMBLER_PROMPT="${ASSEMBLER_PROMPT//OUTPUT_DIR_PLACEHOLDER/$OUTPUT_DIR}"
  ASSEMBLER_PROMPT="${ASSEMBLER_PROMPT//SPEC_PATH_PLACEHOLDER/$SPEC_PATH}"

  claude -p "$ASSEMBLER_PROMPT" \
    --allowedTools "Read,Write" \
    --max-turns 80 \
    --verbose --output-format stream-json \
    2> "$OUTPUT_DIR/assembler-stderr.txt" \
    | stream_claude_phase assembler \
    || true

  if [ "$VERBOSE" = true ] && [ -f "$OUTPUT_DIR/assembler-events.jsonl" ]; then
    echo "  [verbose] Last 20 events of assembler stream:"
    tail -20 "$OUTPUT_DIR/assembler-events.jsonl"
    echo ""
  fi

  if [ ! -f "$OUTPUT_DIR/final-spec.md" ]; then
    echo "  Warning: Assembler didn't produce final-spec.md"
    echo "  Check $OUTPUT_DIR/assembler-events.jsonl and $OUTPUT_DIR/assembler-stderr.txt for details"
  else
    echo "  Phase 3 complete"
    echo "    -> $OUTPUT_DIR/final-spec.md"
  fi
fi
echo ""

# ── Phase 4: SECOND CRITIC (optional) ─────────────────────────────────────

if [ "$SKIP_ASSEMBLY" = true ] || [ "$FULL" != true ]; then
  echo "------------------------------------------------------"
  echo "  PHASE 4: SKIPPED (use --full to enable)"
  echo "------------------------------------------------------"
else
  echo "------------------------------------------------------"
  echo "  PHASE 4: SECOND CRITIC — Fresh review of final spec"
  echo "------------------------------------------------------"
  echo ""

  IFS= read -r -d '' SECOND_CRITIC_PROMPT <<'SECOND_CRITIC_EOF' || true
You are a senior engineer reviewing a spec you have never seen before. You have zero context about the pipeline or process that produced it.

Read the spec at: OUTPUT_DIR_PLACEHOLDER/final-spec.md

Also read the project's CLAUDE.md and any relevant documentation to understand the codebase you'd be implementing against.

Evaluate this spec for implementation readiness. Your review should answer:

1. Could a competent engineer pick this up and start building tomorrow?
2. Are there ambiguities that would cause two engineers to build different things?
3. Are there missing details that would force the implementer to make design decisions the spec should have made?
4. Are there internal contradictions?
5. Are acceptance criteria testable and unambiguous?
6. Are edge cases covered, or are there obvious gaps?
7. Is the scope reasonable, or is it trying to do too much / too little?
8. Does the technical approach make sense given the actual codebase?

Flag real problems, not nitpicks. Every finding should be something that would actually cause issues during implementation.

For each finding, state:
- What the problem is
- Where in the spec it occurs
- Why it matters for implementation
- A suggested fix (if you have one)

Write your review to: OUTPUT_DIR_PLACEHOLDER/final-review.md
SECOND_CRITIC_EOF

  SECOND_CRITIC_PROMPT="${SECOND_CRITIC_PROMPT//OUTPUT_DIR_PLACEHOLDER/$OUTPUT_DIR}"

  rm -f "$OUTPUT_DIR/final-review.md"

  claude -p "$SECOND_CRITIC_PROMPT" \
    --allowedTools "Read,Grep,Glob,Write" \
    --max-turns 80 \
    --verbose --output-format stream-json \
    2> "$OUTPUT_DIR/second-critic-stderr.txt" \
    | stream_claude_phase second-critic \
    || true

  if [ "$VERBOSE" = true ] && [ -f "$OUTPUT_DIR/second-critic-events.jsonl" ]; then
    echo "  [verbose] Last 20 events of second critic stream:"
    tail -20 "$OUTPUT_DIR/second-critic-events.jsonl"
    echo ""
  fi

  if [ ! -f "$OUTPUT_DIR/final-review.md" ]; then
    echo "  Warning: Second Critic didn't produce final-review.md"
    echo "  Check $OUTPUT_DIR/second-critic-events.jsonl and $OUTPUT_DIR/second-critic-stderr.txt for details"
  else
    echo "  Phase 4 complete"
    echo "    -> $OUTPUT_DIR/final-review.md"
  fi
fi
echo ""

# ── Phase 5: RESOLVER (optional) ──────────────────────────────────────────

if [ "$SKIP_ASSEMBLY" = true ] || [ "$FULL" != true ]; then
  echo "------------------------------------------------------"
  echo "  PHASE 5: SKIPPED (use --full to enable)"
  echo "------------------------------------------------------"
elif [ ! -f "$OUTPUT_DIR/final-review.md" ]; then
  echo "------------------------------------------------------"
  echo "  PHASE 5: SKIPPED (no final-review.md from Phase 4)"
  echo "------------------------------------------------------"
  echo ""
  echo "  Phase 4 did not produce final-review.md — nothing to resolve."
  echo "  Check $OUTPUT_DIR/second-critic-events.jsonl for why."
else
  echo "------------------------------------------------------"
  echo "  PHASE 5: RESOLVER — Resolving review findings"
  echo "------------------------------------------------------"
  echo ""

  IFS= read -r -d '' RESOLVER_PROMPT <<'RESOLVER_EOF' || true
You are the RESOLVER. Your job is to process the findings from a final review and apply fixes to the spec.

Read these two files:
1. The spec: OUTPUT_DIR_PLACEHOLDER/final-spec.md
2. The review: OUTPUT_DIR_PLACEHOLDER/final-review.md

For EACH finding in the review, classify it as one of:
- VALID: The finding is correct and you can fix it. Apply the fix directly in the spec.
- NITPICK: The finding is stylistic or trivial. Ignore it.
- REQUIRES DECISION: The finding raises a real issue but fixing it would require a product or design decision. Add a DECISION NEEDED comment in the spec at the relevant location.

CONSTRAINTS — The Resolver may only change:
- Type names, field names, storage keys, API contracts (factual corrections)
- Missing edge case documentation (additive)
- Story sequencing and dependency declarations (structural)
- Acceptance criteria (tighten or add, never remove)
- Missing documentation (additive)

The Resolver may NOT change:
- UX behavior (interaction patterns, navigation flows, what the user sees)
- Component hierarchy or screen layout
- Copy or messaging
- Which analytics events fire and when

Any finding that would require changing UX behavior must be classified as REQUIRES DECISION.

PRODUCE TWO OUTPUTS, IN THIS ORDER — the log is the most valuable artifact, so write it first:

1. FIRST, write the resolution log to: OUTPUT_DIR_PLACEHOLDER/resolution-log.md
   For each finding from the review, list:
   - The finding (brief summary)
   - Classification: VALID, NITPICK, or REQUIRES DECISION
   - Planned action (what you will change, or why you will skip it)

   Write the log FIRST. If you run low on turns, the log is what must survive — the spec edits can be re-derived from it later.

2. SECOND, overwrite the spec at: OUTPUT_DIR_PLACEHOLDER/final-spec.md
   Apply all VALID fixes from the log. Add DECISION NEEDED comments for REQUIRES DECISION items.
RESOLVER_EOF

  RESOLVER_PROMPT="${RESOLVER_PROMPT//OUTPUT_DIR_PLACEHOLDER/$OUTPUT_DIR}"

  rm -f "$OUTPUT_DIR/resolution-log.md"

  claude -p "$RESOLVER_PROMPT" \
    --allowedTools "Read,Write" \
    --max-turns 80 \
    --verbose --output-format stream-json \
    2> "$OUTPUT_DIR/resolver-stderr.txt" \
    | stream_claude_phase resolver \
    || true

  if [ "$VERBOSE" = true ] && [ -f "$OUTPUT_DIR/resolver-events.jsonl" ]; then
    echo "  [verbose] Last 20 events of resolver stream:"
    tail -20 "$OUTPUT_DIR/resolver-events.jsonl"
    echo ""
  fi

  if [ ! -f "$OUTPUT_DIR/resolution-log.md" ]; then
    echo "  Warning: Resolver didn't produce resolution-log.md"
    echo "  Check $OUTPUT_DIR/resolver-events.jsonl and $OUTPUT_DIR/resolver-stderr.txt for details"
  else
    echo "  Phase 5 complete"
    echo "    -> $OUTPUT_DIR/final-spec.md (updated)"
    echo "    -> $OUTPUT_DIR/resolution-log.md"
  fi
fi

# ── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo "======================================================"
echo "  PIPELINE COMPLETE"
echo "======================================================"
echo ""
echo "  Outputs in $OUTPUT_DIR/:"
echo ""

for f in "$OUTPUT_DIR"/*.md; do
  [ -e "$f" ] && echo "    $(basename "$f")"
done

echo ""
echo "  Logs:"

for f in "$OUTPUT_DIR"/*-log.txt; do
  [ -e "$f" ] && echo "    $(basename "$f")"
done

echo ""
echo "  Next steps:"
if [ -f "$OUTPUT_DIR/resolution-log.md" ]; then
  echo "    1. Review resolution-log.md for finding dispositions"
  echo '    2. Resolve any DECISION NEEDED comments in final-spec.md'
  echo "    3. Hand to your AI coding assistant for implementation"
elif [ -f "$OUTPUT_DIR/final-spec.md" ]; then
  echo "    1. Review final-spec.md"
  echo '    2. Resolve any DECISION NEEDED comments'
  echo "    3. Hand to your AI coding assistant for implementation"
elif [ -f "$OUTPUT_DIR/refined-spec.md" ]; then
  echo "    1. Review reconciliation-report.md + critique-report.md"
  echo "    2. Update refined-spec.md based on findings"
  echo "    3. Hand to your AI coding assistant for implementation"
else
  echo "    1. Check the log files for errors"
  echo "    2. Re-run the pipeline"
fi
echo ""
