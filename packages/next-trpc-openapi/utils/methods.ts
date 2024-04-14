import { OpenApiMethod } from "trpc-openapi";

export const acceptsRequestBody = (method: OpenApiMethod) => {
  if (method === "GET" || method === "DELETE") {
    return false;
  }
  return true;
};
