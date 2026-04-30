import { createCrudController } from "@/controllers/crud-controller";
import { documentService } from "@/modules/document/service";

export const documentController = createCrudController(documentService);
