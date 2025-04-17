"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail } from "lucide-react";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      setMessage("Please enter a valid email address");
      setStatus("error");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        "https://api.buttondown.com/v1/subscribers",
        {
          method: "POST",
          headers: {
            Authorization: `Token ${process.env.BUTTONDOWN_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

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
    <div className="bg-green-50 dark:bg-gray-700 p-4 sm:p-6 rounded-lg shadow-md">
      <div className="flex items-center mb-4">
        <Mail className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Get Weekly Resource Digest
        </h3>
      </div>

      <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
        Receive the best links and resources directly in your inbox. No spam,
        just hand-picked content.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <Input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-grow"
          disabled={isSubmitting}
          required
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {isSubmitting ? "Subscribing..." : "Subscribe"}
        </Button>
      </form>

      {message && (
        <p
          className={`mt-2 text-sm ${
            status === "success"
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
