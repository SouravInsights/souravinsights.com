"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import SnakeGame from "@/components/SnakeGame";
import { Button } from "@/components/ui/button";
import { Gamepad2, ArrowLeft, Trophy } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Language Muncher - Snake Game",
  description:
    "Play the Language Muncher Snake Game! Gobble up programming languages and grow your tech stack in this fun, educational twist on the classic Snake game.",
  openGraph: {
    title: "Language Muncher - Snake Game",
    description:
      "Grow your tech stack in this fun, educational twist on the classic Snake game.",
    url: "https://souravinsights.com/play",
    type: "website",
    images: [
      {
        url: "/snake-game-og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Language Muncher Snake Game",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Language Muncher - Snake Game",
    description:
      "Grow your tech stack in this fun, educational twist on the classic Snake game.",
    images: ["/snake-game-og-image.jpg"],
  },
};

const SnakeGamePage: React.FC = () => {
  const [showInstructions, setShowInstructions] = useState(false);
  // const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // useEffect(() => {
  //   // In a real app, you'd fetch this from an API
  //   const dummyLeaderboard: LeaderboardEntry[] = [
  //     { name: "Alice", score: 50, difficulty: "hard" },
  //     { name: "Bob", score: 40, difficulty: "medium" },
  //     { name: "Charlie", score: 30, difficulty: "easy" },
  //   ];
  //   setLeaderboard(dummyLeaderboard);
  // }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 flex justify-center items-center">
          {/* <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center">
              <ArrowLeft className="mr-2" size={16} />
              Back to Home
            </Button>
          </Link> */}
          <h1 className="text-3xl font-bold text-green-700 dark:text-green-300">
            Language Muncher
          </h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <SnakeGame />
        </div>

        {/* <div className="mt-8 flex justify-center space-x-4">
          <Button
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex items-center bg-green-500 text-white hover:bg-green-600"
          >
            <Gamepad2 className="mr-2" size={18} />
            {showInstructions ? "Hide" : "Show"} Instructions
          </Button>
          <Button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="flex items-center bg-yellow-500 text-white hover:bg-yellow-600"
          >
            <Trophy className="mr-2" size={18} />
            {showLeaderboard ? "Hide" : "Show"} Leaderboard
          </Button>
        </div> */}

        {showInstructions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-8 bg-green-50 dark:bg-gray-700 p-6 rounded-lg shadow-md"
          >
            <h2 className="text-xl font-semibold mb-4 text-green-700 dark:text-green-300">
              How to Play
            </h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>Use arrow keys or on-screen buttons to move the snake</li>
              <li>Eat up programming languages to grow your tech stack</li>
              <li>Avoid hitting the walls or your own tail</li>
              <li>Try different difficulty levels for more challenge</li>
            </ul>
          </motion.div>
        )}

        {/* {showLeaderboard && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-8 bg-yellow-50 dark:bg-gray-700 p-6 rounded-lg shadow-md"
          >
            <h2 className="text-xl font-semibold mb-4 text-yellow-700 dark:text-yellow-300">
              Leaderboard
            </h2>
            <Table>
              <TableCaption>Top Language Munchers</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Difficulty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>{entry.name}</TableCell>
                    <TableCell>{entry.score}</TableCell>
                    <TableCell>{entry.difficulty}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        )} */}
      </div>
    </div>
  );
};

export default SnakeGamePage;
