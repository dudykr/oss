"use client";

import { Select } from "@/components/select";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/trpc/web-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FC, useState } from "react";

const Home: FC = () => {
  const [runtimes] = apiClient.runtime.list.useSuspenseQuery();
  const [selectedRuntime, setSelectedRuntime] = useState<bigint>();
  const [selectedVersion, setSelectedVersion] = useState<string>();
  const router = useRouter();
  const versions = apiClient.runtime.listVersions.useQuery({
    runtimeId: selectedRuntime ?? BigInt(0),
  });

  const handleRuntimeChange = (runtimeId: string) => {
    setSelectedRuntime(BigInt(runtimeId));
  };

  const handleVersionChange = (version: string) => {
    const selected = versions.data?.find((v) => v.version === version);
    setSelectedVersion(version);
    router.push(`/versions/range/${selected?.compatRangeId}`);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <Select
          value={selectedRuntime?.toString()}
          data={runtimes.map((runtime) => ({
            value: runtime.id.toString(),
            label: runtime.name,
          }))}
          onChange={handleRuntimeChange}
          type="runtime"
        />
        <Select
          value={selectedVersion}
          onChange={handleVersionChange}
          disabled={!selectedRuntime}
          data={
            versions.data?.map((version) => ({
              value: version.version,
              label: version.version,
            })) ?? []
          }
          type="version"
        />
      </div>
      <Button variant="link" asChild>
        <Link href="/versions/range">or see all versions</Link>
      </Button>
    </div>
  );
};

export default Home;
