import { createCrudController } from "@/controllers/crud-controller";
import { vendorService } from "@/modules/vendor/service";

export const vendorController = createCrudController(vendorService);
