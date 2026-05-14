set shell := ["zsh", "-uc"]

[private]
default:
    @just --list

status:
    git status --short --branch

check: _check-docs _check-skills

verify: check lint test build
    @echo "verification complete"

format:
    @just _run-package-script format

lint:
    @just _run-package-script lint

typecheck:
    @just _run-package-script typecheck

test:
    @just _run-package-script test

build:
    @just _run-package-script build

pack:
    npm pack --dry-run

release-check: verify format pack

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
_run-package-script script:
    npm run {{script}}
