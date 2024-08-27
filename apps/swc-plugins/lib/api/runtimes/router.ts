import { publicProcedure, router } from "@/lib/base";
import { db } from "@/lib/prisma";
import { z } from "zod";

export const runtimeRouter = router({
  list: publicProcedure
    .input(z.void())
    .output(z.array(z.string()))
    .query(async () => {
      const runtimes = await db.swcRuntime.findMany({
        select: {
          name: true,
        },
      });

      return runtimes.map((runtime) => runtime.name);
    }),
});
