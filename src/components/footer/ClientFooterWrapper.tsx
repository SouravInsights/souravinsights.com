"use client";

import { usePathname } from "next/navigation";
import FooterWithSnakeGame from "./FooterWithGame";

const ClientFooterWrapper: React.FC = () => {
  const pathname = usePathname();
  const isSnakeGamePage = pathname === "/play";
  // The CV reads as a document, so it ends where its content ends.
  const isCvPage = pathname === "/cv";

  if (isCvPage) return null;

  return <FooterWithSnakeGame withGame={!isSnakeGamePage} />;
};

export default ClientFooterWrapper;
