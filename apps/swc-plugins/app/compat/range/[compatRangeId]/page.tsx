"use client";

import { apiClient } from "@/lib/trpc/web-client";

export default function Page({
  params: { compatRangeId },
}: {
  params: { compatRangeId: string };
}) {
  const [compatRange] = apiClient.compatRange.get.useSuspenseQuery({
    id: BigInt(compatRangeId),
  });

  return (
    <div>
      <h1>
        <kbd>swc_core</kbd>@<kbd>{compatRange.from}</kbd> -{" "}
        <kbd>{compatRange.to}</kbd>
      </h1>
    </div>
  );
}
