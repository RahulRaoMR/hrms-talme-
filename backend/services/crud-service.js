import { prisma } from "@/lib/prisma";
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

      return model.create({
        data,
        ...buildSelectArgs(config.itemSelect)
      });
    },

    async update(id, payload) {
      const model = getModelOrThrow(config.model);
      const data = await config.updateData(payload);

      return model.update({
        where: { id },
        data,
        ...buildSelectArgs(config.itemSelect)
      });
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
      return record;
    }
  };
}
