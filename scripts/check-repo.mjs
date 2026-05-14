import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function fileContains(path, needle) {
  return readFileSync(path, "utf8").includes(needle);
}

for (const path of ["SPEC.md", "AGENTS.md", "justfile"]) {
  check(existsSync(path), `${path} is missing`);
  check(statSync(path).size > 0, `${path} is empty`);
}

check(
  fileContains("SPEC.md", "# temporal-protobuf-es"),
  "SPEC.md title is missing",
);
check(fileContains("AGENTS.md", "# AGENTS.md"), "AGENTS.md title is missing");

for (const heading of [
  "## Release Criteria",
  "## Test Plan",
  "## Wire Format Modes",
]) {
  check(fileContains("SPEC.md", heading), `SPEC.md is missing ${heading}`);
}

check(
  fileContains("SPEC.md", "named `payloadConverter` export"),
  "SPEC.md is missing the payloadConverterPath module contract",
);

const skillsDir = ".agents/skills";

if (existsSync(skillsDir)) {
  let foundSkill = false;

  for (const entry of readdirSync(skillsDir)) {
    const skillPath = join(skillsDir, entry, "SKILL.md");

    if (!existsSync(skillPath)) {
      continue;
    }

    foundSkill = true;
    const skill = readFileSync(skillPath, "utf8");
    const frontmatterDelimiters = skill.match(/^---$/gm) ?? [];

    check(
      frontmatterDelimiters.length >= 2,
      `${skillPath} is missing YAML frontmatter delimiters`,
    );
    check(skill.includes("name:"), `${skillPath} is missing name`);
    check(
      skill.includes("description:"),
      `${skillPath} is missing description`,
    );
  }

  if (!foundSkill) {
    console.warn("No repo-local skills found under .agents/skills");
  }
} else {
  console.warn("No .agents/skills directory yet");
}
