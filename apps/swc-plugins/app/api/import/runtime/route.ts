import { db } from "@/lib/prisma";
import { createCaller } from "@/lib/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const VersionSchema = z.object({
  version: z.string(),
  swcCoreVersion: z.string(),
});

const BodySchema = z.object({
  runtime: z.enum(["@swc/core", "next", "rspack"]),
  versions: z.array(VersionSchema),
});

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error: "Not allowed",
      },
      {
        status: 403,
      }
    );
  }

  const { runtime, versions } = BodySchema.parse(await req.json());

  const rt = await db.swcRuntime.findUniqueOrThrow({
    where: {
      name: runtime,
    },
  });
  const api = await createCaller();

  for (const version of versions) {
    const compatRange = await api.compatRange.byVersion({
      version: version.swcCoreVersion,
    });

    await db.swcRuntimeVersion.upsert({
      where: {
        runtimeId_version: {
          runtimeId: rt.id,
          version: version.version,
        },
      },
      create: {
        runtimeId: rt.id,
        version: version.version,
        swcCoreVersion: version.swcCoreVersion,
        compatRangeId: compatRange.id,
      },
      update: {},
    });
  }

  return NextResponse.json({
    ok: true,
  });
}
