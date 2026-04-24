import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function getStorageProvider() {
  return process.env.STORAGE_PROVIDER || "local";
}

function getS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION || "ap-south-1",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials:
      process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
          }
        : undefined
  });
}

function buildPublicUrl(key) {
  if (process.env.S3_PUBLIC_BASE_URL) {
    return `${process.env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
  }

  const bucket = process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION || "ap-south-1";
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export async function saveUploadedFile({ fileName, bytes, mimeType }) {
  const safeName = `${Date.now()}-${sanitizeFileName(fileName)}`;
  const provider = getStorageProvider();

  if (provider === "s3") {
    const bucket = process.env.S3_BUCKET_NAME;
    if (!bucket) {
      throw new Error("S3_BUCKET_NAME is required when STORAGE_PROVIDER=s3");
    }

    const key = `uploads/${safeName}`;
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ContentType: mimeType || "application/octet-stream"
      })
    );

    return {
      fileUrl: buildPublicUrl(key),
      storageKey: key
    };
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, safeName);
  await writeFile(filePath, bytes);

  return {
    fileUrl: `/uploads/${safeName}`,
    storageKey: safeName
  };
}

export async function deleteUploadedFile(fileUrl) {
  if (!fileUrl) return;
  const provider = getStorageProvider();

  if (provider === "s3") {
    const bucket = process.env.S3_BUCKET_NAME;
    if (!bucket) return;
    const key = fileUrl.includes("/uploads/") ? `uploads/${fileUrl.split("/uploads/")[1]}` : fileUrl;
    const client = getS3Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
      })
    );
    return;
  }

  if (fileUrl.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", fileUrl.replace(/^\//, ""));
    try {
      await unlink(filePath);
    } catch {}
  }
}
