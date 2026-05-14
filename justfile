set shell := ["zsh", "-uc"]

default:
    @just --list

check: check-docs check-skills

check-docs:
    test -s SPEC.md
    test -s AGENTS.md
    test -s justfile
    grep -q '^# temporal-protobuf-es' SPEC.md
    grep -q '^# AGENTS.md' AGENTS.md
    grep -q '^## Release Criteria' SPEC.md
    grep -q '^## Test Plan' SPEC.md

check-skills:
    @if [ -d .agents/skills ]; then \
      found=0; \
      for skill in .agents/skills/*/SKILL.md(N); do \
        found=1; \
        grep -q '^---$$' "$skill"; \
        grep -q '^name:' "$skill"; \
        grep -q '^description:' "$skill"; \
      done; \
      if [ "$found" -eq 0 ]; then \
        echo "No repo-local skills found under .agents/skills"; \
      fi; \
    else \
      echo "No .agents/skills directory yet"; \
    fi

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

sdk-protobuf-es-reference:
    @for path in \
      ../sdk-typescript/packages/common/src/converter/protobuf-es-payload-converters.ts \
      ../sdk-typescript/packages/common/src/protobufs-es.ts \
      ../sdk-typescript/packages/common/src/converter/types.ts \
      ../sdk-typescript/packages/test/src/test-payload-converter-es.ts; do \
        if [ -f "$path" ]; then \
          echo "$path"; \
        else \
          echo "missing: $path"; \
        fi; \
      done
