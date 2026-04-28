import {
  sendOfferEmailToCandidate,
  shouldSendOfferEmail
} from "@/services/emailAutomation";
import { createCrudService } from "@/services/crud-service";

const baseService = createCrudService("candidates");

export const candidateService = {
  ...baseService,

  async create(payload) {
    const candidate = await baseService.create(payload);

    if (shouldSendOfferEmail(null, candidate.status)) {
      await sendOfferEmailToCandidate(candidate);
    }

    return candidate;
  },

  async update(id, payload) {
    const current = await baseService.getById(id);
    const candidate = await baseService.update(id, payload);

    if (shouldSendOfferEmail(current.status, candidate.status)) {
      await sendOfferEmailToCandidate(candidate);
    }

    return candidate;
  }
};
