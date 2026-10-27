import { constants } from "node:fs";
import { open, realpath, stat, type FileHandle } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { AdapterError } from "./errors.js";
import { MAX_FILE_BYTES } from "./config.js";

function contained(root: string, path: string) {
  const segment = relative(root, path);
  return segment !== "" && segment !== ".." &&
    !segment.startsWith(`..${sep}`) && !isAbsolute(segment);
}

export async function openCheckedFile(
  root: string,
  input: string,
  expected: { byteSize: number; checksum: string },
): Promise<FileHandle> {
  let handle: FileHandle | undefined;
  try {
    if (/^[a-z][a-z0-9+.-]*:/i.test(input) || input.includes("\0"))
      throw new AdapterError("FILE_OUTSIDE_ROOT", "Only files inside the configured local folder may be uploaded.");
    const candidate = resolve(root, input);
    const actual = await realpath(candidate);
    if (!contained(root, actual))
      throw new AdapterError("FILE_OUTSIDE_ROOT", "The selected file resolves outside the configured local folder.");
    const before = await stat(actual);
    if (!before.isFile())
      throw new AdapterError("INVALID_FILE", "The selected path must be a regular file.");
    handle = await open(actual, constants.O_RDONLY | constants.O_NOFOLLOW);
    const opened = await handle.stat();
    const after = await realpath(candidate);
    if (after !== actual || !contained(root, after) ||
        opened.dev !== before.dev || opened.ino !== before.ino || !opened.isFile())
      throw new AdapterError("FILE_CHANGED", "The local file changed while it was being opened.");
    if (!Number.isSafeInteger(expected.byteSize) || expected.byteSize < 1 ||
        expected.byteSize > MAX_FILE_BYTES || opened.size !== expected.byteSize)
      throw new AdapterError("FILE_SIZE_MISMATCH", "The local file size does not match the prepared upload.");
    const hash = createHash("sha256");
    for await (const chunk of checkedChunks(handle, expected.byteSize)) hash.update(chunk);
    if (hash.digest("hex") !== expected.checksum)
      throw new AdapterError("FILE_HASH_MISMATCH", "The local file checksum does not match the prepared upload.");
    return handle;
  } catch (error) {
    await handle?.close();
    if (error instanceof AdapterError) throw error;
    throw new AdapterError("FILE_UNAVAILABLE", "The selected local file cannot be read.");
  }
}

// Explicit offset reads keep retries independent of a shared descriptor position.
export async function* checkedChunks(handle: FileHandle, byteSize: number) {
  let offset = 0;
  while (offset < byteSize) {
    const buffer = Buffer.allocUnsafe(Math.min(64 * 1024, byteSize - offset));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, offset);
    if (!bytesRead) throw new AdapterError("FILE_CHANGED", "The local file changed during transfer.");
    offset += bytesRead;
    yield buffer.subarray(0, bytesRead);
  }
  if ((await handle.stat()).size !== byteSize)
    throw new AdapterError("FILE_CHANGED", "The local file changed during transfer.");
}
