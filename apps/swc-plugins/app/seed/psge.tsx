import { db } from "@/lib/prisma";
import fs from "node:fs/promises";

export default async function Page() {
  const ranges: { min: string; max: string }[] = JSON.parse(
    await fs.readFile("./data/ranges.json", "utf8")
  );

  for (const { min, max } of ranges) {
    await db.compatRange.upsert({
      data: {
        min,
        max,
      },
    });
  }

  return <div>Done</div>;
}
