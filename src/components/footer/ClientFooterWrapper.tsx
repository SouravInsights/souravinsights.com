"use client";

import { usePathname } from "next/navigation";
import FooterWithSnakeGame from "./FooterWithGame";

const ClientFooterWrapper: React.FC = () => {
  const pathname = usePathname();
  // The game owns the whole screen — site chrome would only crowd the board.
  const isPlayPage = pathname === "/play";
  // The CV reads as a document, so it ends where its content ends.
  const isCvPage = pathname === "/cv";
  // Curio owns the whole screen too. A footer under an app screen is the single
  // clearest "this is still a website" signal there is.
  const isCurioPage = pathname === "/curio";

  if (isCvPage || isPlayPage || isCurioPage) return null;

  return <FooterWithSnakeGame withGame={true} withCat={true} />;
};

export default ClientFooterWrapper;
