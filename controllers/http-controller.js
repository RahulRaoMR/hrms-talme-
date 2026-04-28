import { NextResponse } from "next/server";

export function json(data, init) {
  return NextResponse.json(data, init);
}

export function jsonError(message, status) {
  return NextResponse.json({ error: message }, { status });
}

export function getControllerErrorResponse(error) {
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

export async function withController(handler) {
  try {
    return await handler();
  } catch (error) {
    return getControllerErrorResponse(error);
  }
}

export async function getRouteId(context) {
  const params = await context.params;
  return params.id;
}
