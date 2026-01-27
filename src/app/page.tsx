/* eslint-disable react/no-unescaped-entities */
"use client";
import Image from "next/image";
import Macintosh from "@/components/Macintosh";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  ExternalLink,
  Twitter,
  Github,
  ChevronLeft,
} from "lucide-react";
import LastDeployedInfo from "@/components/LastDeployedInfo";
import { FavoriteLinks } from "@/components/FavoriteLinks";
import { useState } from "react";

const companies = [
  {
    name: "Paragraph",
    logo: "https://pbs.twimg.com/profile_images/1906799996864974848/1ObSVOOC_400x400.jpg",
    website: "https://paragraph.xyz/",
  },
  {
    name: "Pimlico",
    logo: "https://pbs.twimg.com/profile_images/1693793364380938240/wvr-wszx_400x400.jpg",
    website: "https://pimlico.io",
  },
  {
    name: "Gallery",
    logo: "https://pbs.twimg.com/profile_images/1507114143865786370/Ww3QGXhq_400x400.png",
    website: "https://gallery.so",
  },
  {
    name: "RabbitHole",
    logo: "https://pbs.twimg.com/profile_images/1740493721601232896/3B7Nytzl_400x400.png",
    website: "https://rabbithole.gg",
  },
];

const projects = [
  {
    name: "Beenthere",
    logo: "/projects/beenthere-logo.png",
    website: "https://www.beenthere.page/",
  },
  {
    name: "FairForms",
    logo: "/projects/fairforms-logo.png",
    website: "https://fairforms.vercel.app/",
  },
  {
    name: "Waitroom",
    logo: "/projects/waitroom-logo.png",
    website: "https://waitroom-api.vercel.app/",
  },
  {
    name: "3Reads",
    logo: "/projects/3reads-logo.png",
    website: "https://3reads.vercel.app/",
  },
];

// const projects = [
//   {
//     name: "FairForms",
//     repoUrl: "https://github.com/SouravInsights/fairforms",
//     liveUrl: "https://www.fairforms.xyz/",
//   },
//   {
//     name: "Vendorly",
//     repoUrl: "https://github.com/SouravInsights/vendorly",
//     liveUrl: "https://vendorly.vercel.app/",
//   },
//   {
//     name: "justanotherday",
//     liveUrl: "https://justanotherday.vercel.app/",
//   },
//   {
//     name: "levelmeup",
//     repoUrl: "https://github.com/SouravInsights/levelmeup",
//     liveUrl: "https://levelmeup.vercel.app/",
//   },
// ];

const blogHighlights = [
  {
    title: "What Wilson (the volleyball) Taught Me About Loneliness",
    url: "/blog/find-your-wilson",
    excerpt:
      "What a volleyball named Wilson in the movie 'Cast Away' taught me about loneliness, connection, and what it really means to stay human.",
    readingTime: "9 min read",
    date: "2025-07-18",
  },
  {
    title: "Building a Brain That Can Do Everything (But Not All at Once)",
    url: "/blog/polymath-mode",
    excerpt:
      "A deep and honest exploration into what it means to be a modern-day polymath, the struggle to balance curiosity with deep focus.",
    readingTime: "10 min read",
    date: "2025-04-19",
  },
];

const unpopularOpinions = [
  "Curiousity & persistence can outmatch talent.",
"Suffering is not always bad, comfort is not always good.",
  "The most dangerous thing about the internet isn’t distraction, it’s identity addiction!",
  "We romanticize 'busy' because we're scared of what we'd find in the silence",
  "You are replaceable. And that’s okay",
  "Sometimes you don’t miss the person. You miss the version of yourself who hoped things would turn out better.",
  "Most people are lonely not because they're alone, but because they're afraid to be vulnerable",
];

const myToolkit = {
  coding: {
    title: "Development",
    items: [
      "VS Code",
      "Warp Terminal",
      "Git",
      "Docker",
      "Postgres",
      "TypeScript",
      "Next.js",
      "React",
    ],
  },
  productivity: {
    title: "Getting Things Done",
    items: [
      "Obsidian",
      "Session (Pomodoro)",
      "Notion",
      "Arc Browser",
      "Raycast",
    ],
  },
  creative: {
    title: "Creative Work",
    items: [
      "Figma",
      "Cap.so",
      "Framer Motion",
      "Tailwind CSS",
      "Guitar",
      "Sketching",
    ],
  },
  daily: {
    title: "Daily Life",
    items: ["Spotify", "Kindle", "Bike rides", "Solo walks", "Coffee shops"],
  },
};

const HeroSection = () => (
  <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden relative border border-gray-200 dark:border-gray-700 transition-colors duration-200">
    {/* Background grid effect */}
    <div
      className="absolute inset-0 transition-opacity duration-200"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)
        `,
        backgroundSize: "4rem 4rem",
        maskImage:
          "radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 110%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 110%)",
        opacity: "0.2",
      }}
    />

    {/* Dark mode grid */}
    <div
      className="absolute inset-0 transition-opacity duration-200 dark:opacity-20 opacity-0"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
        `,
        backgroundSize: "4rem 4rem",
        maskImage:
          "radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 110%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 110%)",
      }}
    />

    <div className="relative z-10 p-4 md:p-8">
      <div className="flex flex-col md:grid md:grid-cols-2 gap-8 items-center">
        {/* Content section - Reordered for mobile */}
        <div className="order-2 md:order-1 w-full">
          <div className="space-y-6">
            <div className="mt-6 md:mt-8 space-y-4 text-gray-600 dark:text-gray-300 text-sm md:text-base">
              <p className="leading-relaxed">
                Hey there! This is my{" "}
                <a
                  href="https://matthiasott.com/articles/into-the-personal-website-verse"
                  className="text-green-600 dark:text-green-400 underline hover:text-green-500 dark:hover:text-green-300 transition-colors"
                >
                  little corner of the internet
                </a>
                . I'm a product engineer who loves building underwhelming
                interfaces,{" "}
                <a
                  href="https://x.com/souravinsights/status/1898797157463015437"
                  className="text-green-600 dark:text-green-400 underline hover:text-green-500 dark:hover:text-green-300 transition-colors"
                >
                  learning new stuff
                </a>
                , and occasionally{" "}
                <a
                  href="https://www.souravinsights.com/blog"
                  className="text-green-600 dark:text-green-400 underline hover:text-green-500 dark:hover:text-green-300 transition-colors"
                >
                  writing
                </a>{" "}
                about it.
              </p>
              <p className="leading-relaxed">
                I spend my days writing code, tinkering with side projects, and
                figuring out{" "}
                <a
                  href="https://www.souravinsights.com/blog/polymath-mode"
                  className="text-green-600 dark:text-green-400 underline hover:text-green-500 dark:hover:text-green-300 transition-colors"
                >
                  how to balance curiosity
                </a>{" "}
                with actually finishing things. When I'm not coding, you'll find
                me{" "}
                <a
                  href="https://chordcanvas.vercel.app/"
                  className="text-green-600 dark:text-green-400 underline hover:text-green-500 dark:hover:text-green-300 transition-colors"
                >
                  practicing chords
                </a>{" "}
                of my fav songs, on a{" "}
                <a
                  href="https://www.souravinsights.com/blog/why-riding-is-like-a-therapy"
                  className="text-green-600 dark:text-green-400 underline hover:text-green-500 dark:hover:text-green-300 transition-colors"
                >
                  bike ride
                </a>
                , or probably{" "}
                <a
                  href="https://3reads.vercel.app/"
                  className="text-green-600 dark:text-green-400 underline hover:text-green-500 dark:hover:text-green-300 transition-colors"
                >
                  reading something random.
                </a>
              </p>
              <p>
                This site is an extension of my personal self, it's where I
                share what I'm working on, thinking about, and learning. It's
                always changing because, well, so am I.
              </p>

              <LastDeployedInfo />
            </div>

            <motion.div
              className="flex flex-wrap gap-3 text-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2 }}
            >
              <a
                href="https://github.com/souravinsights"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </a>
              <a
                href="https://twitter.com/souravinsights"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <Twitter className="w-4 h-4" />
                <span>Twitter</span>
              </a>
            </motion.div>
          </div>
        </div>

        {/* Macintosh section */}
        <div className="order-1 md:order-2 w-full flex justify-center md:justify-end">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg transition-colors duration-200"
          >
            <Macintosh />
          </motion.div>
        </div>
      </div>
    </div>
  </div>
);

export default function Home() {
  const [currentOpinionIndex, setCurrentOpinionIndex] = useState(0);

  const nextOpinion = () => {
    setCurrentOpinionIndex((prev) =>
      prev === unpopularOpinions.length - 1 ? 0 : prev + 1
    );
  };

  const prevOpinion = () => {
    setCurrentOpinionIndex((prev) =>
      prev === 0 ? unpopularOpinions.length - 1 : prev - 1
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-2 sm:p-4 md:p-12 transition-colors duration-200">
      {/* 0cred verification */}
      <div className="f2934f51-f127-4d33-aed6-0d621f9e3f07"></div>

      <div className="max-w-6xl mx-auto space-y-12 pt-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <HeroSection />
        </motion.div>
        {/* Experience Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-6 sm:p-6 md:p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Companies
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                I've had the chance to work with some great teams building
                things people use
              </p>
            </div>
            <div className="grid grid-cols-2 md:flex flex-wrap justify-center gap-4">
              {companies.map((company, index) => (
                <motion.a
                  key={company.name}
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-accent hover:-translate-y-1 transition-all duration-300 min-w-[140px]"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 relative">
                      <Image
                        src={company.logo}
                        alt={`${company.name} logo`}
                        fill
                        className="rounded-full object-cover"
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground transition-colors text-center">
                      {company.name}
                    </span>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>
        </motion.section>
        {/* Projects Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-6 sm:p-6 md:p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Side Projects
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Things I build when I'm curious about something or need to
                scratch a personal itch.
              </p>
            </div>
            <div className="grid grid-cols-2 md:flex flex-wrap justify-center gap-4">
              {projects.map((project, index) => (
                <motion.a
                  key={project.name}
                  href={project.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-accent hover:-translate-y-1 transition-all duration-300 min-w-[140px]"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 relative">
                      <Image
                        src={project.logo}
                        alt={`${project.name} logo`}
                        fill
                        className="rounded-full object-cover"
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground transition-colors text-center">
                      {project.name}
                    </span>
                  </div>
                </motion.a>
              ))}
            </div>
            <div className="mt-8 text-center">
              <a
                href="https://github.com/SouravInsights"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-green-600 dark:hover:text-green-400 font-medium transition-colors"
              >
                View all projects <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </motion.section>
        {/* Blog Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-6 sm:p-6 md:p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Recent Essays
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Some thoughts on life, learning, and whatever random things I
                get curious about at 2 AM
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {blogHighlights.map((blog) => (
                <div key={blog.title} className="group">
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-6 hover:bg-accent transition-all duration-300 h-full">
                    <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
                      <span>{blog.date}</span>
                      <span>•</span>
                      <span>{blog.readingTime}</span>
                    </div>
                    <h3 className="group-hover:text-green-600 dark:group-hover:text-green-400 font-semibold text-foreground mb-3 transition-colors">
                      <a href={blog.url} className="block">
                        {blog.title}
                      </a>
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {blog.excerpt}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <a
                href="/blog"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-green-600 dark:hover:text-green-400 font-medium transition-colors"
              >
                Read all posts <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </motion.section>
        {/* Favorite Links Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="space-y-6"
        >
          <FavoriteLinks />
        </motion.section>

        {/* Unpopular Opinions Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-6"
        >
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-6 sm:p-6 md:p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Unpopular Opinions
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Things I've felt, noticed and often keep circling back to.
              </p>
            </div>

            {/* Mobile: Single card with navigation */}
            <div className="md:hidden">
              <div className="relative overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentOpinionIndex}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="group hover:bg-accent border border-gray-200 dark:border-gray-700 rounded-xl p-6 transition-all duration-300 hover:shadow-sm hover:shadow-gray-200/50 dark:hover:shadow-gray-800/20 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900 h-[140px] flex items-center w-full"
                  >
                    <div className="flex items-start gap-4 w-full">
                      <span className="text-sm font-mono text-green-600 dark:text-green-400 mt-1 w-8 flex-shrink-0 font-medium group-hover:text-green-500 dark:group-hover:text-green-300 transition-colors">
                        {String(currentOpinionIndex + 1).padStart(2, "0")}
                      </span>
                      <p className="text-sm text-gray-600 dark:text-gray-300 italic leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                        {unpopularOpinions[currentOpinionIndex]}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 h-10">
                <button
                  onClick={prevOpinion}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-green-600 dark:hover:text-green-400 transition-colors border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-accent h-full"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>

                {/* Progress dots */}
                <div className="flex gap-1">
                  {unpopularOpinions.slice(0, 10).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentOpinionIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentOpinionIndex
                          ? "bg-green-600 dark:bg-green-400"
                          : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={nextOpinion}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-green-600 dark:hover:text-green-400 transition-colors border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-accent h-full"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-3 opacity-70">
                {currentOpinionIndex + 1} of {unpopularOpinions.length}
              </p>
            </div>

            {/* Desktop: Grid layout */}
            <div className="hidden md:grid grid-cols-2 gap-4">
              {unpopularOpinions.slice(0, 10).map((opinion, index) => (
                <div
                  key={index}
                  className="group hover:bg-accent border border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-4 md:p-6 transition-all duration-300 hover:shadow-sm hover:shadow-gray-200/50 dark:hover:shadow-gray-800/20 hover:-translate-y-0.5 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-xs font-mono text-green-600 dark:text-green-400 mt-1 w-6 flex-shrink-0 font-medium group-hover:text-green-500 dark:group-hover:text-green-300 transition-colors">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-300 italic leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                      {opinion}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* My Toolkit Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-6"
        >
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-6 sm:p-6 md:p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Things I Use
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                The software, tools, and habits that help me get things done
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(myToolkit).map(([key, category]) => (
                <div key={key} className="space-y-3">
                  <h3 className="font-semibold text-foreground">
                    {category.title}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {category.items.map((item) => (
                      <span
                        key={item}
                        className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
