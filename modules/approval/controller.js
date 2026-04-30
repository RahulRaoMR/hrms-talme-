import { createCrudController } from "@/controllers/crud-controller";
import { approvalService } from "@/modules/approval/service";

export const approvalController = createCrudController(approvalService);
