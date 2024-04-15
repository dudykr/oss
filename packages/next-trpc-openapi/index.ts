import { AnyProcedure, TRPCError } from "@trpc/server";
import { NextRequest, NextResponse } from "next/server";
import { CreateOpenApiNodeHttpHandlerOptions } from "trpc-openapi/dist/adapters/node-http/core";
import {
  OpenApiErrorResponse,
  OpenApiMethod,
  OpenApiRouter,
} from "trpc-openapi/dist/types";
import {
  instanceofZodTypeCoercible,
  instanceofZodTypeLikeVoid,
  instanceofZodTypeObject,
  unwrapZodType,
  zodSupportsCoerce,
} from "trpc-openapi/dist/utils/zod";
import { Context, createContext } from "vm";
import { ZodError, z } from "zod";
import { TRPC_ERROR_CODE_HTTP_STATUS, getErrorFromUnknown } from "./errors.js";
import { getInputOutputParsers } from "./procedures.js";
import { acceptsRequestBody } from "./utils/methods.js";
import { normalizePath } from "./utils/paths.js";
import { createProcedureCache } from "./utils/procedures.js";

export type CreateOpenApiNextAppHandlerOptions<TRouter extends OpenApiRouter> =
  Omit<
    CreateOpenApiNodeHttpHandlerOptions<TRouter, NextRequest, NextResponse>,
    "maxBodySize"
  >;

export function createOpenApiNextAppHandler<TRouter extends OpenApiRouter>(
  opts: CreateOpenApiNextAppHandlerOptions<TRouter>
) {
  const { router, responseMeta, onError } = opts;

  const getProcedure = createProcedureCache(router);

  const handler = async (req: NextRequest): Promise<NextResponse<any>> => {
    const method = req.method! as OpenApiMethod | "HEAD";
    const reqUrl = req.url;
    const url = new URL(
      reqUrl.startsWith("/") ? `http://127.0.0.1${reqUrl}` : reqUrl
    );
    const path = normalizePath(url.pathname);
    const { procedure, pathInput } =
      getProcedure(method as OpenApiMethod, path) ?? {};

    const resHeaders = new Headers();

    let input: any = undefined;
    let ctx: Context | undefined = undefined;
    let data: any = undefined;

    try {
      if (!procedure) {
        // Can be used for warmup
        if (method === "HEAD") {
          return NextResponse.json({}, { status: 204 });
        }

        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Route not found for ${method} ${path}`,
        });
      }

      const useBody = acceptsRequestBody(method as OpenApiMethod);
      const schema = getInputOutputParsers(procedure.procedure)
        .inputParser as z.ZodTypeAny;
      const unwrappedSchema = unwrapZodType(schema, true);

      // input should stay undefined if z.void()
      if (!instanceofZodTypeLikeVoid(unwrappedSchema)) {
        input = {
          ...((useBody
            ? await req.json()
            : queryParamsToMap(req.nextUrl.searchParams)) as any),
          ...pathInput,
        };
      }

      // if supported, coerce all string values to correct types
      if (zodSupportsCoerce) {
        if (instanceofZodTypeObject(unwrappedSchema)) {
          Object.values(unwrappedSchema.shape).forEach((shapeSchema) => {
            const unwrappedShapeSchema = unwrapZodType(shapeSchema, false);
            if (instanceofZodTypeCoercible(unwrappedShapeSchema)) {
              unwrappedShapeSchema._def.coerce = true;
            }
          });
        }
      }

      ctx = await createContext?.({ req, resHeaders });
      const caller = router.createCaller(ctx);

      const segments = procedure.path.split(".");
      const procedureFn = segments.reduce(
        (acc, curr) => acc[curr],
        caller as any
      ) as AnyProcedure;

      data = await procedureFn(input);

      const meta = responseMeta?.({
        type: procedure.type,
        paths: [procedure.path],
        ctx,
        data: [data],
        errors: [],
      });

      const statusCode = meta?.status ?? 200;
      const headers = meta?.headers ?? {};

      for (const [key, value] of Object.entries(headers)) {
        if (typeof value !== "undefined") {
          if (Array.isArray(value)) {
            value.forEach((v) => resHeaders.append(key, v));
          } else if (typeof value === "string") {
            resHeaders.set(key, value);
          } else {
            throw new Error(`Invalid header value for key ${key}`);
          }
        }
      }

      return NextResponse.json(data, {
        status: statusCode,
        headers: resHeaders,
      });
    } catch (cause) {
      const error = getErrorFromUnknown(cause);

      onError?.({
        error,
        type: procedure?.type ?? "unknown",
        path: procedure?.path,
        input,
        ctx,
        req,
      });

      const meta = responseMeta?.({
        type: procedure?.type ?? "unknown",
        paths: procedure?.path ? [procedure?.path] : undefined,
        ctx,
        data: [data],
        errors: [error],
      });

      const errorShape = router.getErrorShape({
        error,
        type: procedure?.type ?? "unknown",
        path: procedure?.path,
        input,
        ctx,
      });

      const isInputValidationError =
        error.code === "BAD_REQUEST" &&
        error.cause instanceof Error &&
        error.cause.name === "ZodError";

      const statusCode =
        meta?.status ?? TRPC_ERROR_CODE_HTTP_STATUS[error.code] ?? 500;
      const headers = meta?.headers ?? {};
      const body: OpenApiErrorResponse = {
        message: isInputValidationError
          ? "Input validation failed"
          : errorShape?.message ?? error.message ?? "An error occurred",
        code: error.code,
        issues: isInputValidationError
          ? (error.cause as ZodError).errors
          : undefined,
      };

      for (const [key, value] of Object.entries(headers)) {
        if (typeof value !== "undefined") {
          if (Array.isArray(value)) {
            value.forEach((v) => resHeaders.append(key, v));
          } else if (typeof value === "string") {
            resHeaders.set(key, value);
          } else {
            throw new Error(`Invalid header value for key ${key}`);
          }
        }
      }

      return NextResponse.json(body, {
        status: statusCode,
        headers: resHeaders,
      });
    }
  };
  function queryParamsToMap(q: URLSearchParams): object {
    const entries = q.entries();
    const result: Record<string, string> = {};
    for (const [key, value] of entries) {
      result[key] = value;
    }
    return result;
  }

  return handler;
}
