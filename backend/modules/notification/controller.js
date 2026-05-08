import { createCrudController } from "@/controllers/crud-controller";
import { json, withController } from "@/controllers/http-controller";
import { revalidateSuitePaths, writeAuditLog } from "@/lib/backend-core";
import { notificationService, sendNotificationById } from "@/modules/notification/service";

export const notificationController = createCrudController(notificationService);

export async function POST_SEND(_request, context) {
  return withController(async () => {
    const params = await context.params;
    const notification = await sendNotificationById(params.id);

    await writeAuditLog("SEND", "Notification", notification.id, `Sent notification ${notification.subject}`);
    revalidateSuitePaths();

    return json(notification);
  });
}
