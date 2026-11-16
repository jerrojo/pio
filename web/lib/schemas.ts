import { z } from "zod";
import {
  base,
  locales,
  type Preferences,
  type Reference,
  type Turn,
} from "./domain.ts";
// Server-side validation of what the browser sends. Kept apart from domain.ts
// so the validation library never ships to the browser.
export const preferencesSchema: z.ZodType<Preferences> = z
  .object({
    version: z.literal(3),
    native: z.enum(locales),
    target: z.enum(locales),
  })
  .refine((p) => base(p.native) !== base(p.target));
export const referenceSchema: z.ZodType<Reference> = z.object({
  id: z.string().uuid(),
  text: z.string().trim().min(1).max(500),
  locale: z.enum(locales),
});
export const turnSchema = z
  .object({
    id: z.string().uuid(),
    preferences: preferencesSchema,
    reference: referenceSchema.nullable(),
    intent: z.enum(["auto", "native", "target"]).default("auto"),
    loose: z.boolean().optional(),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          text: z.string().max(400),
        }),
      )
      .max(8)
      .default([]),
  })
  .refine((x) => !x.reference || x.reference.locale === x.preferences.target);
export const parseTurn = (value: unknown): Turn | null => {
  const parsed = turnSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};
