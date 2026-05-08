import { createCrudController } from "@/controllers/crud-controller";
import { candidateService } from "@/modules/candidate/service";

export const candidateController = createCrudController(candidateService);
