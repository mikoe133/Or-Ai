import { useState } from "react";
import { LocalArchiveSchema, type AssetAuthoring } from "@orai/contracts/admin";
import { api } from "../api/consumer.js";
import { ClientError } from "../api/client.js";
import { Failure, useAction } from "../business/shared.js";
import { adminApi, type Upload } from "./api.js";
import { sha256 } from "@noble/hashes/sha2.js";
export async function fileDigest(file: File) {
  const hash = sha256.create();
  for (let offset = 0; offset < file.size; offset += 1024 * 1024)
    hash.update(
      new Uint8Array(
        await file.slice(offset, offset + 1024 * 1024).arrayBuffer(),
      ),
    );
  return [...hash.digest()]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}
export function MediaPreview({
  file,
  label,
}: {
  file: Upload | null;
  label: string;
}) {
  const [failed, setFailed] = useState(false),
    action = useAction();
  if (!file || !file.downloadPath)
    return <p className="content-note">{label}：尚未上传</p>;
  return (
    <div className="content-media-preview">
      <h4>{label}</h4>
      {failed ? (
        <p role="alert">文件暂不可读取，请检查存储后刷新。</p>
      ) : file.kind === "cover" ? (
        <img
          src={file.downloadPath}
          alt={file.fileName}
          onError={() => setFailed(true)}
        />
      ) : (
        <video
          controls
          preload="metadata"
          src={file.downloadPath}
          onError={() => setFailed(true)}
        />
      )}
      <p>
        {file.fileName} · {file.mimeType} ·{" "}
        {(file.byteSize / 1024 / 1024).toFixed(2)} MiB
        <br />
        {file.width ? `${file.width} × ${file.height}` : "旧文件未记录尺寸"}
        {file.durationMs ? ` · ${(file.durationMs / 1000).toFixed(2)} 秒` : ""}
      </p>
      <details>
        <summary>文件校验摘要</summary>
        <code>{file.checksum}</code>
      </details>
      <button
        type="button"
        disabled={action.busy}
        onClick={() =>
          void action.run(async () => {
            const blob = await api.blob(file.downloadPath!),
              url = URL.createObjectURL(blob),
              anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = file.fileName;
            anchor.click();
            setTimeout(() => URL.revokeObjectURL(url), 30000);
          })
        }
      >
        授权下载{label}
      </button>
      {Boolean(action.error) && <Failure error={action.error} />}
    </div>
  );
}
export function FileSlot({
  versionId,
  kind,
  purpose,
  value,
  onChange,
  onBusy,
  onPending,
}: {
  versionId: string;
  kind: "cover" | "video";
  purpose: string;
  value: Upload | null;
  onChange: (value: Upload | null) => void;
  onBusy: (value: boolean) => void;
  onPending: (value: boolean) => void;
}) {
  const action = useAction(),
    [file, setFile] = useState<File | null>(null),
    [ticket, setTicket] = useState<Upload | null>(null),
    [notice, setNotice] = useState(""),
    [attempt, setAttempt] = useState(0);
  return (
    <section className="content-file-slot" aria-label={purpose + "上传"}>
      <label>
        {purpose}文件
        <input
          aria-label={purpose + "文件"}
          type="file"
          accept={
            kind === "cover"
              ? "image/png,image/jpeg,image/webp"
              : "video/mp4,video/webm"
          }
          disabled={action.busy}
          onChange={(event) => {
            const next = event.target.files?.[0] ?? null;
            setFile(next);
            setTicket(null);
            setNotice("");
            setAttempt((value) => value + 1);
            onPending(!!next);
          }}
        />
      </label>
      <div className="biz-row">
        <button
          type="button"
          disabled={action.busy || !file}
          onClick={() =>
            void action.run(
              async () => {
                onBusy(true);
                setNotice("正在上传并校验…");
                try {
                  const maximum = (kind === "cover" ? 10 : 100) * 1024 * 1024;
                  if (!file || file.size > maximum || file.size < 1)
                    throw new ClientError(
                      "VALIDATION_ERROR",
                      `请选择不超过 ${maximum / 1024 / 1024} MiB 的文件。`,
                    );
                  const checksum = await fileDigest(file);
                  let current = ticket
                    ? await adminApi.status(ticket.id)
                    : await adminApi.prepare(
                        action.intent("upload:" + attempt, {
                          productVersionId: versionId,
                          kind,
                          fileName: file.name,
                          mimeType: file.type,
                          byteSize: file.size,
                          checksum,
                        }),
                      );
                  setTicket(current);
                  if (current.status === "pending") {
                    current = await adminApi.upload(current.id, file);
                    setTicket(current);
                  }
                  if (current.status === "uploaded")
                    current = await adminApi.complete(
                      current.id,
                      action.intent("complete:" + current.id, {}),
                    );
                  if (current.status !== "available") {
                    setAttempt((value) => value + 1);
                    setTicket(null);
                    throw new ClientError(
                      "CONFLICT",
                      "本次上传未完成。请等待正在传输的请求结束，或重新上传。",
                    );
                  }
                  return current;
                } catch (error) {
                  setNotice("本次上传未完成，可重试或取消待上传文件。");
                  throw error;
                } finally {
                  onBusy(false);
                }
              },
              (result) => {
                onChange(result);
                setTicket(result);
                setFile(null);
                onPending(false);
                setNotice(purpose + "已校验，请保存素材。");
              },
            )
          }
        >
          上传并校验{purpose}
        </button>
        {file && (
          <button
            type="button"
            disabled={action.busy}
            onClick={() => {
              setFile(null);
              setTicket(null);
              setAttempt((value) => value + 1);
              onPending(false);
              setNotice("已取消待上传文件。");
            }}
          >
            取消待上传{purpose}
          </button>
        )}
        {value && (
          <button
            type="button"
            disabled={action.busy}
            onClick={() => {
              onChange(null);
              setTicket(null);
              setFile(null);
              onPending(false);
            }}
          >
            移除{purpose}关联
          </button>
        )}
      </div>
      <small>
        图片上限 10 MiB，视频上限 100
        MiB。中断后可重试；已传完的文件会继续校验。
      </small>
      {notice && <p role="status">{notice}</p>}
      {Boolean(action.error) && <Failure error={action.error} />}
      <MediaPreview key={value?.id ?? "empty"} file={value} label={purpose} />
    </section>
  );
}
export function ArchiveEditor({
  kind,
  value,
  onChange,
  onBusy,
}: {
  kind: "cover" | "video";
  value: AssetAuthoring["media"]["localArchive"];
  onChange: (value: AssetAuthoring["media"]["localArchive"]) => void;
  onBusy: (value: boolean) => void;
}) {
  const [archiveId, setArchiveId] = useState(value?.archiveId ?? ""),
    action = useAction(),
    [notice, setNotice] = useState("");
  return (
    <section className="content-file-slot">
      <h4>本地原件登记</h4>
      <p className="content-note">
        选择原件只计算摘要与登记文件信息，文件字节留在本机。请自行备份硬盘或
        NAS。
      </p>
      <label>
        归档编号
        <input
          aria-label="归档编号"
          maxLength={64}
          value={archiveId}
          onChange={(event) => setArchiveId(event.target.value)}
          disabled={action.busy}
        />
      </label>
      <label>
        登记本地原件
        <input
          aria-label="登记本地原件"
          type="file"
          disabled={action.busy}
          accept={
            kind === "cover"
              ? "image/png,image/jpeg,image/webp"
              : "video/mp4,video/webm"
          }
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void action.run(
              async () => {
                onBusy(true);
                try {
                  return LocalArchiveSchema.parse({
                    archiveId,
                    fileName: file.name,
                    mimeType: file.type,
                    byteSize: file.size,
                    checksum: await fileDigest(file),
                  });
                } finally {
                  onBusy(false);
                }
              },
              (result) => {
                onChange(result);
                setNotice("原件信息已登记，请保存素材。");
              },
            );
          }}
        />
      </label>
      {value && (
        <>
          <p>
            {value.archiveId} · {value.fileName} ·{" "}
            {(value.byteSize / 1024 / 1024).toFixed(2)} MiB
          </p>
          <button type="button" onClick={() => onChange(null)}>
            移除原件登记
          </button>
        </>
      )}
      {notice && <p role="status">{notice}</p>}
      {Boolean(action.error) && <Failure error={action.error} />}
    </section>
  );
}
