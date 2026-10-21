# Agreement Hub skill

`agreement-hub-scope/` is a skill for Claude. Once installed, Claude writes and
updates scope documents in the Markdown format Agreement Hub imports, so
developers don't need to learn the format.

- `SKILL.md`: when to use the skill and the format rules
- `example.md`: a complete document that imports cleanly

The rules mirror `src/lib/markdown-import.ts`. When the parser changes, update
`SKILL.md`, `example.md` and the prompt on the `/guide` page with it.

## Install

The portal serves the skill as `/agreement-hub-scope.zip` and shows these steps
on the home page and `/guide` (`src/components/skill-card.tsx`).

- **Claude app (web or desktop):** Customize → Skills → + → Create skill →
  Upload a skill, then choose the ZIP. Needs "Code execution and file creation"
  on in Settings → Capabilities.
- **Claude Code:** copy the `agreement-hub-scope` folder into
  `~/.claude/skills/`.

## Rebuild the ZIP

After changing the skill, rebuild `public/agreement-hub-scope.zip`. The ZIP must
contain the `agreement-hub-scope` folder itself, not just its files. Run this
from the `skill` folder. (Windows PowerShell's `Compress-Archive` writes `\`
paths that some tools reject, so use `tar`, which ships with Windows and macOS.)

```bash
tar -a -cf ../public/agreement-hub-scope.zip agreement-hub-scope
```
