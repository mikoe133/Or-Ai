import {
  ProductionDomainSchema,
  StyleSkillManifestSchema,
  skillPurposes,
  withThreejsSkillPolicy,
  threejsPurposeInstructions,
  type StyleSkillManifest,
} from "@orai/contracts/admin";
export const skillDomains = {
  assessment: "题库与报告",
  cover: "封面",
  video: "视频",
  copy: "引流文案",
  experience: "交互体验",
} as const;
export const purposeLabels = {
  assessment_design: "题目与规则设计",
  report_writing: "报告写作",
  cover_design: "封面制作",
  video_production: "视频与分镜",
  copywriting: "传播文案",
  scene_design: "场景与交互设计",
  report_presentation: "报告呈现",
} as const;
export const skillStatuses = {
  draft: "草稿",
  reviewed: "已审核",
  active: "已启用",
  archived: "已归档",
} as const;
export function defaultSkill(domainInput: string, purpose?: StyleSkillManifest['purposes'][number]): StyleSkillManifest {
  const domain = ProductionDomainSchema.parse(domainInput);
  const selectedPurpose = purpose ?? skillPurposes[domain][0];
  if (!(skillPurposes[domain] as readonly string[]).includes(selectedPurpose)) throw new Error('专业用途与 skill 领域不符');
  return withThreejsSkillPolicy({
    schemaVersion: 1,
    domain,
    name: "新的" + skillDomains[domain] + " skill",
    description: "说明此 skill 的用途、适用场景与制作目标。",
    purposes: [selectedPurpose],
    styles: ["温柔"],
    supportedForms: ["3d"],
    inputs: [
      {
        key: "creative-profile",
        description: "固定修订的共同创作设定与情绪/理解目标",
        required: true,
      },
    ],
    outputs: [
      {
        key: "deliverable",
        description: "与商品设定及本领域用途匹配的结构化内容",
      },
    ],
    instructions:
      "尊重使用者，以具体的理解、表达与沟通线索提供情绪价值。\n避免确定性诊断、贴标签或夸大传播承诺。\n" + threejsPurposeInstructions[selectedPurpose],
    examples: [],
    references: [],
  });
}
export function importSkill(text: string) {
  const input: unknown = JSON.parse(text);
  if (input && typeof input === "object" && "version" in input) {
    const version = (input as { version: unknown }).version;
    if (version && typeof version === "object" && "manifest" in version)
      return StyleSkillManifestSchema.parse(
        (version as { manifest: unknown }).manifest,
      );
  }
  return StyleSkillManifestSchema.parse(input);
}
export const referenceMime = (name: string) =>
  ({
    md: "text/markdown",
    txt: "text/plain",
    json: "application/json",
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
  })[name.split(".").at(-1)?.toLowerCase() ?? ""];
