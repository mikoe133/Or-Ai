import { useState } from "react";
import type { Asset } from "./api.js";

type PreviewAsset = Pick<Asset, "kind" | "variant" | "text" | "downloadPath">;

export function AssetPreview({ asset }: { asset: PreviewAsset }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const { kind, variant, text, downloadPath } = asset;
  if (kind === "copy" || kind === "script") {
    return <div className="admin-media-text-preview" data-preview="text">
      <span>{kind === "copy" ? "文案摘录" : "脚本摘录"}</span>
      <p>{text || "尚未填写文字内容"}</p>
    </div>;
  }
  if (downloadPath && failedSource !== downloadPath) {
    return kind === "cover"
      ? <img src={downloadPath} alt={variant + "封面"} loading="lazy" onError={() => setFailedSource(downloadPath)} />
      : <video src={downloadPath} preload="none" controls aria-label={variant + "视频预览"} onError={() => setFailedSource(downloadPath)} />;
  }
  return <div className="admin-media-unavailable" data-preview={downloadPath ? "failed" : "missing"}>
    <span>{kind === "cover" ? "封面预览" : "视频预览"}</span>
    <p>{downloadPath ? "预览暂时无法加载" : "尚未关联预览文件"}</p>
    {downloadPath ? <button type="button" onClick={() => setFailedSource(null)}>重试预览</button>
      : <small>在素材详情中查看或补充文件。</small>}
  </div>;
}
