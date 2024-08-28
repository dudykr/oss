import { Logo } from "@/components/logo";
import { RuntimeVersionSelector } from "@/components/runtime-version-selector";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FC } from "react";

const Home: FC = () => (
  <div className="flex flex-col items-center gap-8">
    <Logo />
    <div className="flex flex-col gap-2">
      <h1 className="max-w-[330px] text-center text-3xl font-bold leading-tight tracking-tighter md:min-w-[540px] md:text-4xl lg:leading-[1.1]">
        SWC Plugins
      </h1>
      <p className="text-muted-foreground max-w-[750px] text-center text-lg">
        A collection of SWC plugins, ready to use in your project.
      </p>
    </div>
    <RuntimeVersionSelector />
    <Button variant="link" asChild>
      <Link href="/versions/range">or see all versions</Link>
    </Button>
  </div>
);

export default Home;
