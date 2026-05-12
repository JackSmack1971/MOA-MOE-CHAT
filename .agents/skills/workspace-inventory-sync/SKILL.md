---
name: workspace-inventory-sync
description: Maintains a master INVENTORY.md registry at the workspace root by scanning project subdirectories and generating concise purpose summaries. Triggers on: "update inventory", "add project to inventory", "document this project", "new project created", "register subdirectory", "workspace index out of date", or any request to add or refresh an entry in the master project index. Handles create, update, and deduplication. Scans README.md, SKILL.md, package.json, and pyproject.toml to derive summaries. Do NOT use for general README authoring, file listing, or documentation tasks unrelated to the workspace registry.
allowed-tools: Read Bash
---

# Workspace Inventory Sync Protocol

Maintains `INVENTORY.md` at the workspace root. Operates in three modes:

- **Create** — first-time initialization when no inventory file exists
- **Append** — registers a new subdirectory not yet in the index
- **Update** — refreshes the summary for an existing entry

---

## Inputs

| Variable  | Source                                                | Required |
| --------- | ----------------------------------------------------- | -------- |
| `$TARGET` | User-supplied path to the project subdirectory        | Yes      |
| `$ROOT`   | Derive via `git rev-parse --show-toplevel` or use cwd | Auto     |

---

## Step 1 — Locate Inventory

```bash
ls "$ROOT/INVENTORY.md" 2>/dev/null
```

- **Missing** → create it using the scaffold at `references/inventory-schema.md`
- **Present** → read the full file content into context

---

## Step 2 — Generate Summary

Scan the target directory for purpose signals in this priority order:

1. `$TARGET/README.md` — extract the first non-header paragraph (≤2 sentences)
2. `$TARGET/SKILL.md` — extract the `description:` frontmatter value
3. `$TARGET/package.json` — extract the `"description"` key
4. `$TARGET/pyproject.toml` or `setup.cfg` — extract `description =`
5. **Fallback** — use the directory name to infer purpose

**Summary rules:**

- ≤15 words
- Third person, present tense
- Do not begin with "This project" or "A tool that"
- Example: `Orchestrates multi-agent article generation from research through final draft.`

---

## Step 3 — Deduplication Check

Scan `INVENTORY.md` for any row whose link path contains `$TARGET`.

- **Row found** → update that row's summary column in-place (preserve link)
- **No row found** → proceed to Step 4 to append

---

## Step 4 — Write Entry

Format new or updated rows exactly as:
| Folder Name | Summary sentence. |


**Link fallback:** if `$TARGET/README.md` does not exist, use `(./$TARGET/)` as the href.

Folder Name = the final path segment of `$TARGET` (e.g., `btc-research-orchestrator`).

---

## Step 5 — Validate

After writing, verify all conditions:

- [ ] INVENTORY.md has a header row (`| Project | Description |`)
- [ ] INVENTORY.md has a separator row (`|---|---|`)
- [ ] The new/updated row is present and pipe-balanced
- [ ] No duplicate rows exist for `$TARGET`
- [ ] No broken cells (no unescaped pipes inside cell content)

**If any check fails:** repair the table structure, then re-run validation before reporting.

**On pass:** output exactly:
✅ INVENTORY.md [created|updated] — "$FOLDER_NAME" entry [added|refreshed].



