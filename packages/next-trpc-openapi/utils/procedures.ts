import { OpenApiMethod, OpenApiRouter } from "trpc-openapi";
import { OpenApiProcedure } from "trpc-openapi/dist/types";
import { forEachOpenApiProcedure } from "../procedures.js";
import { getPathRegExp, normalizePath } from "./paths.js";

export const createProcedureCache = (router: OpenApiRouter) => {
  const procedureCache = new Map<
    OpenApiMethod,
    Map<
      RegExp,
      {
        type: "query" | "mutation";
        path: string;
        procedure: OpenApiProcedure;
      }
    >
  >();

  const { queries, mutations } = router._def;

  forEachOpenApiProcedure(
    queries,
    ({ path: queryPath, procedure, openapi }) => {
      const { method } = openapi;
      if (!procedureCache.has(method)) {
        procedureCache.set(method, new Map());
      }
      const path = normalizePath(openapi.path);
      const pathRegExp = getPathRegExp(path);
      procedureCache.get(method)!.set(pathRegExp, {
        type: "query",
        path: queryPath,
        procedure,
      });
    }
  );

  forEachOpenApiProcedure(
    mutations,
    ({ path: mutationPath, procedure, openapi }) => {
      const { method } = openapi;
      if (!procedureCache.has(method)) {
        procedureCache.set(method, new Map());
      }
      const path = normalizePath(openapi.path);
      const pathRegExp = getPathRegExp(path);
      procedureCache.get(method)!.set(pathRegExp, {
        type: "mutation",
        path: mutationPath,
        procedure,
      });
    }
  );

  return (method: OpenApiMethod, path: string) => {
    const procedureMethodCache = procedureCache.get(method);
    if (!procedureMethodCache) {
      return undefined;
    }

    const procedureRegExp = Array.from(procedureMethodCache.keys()).find((re) =>
      re.test(path)
    );
    if (!procedureRegExp) {
      return undefined;
    }

    const procedure = procedureMethodCache.get(procedureRegExp)!;
    const pathInput = procedureRegExp.exec(path)?.groups ?? {};

    return { procedure, pathInput };
  };
};
