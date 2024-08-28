"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Keyboard,
} from "lucide-react";
import useSound from "use-sound";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Position = { x: number; y: number };

const GRID_SIZE = 20;
const CELL_SIZE = 15;
const INITIAL_SNAKE: Position[] = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION: Direction = "RIGHT";
const GAME_SPEED = 150;

const programmingIcons = ["JS", "TS", "Py", "Rx", "Nx"];

const SnakeGame: React.FC = () => {
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);

  // Sound effects
  const [playMove] = useSound("/sounds/move.mp3", { volume: 0.25 });
  const [playEat] = useSound("/sounds/food.mp3", { volume: 0.25 });
  const [playGameOver] = useSound("/sounds/gameover.mp3", { volume: 0.25 });

  const moveSnake = useCallback(() => {
    const newSnake = [...snake];
    const head = { ...newSnake[0] };

    switch (direction) {
      case "UP":
        head.y -= 1;
        break;
      case "DOWN":
        head.y += 1;
        break;
      case "LEFT":
        head.x -= 1;
        break;
      case "RIGHT":
        head.x += 1;
        break;
    }

    if (
      head.x < 0 ||
      head.x >= GRID_SIZE ||
      head.y < 0 ||
      head.y >= GRID_SIZE ||
      newSnake.some((segment) => segment.x === head.x && segment.y === head.y)
    ) {
      setGameOver(true);
      playGameOver();
      return;
    }

    newSnake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      setScore((prevScore) => prevScore + 1);
      setFood(getRandomPosition());
      playEat();
    } else {
      newSnake.pop();
      playMove();
    }

    setSnake(newSnake);
  }, [snake, direction, food, playMove, playEat, playGameOver]);

  useEffect(() => {
    if (!gameOver) {
      const gameLoop = setInterval(moveSnake, GAME_SPEED);
      return () => clearInterval(gameLoop);
    }
  }, [moveSnake, gameOver]);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    switch (e.key) {
      case "ArrowUp":
        setDirection("UP");
        break;
      case "ArrowDown":
        setDirection("DOWN");
        break;
      case "ArrowLeft":
        setDirection("LEFT");
        break;
      case "ArrowRight":
        setDirection("RIGHT");
        break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  const getRandomPosition = (): Position => ({
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE),
  });

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setFood(getRandomPosition());
    setGameOver(false);
    setScore(0);
  };

  const handleDirectionChange = (newDirection: Direction) => {
    setDirection(newDirection);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto">
      <div
        className="border-2 border-green-600 dark:border-green-400 rounded-lg overflow-hidden bg-white dark:bg-gray-800 relative"
        style={{
          width: `${GRID_SIZE * CELL_SIZE}px`,
          height: `${GRID_SIZE * CELL_SIZE}px`,
        }}
      >
        {/* Grid lines */}
        <div className="absolute inset-0 grid grid-cols-20 grid-rows-20">
          {Array.from({ length: 400 }).map((_, i) => (
            <div
              key={i}
              className="border border-gray-100 dark:border-gray-700"
            />
          ))}
        </div>
        {/* Snake */}
        {snake.map((segment, index) => (
          <motion.div
            key={index}
            className="absolute bg-green-500 rounded-sm"
            style={{
              width: `${CELL_SIZE}px`,
              height: `${CELL_SIZE}px`,
              left: `${segment.x * CELL_SIZE}px`,
              top: `${segment.y * CELL_SIZE}px`,
            }}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.1 }}
          />
        ))}
        {/* Food */}
        <motion.div
          className="absolute bg-red-500 rounded-full flex items-center justify-center text-white font-bold"
          style={{
            width: `${CELL_SIZE}px`,
            height: `${CELL_SIZE}px`,
            left: `${food.x * CELL_SIZE}px`,
            top: `${food.y * CELL_SIZE}px`,
            fontSize: "10px",
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {programmingIcons[score % programmingIcons.length]}
        </motion.div>
      </div>
      <div className="mt-4 text-center">
        <p className="text-lg font-semibold text-green-700 dark:text-green-300">
          Skills Collected: {score}
        </p>
        {gameOver && (
          <motion.div
            className="mt-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-red-500 font-bold mb-2">Game Over!</p>
            <Button
              onClick={resetGame}
              className="bg-green-500 text-white hover:bg-green-600 transition-colors duration-200"
            >
              Munch Again
            </Button>
          </motion.div>
        )}
      </div>
      {/* Mobile controls */}
      <div className="grid grid-cols-3 gap-2 mt-4 md:hidden">
        <div></div>
        <Button
          size="sm"
          onClick={() => handleDirectionChange("UP")}
          className="p-2 bg-green-500 text-white"
        >
          <ArrowUp size={20} />
        </Button>
        <div></div>
        <Button
          size="sm"
          onClick={() => handleDirectionChange("LEFT")}
          className="p-2 bg-green-500 text-white"
        >
          <ArrowLeft size={20} />
        </Button>
        <div></div>
        <Button
          size="sm"
          onClick={() => handleDirectionChange("RIGHT")}
          className="p-2 bg-green-500 text-white"
        >
          <ArrowRight size={20} />
        </Button>
        <div></div>
        <Button
          size="sm"
          onClick={() => handleDirectionChange("DOWN")}
          className="p-2 bg-green-500 text-white"
        >
          <ArrowDown size={20} />
        </Button>
        <div></div>
      </div>
      <motion.div
        className="mt-6 p-3 bg-green-50 dark:bg-gray-700 rounded-lg shadow-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h4 className="text-sm font-semibold mb-2 text-green-700 dark:text-green-300 flex items-center justify-center">
          <Keyboard className="mr-2" size={16} />
          How to Play
        </h4>
        <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
          <li className="flex items-center">
            <span className="mr-2">🎮</span>
            Use arrow keys or on-screen buttons to move
          </li>
          <li className="flex items-center">
            <span className="mr-2">🍎</span>
            Collect programming icons to level up
          </li>
          <li className="flex items-center">
            <span className="mr-2">🚫</span>
            Avoid hitting walls or yourself
          </li>
        </ul>
      </motion.div>
    </div>
  );
};

export default SnakeGame;
