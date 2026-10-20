import {
  AssetAuthoringSchema,
  CreativeProfileSchema,
  ProductConfigurationSchema,
  type AssetAuthoring,
  type ContentLocator,
} from "@orai/contracts/admin";
import type { AdminProduct } from "./api.js";
import type { Revision } from "./content-api.js";
export const domains = {
  assessment: "题库与报告",
  cover: "封面",
  video: "视频与分镜",
  copy: "引流文案",
} as const;
export const platforms = {
  manual: "通用",
  douyin: "抖音",
  xiaohongshu: "小红书",
} as const;
export const statuses: Record<string, string> = {
  draft: "草稿",
  reviewed: "已审核",
  ready: "已就绪",
  published: "已发布",
  archived: "已归档",
};
export function stringField(value: unknown) {
  return typeof value === "string" ? value : "";
}
export function authoringOf(revision: Revision) {
  const result = AssetAuthoringSchema.safeParse(revision.snapshot.authoring);
  return result.success ? result.data : null;
}
export function defaultProfile(product: Pick<AdminProduct, "name">) {
  return CreativeProfileSchema.parse({
    schemaVersion: 1,
    title: product.name.slice(0, 150) + " · 创作设定",
    audience: "希望更了解自己与关系的成年人",
    situation: "一次安静的自我观察",
    emotionalGoal: "感到被理解和接纳",
    understandingGoal: "辨认自己的需要与相处习惯",
    takeaway: "带走一个可以尝试的小行动",
    perspective: "self",
    experienceForm: "web",
    pace: "逐题思考，可暂停继续",
    world: "从日常生活中的具体情境出发",
    language: "温柔、具体、尊重差异",
    visual: "柔和色彩，清晰文字与留白",
    sound: "默认安静",
    reportPlan: {
      schemaVersion: 1,
      title: product.name.slice(0, 150) + " · 观察报告",
      narrative: "观察、解释，再给出一个可尝试的建议",
      presentation: "standard",
      sections: [
        {
          sectionId: "observation",
          title: "我的观察",
          purpose: "解释倾向与适用边界",
        },
        {
          sectionId: "next-step",
          title: "试着这样做",
          purpose: "给出一个具体的小行动",
        },
      ],
    },
    channels: ["manual"],
    deliverables: ["assessment", "cover", "video", "copy"],
  });
}
export function emptyContent(
  kind: AssetAuthoring["content"]["kind"],
): AssetAuthoring["content"] {
  if (kind === "cover") return { kind, title: "", description: "" };
  if (kind === "copy")
    return {
      kind,
      blocks: [
        { blockId: "hook", role: "hook", text: "" },
        { blockId: "cta", role: "cta", text: "" },
      ],
    };
  return {
    kind,
    scenes: [{ sceneId: "scene-1", startMs: 0, endMs: 5000, text: "" }],
  };
}
export function defaultConfiguration() {
  return ProductConfigurationSchema.parse({
    schemaVersion: 1,
    engine: "dimensions_v1",
    locale: "zh-CN",
    dimensions: [
      {
        id: "awareness",
        label: "自我觉察",
        weight: 1,
        minApplicableAnswers: 1,
        missingReason: "还需要更多适用的回答",
      },
    ],
    questions: [
      {
        id: "daily-need",
        text: "忙碌的一天结束后，你会给自己留一点安静的时间吗？",
        dimensionId: "awareness",
        required: true,
        weight: 1,
        options: [
          { id: "often", label: "经常会", notApplicable: false, points: 2 },
          { id: "sometimes", label: "偶尔会", notApplicable: false, points: 1 },
          { id: "na", label: "暂时不适用", notApplicable: true, points: null },
        ],
      },
    ],
    bands: [
      { resultTypeId: "exploring", min: 0, max: 50 },
      { resultTypeId: "noticing", min: 50, max: 100 },
    ],
    resultTypes: [
      {
        id: "exploring",
        label: "慢慢探索",
        summary: "可以从一个小习惯开始观察自己。",
      },
      { id: "noticing", label: "正在觉察", summary: "你正在辨认自己的需要。" },
    ],
    report: {
      disclaimer: "仅供自我探索，不构成心理诊断或关系结论。",
      missingDimensionPolicy: "null",
      templates: [
        {
          resultTypeId: "exploring",
          explanation: "留一点时间观察自己的感受。",
          suggestion: "今天试着记录一个自己的需要。",
        },
        {
          resultTypeId: "noticing",
          explanation: "你会留意自己的感受与需要。",
          suggestion: "试着把一个需要具体地表达出来。",
        },
      ],
      insufficient: {
        id: "insufficient",
        label: "信息还不充分",
        explanation: "当前适用的回答不足以形成观察。",
        suggestion: "可以在有合适经历时再来看看。",
      },
    },
    retention: {
      firstRedemptionDays: 30,
      entitlementDays: 365,
      rawAnswerDays: 30,
      reportDays: 365,
    },
    statisticsMinimum: 20,
  });
}
export function capability(
  profile: ReturnType<typeof defaultProfile> | undefined,
) {
  if (!profile) return "尚未设定";
  if (profile.perspective === "planned_two_person")
    return "双方参与：规划中，当前不可运行";
  if (profile.experienceForm !== "web")
    return `${profile.experienceForm} 形式：创作方案，待运行端支持`;
  return profile.perspective === "self"
    ? "当前支持单人自我探索"
    : "当前支持单人观察关系";
}

export function insertReferenceText(
  content: AssetAuthoring["content"],
  locator: ContentLocator,
  text: string,
): AssetAuthoring["content"] {
  const append = (current: string) =>
    current.includes(text) ? current : current ? current + "\n" + text : text;
  if (content.kind === "cover")
    return { ...content, description: append(content.description) };
  if (content.kind === "copy" && locator.kind === "block")
    return {
      ...content,
      blocks: content.blocks.map((block) =>
        block.blockId === locator.blockId
          ? { ...block, text: append(block.text) }
          : block,
      ),
    };
  if (
    (content.kind === "video" || content.kind === "script") &&
    locator.kind === "scene"
  )
    return {
      ...content,
      scenes: content.scenes.map((scene) =>
        scene.sceneId === locator.sceneId
          ? { ...scene, text: append(scene.text) }
          : scene,
      ),
    };
  return content;
}
