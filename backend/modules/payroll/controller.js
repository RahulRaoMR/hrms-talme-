import { createCrudController } from "@/controllers/crud-controller";
import { payrollService } from "@/modules/payroll/service";

export const payrollController = createCrudController(payrollService);
