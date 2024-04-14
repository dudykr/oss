# next-trpc-openapi

Fork of [trpc-openapi](https://github.com/jlalmes/trpc-openapi) that works with Next.js app router.

# Usage

Usage is similar to [trpc-openapi](https://github.com/jlalmes/trpc-openapi#usage).

## 1. Install `trpc-openapi` and `next-trpc-openapi`.

```bash
npm i next-trpc-openapi
# or
yarn add next-trpc-openapi
# or
pnpm i next-trpc-openapi
```

## 2. Add OpenApiMeta to your tRPC instance.

```ts
import { initTRPC } from "@trpc/server";
import { OpenApiMeta } from "trpc-openapi";

const t = initTRPC.meta<OpenApiMeta>().create(); /* 👈 */
```

## 3. Enable openapi support for a procedure.

```ts
export const appRouter = t.router({
  sayHello: t.procedure
    .meta({ /* 👉 */ openapi: { method: 'GET', path: '/say-hello' } })
    .input(z.object({ name: z.string() }))
    .output(z.object({ greeting: z.string() }))
    .query(({ input }) => {
      return { greeting: `Hello ${input.name}!` };
    });
});
```

## 4. Generate an OpenAPI document.

```ts
import { generateOpenApiDocument } from "trpc-openapi";

import { appRouter } from "../appRouter";

/* 👇 */
export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: "tRPC OpenAPI",
  version: "1.0.0",
  baseUrl: "http://localhost:3000",
});
```

## 5. Add an trpc handler to your Next.js app.

`app/api/[trpc]/route.ts`:

```tsx
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { NextResponse } from "next/server";

const trpcApiRouteHandler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api",
    req,
    // Your trpc router
    router: appRouter,
    // Your trpc createContext
    createContext,
  });

export {
  trpcApiRouteHandler as DELETE,
  trpcApiRouteHandler as GET,
  trpcApiRouteHandler as HEAD,
  trpcApiRouteHandler as PATCH,
  trpcApiRouteHandler as POST,
  trpcApiRouteHandler as PUT,
};
```

## 6. Add an trpc-openapi handler to your Next.js app.

`app/api/[...trpc]/route.ts`:

```ts
import { createContext } from "@api/cloud-core-client";
import { cliPushRouter } from "index";
import { createOpenApiNextAppHandler } from "next-trpc-openapi";

const handler = createOpenApiNextAppHandler({
  // Your trpc router
  router: appRouter,
  // Your trpc createContext
  createContext,
  responseMeta: undefined,
  onError: undefined,
});

export default handler;
```

## License

Apache-2.0
