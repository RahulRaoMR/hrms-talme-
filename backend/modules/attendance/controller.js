import { createCrudController } from "@/controllers/crud-controller";
import { attendanceService } from "@/modules/attendance/service";

export const attendanceController = createCrudController(attendanceService);
