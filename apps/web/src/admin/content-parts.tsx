import type { AssetAuthoring } from "@orai/contracts/admin";
export function ProductionOrigin({ source }: { source: {
  source: string; machineCredentialId?: string; machineRequestId?: string;
} | null }) {
  if (!source) return null;
  if (source.machineCredentialId && source.machineRequestId) return <div className="content-note" aria-label="已核实机器保存来源">
    <strong>已核实 MCP 接入</strong>
    <p>机器连接：<code>{source.machineCredentialId}</code><br />请求：<code>{source.machineRequestId}</code></p>
    <small>已确认通过授权机器接口保存；模型与 skill 的实际执行由制作端负责。</small>
  </div>;
  return source.source === "mcp" ? <p className="content-note">MCP 来源申报 · 未核实机器接入</p> : null;
}
export function StructuredEditor({
  content,
  onChange,
}: {
  content: AssetAuthoring["content"];
  onChange: (value: AssetAuthoring["content"]) => void;
}) {
  if (content.kind === "cover")
    return (
      <>
        <label>
          封面标题
          <input
            required
            maxLength={160}
            value={content.title}
            onChange={(event) =>
              onChange({ ...content, title: event.target.value })
            }
          />
        </label>
        <label>
          画面与传播说明
          <textarea
            required
            maxLength={2000}
            value={content.description}
            onChange={(event) =>
              onChange({ ...content, description: event.target.value })
            }
          />
        </label>
      </>
    );
  if (content.kind === "copy")
    return (
      <>
        {content.blocks.map((block, index) => (
          <div className="content-block content-structured-block" key={index}>
            <h4><span>{String(index + 1).padStart(2, "0")}</span> 文案块</h4>
            <div className="content-fields">
              <label>
                文案块 ID
                <input
                  aria-label={`文案块 ${index + 1} ID`}
                  required
                  value={block.blockId}
                  onChange={(event) =>
                    onChange({
                      ...content,
                      blocks: content.blocks.map((value, at) =>
                        at === index
                          ? { ...value, blockId: event.target.value }
                          : value,
                      ),
                    })
                  }
                />
              </label>
              <label>
                用途
                <select
                  aria-label={`文案块 ${index + 1} 用途`}
                  value={block.role}
                  onChange={(event) =>
                    onChange({
                      ...content,
                      blocks: content.blocks.map((value, at) =>
                        at === index
                          ? {
                              ...value,
                              role: event.target.value as typeof block.role,
                            }
                          : value,
                      ),
                    })
                  }
                >
                  {Object.entries({
                    title: "标题",
                    hook: "钩子",
                    body: "正文",
                    topic: "话题",
                    subtitle: "字幕",
                    voiceover: "口播",
                    cta: "行动引导",
                  }).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              文案内容
              <textarea
                aria-label={`文案块 ${index + 1} 内容`}
                required
                maxLength={5000}
                value={block.text}
                onChange={(event) =>
                  onChange({
                    ...content,
                    blocks: content.blocks.map((value, at) =>
                      at === index
                        ? { ...value, text: event.target.value }
                        : value,
                    ),
                  })
                }
              />
            </label>
            <button
              type="button"
              disabled={content.blocks.length === 1}
              onClick={() =>
                onChange({
                  ...content,
                  blocks: content.blocks.filter((_, at) => at !== index),
                })
              }
            >
              移除文案块
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={content.blocks.length >= 100}
          onClick={() =>
            onChange({
              ...content,
              blocks: [
                ...content.blocks,
                {
                  blockId: "block-" + crypto.randomUUID().slice(0, 8),
                  role: "body",
                  text: "",
                },
              ],
            })
          }
        >
          添加文案块
        </button>
      </>
    );
  return (
    <>
      {content.scenes.map((scene, index) => (
        <div className="content-block content-structured-block" key={index}>
          <h4><span>{String(index + 1).padStart(2, "0")}</span> 分镜 <small>{scene.startMs / 1000}–{scene.endMs / 1000} 秒</small></h4>
          <div className="content-fields">
            <label>
              分镜 ID
              <input
                aria-label={`分镜 ${index + 1} ID`}
                required
                value={scene.sceneId}
                onChange={(event) =>
                  onChange({
                    ...content,
                    scenes: content.scenes.map((value, at) =>
                      at === index
                        ? { ...value, sceneId: event.target.value }
                        : value,
                    ),
                  })
                }
              />
            </label>
            <label>
              开始（毫秒）
              <input
                aria-label={`分镜 ${index + 1} 开始`}
                required
                type="number"
                min={0}
                max={86400000}
                value={scene.startMs}
                onChange={(event) =>
                  onChange({
                    ...content,
                    scenes: content.scenes.map((value, at) =>
                      at === index
                        ? { ...value, startMs: Number(event.target.value) }
                        : value,
                    ),
                  })
                }
              />
            </label>
            <label>
              结束（毫秒）
              <input
                aria-label={`分镜 ${index + 1} 结束`}
                required
                type="number"
                min={1}
                max={86400000}
                value={scene.endMs}
                onChange={(event) =>
                  onChange({
                    ...content,
                    scenes: content.scenes.map((value, at) =>
                      at === index
                        ? { ...value, endMs: Number(event.target.value) }
                        : value,
                    ),
                  })
                }
              />
            </label>
          </div>
          <label>
            画面、字幕与口播
            <textarea
              aria-label={`分镜 ${index + 1} 内容`}
              required
              maxLength={5000}
              value={scene.text}
              onChange={(event) =>
                onChange({
                  ...content,
                  scenes: content.scenes.map((value, at) =>
                    at === index
                      ? { ...value, text: event.target.value }
                      : value,
                  ),
                })
              }
            />
          </label>
          <button
            type="button"
            disabled={content.scenes.length === 1}
            onClick={() =>
              onChange({
                ...content,
                scenes: content.scenes.filter((_, at) => at !== index),
              })
            }
          >
            移除分镜
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={content.scenes.length >= 100}
        onClick={() =>
          onChange({
            ...content,
            scenes: [
              ...content.scenes,
              {
                sceneId: "scene-" + crypto.randomUUID().slice(0, 8),
                startMs: content.scenes.at(-1)!.endMs,
                endMs: content.scenes.at(-1)!.endMs + 5000,
                text: "",
              },
            ],
          })
        }
      >
        添加分镜
      </button>
    </>
  );
}
