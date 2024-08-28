import { createCaller } from "@/lib/server";
import { RangeTable } from "./components/range-table";

export default async function Page() {
  const api = await createCaller();
  const ranges = await api.compatRange.list();

  return <RangeTable ranges={ranges} />;
}

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
