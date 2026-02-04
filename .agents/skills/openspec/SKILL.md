---
name: openspec
description: |
  Spec-driven development workflow using OpenSpec for creating, validating, and managing change proposals.
  Use when:
  - User mentions "proposal", "change", or "spec" with "create", "plan", "make", "start", "help"
  - User says "implement", "add feature", "plan", "kế hoạch" for new capabilities
  - Adding features, breaking changes, architecture shifts, or security/performance work
  - Need to understand existing specs or pending changes
  - Archiving completed changes after deployment
  Skip for: bug fixes, typos, dependency updates, config changes, tests for existing behavior.
---

# OpenSpec Workflow

3 stages: **Plan -> Implement -> Archive**.

## Stage 1: Plan

Flow: `context review` -> `discovery` -> `proposal` -> `specs` -> `design` -> `tasks` -> `validation`

### 1. ContextReview
- Review `openspec/project.md`, `openspec list`, and `openspec list --specs`.
- Choose a unique verb-led `change-id`, scaffold: `openspec new change "<change-id>"`

### 2. Discovery (Adaptive Exploration)
Template: `openspec/templates/discovery.md`
Populate `discovery.md` by selecting tracks appropriate to the change's complexity. Run selected tracks in parallel when possible.

**Available tracks** (pick what's relevant — not all are needed for every change):

| Track | When to use | Tools |
| --- | --- | --- |
| **Task(Architecture Snapshot)** | Always (at minimum read affected files) | `gkg repo_map`, `gkg search_codebase_definitions`, `Read` |
| **Task(Internal Patterns)** | When similar features exist in codebase | `gkg get_references`, `Grep`, `finder` |
| **Task(External Patterns)** | Novel architecture or unfamiliar domain | `librarian` ("how do similar projects do this?") |
| **Task(Constraint Check)** | New dependencies or build changes | Read `package.json`, `tsconfig.json` |
| **Task(Documentation)** | New external library or API integration | `deepwiki` / `git-mcp` / `web_search` |

**Guidelines**:
- **Small/well-documented changes** (e.g., adding a well-documented plugin): Architecture Snapshot + Constraint Check + Documentation may suffice.
- **Large/novel changes** (e.g., new architecture pattern, unfamiliar domain): Use all tracks. Consider spawning subagents for parallel exploration.
- **Always justify** in discovery.md which tracks were used and why others were skipped.

### 3. Proposal
Template: `openspec/templates/proposal.md`
- **Why**: Problem/Opportunity (1-2 sentences).
- **What Changes**: Bullet list of new/mod/removed capabilities.
- **Capabilities**: List new (`specs/new-cap/spec.md`) and mod (`specs/existing-cap/spec.md` delta).
- **Impact**: Affected areas.

### 4. Specs (Delta Format)
Create ONE spec file per capability. **Path**: `openspec/changes/<change-id>/specs/<capability-name>/spec.md`.
Follow format in `openspec/templates/spec.md`.

**Format rules**:
- Sections: `ADDED`, `MODIFIED`, `REMOVED`, `RENAMED`
- `#### Scenario:` — exactly 4 hashtags, ≥1 per requirement
- MODIFIED: copy FULL original requirement block, then edit. Partial = data loss at archive.
- Use SHALL/MUST for normative requirements.

**Quality rules** (keep specs dense, not verbose):
- **One scenario per distinct behavior**, not per input variant. If bold/italic/links all just "render markdown" → one scenario.
- **Scenarios MUST add info beyond the requirement**. If deleting the scenario loses nothing, delete it.
- **Don't scenario infrastructure wiring** ("plugin is configured", "provider wraps app"). State in requirement sentence.
- **Omit obvious defaults** ("plain text stays plain", "missing input shows error") unless AI is likely to miss them.
- **Inline constraints** (sanitization, open-in-new-tab) as bullets under one scenario, not separate scenarios.
- **≤ 3 scenarios per requirement**. If more, consolidate.

### 5. Design
Template: `openspec/templates/design.md`
Defines **HOW** to implement. Create only if: cross-cutting, new external dep, high risk/ambiguity.

**Process**: Feed discovery, specs, proposal, and the design template to Oracle. Use Oracle output as the basis for `design.md`.

```
oracle(
  task: "Analyze gap and produce design document",
  context: "Discovery (what exists), specs (what's needed), proposal (why + impact) attached. Produce design document following the template in design.md.",
  files: [
    "openspec/changes/<change-id>/discovery.md",
    "openspec/changes/<change-id>/specs/<cap>/spec.md",
    "openspec/changes/<change-id>/proposal.md",
    "openspec/templates/design.md"
  ]
)
```

**Risk scale** for Risk Map:

| Level  | Criteria                      | Verification                 |
| ------ | ----------------------------- | ---------------------------- |
| LOW    | Pattern exists in codebase    | Proceed                      |
| MEDIUM | Variation of existing pattern | Interface sketch, type-check |
| HIGH   | Novel or external integration | Spike required               |

### 6. Tasks
Template: `openspec/templates/tasks.md`
Verifiable implementation checklist. Reference Specs (what) and Design (how).

### 7. Validation
- Oracle Final Review
```
oracle(
  task: "Review plan completeness and clarity",
  context: "Plan ready. Check for gaps, unclear beads, missing deps.",
  files: ["openspec/changes/<change-id>/tasks.md"]
)
```
- Run: `openspec validate <change-id> --strict --no-interactive`
- If errors, debug with: `openspec show <change-id> --json --deltas-only`
- **STOP** and ask for user approval before moving to Implementation.

## Stage 2: Implement

1. **Read**: `proposal.md`, `design.md` (if existing), and `tasks.md` and refer `discovery.md` (if needed).
2. **Execute**: Implement tasks sequentially. Can start before all artifacts done if tasks exist.
3. **Update**: Mark tasks `- [x]` as you go.
4. **Adapt**: If implementation reveals design issues, update artifacts — workflow is fluid.
5. **Verify**: Ensure code matches specs.

## Stage 3: Archive

**After deployment/merge:**

1. Move folder: `changes/<change-id>/` → `changes/archive/YYYY-MM-DD-<change-id>/`
2. Update Specs: Update `specs/` to reflect the new "current truth" if capabilities changed.
3. Archive: `openspec archive <change-id> --yes`

---

## Appendix

### Tool Selection Guide

| Need | Tool |
| --- | --- |
| Codebase structure | `gkg repo_map` |
| Find definitions | `gkg search_codebase_definitions` |
| Find usages / references | `gkg get_references` |
| How OSS projects solve it | `librarian` |
| Library docs / integration guides | `deepwiki`, `git-mcp` |
| API docs, recent releases | `web_search` |
| Gap analysis / risk assessment | `oracle` |
| Visualize architecture / flows | `mermaid` |
| Create spec files | `create_file` / `edit_file` |

**Note:** If primary tool unavailable, use built-in tools: `finder`, `Grep`, `Read`...

### CLI Quick Reference

```bash
openspec new change "<name>"                                # Scaffold change
openspec status --change "<name>" --json                    # Artifact status
openspec instructions <artifact> --change "<name>" --json   # Get template + rules
openspec spec list --long                                   # List all specs
openspec show <id> --json --deltas-only                     # Debug delta parsing
openspec validate <id> --strict --no-interactive            # Validate
openspec archive <id> --yes                                 # Archive after merge
```
