"use client";
import React, { useState } from "react";
import { Github, Linkedin, Twitter, ExternalLink, Heart } from "lucide-react";
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

const FooterWithSnakeGame: React.FC = () => {
  const [hoveredTech, setHoveredTech] = useState<TechInfo | null>(null);
  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-2">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
              Code Muncher
            </h3>
            <SnakeGame />
          </div>
          <div className="space-y-8">
            <div>
              <h4 className="text-xl font-semibold mb-4 flex items-center">
                <motion.div
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="mr-2"
                >
                  <ExternalLink size={20} />
                </motion.div>
                Connect
              </h4>
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
                          className="text-gray-300 hover:text-white transition-colors duration-200"
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
              <h4 className="text-xl font-semibold mb-4">Open Source</h4>
              <p className="text-sm mb-2">
                This portfolio is open source. Feel free to explore, fork, or
                contribute!
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
                className={"text-gray-700"}
              >
                View on GitHub
              </Button>
            </div>
            <div>
              <div>
                <h4 className="text-xl font-semibold mb-4 flex items-center">
                  <Heart className="mr-2 text-red-500" />
                  Tech Stack
                </h4>
                <div className="flex flex-wrap gap-2">
                  {techs.map((tech, index) => (
                    <motion.div
                      key={index}
                      className="px-3 py-2 bg-gray-700 rounded-full text-sm cursor-pointer flex items-center"
                      whileHover={{ scale: 1.1, backgroundColor: tech.color }}
                      onHoverStart={() => setHoveredTech(tech)}
                      onHoverEnd={() => setHoveredTech(null)}
                    >
                      <span className="mr-1">{tech.icon}</span>
                      {tech.name}
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
                        className="p-3 bg-gray-800 rounded-md"
                      >
                        <h5 className="text-sm font-semibold mb-2">
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
        </div>
        <motion.div
          className="mt-8 text-center text-sm text-gray-400"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          © {new Date().getFullYear()} SouravInsights | Crafted with passion and
          probably too much coffee
        </motion.div>
      </div>
    </footer>
  );
};

export default FooterWithSnakeGame;
