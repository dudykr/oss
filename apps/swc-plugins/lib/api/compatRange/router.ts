import { publicProcedure, router } from "@/lib/base";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const compatRangeRouter = router({
  list: publicProcedure
    .input(z.void())
    .output(
      z.array(
        z.object({
          id: z.string(),
          from: z.string(),
          to: z.string(),
        })
      )
    )
    .query(async ({ ctx }) => {
      const versions = await prisma.compatRange.findMany({
        orderBy: {
          from: "asc",
        },
      });

      return versions;
    }),
});
