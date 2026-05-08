import { createCrudController } from "@/controllers/crud-controller";
import { harmonizedRoleService } from "@/modules/harmonized-role/service";

export const harmonizedRoleController = createCrudController(harmonizedRoleService);
