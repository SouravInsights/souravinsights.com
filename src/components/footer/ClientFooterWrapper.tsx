"use client";

import { usePathname } from "next/navigation";
import FooterWithSnakeGame from "./FooterWithGame";

const ClientFooterWrapper: React.FC = () => {
  const pathname = usePathname();
  const isSnakeGamePage = pathname === "/play";

  return <FooterWithSnakeGame withGame={!isSnakeGamePage} />;
};

export default ClientFooterWrapper;
