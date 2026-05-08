import { createCrudController } from "@/controllers/crud-controller";
import { recruiterService } from "@/modules/recruiter/service";

export const recruiterController = createCrudController(recruiterService);
