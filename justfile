set shell := ["zsh", "-uc"]

[private]
default:
    @just --list

check: _check-docs _check-skills

verify: check
    @echo "spec-phase verification complete"

status:
    git status --short --branch

diff:
    git diff -- SPEC.md AGENTS.md justfile .agents/skills

spec:
    sed -n '1,260p' SPEC.md

context:
    sed -n '1,220p' AGENTS.md

skills:
    @if [ -d .agents/skills ]; then \
      for skill in .agents/skills/*/SKILL.md(N); do \
        echo "$skill"; \
        sed -n '1,8p' "$skill" | grep -E '^(name|description):'; \
        echo; \
      done; \
    else \
      echo "No .agents/skills directory yet"; \
    fi

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
