import { createCrudController } from "@/controllers/crud-controller";
import { userService } from "@/modules/user/service";

export const userController = createCrudController(userService);
