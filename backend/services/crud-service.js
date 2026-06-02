import { prisma } from "@/lib/prisma";
import {
  isAtsSharePointResource,
  maybeImportAtsFromSharePoint,
  queueAtsSharePointExport
} from "@/lib/ats-sharepoint-sync";
import { ensureSeedData } from "@/lib/seed-db";
import { getResourceConfig } from "@/lib/api-resources";
import { ApiRouteError } from "@/lib/api-route-factory";

function getModelOrThrow(modelName) {
  const model = prisma[modelName];

  if (!model) {
    throw new ApiRouteError(`Unknown Prisma model: ${modelName}`, 500);
  }

  return model;
}

function buildSelectArgs(select) {
  return select ? { select } : {};
}

export function createCrudService(resourceName) {
  const config = getResourceConfig(resourceName);

  return {
    config,

    async list() {
      if (config.seed !== false) {
        await ensureSeedData();
      }

      await refreshAtsResource(resourceName);
      const model = getModelOrThrow(config.model);
      return model.findMany({
        orderBy: config.orderBy,
        ...buildSelectArgs(config.listSelect)
      });
    },

    async getById(id) {
      if (config.seed !== false) {
        await ensureSeedData();
      }

      const model = getModelOrThrow(config.model);
      const record = await model.findUnique({
        where: { id },
        ...buildSelectArgs(config.itemSelect)
      });

      if (!record) {
        throw new ApiRouteError(`${config.entity} not found.`, 404);
      }

      return record;
    },

    async create(payload) {
      if (config.seed !== false) {
        await ensureSeedData();
      }

      const model = getModelOrThrow(config.model);
      const data = await config.createData(payload);

      const record = await model.create({
        data,
        ...buildSelectArgs(config.itemSelect)
      });

      queueAtsResourceExport(resourceName);
      return record;
    },

    async update(id, payload) {
      const model = getModelOrThrow(config.model);
      const data = await config.updateData(payload);

      const record = await model.update({
        where: { id },
        data,
        ...buildSelectArgs(config.itemSelect)
      });

      queueAtsResourceExport(resourceName);
      return record;
    },

    async remove(id) {
      const model = getModelOrThrow(config.model);
      const record = await model.findUnique({
        where: { id },
        ...buildSelectArgs(config.itemSelect)
      });

      if (!record) {
        throw new ApiRouteError(`${config.entity} not found.`, 404);
      }

      await model.delete({ where: { id } });
      queueAtsResourceExport(resourceName);
      return record;
    }
  };
}

async function refreshAtsResource(resourceName) {
  if (!isAtsSharePointResource(resourceName)) return;

  await maybeImportAtsFromSharePoint(prisma).catch((error) => {
    console.error("SharePoint ATS import failed:", error);
  });
}

function queueAtsResourceExport(resourceName) {
  if (isAtsSharePointResource(resourceName)) {
    queueAtsSharePointExport(prisma, resourceName);
  }
}
