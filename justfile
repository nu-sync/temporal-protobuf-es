set shell := ["zsh", "-uc"]

default:
    @just --list

check: check-docs check-skills

verify: check
    @echo "spec-phase verification complete"

check-docs:
    test -s SPEC.md
    test -s AGENTS.md
    test -s justfile
    grep -q '^# temporal-protobuf-es' SPEC.md
    grep -q '^# AGENTS.md' AGENTS.md
    grep -q '^## Release Criteria' SPEC.md
    grep -q '^## Test Plan' SPEC.md
    grep -q '^## Wire Format Modes' SPEC.md
    grep -q 'named `payloadConverter` export' SPEC.md

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

planned-commands:
    @printf '%s\n' \
      'build' \
      'typecheck' \
      'lint' \
      'format' \
      'test' \
      'test-unit' \
      'test-integration' \
      'pack' \
      'fixture-npm' \
      'fixture-deno' \
      'compat-rust' \
      'release-check'

sdk-protobuf-es-reference:
    @for path in \
      ../sdk-typescript/packages/common/src/converter/protobuf-es-payload-converters.ts \
      ../sdk-typescript/packages/common/src/protobufs-es.ts \
      ../sdk-typescript/packages/common/src/converter/types.ts \
      ../sdk-typescript/packages/common/src/internal-non-workflow/data-converter-helpers.ts \
      ../sdk-typescript/packages/worker/src/workflow/bundler.ts \
      ../sdk-typescript/packages/test/src/test-payload-converter-es.ts; do \
        if [ -f "$path" ]; then \
          echo "$path"; \
        else \
          echo "missing: $path"; \
        fi; \
      done

temporal-generator-reference:
    @for path in \
      ../protoc-gen-ts-temporal/crates/protoc-gen-ts-temporal/src/render.rs \
      ../protoc-gen-ts-temporal/examples/minimal/src/data-converter.ts \
      ../protoc-gen-ts-temporal/examples/minimal/src/client.ts \
      ../protoc-gen-ts-temporal/examples/minimal/src/worker.ts \
      ../protoc-gen-rust-temporal/WIRE-FORMAT.md; do \
        if [ -f "$path" ]; then \
          echo "$path"; \
        else \
          echo "missing: $path"; \
        fi; \
      done

[private]
_package-scaffold-required:
    @test -f package.json || (echo "Package scaffold not present yet. Complete the package skeleton milestone first." >&2; exit 1)

build: _package-scaffold-required
    pnpm build

typecheck: _package-scaffold-required
    pnpm typecheck

lint: _package-scaffold-required
    pnpm lint

format: _package-scaffold-required
    pnpm format

test: _package-scaffold-required
    pnpm test

test-unit: _package-scaffold-required
    pnpm test:unit

test-integration: _package-scaffold-required
    pnpm test:integration

pack: _package-scaffold-required
    npm pack --dry-run

fixture-npm: _package-scaffold-required
    @test -d test/fixtures/npm || (echo "npm fixture not present yet" >&2; exit 1)
    pnpm fixture:npm

fixture-deno: _package-scaffold-required
    @test -d test/fixtures/deno || (echo "Deno fixture not present yet" >&2; exit 1)
    pnpm fixture:deno

compat-rust: _package-scaffold-required
    @test -d test/fixtures/rust || (echo "Rust compatibility fixture not present yet" >&2; exit 1)
    pnpm compat:rust

release-check: check build typecheck lint test pack fixture-npm fixture-deno compat-rust
