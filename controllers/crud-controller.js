import { revalidateSuitePaths, writeAuditLog } from "@/lib/backend-core";
import { getRouteId, json, withController } from "@/controllers/http-controller";

export function createCrudController(service) {
  const { config } = service;

  return {
    async GET() {
      return withController(async () => json(await service.list()));
    },

    async POST(request) {
      return withController(async () => {
        const payload = await request.json();
        const record = await service.create(payload);

        await writeAuditLog("CREATE", config.entity, record.id, config.audit.create(record));
        revalidateSuitePaths(config.revalidatePaths);

        return json(record, { status: 201 });
      });
    },

    async GET_BY_ID(_request, context) {
      return withController(async () => {
        const id = await getRouteId(context);
        return json(await service.getById(id));
      });
    },

    async PATCH(request, context) {
      return withController(async () => {
        const id = await getRouteId(context);
        const payload = await request.json();
        const record = await service.update(id, payload);

        await writeAuditLog("UPDATE", config.entity, record.id, config.audit.update(record));
        revalidateSuitePaths(config.revalidatePaths);

        return json(record);
      });
    },

    async DELETE(_request, context) {
      return withController(async () => {
        const id = await getRouteId(context);
        const record = await service.remove(id);

        await writeAuditLog("DELETE", config.entity, id, config.audit.delete(record, id));
        revalidateSuitePaths(config.revalidatePaths);

        return json({ id });
      });
    }
  };
}
