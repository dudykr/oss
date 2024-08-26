import { publicProcedure, router } from "@/lib/base";

import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { z } from "zod";

export const apiRouter = router({
  hello: publicProcedure.input(z.string()).query(({ input }) => {
    return `Hello ${input}`;
  }),
});

export type ApiRouter = typeof apiRouter;
export type ApiInput = inferRouterInputs<ApiRouter>;
export type ApiOutput = inferRouterOutputs<ApiRouter>;
