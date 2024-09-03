"use client";
import React, { useEffect, useState } from "react";
import { Github, Linkedin, Twitter, Cpu, Code2, Sparkles } from "lucide-react";
import {
  BinaryAppleIcon,
  PixelatedSnakeIcon,
  CodeBlockMazeIcon,
} from "@/components/icons";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import SnakeGame from "@/components/SnakeGame";

interface TechInfo {
  name: string;
  icon: string;
  color: string;
  showcase: React.ReactNode;
}

const techs: TechInfo[] = [
  {
    name: "Next.js",
    icon: "️️⚡",
    color: "#000000",
    showcase: <div className="text-xs">Loading... 99% | next start</div>,
  },
  {
    name: "React",
    icon: "⚛️",
    color: "#61DAFB",
    showcase: (
      <div className="text-xs">
        const [isAwesome, setIsAwesome] = useState(true);
      </div>
    ),
  },
  {
    name: "TypeScript",
    icon: "📘",
    color: "#3178C6",
    showcase: (
      <div className="text-xs">{`type Developer = 'Awesome' | 'Super Awesome';`}</div>
    ),
  },
  {
    name: "Tailwind CSS",
    icon: "🎨",
    color: "#06B6D4",
    showcase: (
      <div className="text-xs">{`className="hover:awesome focus:more-awesome"`}</div>
    ),
  },
  {
    name: "ShadcN UI",
    icon: "🧩",
    color: "#000000",
    showcase: (
      <Button
        size="sm"
        variant="outline"
        className="text-xs text-gray-700 hover:text-black"
      >
        Classy Button
      </Button>
    ),
  },
  {
    name: "Framer Motion",
    icon: "🎭",
    color: "#FF4154",
    showcase: (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-4 h-4 bg-purple-500 rounded-full"
      />
    ),
  },
];

const IconRotator: React.FC = () => {
  const icons = [BinaryAppleIcon, PixelatedSnakeIcon, CodeBlockMazeIcon];
  const [currentIconIndex, setCurrentIconIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentIconIndex((prevIndex) => (prevIndex + 1) % icons.length);
    }, 3000); // Change icon every 3 seconds

    return () => clearInterval(intervalId);
  }, []);

  const CurrentIcon = icons[currentIconIndex];

  return (
    <CurrentIcon className="w-6 h-6 sm:w-8 sm:h-8 transition-all duration-300 ease-in-out" />
  );
};

const FooterWithSnakeGame: React.FC = () => {
  const [hoveredTech, setHoveredTech] = useState<TechInfo | null>(null);
  return (
    <footer className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-8 md:py-12 transition-colors duration-200">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="flex flex-col gap-2 items-center">
            <h3 className="text-center text-xl sm:text-2xl font-bold text-green-700 dark:text-green-400 transition-colors duration-200 flex items-center justify-center space-x-2 mb-2">
              <IconRotator />
              <span>Language Muncher</span>
            </h3>
            <div className="px-6 py-2 rounded-lg shadow-sm transition-colors duration-200">
              <SnakeGame />
            </div>
          </div>
          <div className="space-y-8">
            <div>
              <h4 className="text-xl font-semibold mb-4 flex items-center text-green-700 dark:text-green-300">
                <Sparkles className="mr-2" size={20} />
                {`Let's Connect`}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                {`Grab a virtual coffee with me and let's chat about code!`}
              </p>
              <div className="flex space-x-4">
                {[
                  {
                    icon: Github,
                    link: "https://github.com/souravinsights",
                    label: "GitHub",
                  },
                  {
                    icon: Linkedin,
                    link: "https://linkedin.com/in/souravinsights",
                    label: "LinkedIn",
                  },
                  {
                    icon: Twitter,
                    link: "https://twitter.com/souravinsights",
                    label: "Twitter",
                  },
                ].map((social, index) => (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.a
                          href={social.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-green-600 dark:text-gray-300 dark:hover:text-green-400 transition-colors duration-200"
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <social.icon size={24} />
                        </motion.a>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{social.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xl font-semibold mb-4 flex items-center text-green-700 dark:text-green-300">
                <Code2 className="mr-2" size={20} />
                Open Source
              </h4>
              <p className="text-sm mb-2 text-gray-600 dark:text-gray-300">
                {`This portfolio is open source. Feel free play around, just don't judge my commit messages too harshly!`}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(
                    "https://github.com/SouravInsights/souravinsights.com",
                    "_blank"
                  )
                }
                className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-gray-700 dark:text-green-300 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                View on GitHub
              </Button>
            </div>
            <div>
              <h4 className="text-xl font-semibold mb-4 flex items-center text-green-700 dark:text-green-300">
                <Cpu className="mr-2 text-red-500" />
                Tech Stack
              </h4>
              <div className="flex flex-wrap gap-2">
                {techs.map((tech, index) => (
                  <motion.div
                    key={index}
                    className="px-3 py-2 bg-white dark:bg-gray-700 rounded-full text-sm cursor-pointer flex items-center shadow-sm hover:shadow-md transition-shadow duration-300"
                    whileHover={{ scale: 1.05 }}
                    onHoverStart={() => setHoveredTech(tech)}
                    onHoverEnd={() => setHoveredTech(null)}
                  >
                    <span className="mr-1">{tech.icon}</span>
                    <span className="text-gray-800 dark:text-gray-200">
                      {tech.name}
                    </span>
                  </motion.div>
                ))}
              </div>
              <div className="h-24 mt-4">
                <AnimatePresence>
                  {hoveredTech && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="p-3 bg-white dark:bg-gray-700 rounded-md shadow-lg"
                    >
                      <h5 className="text-sm font-semibold mb-2 text-green-700 dark:text-green-300">
                        {hoveredTech.name} Showcase:
                      </h5>
                      <div className="flex items-center justify-center h-8">
                        {hoveredTech.showcase}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
        <motion.div
          className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400 transition-colors duration-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          © {new Date().getFullYear()} SouravInsights | Crafted with passion and
          some (maybe a lot) ☕
          <br />
        </motion.div>
      </div>
    </footer>
  );
};

export default FooterWithSnakeGame;
