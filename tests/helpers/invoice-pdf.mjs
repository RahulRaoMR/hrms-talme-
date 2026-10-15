export async function invoicePdfText(bytes) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loading = getDocument({ data: Uint8Array.from(bytes), useSystemFonts: true });
  const document = await loading.promise;
  try {
    const pages = [];
    for (let index = 1; index <= document.numPages; index += 1) {
      const content = await (await document.getPage(index)).getTextContent();
      pages.push(content.items.map((item) => item.str).join(" "));
    }
    return pages.join("\n");
  } finally {
    await loading.destroy();
  }
}
