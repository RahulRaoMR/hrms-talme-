import { NextResponse } from "next/server";
import { createUploadedAssetRecordAction } from "@/app/actions";
import { saveUploadedFile } from "@/lib/storage";

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const module = String(formData.get("module") || "General");
  const owner = String(formData.get("owner") || "Unassigned");
  const label = String(formData.get("label") || "Uploaded File");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const saved = await saveUploadedFile({
    fileName: file.name,
    bytes: buffer,
    mimeType: file.type
  });

  const asset = await createUploadedAssetRecordAction({
    module,
    owner,
    label,
    fileName: file.name,
    fileUrl: saved.fileUrl,
    mimeType: file.type || "application/octet-stream",
    sizeLabel: `${Math.max(1, Math.round(buffer.length / 1024))} KB`,
    status: "Uploaded"
  });

  return NextResponse.json(asset);
}
