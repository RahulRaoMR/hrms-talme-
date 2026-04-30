import { createCrudController } from "@/controllers/crud-controller";
import { leaveService } from "@/modules/leave/service";

export const leaveController = createCrudController(leaveService);
