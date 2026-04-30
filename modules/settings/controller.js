import { createCrudController } from "@/controllers/crud-controller";
import { settingsService } from "@/modules/settings/service";

export const settingsController = createCrudController(settingsService);
