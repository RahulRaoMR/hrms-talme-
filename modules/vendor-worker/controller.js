import { createCrudController } from "@/controllers/crud-controller";
import { vendorWorkerService } from "@/modules/vendor-worker/service";

export const vendorWorkerController = createCrudController(vendorWorkerService);
