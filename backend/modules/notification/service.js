import { deliverNotification } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { createCrudService } from "@/services/crud-service";
import { ApiRouteError } from "@/lib/api-route-factory";

export const notificationService = createCrudService("notifications");

export async function sendNotificationById(id) {
  const current = await prisma.notification.findUnique({ where: { id } });

  if (!current) {
    throw new ApiRouteError("Notification not found.", 404);
  }

  const delivery = await deliverNotification(current);

  return prisma.notification.update({
    where: { id },
    data: {
      status: delivery.ok ? "Sent" : "Failed",
      tone: delivery.ok ? "teal" : "gold",
      providerResult: delivery.ok ? delivery.detail : null,
      providerError: delivery.ok ? null : delivery.detail
    }
  });
}
