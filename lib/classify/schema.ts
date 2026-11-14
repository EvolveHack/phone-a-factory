import { z } from "zod";

const factSchema = z.object({
  value: z.union([z.boolean(), z.literal("unknown")]),
  quote: z.string().nullable(),
});

export const classificationSchema = z.object({
  askOneLine: z.string(),
  doneWhen: z.array(z.string()).length(2),
  area: z.enum(["loads_table", "map", "exceptions", "other"]),
  facts: z.object({
    changesAccess: factSchema,
    touchesMoney: factSchema,
    changesDataOrCalculation: factSchema,
    appliesToEveryCustomer: factSchema,
    newScreenOrConnection: factSchema,
    controlsDevices: factSchema,
    displayOnly: factSchema,
  }),
  contentOk: z.boolean(),
  contentReason: z.string().nullable(),
});
