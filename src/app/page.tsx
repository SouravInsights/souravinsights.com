/* eslint-disable react/no-unescaped-entities */
"use client";
import Macintosh from "@/components/Macintosh";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6 md:p-12 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="flex flex-col lg:flex-row items-center lg:items-start gap-12 md:gap-4 mt-2 mb-8 md:mt-16 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="lg:w-1/3 flex justify-center lg:justify-start">
            <Macintosh />
          </div>
          <div className="lg:w-2/3">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-green-800 dark:text-green-400">
              Hello world! I'm <span className="text-primary">Sourav</span>{" "}
              <span
                role="img"
                aria-label="waving hand"
                className="animate-wave inline-block"
              >
                👋
              </span>
            </h1>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>
                And this is my{" "}
                <a
                  href="https://matthiasott.com/articles/into-the-personal-website-verse?ref=gersande.com"
                  className="text-green-700 dark:text-green-400 underline hover:text-green-600 dark:hover:text-green-300 transition-colors"
                >
                  tiny home on the internet
                </a>
                , a place to tell my own stories, share what I'm excited about,
                what I'm thinking and what I'm currently up to.
              </p>
              <p>
                I believe,{" "}
                <a
                  href="https://thecreativeindependent.com/essays/laurel-schwulst-my-website-is-a-shifting-house-next-to-a-river-of-knowledge-what-could-yours-be/"
                  className="text-green-700 dark:text-green-400 underline hover:text-green-600 dark:hover:text-green-300 transition-colors"
                >
                  a personal website has endless possibilities
                </a>
                , our identities, ideas, and dreams are created and expanded by
                them, so it's instrumental that our websites progress along with
                us.
              </p>
              <p>
                With algorithms now prioritizing content that is loud and
                outrageous and from people with a huge following, it has been
                increasingly harder for people to get their voice heard. Also,
                we don't own our content anymore; what if all the popular
                platforms we use to share our ideas & thoughts cease to exist?
              </p>
              <p>
                Our content is not just something we have created but it is also
                part of our identity. It is part of who we are, what we are
                thinking, what we believe in. It is part of the story we are
                about to tell. Our content is one of our most valuable assets
                and thus owning it is invaluable.
              </p>
              <p>
                I intend to treat this website as an extension of myself. This
                will house all my curations, all of my little insights from all
                of my sources. And this site will always be a work-in-progress
                because there's{" "}
                <a
                  href="https://thecreativeindependent.com/essays/laurel-schwulst-my-website-is-a-shifting-house-next-to-a-river-of-knowledge-what-could-yours-be/"
                  className="text-green-700 dark:text-green-400 underline hover:text-green-600 dark:hover:text-green-300 transition-colors"
                >
                  no state of "completeness" to a website.
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
