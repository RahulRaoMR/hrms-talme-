import { createCrudController } from "@/controllers/crud-controller";
import { employeeService } from "@/modules/employee/service";

export const employeeController = createCrudController(employeeService);
