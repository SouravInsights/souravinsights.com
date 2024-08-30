"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Gamepad2,
} from "lucide-react";
import useSound from "use-sound";
import {
  SiTypescript,
  SiPython,
  SiRust,
  SiJavascript,
  SiC,
  SiReact,
  SiNodedotjs,
  SiGo,
} from "react-icons/si";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Position = { x: number; y: number };

const GRID_SIZE = 20;
const CELL_SIZE = 15;
const INITIAL_SNAKE: Position[] = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION: Direction = "RIGHT";

const programmingIcons = [
  { icon: SiTypescript, color: "#3178C6" },
  { icon: SiPython, color: "#3776AB" },
  { icon: SiRust, color: "#000000" },
  { icon: SiJavascript, color: "#F7DF1E" },
  { icon: SiC, color: "#A8B9CC" },
  { icon: SiReact, color: "#61DAFB" },
  { icon: SiNodedotjs, color: "#339933" },
  { icon: SiGo, color: "#00ADD8" },
];

const DIFFICULTY_SPEEDS = {
  easy: 200,
  medium: 150,
  hard: 100,
};

type Difficulty = "easy" | "medium" | "hard";

const SnakeGame: React.FC = () => {
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [currentIcon, setCurrentIcon] = useState(programmingIcons[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [gameSpeed, setGameSpeed] = useState(DIFFICULTY_SPEEDS.medium);

  // Sound effects
  const [playMove] = useSound("/sounds/move.mp3", { volume: 0.25 });
  const [playEat] = useSound("/sounds/food.mp3", { volume: 0.25 });
  const [playGameOver] = useSound("/sounds/gameover.mp3", { volume: 0.25 });

  /**
   * Handles the movement of the snake, including collision detection, food consumption, and game state updates.
   * This function is memoized with useCallback to optimize performance in the game loop.
   *
   * This bad boy handles:
   * - Snake movement (moving the snake based on the current direction)
   * - Collision detection (for when our snake gets too adventurous)
   * - Food consumption (scoring points and growing longer)
   * - Game state updates (score, food position, game over)
   *
   *  @returns void, but a lot happens in here, trust me
   */
  const moveSnake = useCallback(() => {
    /** Create a new copy of the snake array.
     * No body likes mutating the state directly, right?
     */
    const newSnake = [...snake];

    /** New head position */
    const head = { ...newSnake[0] };

    /**
     * Time to move our snake. Up is down, down is up, I'm not kidding...
     * In this coordinate system:
     * - y decreases upwards (0 is at the top)
     * - x increases to the right
     */
    switch (direction) {
      case "UP":
        head.y -= 1; // Moving up, so y gets smaller
        break;
      case "DOWN":
        head.y += 1; // Moving down, y gets bigger
        break;
      case "LEFT":
        head.x -= 1; // Going left, x gets smaller
        break;
      case "RIGHT":
        head.x += 1; // Going right, x gets bigger
        break;
    }

    /**
     * Uh oh, did we hit something?
     * This checks if we've smacked into a wall or ourselves (ouch!)
     */
    if (
      // Wall collision check
      head.x < 0 ||
      head.x >= GRID_SIZE ||
      head.y < 0 ||
      head.y >= GRID_SIZE ||
      // Self collision check (chechk whether head position matches any body segment)
      newSnake.some((segment) => segment.x === head.x && segment.y === head.y)
    ) {
      setGameOver(true); // Game over, man. Game over!
      playGameOver();
      return; // We're done here, folks
    }

    // If we're still alive, let's move our snake forward
    newSnake.unshift(head);

    /**
     * Food check: Did we just score a snake snack?
     * @note
     * If food is eaten:
     * - Increase score
     * - Generate new food position
     * - Change food icon
     * - Play eating sound
     * - Snake grows (tail is not removed)
     * If food is not eaten:
     * - Remove tail to maintain snake length
     * - Play movement sound
     */
    if (head.x === food.x && head.y === food.y) {
      // Score! (literally)
      setScore((prevScore) => prevScore + 1);

      // New food, who dis?
      setFood(getRandomPosition());

      // Change up the food icon, just to keep things spicy
      setCurrentIcon(
        programmingIcons[Math.floor(Math.random() * programmingIcons.length)]
      );
      playEat();
      // Notice we don't remove the tail here - that's how our snake grows!
    } else {
      // No food? Remove the tail to keep our snake the same length
      newSnake.pop();
      playMove();
    }

    // Update our snake's position. React, do your thing!
    setSnake(newSnake);
  }, [snake, direction, food, playMove, playEat, playGameOver]);
  // Dependencies array: The VIP list of state that decides whether this function will be recreated or not!

  useEffect(() => {
    setGameSpeed(DIFFICULTY_SPEEDS[difficulty]);
  }, [difficulty]);

  // Set up game loop
  useEffect(() => {
    if (!gameOver) {
      const gameLoop = setInterval(moveSnake, gameSpeed);
      return () => clearInterval(gameLoop);
    }
  }, [moveSnake, gameOver, gameSpeed]);

  // Handle keyboard input
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

  // Set up event listener for keyboard input
  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  // Generate a random position for food
  const getRandomPosition = (): Position => ({
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE),
  });

  // Reset the game to initial state
  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setFood(getRandomPosition());
    setGameOver(false);
    setScore(0);
    setCurrentIcon(
      programmingIcons[Math.floor(Math.random() * programmingIcons.length)]
    );
  };

  // Handle direction change (for mobile controls)
  const handleDirectionChange = (newDirection: Direction) => {
    setDirection(newDirection);
  };

  const handleDifficultyChange = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    resetGame();
  };

  return (
    <div className="flex flex-col gap-4 items-center justify-center w-full max-w-sm mx-auto">
      <div className="flex justify-center space-x-2">
        {(["easy", "medium", "hard"] as Difficulty[]).map((level) => (
          <Button
            key={level}
            onClick={() => handleDifficultyChange(level)}
            variant="outline"
            size="sm"
            className={`px-3 py-1 text-sm transition-colors duration-200
              ${
                difficulty === level
                  ? "bg-green-500 text-white hover:bg-green-600 hover:text-white"
                  : "bg-white text-green-700 hover:bg-green-100 hover:text-green-800 dark:bg-gray-800 dark:text-green-400 dark:hover:bg-gray-700 dark:hover:text-green-300"
              } border border-green-500 dark:border-green-400`}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </Button>
        ))}
      </div>

      <motion.div
        className="flex flex-col gap-2 p-3 bg-green-50 dark:bg-gray-700 rounded-lg shadow-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h4 className="text-sm font-semibold text-green-700 dark:text-green-300 flex items-center justify-center">
          <Gamepad2 className="mr-2" size={16} />
          How to Play
        </h4>
        <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
          <li className="flex items-center">
            <span className="mr-2">🎮</span>
            Use arrow keys or on-screen buttons to move
          </li>
          <li className="flex items-center">
            <span className="mr-2">🍎</span>
            Eat up programming languages to level up your tech stack
          </li>
          <li className="flex items-center">
            <span className="mr-2">🚫</span>
            Avoid walls and self-bites
          </li>
          <li className="flex items-center">
            <span className="mr-2">⚙️</span>
            Choose your difficulty: Easy, Medium, or Hard
          </li>
        </ul>
      </motion.div>
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
          <currentIcon.icon size={CELL_SIZE * 0.8} color="white" />
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
          className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-md active:shadow-inner transition-all duration-200"
        >
          <ChevronUp size={24} />
        </Button>
        <div></div>
        <Button
          size="sm"
          onClick={() => handleDirectionChange("LEFT")}
          className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-md active:shadow-inner transition-all duration-200"
        >
          <ChevronLeft size={24} />
        </Button>
        <div></div>
        <Button
          size="sm"
          onClick={() => handleDirectionChange("RIGHT")}
          className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-md active:shadow-inner transition-all duration-200"
        >
          <ChevronRight size={24} />
        </Button>
        <div></div>
        <Button
          size="sm"
          onClick={() => handleDirectionChange("DOWN")}
          className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-md active:shadow-inner transition-all duration-200"
        >
          <ChevronDown size={24} />
        </Button>
        <div></div>
      </div>
    </div>
  );
};

export default SnakeGame;
