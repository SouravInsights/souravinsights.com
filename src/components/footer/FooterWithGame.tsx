/* eslint-disable react/no-unescaped-entities */
"use client";
import React from "react";
import { Github, Linkedin, Twitter } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FooterWithSnakeGameProps {
  withGame?: boolean;
}

const FooterWithSnakeGame: React.FC<FooterWithSnakeGameProps> = ({
  withGame = true,
}) => {
  return (
    <footer className="relative bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-t border-gray-200 dark:border-gray-700 py-16 transition-all duration-500 overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="container mx-auto px-4 max-w-5xl relative">
        {/* Main Content */}
        <motion.div
          className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-12 mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, staggerChildren: 0.1 }}
        >
          {/* Left: Connect Section */}
          <motion.div
            className="flex-1 text-center md:text-left"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-4 justify-center md:justify-start">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                ☕
              </motion.div>
              <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Let's connect
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed max-w-xs md:max-w-none mx-auto md:mx-0">
              Grab a virtual coffee and let's chat about code, life, or that
              next big idea you want to work on!
            </p>
            <div className="flex justify-center md:justify-start space-x-3">
              {[
                {
                  icon: Github,
                  link: "https://github.com/souravinsights",
                  label: "GitHub",
                  color: "hover:text-gray-900 dark:hover:text-white",
                  bg: "hover:bg-gray-100 dark:hover:bg-gray-700",
                },
                {
                  icon: Linkedin,
                  link: "https://linkedin.com/in/souravinsights",
                  label: "LinkedIn",
                  color: "hover:text-blue-600 dark:hover:text-blue-400",
                  bg: "hover:bg-blue-50 dark:hover:bg-blue-900/20",
                },
                {
                  icon: Twitter,
                  link: "https://twitter.com/souravinsights",
                  label: "Twitter",
                  color: "hover:text-sky-500 dark:hover:text-sky-400",
                  bg: "hover:bg-sky-50 dark:hover:bg-sky-900/20",
                },
              ].map((social, index) => (
                <TooltipProvider key={index}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.a
                        href={social.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-2 md:p-3 rounded-xl text-gray-600 dark:text-gray-300 ${social.color} ${social.bg} transition-all duration-300 group`}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                      >
                        <social.icon
                          size={16}
                          className="md:w-[18px] md:h-[18px] group-hover:animate-pulse"
                        />
                      </motion.a>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="font-medium">
                      <p>{social.label}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </motion.div>

          {/* Center: Play Button */}
          {withGame && (
            <motion.div
              className="flex-shrink-0 order-first md:order-none"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => window.open("/play", "_self")}
                  className="relative px-4 md:px-8 py-2 md:py-4 text-sm md:text-base text-gray-700 hover:text-gray-900 border-2 border-dashed border-gray-300 hover:border-gray-400 dark:text-gray-300 dark:hover:text-white dark:border-gray-600 dark:hover:border-gray-500 transition-all duration-300 group overflow-hidden"
                >
                  <motion.span
                    className="flex items-center gap-2 relative z-10"
                    whileHover={{ x: 2 }}
                  >
                    <motion.span
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        repeatDelay: 2,
                      }}
                    >
                      🎮
                    </motion.span>
                    <span className="hidden sm:inline">Bored? Try this...</span>
                    <span className="sm:hidden">Bored? Try this...</span>
                  </motion.span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* Right: Open Source */}
          <motion.div
            className="flex-1 text-center md:text-right"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-4 justify-center md:justify-end">
              <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Open Source
              </h3>
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                ⚡
              </motion.div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed max-w-xs md:max-w-none mx-auto md:mx-0">
              This portfolio is open source. Dive in, break things, just don't
              judge my commit messages!
            </p>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="default"
                onClick={() =>
                  window.open(
                    "https://github.com/SouravInsights/souravinsights.com",
                    "_blank"
                  )
                }
                className="px-4 md:px-6 py-2 text-sm md:text-base text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-800 transition-all duration-300 group"
              >
                <span className="flex items-center gap-2">
                  <Github
                    size={14}
                    className="md:w-4 md:h-4 group-hover:rotate-12 transition-transform duration-300"
                  />
                  <span className="hidden sm:inline">Explore the code</span>
                  <span className="sm:hidden">Code</span>
                </span>
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Decorative separator */}
        <motion.div
          className="relative mb-12"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <motion.div
              className="w-3 h-3 bg-gray-400 dark:bg-gray-500 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>

        {/* Bottom: Quote */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <motion.div
            className="relative inline-block px-4 md:px-8 py-4 md:py-6 rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 max-w-2xl mx-auto"
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="absolute top-1 md:top-2 left-2 md:left-4 text-2xl md:text-4xl text-gray-300 dark:text-gray-600 font-serif">
              "
            </div>
            <p className="text-sm md:text-base italic text-gray-700 dark:text-gray-300 leading-relaxed px-4 md:px-0 relative z-10">
              The only way to do great work is to love what you do. If you
              haven't found it yet, keep looking. Don't settle.
            </p>
            <div className="absolute bottom-1 md:bottom-2 right-2 md:right-4 text-2xl md:text-4xl text-gray-300 dark:text-gray-600 font-serif rotate-180">
              "
            </div>
            <motion.p
              className="mt-3 md:mt-4 text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              — Steve Jobs
            </motion.p>
          </motion.div>
        </motion.div>
      </div>
    </footer>
  );
};

export default FooterWithSnakeGame;
