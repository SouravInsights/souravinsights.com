import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Code2, Command, Cpu } from "lucide-react";

interface CommandEntry {
  text: string;
  timestamp?: string;
  isResponse?: boolean;
}

const InteractiveTerminal = () => {
  const [commands, setCommands] = useState<CommandEntry[]>([
    {
      text: `Welcome to my interactive terminal! 👋
Type 'help' to see available commands.`,
      isResponse: true,
    },
  ]);
  const [currentCommand, setCurrentCommand] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Handle key presses
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isFocused) return;

      // Handle backspace
      if (e.key === "Backspace") {
        setCurrentCommand((prev) => prev.slice(0, -1));
        return;
      }

      // Handle enter
      if (e.key === "Enter") {
        if (currentCommand.trim()) {
          handleCommand(currentCommand.trim());
          setCurrentCommand("");
        }
        return;
      }

      // Only add printable characters
      if (e.key.length === 1) {
        setCurrentCommand((prev) => prev + e.key);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isFocused, currentCommand]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        terminalRef.current &&
        !terminalRef.current.contains(e.target as Node)
      ) {
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCommand = (cmd: string) => {
    const newCommand: CommandEntry = {
      text: cmd,
      timestamp: new Date().toLocaleTimeString(),
    };

    let response: CommandEntry = {
      text: "",
      isResponse: true,
    };

    switch (cmd.toLowerCase()) {
      case "help":
        response.text = `Available commands:
help       - Show this help message
about      - About me
skills     - My technical skills
projects   - View my projects
experience - View my work experience
clear      - Clear terminal`;
        break;
      case "experience":
        response.text = `Work Experience:

🟢 Paragraph (2024 - Present)
   Full-stack Engineer
   Remote

🔵 Pimlico (2023)
   Full-stack Engineer | Remote
   • Building create-permissionless-app CLI tool
   • Bootstrapping apps with Account Abstraction using Pimlico's AA infra
   
🔵 Gallery (2023)
   Front-end Engineer | Remote
   • A crypto-based social network for sharing collections
   • Built onchain collection sharing features
   
🔵 RabbitHole (2021 - 2022)
   Frontend Engineer | Remote
   • Redesigned v1 client app focusing on better onboarding
   • Built internal design system & maintained UI consistency
   • Led decentralization efforts with Ceramic & Graph Protocol`;
        break;
      case "about":
        response.text =
          "Hi! I'm a Full-stack Engineer passionate about building impactful products.";
        break;
      case "skills":
        response.text = "TypeScript, React, Node.js, Next.js, PostgreSQL";
        break;
      case "projects":
        response.text = `My Projects:

1. FairForms
   A self-hosted form builder that doesn't cost a kidney per month.
   Stack: TypeScript, Next.js, Shadcn, PostgreSQL, Drizzle
   
2. Vendorly
   A web app for fashion retailers to manage vendor meetings and design collections.
   Stack: TypeScript, Next.js, Shadcn, PostgreSQL, Drizzle
   
3. NightOwls Community
   🦉 A cozy corner for night owls to share code and late-night building adventures.
   Stack: TypeScript, Next.js, Shadcn, PostgreSQL, Drizzle
   
4. create-permissionless-app
   CLI tool for bootstrapping Account Abstraction apps with Pimlico's AA infrastructure.
   Stack: TypeScript, Node.js, React, Viem`;
        break;
      case "clear":
        setCommands([]);
        return;
      default:
        response.text = `Command not found: ${cmd}. Type 'help' for available commands.`;
    }

    setCommands((prev) => [...prev, newCommand, response]);
  };

  return (
    <div
      ref={terminalRef}
      onClick={() => setIsFocused(true)}
      className={`relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden cursor-text ${
        isFocused ? "ring-1 ring-green-500" : ""
      }`}
      tabIndex={0}
    >
      {/* Terminal Header */}
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 flex items-center gap-2">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
          ~/terminal {isFocused ? "(active)" : "(click to activate)"}
        </span>
      </div>

      {/* Terminal Content */}
      <div className="p-4 bg-gray-900 font-mono text-sm min-h-[200px]">
        <div className="space-y-2">
          {commands.map((cmd, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${
                cmd.isResponse ? "text-green-400" : "text-gray-300"
              }`}
            >
              {!cmd.isResponse && <span className="text-blue-400">$ </span>}
              <span className="whitespace-pre-wrap">{cmd.text}</span>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 flex items-start gap-2">
          <span className="text-blue-400">$</span>
          <div className="flex-1 text-gray-300">
            {currentCommand}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="inline-block w-2 h-4 bg-gray-300 ml-1"
            ></motion.span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Floating Tech Icons
const FloatingIcons = () => {
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-3">
      <AnimatePresence>
        {["cpu", "code", "command"].map((icon, index) => (
          <motion.div
            key={icon}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: [0, -10, 0],
              transition: {
                duration: 2,
                repeat: Infinity,
                delay: index * 0.2,
              },
            }}
            whileHover={{ scale: 1.2 }}
            className="bg-gray-800 p-2 rounded-full cursor-pointer"
          >
            {icon === "cpu" && <Cpu className="w-5 h-5 text-green-400" />}
            {icon === "code" && <Code2 className="w-5 h-5 text-blue-400" />}
            {icon === "command" && (
              <Command className="w-5 h-5 text-purple-400" />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Matrix Rain Effect
const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = 100);

    const columns = Math.floor(width / 20);
    const yPositions = Array(columns).fill(0);

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    const matrixEffect = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "#0F0";
      ctx.font = "15px monospace";

      yPositions.forEach((y, i) => {
        const text = String.fromCharCode(Math.random() * 128);
        const x = i * 20;
        ctx.fillText(text, x, y);

        if (y > 100 + Math.random() * 10000) {
          yPositions[i] = 0;
        } else {
          yPositions[i] = y + 20;
        }
      });
    };

    const interval = setInterval(matrixEffect, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full opacity-10 pointer-events-none"
    />
  );
};

export { InteractiveTerminal, FloatingIcons, MatrixRain };
