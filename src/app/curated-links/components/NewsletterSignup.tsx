/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, ChevronDown, ChevronUp, Check, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [showDetails, setShowDetails] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      setMessage("Please enter a valid email address");
      setStatus("error");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          Authorization: `Token ${process.env.BUTTONDOWN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setMessage("Thanks for subscribing! Check your inbox to confirm.");
        setStatus("success");
        setEmail("");
      } else {
        const error = await response.json();
        if (error.detail?.includes("already exists")) {
          setMessage("You're already subscribed! Thank you!");
          setStatus("success");
        } else {
          throw new Error(error.detail || "Something went wrong");
        }
      }
    } catch (error) {
      console.error("Error subscribing:", error);
      setMessage("Error subscribing. Please try again later.");
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-lg shadow-md border border-green-100 dark:border-green-900">
      <div className="flex items-center mb-4">
        <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full mr-3">
          <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            My Weekly Internet Treasures
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Curated treasures from the overlooked corners of the internet
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex flex-col space-y-2">
          <div className="flex items-start">
            <Check className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700 dark:text-gray-200">
              Hand-picked resources that algorithms don't prioritize
            </p>
          </div>
          <div className="flex items-start">
            <Check className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700 dark:text-gray-200">
              Thoughtful summaries that respect your time and attention
            </p>
          </div>
          <div className="flex items-start">
            <Check className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700 dark:text-gray-200">
              Weekly delivery with zero spam, ever
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors text-sm mt-3 font-medium"
        >
          {showDetails ? "Show less" : "Why subscribe?"}
          {showDetails ? (
            <ChevronUp className="ml-1 w-4 h-4" />
          ) : (
            <ChevronDown className="ml-1 w-4 h-4" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="border-l-2 border-green-300 dark:border-green-700 pl-4 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 italic mb-2">
                "We live in a paradox of abundance: an endless ocean of content,
                yet somehow the truly valuable gems often remain hidden in
                overlooked corners of the internet."
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Each week, I scour the internet, searching for treasures that
                deserve attention but don't always get it.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
              <p className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                What you'll receive:
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-5">
                <li>5-7 curated links spanning tech, design, and creativity</li>
                <li>Brief, thoughtful commentary on why each matters</li>
                <li>Occasional exclusive insights and resources</li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-grow bg-white dark:bg-gray-900"
            disabled={isSubmitting}
            required
          />
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Subscribing...
              </>
            ) : (
              "Subscribe for Free"
            )}
          </Button>
        </div>

        {message && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-sm ${
              status === "success"
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {message}
          </motion.p>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
          Join the readers who value depth over algorithms. Unsubscribe anytime.
        </p>
      </form>
    </div>
  );
}
