import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed: ${command} ${args.join(" ")}`,
        `cwd: ${options.cwd ?? repoRoot}`,
        `exit code: ${result.status}`,
        result.stdout ? `stdout:\n${result.stdout}` : "",
        result.stderr ? `stderr:\n${result.stderr}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return result;
}

export function makeTempDir(label) {
  const safeLabel = label.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return mkdtempSync(join(tmpdir(), `temporal-protobuf-es-${safeLabel}-`));
}

export function removeTempDir(path) {
  rmSync(path, { recursive: true, force: true });
}

export function installPackedPackageFixture(tempDir) {
  const tarball = packCurrentPackage(tempDir);

  writeJson(join(tempDir, "package.json"), {
    private: true,
    type: "module",
    dependencies: {
      "@nu-sync/temporal-protobuf-es": `file:${tarball}`,
      "@bufbuild/protobuf": `file:${join(
        repoRoot,
        "node_modules/@bufbuild/protobuf",
      )}`,
      "@temporalio/common": `file:${join(
        repoRoot,
        "node_modules/@temporalio/common",
      )}`,
    },
  });

  run(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
      "--legacy-peer-deps",
    ],
    { cwd: tempDir },
  );

  return { tarball };
}

export function metadataString(payload, key) {
  return textDecoder.decode(payload.metadata?.[key]);
}

export function encodeMetadata(value) {
  return textEncoder.encode(value);
}

export function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function hexToBytes(hex) {
  assert.equal(hex.length % 2, 0, `hex byte strings must be even: ${hex}`);

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

export function formatRecord(record) {
  return `${Object.entries(record)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")}\n`;
}

export function parseRecord(content) {
  const record = {};

  for (const line of content.split(/\r?\n/)) {
    if (line === "") {
      continue;
    }

    const separator = line.indexOf("=");
    assert.notEqual(separator, -1, `missing key/value separator in: ${line}`);
    record[line.slice(0, separator)] = line.slice(separator + 1);
  }

  return record;
}

function packCurrentPackage(tempDir) {
  const result = run("npm", ["pack", "--json", "--pack-destination", tempDir]);
  const [pack] = JSON.parse(result.stdout);

  assert.equal(typeof pack.filename, "string");
  return join(tempDir, pack.filename);
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}
