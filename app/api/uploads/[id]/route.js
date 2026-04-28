import { NextResponse } from "next/server";
import { revalidateSuitePaths, writeAuditLog } from "@/lib/backend-core";
import { prisma } from "@/lib/prisma";
import { deleteUploadedFile } from "@/lib/storage";

export async function DELETE(_request, context) {
  const params = await context.params;
  const asset = await prisma.uploadedAsset.findUnique({
    where: { id: params.id }
  });

  if (!asset) {
    return NextResponse.json({ error: "Uploaded asset not found." }, { status: 404 });
  }

  await deleteUploadedFile(asset.fileUrl);
  await prisma.uploadedAsset.delete({
    where: { id: asset.id }
  });

  await writeAuditLog("DELETE", "UploadedAsset", asset.id, `Deleted asset ${asset.fileName}`);
  revalidateSuitePaths();

  return NextResponse.json({ id: asset.id });
}
