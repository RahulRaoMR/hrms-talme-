import { withController } from "@/controllers/http-controller";
import { buildCsvExport } from "@/modules/export/service";

export async function GET_DATASET(_request, context) {
  return withController(async () => {
    const params = await context.params;
    const { fileName, csv } = await buildCsvExport(params.dataset);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`
      }
    });
  });
}
