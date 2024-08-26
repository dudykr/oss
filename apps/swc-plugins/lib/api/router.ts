import { router } from "@/lib/base";

import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

export const apiRouter = router({
});

export type ApiRouter = typeof apiRouter;
export type ApiInput = inferRouterInputs<ApiRouter>;
export type ApiOutput = inferRouterOutputs<ApiRouter>;
