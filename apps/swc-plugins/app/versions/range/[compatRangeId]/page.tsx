"use client";

import { TableContainer } from "@/components/table-container";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiClient } from "@/lib/trpc/web-client";
import { useState } from "react";

export default function Page({
  params: { compatRangeId },
}: {
  params: { compatRangeId: string };
}) {
  const [includePrerelease, setIncludePrerelease] = useState(false);
  const [compatRange] = apiClient.compatRange.get.useSuspenseQuery({
    id: BigInt(compatRangeId),
    includePrerelease,
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-row justify-between">
        <h1 className="mr-10 flex flex-col font-mono text-2xl font-bold">
          <p>swc_core</p>
          <span className="text-sm">
            @<span className="font-mono">{compatRange.from}</span> -{" "}
            <span className="font-mono">{compatRange.to}</span>
          </span>
        </h1>

        <div className="flex flex-row items-center gap-2 text-sm font-medium">
          <Checkbox
            checked={includePrerelease}
            onCheckedChange={(v) => {
              setIncludePrerelease(!!v);
            }}
          />
          <label>Include Prerelease</label>
        </div>
      </div>

      <TableContainer title="Runtime Version Ranges">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Runtime</TableHead>
              <TableHead className="w-[200px]">Minimum Version</TableHead>
              <TableHead className="w-[200px]">Maximum Version</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {compatRange.runtimes.map((runtime) => (
              <TableRow key={runtime.name}>
                <TableCell className="font-medium">{runtime.name}</TableCell>
                <TableCell className="w-[200px]">
                  {runtime.minVersion}
                </TableCell>
                <TableCell className="w-[200px]">
                  {runtime.maxVersion}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TableContainer title="Compatible Plugins">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plugin</TableHead>
              <TableHead className="w-[200px]">Minimum Version</TableHead>
              <TableHead className="w-[200px]">Maximum Version</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {compatRange.plugins.map((plugin) => (
              <TableRow key={plugin.name}>
                <TableCell className="font-medium">{plugin.name}</TableCell>
                <TableCell className="w-[200px]">{plugin.minVersion}</TableCell>
                <TableCell className="w-[200px]">{plugin.maxVersion}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

export const dynamic = "force-dynamic";
