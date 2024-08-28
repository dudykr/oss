"use client";

import { TableContainer } from "@/components/table-container";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompatRange } from "@/lib/prisma";
import { useRouter } from "next/navigation";

export const RangeTable = ({ ranges }: { ranges: CompatRange[] }) => {
  const router = useRouter();

  const handleClick = (id: bigint) => {
    router.push(`/versions/range/${id}`);
  };

  return (
    <TableContainer title="Compat Ranges">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Runtime</TableHead>
            <TableHead className="w-[200px]">Minimum Version</TableHead>
            <TableHead className="w-[200px]">Maximum Version</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ranges.map((range) => (
            <TableRow
              key={range.id}
              className="cursor-pointer"
              onClick={() => handleClick(range.id)}
            >
              <TableCell className="font-medium">swc_core</TableCell>
              <TableCell className="w-[200px]">{range.from}</TableCell>
              <TableCell className="w-[200px]">{range.to}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
