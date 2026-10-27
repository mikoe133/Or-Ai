import assert from "node:assert/strict";
import { test } from "node:test";
import { StyleSkillManifestSchema, skillPurposes, hasThreejsSkillPolicy, withThreejsSkillPolicy, threejsSkillInstructions } from "@orai/contracts/admin";
import {
  defaultSkill,
  importSkill,
  referenceMime,
} from "../src/admin/skills-model.js";
test("all five skill libraries and seven purposes require Three.js while animation and interaction follow the product plan", () => {
  let purposes = 0;
  for (const domain of ["assessment", "cover", "video", "copy", "experience"] as const) for (const purpose of skillPurposes[domain]) {
    const manifest = defaultSkill(domain, purpose); purposes++;
    assert.equal(manifest.schemaVersion, 2);
    assert.equal(StyleSkillManifestSchema.safeParse(manifest).success, true);
    assert.ok(
      manifest.purposes.every((value) =>
        (skillPurposes[domain] as readonly string[]).includes(value),
      ),
    );
    assert.ok(
      manifest.inputs.some(
        (value) => value.key === "creative-profile" && value.required,
      ),
    );
    assert.equal(manifest.references.length, 0);
    assert.deepEqual(manifest.supportedForms, ['3d']);
    assert.equal(hasThreejsSkillPolicy(manifest), true);
    assert.match(manifest.instructions, /以该商品固定版本的规划为准/);
    assert.ok(manifest.inputs.some(input => input.key === 'product-plan' && input.required));
  }
  assert.equal(purposes, 7);
  assert.throws(() => defaultSkill('cover', 'report_writing'));
});
test('adding the Three.js clause creates an idempotent draft without rewriting historical methods or losing references', () => {
  const original = { ...defaultSkill('assessment'), supportedForms: ['web' as const], instructions: '保留原有专属方法。',
    inputs: [{ key: 'creative-profile', description: '共同设定', required: true }, { key: 'product-plan', description: '保留输入说明', required: false }],
    references: [{ path: 'references/source.md', fileId: '00000000-0000-4000-8000-000000000001' }] };
  const before = JSON.stringify(original), next = withThreejsSkillPolicy(original);
  assert.equal(JSON.stringify(original), before);
  assert.equal(hasThreejsSkillPolicy(original), false);
  assert.equal(hasThreejsSkillPolicy(next), true);
  assert.deepEqual(next, withThreejsSkillPolicy(next));
  assert.deepEqual(next.references, original.references);
  assert.equal(next.inputs.filter(input => input.key === 'product-plan').length, 1);
  assert.equal(next.inputs.find(input => input.key === 'product-plan')!.description, '保留输入说明');
  assert.equal(next.instructions.split(threejsSkillInstructions).length - 1, 1);
  assert.match(next.instructions, /^保留原有专属方法/);
  assert.equal(StyleSkillManifestSchema.safeParse(next).success, true);
});
test("platform imports accept bare or exported manifests, preserve inert text and reject executable or foreign schemas", () => {
  const manifest = {
    ...defaultSkill("assessment"),
    instructions:
      '<script>do not execute</script>\n```js\nthrow new Error("inert")\n```\n' + defaultSkill('assessment').instructions,
  };
  assert.deepEqual(importSkill(JSON.stringify(manifest)), manifest);
  assert.deepEqual(
    importSkill(
      JSON.stringify({
        schemaVersion: 1,
        slug: "example",
        version: { manifest },
      }),
    ),
    manifest,
  );
  assert.throws(() => importSkill("{bad JSON"));
  assert.throws(() =>
    importSkill(JSON.stringify({ ...manifest, execute: true })),
  );
  assert.equal(referenceMime("指南.MD"), "text/markdown");
  assert.equal(referenceMime("guide.pdf"), "application/pdf");
  assert.equal(referenceMime("run.js"), undefined);
});
