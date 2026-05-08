import { createCrudController } from "@/controllers/crud-controller";
import { jobOpeningService } from "@/modules/job-opening/service";

export const jobOpeningController = createCrudController(jobOpeningService);
