import type { AdminAuditSchema, AdminOverviewSchema } from "@orai/contracts/admin";

export type OverviewData = ReturnType<typeof AdminOverviewSchema.parse>;
export type AuditEntry = ReturnType<typeof AdminAuditSchema.parse>;
export type EventSource = OverviewData["events"][number]["source"];
export type ChartDatum = { key: string; label: string; count: number; color: string };

export const eventLabels = {
  view: "浏览商品", redemption: "兑换成功", start: "开始体验", complete: "完成体验",
  report_view: "查看报告", share_export: "导出分享内容", refund: "退款撤权",
} satisfies Record<OverviewData["events"][number]["kind"], string>;
export const eventSources: ChartDatum[] = [
  { key: "web", label: "网站", count: 0, color: "#bea5ec" },
  { key: "manual", label: "人工记录", count: 0, color: "#accdbc" },
  { key: "demo", label: "测试来源", count: 0, color: "#77788f" },
];
export const orderStatuses: ChartDatum[] = [
  { key: "pending", label: "待交付", count: 0, color: "#bea5ec" },
  { key: "fulfilled", label: "已交付", count: 0, color: "#accdbc" },
  { key: "refunded", label: "已退款", count: 0, color: "#e2a6b5" },
  { key: "cancelled", label: "已取消", count: 0, color: "#77788f" },
];

export const auditActionLabels: Record<string, string> = {
  "codex.connection.create": "建立 Codex 授权",
  "codex.connection.revoke": "撤销 Codex 授权",
  "categories.create": "创建分类",
  "categories.update": "更新分类",
  "tags.create": "创建标签",
  "tags.update": "更新标签",
  "products.create": "创建商品",
  "products.update": "更新商品资料",
  "products.cover": "采用商品封面",
  "catalog.import": "导入配置版本",
  "catalog.replace": "保存配置草稿",
  "catalog.review": "审核配置版本",
  "catalog.publish": "发布商品版本",
  "catalog.archive": "下架商品",
  "assets.create": "创建素材草稿",
  "assets.update": "更新素材",
  "assets.review": "审核素材",
  "assets.ready": "标记素材就绪",
  "assets.archive": "归档素材",
  "files.prepare": "创建文件上传",
  "files.complete": "完成文件校验",
  "content.profile": "保存创作设定",
  "content.assessment": "保存题库与报告",
  "content.asset": "保存内容素材",
  "content.production": "登记制作来源",
  "content.review": "确认内容复查",
  "content.adopt": "采用成套内容",
  "content.cleanup-preview": "预演文件清理",
  "content.cleanup-start": "执行文件清理",
  "content.cleanup-file": "清理过期文件",
  "skills.create": "创建 skill",
  "skills.save": "保存 skill 草稿",
  "skills.clone": "创建 skill 新版本",
  "skills.review": "审核 skill 版本",
  "skills.activate": "启用 skill 版本",
  "skills.archive": "归档 skill 版本",
  "skills.bind": "保存 skill 组合",
  "skills.files.prepare": "创建 skill 附件上传",
  "skills.files.complete": "完成 skill 附件校验",
  "machine.credentials.create": "签发 MCP 连接",
  "machine.credentials.revoke": "撤销 MCP 连接",
  "machine.upload.prepare": "创建 MCP 上传",
  "machine.files.prepare": "准备 MCP 文件上传",
  "delivery.order": "登记人工订单",
  "delivery.issue": "首次发放兑换码",
  "delivery.replace": "补发兑换码",
  "delivery.refund": "登记退款并撤权",
  "orders.import.reserve": "创建订单导入批次",
  "orders.import.complete": "完成订单批量导入",
};
export const auditEntityLabels: Record<string, string> = {
  categories: "分类",
  tags: "标签",
  product: "商品",
  product_version: "商品版本",
  campaign_asset: "宣传素材",
  asset_file: "媒体文件",
  creative_profile_revision: "创作设定版本",
  content_revision: "内容修订",
  production_record: "制作来源记录",
  content_review: "内容复查记录",
  content_package: "成套内容",
  file_cleanup_plan: "文件清理计划",
  style_skill: "制作 skill",
  style_skill_version: "Skill 版本",
  creative_skill_set: "Skill 组合",
  skill_reference_file: "Skill 参考附件",
  machine_credential: "MCP 连接凭据",
  machine_upload: "MCP 上传文件",
  order: "订单",
  code_batch: "兑换码批次",
  redemption_code: "兑换码",
  order_import: "订单导入批次",
};

export function labelFor(labels: Record<string, string>, key: string): string {
  return Object.hasOwn(labels, key) ? labels[key]! : key;
}


export function experienceCounts(events: OverviewData["events"], source: EventSource | "all" = "all"): ChartDatum[] {
  return Object.entries(eventLabels).map(([key, label]) => ({
    key, label, color: key === "refund" ? "#e2a6b5" : "#bea5ec",
    count: events.reduce((sum, event) => sum + (event.kind === key && (source === "all" || event.source === source) ? event.count : 0), 0),
  }));
}

export function sourceCounts(events: OverviewData["events"]): ChartDatum[] {
  return eventSources.map(source => ({ ...source,
    count: events.reduce((sum, event) => sum + (event.source === source.key ? event.count : 0), 0),
  }));
}

export function statusCounts(statuses: OverviewData["orders"]["statuses"]): ChartDatum[] {
  return orderStatuses.map(status => ({ ...status,
    count: statuses.reduce((sum, entry) => sum + (entry.status === status.key ? entry.count : 0), 0),
  }));
}

// This distribution always describes the loaded audit page, never the global total.
export function auditCounts(items: AuditEntry[], by: "action" | "entityKind"): ChartDatum[] {
  const groups = new Map<string, number>();
  for (const item of items) groups.set(item[by], (groups.get(item[by]) ?? 0) + 1);
  const labels = by === "action" ? auditActionLabels : auditEntityLabels;
  return Array.from(groups, ([key, count]) => ({ key, count, label: labelFor(labels, key), color: "#bea5ec" }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export function chartScale(data: ChartDatum[]) {
  const max = Math.max(0, ...data.map(item => item.count));
  if (max === 0) return 1;
  const step = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / step) * step;
}
