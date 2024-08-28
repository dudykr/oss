import { FC } from "react";

import Image from "next/image";
import SWCLogo from "./swc.svg";

export const Logo: FC = () => (
  <Image src={SWCLogo} alt="SWC Logo" width={80} height={28} />
);
