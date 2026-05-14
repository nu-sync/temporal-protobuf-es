set shell := ["zsh", "-uc"]

[private]
default:
    @just --list

status:
    git status --short --branch

check: _check-docs _check-skills

verify: check
    @echo "spec-phase verification complete"

format: _package-scaffold-required
    pnpm format

lint: _package-scaffold-required
    pnpm lint

typecheck: _package-scaffold-required
    pnpm typecheck

test: _package-scaffold-required
    pnpm test

build: _package-scaffold-required
    pnpm build

pack: _package-scaffold-required
    npm pack --dry-run

release-check: check format lint typecheck test build pack

[private]
_check-docs:
    test -s SPEC.md
    test -s AGENTS.md
    test -s justfile
    grep -q '^# temporal-protobuf-es' SPEC.md
    grep -q '^# AGENTS.md' AGENTS.md
    grep -q '^## Release Criteria' SPEC.md
    grep -q '^## Test Plan' SPEC.md
    grep -q '^## Wire Format Modes' SPEC.md
    grep -q 'named `payloadConverter` export' SPEC.md

[private]
_check-skills:
    @if [ -d .agents/skills ]; then \
      found=0; \
      for skill in .agents/skills/*/SKILL.md(N); do \
        found=1; \
        test "$(grep -c '^---$' "$skill")" -ge 2; \
        grep -q '^name:' "$skill"; \
        grep -q '^description:' "$skill"; \
      done; \
      if [ "$found" -eq 0 ]; then \
        echo "No repo-local skills found under .agents/skills"; \
      fi; \
    else \
      echo "No .agents/skills directory yet"; \
    fi

[private]
_package-scaffold-required:
    @test -f package.json || (echo "Package scaffold not present yet. Complete the package skeleton milestone first." >&2; exit 1)
