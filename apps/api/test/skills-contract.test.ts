import assert from "node:assert/strict";
import { test } from "node:test";
import {
  StyleSkillManifestSchema,
  SkillReferencePathSchema,
  missingSkillReferences,
} from "@orai/contracts/admin";
const manifest = () => ({
  schemaVersion: 1,
  domain: "assessment",
  name: "温柔观察",
  description: "给出具体的观察与表达线索",
  purposes: ["report_writing"],
  styles: ["温柔"],
  supportedForms: ["web"],
  inputs: [
    {
      key: "creative-profile",
      description: "固定共同创作设定",
      required: true,
    },
  ],
  outputs: [{ key: "report", description: "符合既有模板的报告" }],
  instructions: "尊重作答者，避免确定性诊断。",
  examples: [],
  references: [],
});
test("skills keep professional purpose and shared creative-profile requirements separate from style labels", () => {
  assert.equal(StyleSkillManifestSchema.safeParse(manifest()).success, true);
  for (const changed of [
    { domain: "cover" },
    { purposes: ["cover_design"] },
    { inputs: [] },
    {
      inputs: [
        { key: "creative-profile", description: "设定", required: false },
      ],
    },
    { styles: ["温柔", "温柔"] },
  ])
    assert.equal(
      StyleSkillManifestSchema.safeParse({ ...manifest(), ...changed }).success,
      false,
    );
});
test("skill package references reject traversal, encoded paths, protocol URLs and missing attachments", () => {
  for (const path of [
    "../secret",
    "/secret",
    "C:/secret",
    "refs/%2e%2e/a.txt",
    "refs/../x.md",
    "SKILL.md",
    "a\\b.txt",
  ])
    assert.equal(SkillReferencePathSchema.safeParse(path).success, false);
  assert.equal(
    SkillReferencePathSchema.safeParse("references/表达示例.md").success,
    true,
  );
  assert.deepEqual(
    missingSkillReferences(
      '[表达](references/a.md)\n[x]: references/b.md\n<img src="references/c.png">',
      ["references/a.md"],
    ),
    ["references/b.md", "references/c.png"],
  );
  assert.deepEqual(
    missingSkillReferences(
      "[官网](https://example.test) [章节](#one) `![example](not-a-file)`",
      [],
    ),
    [],
  );
  assert.equal(
    StyleSkillManifestSchema.safeParse({
      ...manifest(),
      instructions: "[表达](references/missing.md)",
    }).success,
    false,
  );
});
