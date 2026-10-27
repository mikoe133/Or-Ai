import { ApiException } from "../common/http-errors";
export const referenceExtensions: Record<string, string[]> = {
  "text/markdown": ["md"],
  "text/plain": ["txt"],
  "application/json": ["json"],
  "application/pdf": ["pdf"],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
};
export function checkReferenceName(name: string, mime: string) {
  return Boolean(
    referenceExtensions[mime]?.includes(name.split(".").at(-1)!.toLowerCase()),
  );
}
export function referenceContent(bytes: Buffer, mime: string) {
  if (bytes.length < 1 || bytes.length > 5 * 1024 * 1024)
    throw new ApiException(
      "VALIDATION_ERROR",
      "参考文件需为 1 字节至 5 MiB",
      400,
    );
  if (mime === "application/pdf") {
    if (
      !/^%PDF-(?:1\.[0-7]|2\.0)/.test(bytes.toString("ascii", 0, 9)) ||
      !bytes.subarray(-1024).includes(Buffer.from("%%EOF"))
    )
      throw new ApiException("VALIDATION_ERROR", "PDF 文件头或结尾不完整", 400);
  } else {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new ApiException(
        "VALIDATION_ERROR",
        "参考文本必须是有效 UTF-8",
        400,
      );
    }
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text))
      throw new ApiException(
        "VALIDATION_ERROR",
        "参考文本含不支持的控制字符",
        400,
      );
    if (mime === "application/json") {
      try {
        JSON.parse(text);
      } catch {
        throw new ApiException("VALIDATION_ERROR", "参考 JSON 格式不正确", 400);
      }
    } else if (!["text/plain", "text/markdown"].includes(mime))
      throw new ApiException("VALIDATION_ERROR", "不支持的参考文件类型", 400);
  }
  return mime;
}
