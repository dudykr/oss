import { db } from "@/lib/prisma";
import fs from "node:fs/promises";

export default async function Page() {
  const ranges: { min: string; max: string }[] = JSON.parse(
    await fs.readFile("./data/ranges.json", "utf8")
  );

  for (const { min, max } of ranges) {
    await db.compatRange.upsert({
      where: {
        from_to: {
          from: min,
          to: max,
        },
      },
      update: {},
      create: {
        from: min,
        to: max,
      },
    });
  }

  const runtimes = ["@swc/core", "next", "rspack"];

  for (const runtime of runtimes) {
    await db.swcRuntime.upsert({
      where: {
        name: runtime,
      },
      update: {},
      create: {
        name: runtime,
      },
    });
  }

  return <div>Done</div>;
}
