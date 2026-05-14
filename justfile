set shell := ["zsh", "-uc"]

[private]
default:
    @just --list

status:
    git status --short --branch

check: _check-docs _check-skills
    @just _run-package-script check

verify:
    @just _run-package-script verify

verify-integration:
    @just _run-package-script verify:integration

format:
    @just _run-package-script format

lint:
    @just _run-package-script lint

typecheck:
    @just _run-package-script typecheck

test:
    @just test-unit
    @just test-e2e

test-unit:
    @just _run-package-script test:unit

test-e2e: build
    @just _run-package-script test:e2e

test-e2e-npm: build
    node --test test/e2e/npm-packed-fixture.test.mjs

test-e2e-sdk-loader: build
    node --test test/e2e/sdk-loader-fixture.test.mjs

test-e2e-deno: build
    node --test test/e2e/deno-packed-fixture.test.mjs

test-e2e-rust: build
    node --test test/e2e/rust-wire-format.test.mjs

test-e2e-temporal-worker:
    @just _run-package-script test:e2e:temporal-worker

build:
    @just _run-package-script build

pack:
    @just _run-package-script pack

release-check:
    @just _run-package-script release-check

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
