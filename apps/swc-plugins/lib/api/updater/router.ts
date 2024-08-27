import { publicProcedure, router } from "@/lib/base";
import { db } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

function validateToken(token: string) {
  if (token === process.env.CRAWL_SECRET) {
    return;
  }

  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: "Invalid token",
  });
}

const PackageVersionSchema = z.object({
  version: z.string(),
  swcCoreVersion: z.string(),
});

const PackageSchema = z.object({
  name: z.string(),
  versions: z.array(PackageVersionSchema),
});

export const UpdateWasmPluginsInputSchema = z.object({
  token: z.string(),
  pkgs: z.array(PackageSchema),
});

export const UpdateRuntimesInputSchema = z.object({
  token: z.string(),
  pkgs: z.array(PackageSchema),
});

export const updaterRouter = router({
  updateWasmPlugins: publicProcedure
    .input(UpdateWasmPluginsInputSchema)
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      validateToken(input.token);

      const api = await (await import("@/lib/api/server")).createCaller(ctx);

      for (const pkg of input.pkgs) {
        const plugin = await db.swcPlugin.upsert({
          where: {
            name: pkg.name,
          },
          create: {
            name: pkg.name,
          },
          update: {},
        });

        for (const version of pkg.versions) {
          const swcCoreVersion = version.swcCoreVersion;
          const compatRange = await api.compatRange.byCoreVersion({
            version: swcCoreVersion,
          });

          if (!compatRange) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Compat range not found for SWC core version ${swcCoreVersion}`,
            });
          }

          await db.swcPluginVersion.upsert({
            where: {
              pluginId_version: {
                pluginId: plugin.id,
                version: version.version,
              },
            },
            create: {
              pluginId: plugin.id,
              version: version.version,
              compatRangeId: compatRange.id,
              swcCoreVersion,
            },
            update: {
              compatRangeId: compatRange.id,
              swcCoreVersion,
            },
          });
        }
      }
    }),

  updateRuntimes: publicProcedure
    .input(UpdateRuntimesInputSchema)
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      validateToken(input.token);

      const api = await (await import("@/lib/api/server")).createCaller(ctx);

      for (const pkg of input.pkgs) {
        const runtime = await db.swcRuntime.upsert({
          where: {
            name: pkg.name,
          },
          create: {
            name: pkg.name,
          },
          update: {},
        });

        for (const version of pkg.versions) {
          const swcCoreVersion = version.swcCoreVersion;
          const compatRange = await api.compatRange.byCoreVersion({
            version: swcCoreVersion,
          });

          if (!compatRange) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Compat range not found for SWC core version ${swcCoreVersion}`,
            });
          }

          await db.swcRuntimeVersion.upsert({
            where: {
              runtimeId_version: {
                runtimeId: runtime.id,
                version: version.version,
              },
            },
            create: {
              runtimeId: runtime.id,
              version: version.version,
              compatRangeId: compatRange.id,
              swcCoreVersion,
            },
            update: {
              compatRangeId: compatRange.id,
              swcCoreVersion,
            },
          });
        }
      }
    }),
});
