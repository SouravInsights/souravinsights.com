"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Home, BookOpen, BookmarkCheck, Gamepad2 } from "lucide-react";
import { DarkModeToggle } from "@/components/DarkModeToggle";

const navItems = [
  { name: "Home", path: "/", icon: Home },
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
          className="flex space-x-2 bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {navItems.map((item) => (
            <Link href={item.path} key={item.name}>
              <motion.div
                className={`book px-4 py-2 rounded-full flex items-center space-x-2 ${
                  pathname === item.path
                    ? "bg-gradient-to-br from-green-300 to-green-400 dark:from-gray-900 dark:to-gray-800"
                    : " text-gray-800 dark:text-gray-200"
                }`}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </motion.div>
            </Link>
          ))}
          <div className="book">
            <DarkModeToggle />
          </div>
        </motion.div>
      </nav>

      {/* Mobile Navbar Button */}
      <nav className="fixed items-center bottom-10 right-4 z-50 md:hidden flex flex-col space-y-2">
        <DarkModeToggle />
        <motion.button
          className="p-2 bg-green-400 dark:bg-gray-900 text-white rounded-full shadow-lg"
          onClick={() => setIsOpen(!isOpen)}
          whileTap={{ scale: 0.95 }}
        >
          {isOpen ? <X size={32} /> : <Menu size={32} />}
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
            className="fixed inset-x-0 bottom-0 bg-white dark:bg-gray-800 shadow-lg p-4 z-40 md:hidden rounded-t-3xl"
          >
            <div className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <Link href={item.path} key={item.name}>
                  <motion.div
                    className={`px-4 py-3 rounded-lg flex items-center space-x-2 ${
                      pathname === item.path
                        ? "bg-gradient-to-br from-green-300 to-green-400 dark:from-gray-900 dark:to-gray-800"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                    }`}
                    whileHover={{ scale: 1.05 }}
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
