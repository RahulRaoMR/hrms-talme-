import { sendWelcomeEmailToEmployee } from "@/services/emailAutomation";
import { createCrudService } from "@/services/crud-service";

const baseService = createCrudService("employees");

export const employeeService = {
  ...baseService,

  async create(payload) {
    const employee = await baseService.create(payload);
    await sendWelcomeEmailToEmployee(employee);
    return employee;
  }
};
