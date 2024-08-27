import { publicProcedure, router } from "@/lib/base";
import { db } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createCaller } from "../server";

if (!process.env.CRAWLER_SECRET) {
  throw new Error("CRAWLER_SECRET is not set");
}

function validateToken(token: string) {
  if (token === process.env.CRAWLER_SECRET) {
    return;
  }

  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: "Invalid token",
  });
}

const NpmPackageVersionSchema = z.object({
  version: z.string(),
  swcCoreVersion: z.string(),
});

const NpmPackageSchema = z.object({
  name: z.string(),
  versions: z.array(NpmPackageVersionSchema),
});

export const updaterRouter = router({
  updateWasmPlugins: publicProcedure
    .input(
      z.object({
        token: z.string(),
        pkgs: z.array(NpmPackageSchema),
      })
    )
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      validateToken(input.token);

      const api = await createCaller(ctx);

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
            },
            update: {
              compatRangeId: compatRange.id,
            },
          });
        }
      }
    }),
});
