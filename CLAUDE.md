# CLAUDE.md

**Read [AGENTS.md](AGENTS.md) first.** It is the source of truth for how this site works — architecture, the Agility CMS content model, environment variables, the MCP server, search indexing, and the gotchas that bite when editing CMS-driven code or content. Everything in AGENTS.md applies to you; don't duplicate it here.

## Quick pointers for Claude

- **Authoring or editing documentation articles in Agility** (create/update a doc, place it in a section, embed images, save Markdown): use the skill at [.claude/skills/authoring-agility-docs/SKILL.md](.claude/skills/authoring-agility-docs/SKILL.md). It has the full category→container map, the linked-content case rules, the image-upload workflow, and the preview/edit link templates.
- **Before writing any GraphQL list query**, remember container lists default to 50 items — pass `(take: 250, ...)`. See the Gotchas section in AGENTS.md.
- **The Agility MCP cannot set workflow state, publish, or delete.** Those are manual steps in the Agility UI — say so rather than implying a save went live.
- Reference files with clickable paths, match the surrounding code style, and confirm container/section reference names with a `get_containers` lookup rather than assuming case.
