import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed-db";
import { revalidateSuitePaths, writeAuditLog } from "@/lib/backend-core";

export class ApiRouteError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ApiRouteError";
    this.status = status;
  }
}

function jsonError(message, status) {
  return NextResponse.json({ error: message }, { status });
}

function getErrorResponse(error) {
  if (error?.status) {
    return jsonError(error.message, error.status);
  }

  if (error?.code === "P2002") {
    return jsonError("A record with the same unique value already exists.", 409);
  }

  if (error?.code === "P2025") {
    return jsonError("Record not found.", 404);
  }

  if (error instanceof SyntaxError) {
    return jsonError("Invalid JSON payload.", 400);
  }

  console.error(error);
  return jsonError(error?.message || "Internal server error.", 500);
}

async function withErrorHandling(handler) {
  try {
    return await handler();
  } catch (error) {
    return getErrorResponse(error);
  }
}

function getModel(modelName) {
  const model = prisma[modelName];

  if (!model) {
    throw new ApiRouteError(`Unknown Prisma model: ${modelName}`, 500);
  }

  return model;
}

function buildSelectArgs(select) {
  return select ? { select } : {};
}

async function getRouteId(context) {
  const params = await context.params;
  return params.id;
}

export function createCollectionHandlers(config) {
  return {
    async GET() {
      return withErrorHandling(async () => {
        const model = getModel(config.model);

        if (config.seed !== false) {
          await ensureSeedData();
        }

        const items = await model.findMany({
          orderBy: config.orderBy,
          ...buildSelectArgs(config.listSelect)
        });

        return NextResponse.json(items);
      });
    },

    async POST(request) {
      return withErrorHandling(async () => {
        const model = getModel(config.model);

        if (config.seed !== false) {
          await ensureSeedData();
        }

        const payload = await request.json();
        const data = await config.createData(payload);
        const record = await model.create({
          data,
          ...buildSelectArgs(config.itemSelect)
        });

        await writeAuditLog("CREATE", config.entity, record.id, config.audit.create(record));
        revalidateSuitePaths(config.revalidatePaths);

        return NextResponse.json(record, { status: 201 });
      });
    }
  };
}

export function createItemHandlers(config) {
  return {
    async GET(_request, context) {
      return withErrorHandling(async () => {
        const model = getModel(config.model);

        if (config.seed !== false) {
          await ensureSeedData();
        }

        const id = await getRouteId(context);
        const record = await model.findUnique({
          where: { id },
          ...buildSelectArgs(config.itemSelect)
        });

        if (!record) {
          return jsonError(`${config.entity} not found.`, 404);
        }

        return NextResponse.json(record);
      });
    },

    async PATCH(request, context) {
      return withErrorHandling(async () => {
        const model = getModel(config.model);
        const id = await getRouteId(context);
        const payload = await request.json();
        const data = await config.updateData(payload);
        const record = await model.update({
          where: { id },
          data,
          ...buildSelectArgs(config.itemSelect)
        });

        await writeAuditLog("UPDATE", config.entity, record.id, config.audit.update(record));
        revalidateSuitePaths(config.revalidatePaths);

        return NextResponse.json(record);
      });
    },

    async DELETE(_request, context) {
      return withErrorHandling(async () => {
        const model = getModel(config.model);
        const id = await getRouteId(context);
        const existing = await model.findUnique({ where: { id } });

        if (!existing) {
          return jsonError(`${config.entity} not found.`, 404);
        }

        await model.delete({ where: { id } });
        await writeAuditLog("DELETE", config.entity, id, config.audit.delete(existing, id));
        revalidateSuitePaths(config.revalidatePaths);

        return NextResponse.json({ id });
      });
    }
  };
}
