import { graphFetch } from "./client";

export type UploadedDriveItem = {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  file?: { mimeType?: string };
};

const SMALL_UPLOAD_LIMIT_BYTES = 4 * 1024 * 1024;

export type UploadContent = ArrayBuffer | Uint8Array | Blob;

/**
 * Upload a file to a drive folder via the simple PUT endpoint.
 *
 * Limited to files under 4MB — larger payloads require Graph upload
 * sessions, which are out of scope for v1.
 */
export async function uploadFile(
  driveId: string,
  parentItemId: string,
  fileName: string,
  content: UploadContent,
  mimeType: string,
): Promise<UploadedDriveItem> {
  const size =
    content instanceof Blob
      ? content.size
      : content instanceof Uint8Array
        ? content.byteLength
        : content.byteLength;

  if (size > SMALL_UPLOAD_LIMIT_BYTES) {
    throw new Error(
      `File ${fileName} is ${size} bytes; uploads over 4MB require an upload session (not implemented in v1).`,
    );
  }

  const path = `/drives/${driveId}/items/${parentItemId}:/${encodeURIComponent(fileName)}:/content`;

  return graphFetch<UploadedDriveItem>(path, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: content as BodyInit,
  });
}
