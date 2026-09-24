/* eslint-disable react/no-unescaped-entities */
"use client";
import React from "react";
import Link from "next/link";
import { ArrowUpRight, Github, Linkedin, Twitter } from "lucide-react";
import { motion } from "framer-motion";
import Oneko from "@/components/oneko";
import { useFeedback } from "@/hooks/useFeedback";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FooterWithSnakeGameProps {
  withGame?: boolean;
  withCat?: boolean;
}

const SOCIALS = [
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
];

const FooterWithSnakeGame: React.FC<FooterWithSnakeGameProps> = ({
  withGame = true,
  withCat = true,
}) => {
  const feedback = useFeedback();

  return (
    <footer className="relative bg-card">
      <div className="rule" aria-hidden="true" />
      {/*
        The cat is a fixed overlay that roams the footer on its own (`wander`).
        It lives below the navbar/modals (z-50) and routes around the footer
        links via `data-oneko-zone="avoid"`.
      */}
      {withCat && (
        <Oneko
          skin="classic"
          meow={false}
          zIndex={30}
          persistPosition={false}
          wander={{ selector: "footer", padding: 4 }}
          bubbleChance={0.3}
        />
      )}

      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Connect */}
          <motion.div
            className="text-center md:text-left"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="type-heading mb-1.5">
              Get in touch
            </h3>
            <p className="type-caption max-w-sm">
              Have a project in mind, or just want to say hi? Write to me at{" "}
              <a
                href="mailto:souravinsights@gmail.com"
                className="font-medium text-green-700 dark:text-green-500 underline decoration-green-700/40 dark:decoration-green-500/40 underline-offset-4 hover:decoration-green-700 dark:hover:decoration-green-500 transition-colors"
              >
                souravinsights@gmail.com
              </a>
              .
            </p>
          </motion.div>

          {/* Socials */}
          <motion.div
            className="flex flex-col items-center gap-2"
            data-oneko-zone="avoid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center justify-center gap-1">
              {SOCIALS.map((social) => (
                <TooltipProvider key={social.label}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.a
                        href={social.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={social.label}
                        onClick={() => feedback.press()}
                        className="p-2 rounded-lg text-muted-foreground hover:text-green-700 dark:hover:text-green-500 hover:bg-accent transition-colors duration-200"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <social.icon size={18} />
                      </motion.a>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="font-medium">
                      <p>{social.label}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
            <a
              href="https://github.com/SouravInsights/souravinsights.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-green-700 dark:hover:text-green-500 hover:underline"
            >
              source code
              <ArrowUpRight
                size={12}
                className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
          </motion.div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs italic text-muted-foreground text-center sm:text-left">
            "The only way to do great work is to love what you do." - Steve Jobs
          </p>
          <div className="flex items-center gap-4" data-oneko-zone="avoid">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              Bored?
              {withGame && (
                <>
                  <Link
                    href="/play"
                    className="inline-flex items-center gap-1 font-medium text-green-700 dark:text-green-500 underline-offset-4 hover:underline"
                  >
                    <span aria-hidden="true">🎮</span>
                    Play a game
                  </Link>
                  <span aria-hidden="true">or</span>
                </>
              )}
              <Link
                href="/movies"
                className="inline-flex items-center gap-1 font-medium text-green-700 dark:text-green-500 underline-offset-4 hover:underline"
              >
                <span aria-hidden="true">🎬</span>
                watch a movie
              </Link>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterWithSnakeGame;