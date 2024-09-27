"use client";

import { usePathname } from "next/navigation";

interface ClientMainWrapperProps {
  children: React.ReactNode;
}

const ClientMainWrapper: React.FC<ClientMainWrapperProps> = ({ children }) => {
  const pathname = usePathname();
  const isSnakeGamePage = pathname === "/play";

  return (
    <main className={`flex-grow ${isSnakeGamePage ? "" : "pt-20"}`}>
      {children}
    </main>
  );
};

export default ClientMainWrapper;
