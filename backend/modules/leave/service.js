import { sendLeaveStatusEmailToEmployee } from "@/services/emailAutomation";
import { createCrudService } from "@/services/crud-service";

const baseService = createCrudService("leaveRequests");

export const leaveService = {
  ...baseService,

  async update(id, payload) {
    const current = await baseService.getById(id);
    const leaveRequest = await baseService.update(id, payload);

    if (payload?.status && payload.status !== current.status) {
      await sendLeaveStatusEmailToEmployee(leaveRequest);
    }

    return leaveRequest;
  }
};
