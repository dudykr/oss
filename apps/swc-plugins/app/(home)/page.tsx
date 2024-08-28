"use client";

import { useState } from "react";

import { Select } from "@/components/select";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/trpc/web-client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const [runtimes] = apiClient.runtime.list.useSuspenseQuery();
  const [selectedRuntime, setSelectedRuntime] = useState<bigint>();

  return (
    <div className="flex w-full max-w-md flex-col space-y-4">
      <div className="flex space-x-4">
        <Select
          value={selectedRuntime?.toString()}
          data={runtimes.map((runtime) => ({
            value: runtime.id.toString(),
            label: runtime.name,
          }))}
          onChange={(e) => setSelectedRuntime(BigInt(e))}
        />

        <VersionSelector
          runtimeId={selectedRuntime}
          disabled={!selectedRuntime}
        />
      </div>
      <div className="flex justify-center">
        <Link href={`/versions/range`} passHref>
          <Button
            variant="secondary"
            size="default"
            className="whitespace-nowrap"
          >
            See all versions
          </Button>
        </Link>
      </div>
    </div>
  );
}

function VersionSelector({
  runtimeId,
  disabled,
}: {
  runtimeId: bigint;
  disabled: boolean;
}) {
  const router = useRouter();
  const versions = apiClient.runtime.listVersions.useQuery({
    runtimeId,
  });
  const [selectedVersion, setSelectedVersion] = useState<string>();

  const handleVersionChange = (version: string) => {
    const selected = versions.data?.find((v) => v.version === version);
    setSelectedVersion(version);
    router.push(`/versions/range/${selected?.compatRangeId}`);
  };

  return (
    <Select
      value={selectedVersion}
      onChange={handleVersionChange}
      disabled={disabled}
      data={
        versions.data?.map((version) => ({
          value: version.version,
          label: version.version,
        })) ?? []
      }
    />
  );
}
