"use client";

import { CompatRangeHeader } from "./components/compat-range-header";
import { CompatRangeTables } from "./components/compat-range-tables";

export default function Page({
  params: { compatRangeId },
}: {
  params: { compatRangeId: string };
}) {
  return (
    <div className="grid gap-6">
      <CompatRangeHeader compatRangeId={compatRangeId} />
      <CompatRangeTables compatRangeId={compatRangeId} />
    </div>
  );
}

export const dynamic = "force-dynamic";
