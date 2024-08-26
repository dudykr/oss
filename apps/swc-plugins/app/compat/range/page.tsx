"use client";

import { apiClient } from "@/lib/trpc/web-client";
import Link from "next/link";

export default function Page() {
  const [ranges] = apiClient.compatRange.list.useSuspenseQuery();

  return (
    <div>
      <h1 className="text-2xl font-bold">Compat Ranges</h1>
      <ul>
        {ranges.map((range) => (
          <li key={range.id}>
            <Link href={`/compat/range/${range.id}`}>
              <kbd>swc_core</kbd>@<kbd>{range.from}</kbd> -{" "}
              <kbd>{range.to}</kbd>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const dynamic = "force-dynamic";
