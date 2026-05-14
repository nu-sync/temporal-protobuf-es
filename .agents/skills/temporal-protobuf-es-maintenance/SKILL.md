---
name: temporal-protobuf-es-maintenance
description: Use when updating temporal-protobuf-es SPEC.md, AGENTS.md, justfile, repo-local skills, release criteria, or milestone context.
---

# temporal-protobuf-es Maintenance

Use this skill for keeping the repo's durable context accurate.

## Read First

1. `SPEC.md`
2. `AGENTS.md`
3. `justfile`
4. `.agents/skills/*/SKILL.md`

## Maintenance Rules

- Keep `SPEC.md` as the implementation source of truth.
- Keep `AGENTS.md` limited to stable project context, commands, and working conventions.
- Keep `justfile` focused on maintenance and developer lifecycle commands.
- Avoid read-only wrapper recipes for files that are easy to open directly.
- Keep skill descriptions concise and trigger-focused.
- Prefer repo-relative paths over machine-specific absolute paths.
- Do not commit generated runtime state, package tarballs, dependency folders, logs, or secrets.

## Milestone Workflow

1. Make one coherent documentation, command, skill, or implementation change.
2. Run `just check`.
3. Inspect `git diff` and `git status --short --branch`.
4. Commit with a focused message.

## When To Update This Skill

- A new repo workflow becomes stable.
- A new class of tests or fixtures is added.
- Release criteria change.
- `justfile` command names change.
