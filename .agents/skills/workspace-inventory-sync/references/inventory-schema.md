# Workspace Inventory Schema

Use this file to scaffold a new INVENTORY.md when none exists at the workspace root.

---

## Scaffold

Copy the block below verbatim to create `INVENTORY.md`:

```markdown
# Workspace Inventory

Master index of all project subdirectories in this workspace.
Updated automatically by the `workspace-inventory-sync` skill.

| Project | Description |
|---|---|
```

---

## Column Definitions

| Column          | Rules                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------- |
| **Project**     | Markdown link: display name = final folder segment; href = relative path to README.md or folder |
| **Description** | One sentence, ≤15 words, third person, present tense, no filler openers                         |

## Maintenance Notes

- One row per subdirectory — no nested entries
- Alphabetical sort is recommended but not enforced
- Do not manually edit link paths; let the skill manage them
