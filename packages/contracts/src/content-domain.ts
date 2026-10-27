import { z } from "zod";
export const ContentDomainSchema = z.enum([
  "assessment",
  "cover",
  "video",
  "copy",
]);
// Experience authoring is optional; the four deliverable domains stay unchanged.
export const ProductionDomainSchema = z.enum([...ContentDomainSchema.options, "experience"]);
