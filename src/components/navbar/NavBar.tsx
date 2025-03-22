"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Home,
  BookOpen,
  BookmarkCheck,
  Gamepad2,
  Terminal,
  BookText,
} from "lucide-react";
import { DarkModeToggle } from "@/components/DarkModeToggle";

const navItems = [
  { name: "Home", path: "/", icon: Home },
  { name: "Blog", path: "/blog", icon: BookText },
  { name: "Books", path: "/books", icon: BookOpen },
  { name: "Insights", path: "/curated-links", icon: BookmarkCheck },
  { name: "Play", path: "/play", icon: Gamepad2 },
];

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 hidden md:block">
        <motion.div
          className="flex space-x-2 bg-white dark:bg-gray-900 p-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="flex items-center px-3 text-green-600 dark:text-green-400 font-mono text-sm border-r border-gray-200 dark:border-gray-700">
            <Terminal size={16} className="mr-2" />
            <span>~/nav</span>
          </div>
          {navItems.map((item) => (
            <Link href={item.path} key={item.name}>
              <motion.div
                className={`px-3 py-1.5 rounded-md flex items-center space-x-2 font-mono text-sm ${
                  pathname === item.path ||
                  (item.path !== "/" && pathname?.startsWith(item.path))
                    ? "bg-gray-100 dark:bg-gray-800 text-green-600 dark:text-green-400"
                    : "text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <item.icon size={16} />
                <span>{item.name}</span>
              </motion.div>
            </Link>
          ))}
          <div className="border-l border-gray-200 dark:border-gray-700 pl-2">
            <DarkModeToggle />
          </div>
        </motion.div>
      </nav>

      {/* Mobile Navbar */}
      <nav className="fixed bottom-4 right-4 z-50 md:hidden flex flex-col space-y-2">
        <DarkModeToggle />
        <motion.button
          className="p-2 bg-white dark:bg-gray-900 text-green-600 dark:text-green-400 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
          onClick={() => setIsOpen(!isOpen)}
          whileTap={{ scale: 0.95 }}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </motion.button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 bg-white dark:bg-gray-900 shadow-lg p-4 z-40 md:hidden rounded-t-xl border-t border-gray-200 dark:border-gray-700"
          >
            <div className="flex flex-col space-y-2">
              <div className="flex items-center px-3 py-2 text-green-600 dark:text-green-400 font-mono text-sm border-b border-gray-200 dark:border-gray-700">
                <Terminal size={16} className="mr-2" />
                <span>~/nav</span>
              </div>
              {navItems.map((item) => (
                <Link href={item.path} key={item.name}>
                  <motion.div
                    className={`px-4 py-3 rounded-md flex items-center space-x-2 font-mono ${
                      pathname === item.path ||
                      (item.path !== "/" && pathname?.startsWith(item.path))
                        ? "bg-gray-100 dark:bg-gray-800 text-green-600 dark:text-green-400"
                        : "text-gray-800 dark:text-gray-200"
                    }`}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon size={20} />
                    <span>{item.name}</span>
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
