"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
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
    <div className="space-y-4 flex flex-col md:flex-row items-start gap-4 my-2">
      <div>
        <div
          className="border-2 border-gray-600 rounded-lg overflow-hidden bg-gray-800 relative"
          style={{
            width: `${GRID_SIZE * CELL_SIZE}px`,
            height: `${GRID_SIZE * CELL_SIZE}px`,
          }}
        >
          {/* Grid lines */}
          <div className="absolute inset-0 grid grid-cols-20 grid-rows-20">
            {Array.from({ length: 400 }).map((_, i) => (
              <div key={i} className="border border-gray-700" />
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
        <div className="mt-2">
          <p className="text-lg">Skills Collected: {score}</p>
          {gameOver && (
            <motion.div
              className="mt-2"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-red-500 font-bold">Game Over!</p>
              <Button onClick={resetGame} className="mt-2">
                Munch Again
              </Button>
            </motion.div>
          )}
        </div>
        <p className="text-sm text-center md:text-left">
          Use arrow keys or buttons to guide the snake. Devour programming icons
          to level up your skills!
        </p>
      </div>
      {/* Mobile controls - hidden on desktop */}
      <div className="md:hidden grid grid-cols-3 gap-2 w-36">
        <div></div>
        <Button
          size="sm"
          onClick={() => handleDirectionChange("UP")}
          className="p-2"
        >
          <ArrowUp size={20} />
        </Button>
        <div></div>
        <Button
          size="sm"
          onClick={() => handleDirectionChange("LEFT")}
          className="p-2"
        >
          <ArrowLeft size={20} />
        </Button>
        <div></div>
        <Button
          size="sm"
          onClick={() => handleDirectionChange("RIGHT")}
          className="p-2"
        >
          <ArrowRight size={20} />
        </Button>
        <div></div>
        <Button
          size="sm"
          onClick={() => handleDirectionChange("DOWN")}
          className="p-2"
        >
          <ArrowDown size={20} />
        </Button>
        <div></div>
      </div>
    </div>
  );
};

export default SnakeGame;
