import assert from "node:assert/strict";
import { test } from "node:test";
import { KeySchema } from "@orai/contracts";
import {
  CreativeProfileSchema,
  ProductConfigurationSchema,
} from "@orai/contracts/admin";
import {
  defaultProfile,
  defaultConfiguration,
  emptyContent,
  capability,
} from "../src/admin/content-model.js";

test("workbench starting drafts satisfy the real authoring and runtime schemas, including stable locator IDs", () => {
  for (const name of ["观察自己", "长".repeat(160)]) {
    const profile = defaultProfile({ name });
    assert.equal(CreativeProfileSchema.safeParse(profile).success, true);
    assert.ok(
      profile.reportPlan.sections.every(
        (section) => KeySchema.safeParse(section.sectionId).success,
      ),
    );
  }
  const configuration = defaultConfiguration();
  assert.equal(
    ProductConfigurationSchema.safeParse(configuration).success,
    true,
  );
  for (const kind of ["copy", "video", "script", "cover"] as const) {
    const content = emptyContent(kind);
    if (content.kind === "copy")
      assert.ok(
        content.blocks.every(
          (block) => KeySchema.safeParse(block.blockId).success,
        ),
      );
    if (content.kind === "video" || content.kind === "script")
      assert.ok(
        content.scenes.every(
          (scene) => KeySchema.safeParse(scene.sceneId).success,
        ),
      );
  }
});
test("workbench labels distinguish a supported single-person runtime from planned forms and two-person participation", () => {
  const profile = defaultProfile({ name: "关系观察" });
  assert.match(capability(profile), /当前支持单人/);
  assert.match(
    capability({ ...profile, perspective: "planned_two_person" }),
    /规划中.*不可运行/,
  );
  for (const experienceForm of ["3d", "2.5d", "cards", "game"] as const)
    assert.match(capability({ ...profile, experienceForm }), /待运行端支持/);
});

test("fixed-reference insertion changes only the selected stable scene and preserves an explicit adapted quote", async () => {
  const { insertReferenceText } = await import("../src/admin/content-model.js");
  const content = {
    kind: "video" as const,
    scenes: [
      { sceneId: "opening", startMs: 0, endMs: 1000, text: "开场" },
      { sceneId: "question", startMs: 1000, endMs: 2000, text: "" },
    ],
  };
  const result = insertReferenceText(
    content,
    { kind: "scene", sceneId: "question" },
    "你想怎样被陪伴？",
  );
  assert.equal(result.kind, "video");
  if (result.kind !== "video") throw new Error("Wrong domain");
  assert.deepEqual(result.scenes[0], content.scenes[0]);
  assert.equal(result.scenes[1]!.sceneId, "question");
  assert.equal(result.scenes[1]!.text, "你想怎样被陪伴？");
  assert.deepEqual(
    insertReferenceText(
      result,
      { kind: "scene", sceneId: "question" },
      "你想怎样被陪伴？",
    ),
    result,
  );
  assert.equal(content.scenes[1]!.text, "");
});
