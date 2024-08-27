import { publicProcedure, router } from "@/lib/base";
import { db } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import semver from "semver";
import { z } from "zod";
import { VersionRange, VersionRangeSchema } from "./zod";

export const compatRangeRouter = router({
  list: publicProcedure
    .input(z.void())
    .output(
      z.array(
        z.object({
          id: z.bigint(),
          from: z.string(),
          to: z.string(),
        })
      )
    )
    .query(async ({ ctx }) => {
      const versions = await db.compatRange.findMany({
        orderBy: {
          from: "asc",
        },
      });

      return versions;
    }),

  get: publicProcedure
    .input(
      z.object({
        id: z.bigint(),
      })
    )
    .output(
      z.object({
        id: z.bigint(),
        from: z.string(),
        to: z.string(),
        plugins: z.array(VersionRangeSchema),
        runtimes: z.array(VersionRangeSchema),
      })
    )
    .query(async ({ ctx, input: { id } }) => {
      const range = await db.compatRange.findUnique({
        where: {
          id: id,
        },
        select: {
          id: true,
          from: true,
          to: true,
          plugins: {
            select: {
              id: true,
              version: true,
              plugin: {
                select: {
                  name: true,
                },
              },
            },
          },
          runtimes: {
            select: {
              id: true,
              version: true,
              runtime: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!range) {
        throw new Error("CompatRange not found");
      }
      const plugins = merge(
        range.plugins.map((p) => ({ name: p.plugin.name, version: p.version }))
      );
      const runtimes = merge(
        range.runtimes.map((p) => ({
          name: p.runtime.name,
          version: p.version,
        }))
      );

      return {
        id: range.id,
        from: range.from,
        to: range.to,
        plugins,
        runtimes,
      };
    }),

  byVersion: publicProcedure
    .input(
      z.object({
        version: z.string(),
      })
    )
    .output(
      z.nullable(
        z.object({
          id: z.bigint(),
          from: z.string(),
          to: z.string(),
        })
      )
    )
    .query(async ({ ctx, input: { version } }) => {
      const versions = await db.compatRange.findMany({
        select: {
          id: true,
          from: true,
          to: true,
        },
      });

      for (const range of versions) {
        if (
          semver.gte(version, range.from) &&
          (range.to === "*" || semver.lte(version, range.to))
        ) {
          return range;
        }
      }

      return null;
    }),

  addCacheForCrates: publicProcedure
    .input(
      z.object({
        pluginRunnerVersions: z.array(z.string()),
        coreVersions: z.array(
          z.object({
            version: z.string().describe("The version of the swc_core"),
            pluginRunnerReq: z.string(),
          })
        ),
      })
    )
    .output(z.void())
    .mutation(
      async ({ ctx, input: { coreVersions, pluginRunnerVersions } }) => {
        if (process.env.NODE_ENV === "production") {
          throw new TRPCError({
            code: "FORBIDDEN",
          });
        }

        const compatRanges = await db.compatRange.findMany({
          select: {
            id: true,
            from: true,
            to: true,
          },
        });

        function byVersion(swcCoreVersion: string) {
          for (const range of compatRanges) {
            if (
              semver.gte(swcCoreVersion, range.from) &&
              (range.to === "*" || semver.lte(swcCoreVersion, range.to))
            ) {
              return range;
            }
          }
        }

        for (const corePkg of coreVersions) {
          corePkg.version = corePkg.version.replace("v", "");

          const compatRange = byVersion(corePkg.version);

          if (!compatRange) {
            console.error(`Compat range not found for ${corePkg.version}`);
            continue;
          }

          for (let rv of pluginRunnerVersions) {
            rv = rv.replace("v", "");

            if (semver.satisfies(rv, corePkg.pluginRunnerReq)) {
              await db.swcPluginRunnerVersion.upsert({
                where: {
                  version: rv,
                },
                create: {
                  version: rv,
                  compatRangeId: compatRange.id,
                },
                update: {},
              });
            }
          }

          await db.swcCoreVersion.upsert({
            where: {
              version: corePkg.version,
            },
            create: {
              version: corePkg.version,
              pluginRunnerReq: corePkg.pluginRunnerReq,
              compatRangeId: compatRange.id,
            },
            update: {
              pluginRunnerReq: corePkg.pluginRunnerReq,
            },
          });
          console.log(`Imported ${corePkg.version}`);
        }
      }
    ),
});

function merge(ranges: { name: string; version: string }[]): VersionRange[] {
  const merged: { [key: string]: VersionRange } = {};

  for (const { name, version } of ranges) {
    if (!merged[name]) {
      merged[name] = { name, minVersion: "0.0.0", maxVersion: "0.0.0" };
    }

    const { min, max } = mergeVersion(
      merged[name].minVersion,
      merged[name].maxVersion,
      version
    );
    merged[name] = { name, minVersion: min, maxVersion: max };
  }

  return Object.values(merged);
}
/**
 *
 * @param min semver
 * @param max semver
 * @param newValue semver
 */
function mergeVersion(min: string, max: string, newValue: string) {
  const minVersion =
    min !== "0.0.0" && semver.lt(min, newValue) ? min : newValue;
  const maxVersion = semver.gt(max, newValue) ? max : newValue;

  return { min: minVersion, max: maxVersion };
}
