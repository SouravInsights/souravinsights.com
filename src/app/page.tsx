/* eslint-disable react/no-unescaped-entities */
"use client";
import Image from "next/image";
import Macintosh from "@/components/Macintosh";
import { motion } from "framer-motion";
import { ChevronRight, ExternalLink, Globe, Twitter } from "lucide-react";

const companies = [
  {
    name: "Paragraph",
    role: "Full-stack Engineer",
    period: "2023",
    location: "Remote",
    logo: "https://pbs.twimg.com/profile_images/1693793364380938240/wvr-wszx_400x400.jpg",
    twitter: "@pimlicoHQ",
    website: "https://pimlico.io",
    projectUrl: "https://github.com/SouravInsights/create-permissionless-app",
    current: true,
  },
  {
    name: "Pimlico",
    role: "Full-stack Engineer",
    period: "2023",
    location: "Remote",
    description: [
      "Building a CLI tool called create-permissionless-app, similar to create-next-app but for bootstrapping an app based on Account Abstraction using Pimlico's AA infra.",
      "It allows you to choose an account system, signer, bundler & paymaster of your own choice and then generates a super clean template!",
      "The generated boilerplate uses Next.js, Typescript, Viem, Wagmi, Permissionless.js and other provider specific packages.",
    ],
    logo: "https://pbs.twimg.com/profile_images/1693793364380938240/wvr-wszx_400x400.jpg",
    twitter: "@pimlicoHQ",
    website: "https://pimlico.io",
    projectUrl: "https://github.com/SouravInsights/create-permissionless-app",
    current: false,
  },
  {
    name: "Gallery",
    role: "Front-end Engineer",
    period: "2023",
    location: "Remote",
    description: [
      "Gallery is where you bring your collections to life for others to see and celebrate.",
      "It's a crypto-based social network for sharing your taste based on the things you collect onchain.",
    ],
    logo: "https://pbs.twimg.com/profile_images/1507114143865786370/Ww3QGXhq_400x400.png",
    twitter: "@GALLERY",
    website: "https://gallery.so",
    projectUrl: "https://github.com/SouravInsights/create-permissionless-app",
    current: false,
  },
  {
    name: "RabbitHole",
    role: "Frontend Engineer",
    period: "2021 - 2022",
    location: "Remote",
    description: [
      "Redesigned the v1 client app from the ground up focusing on delivering a better onboarding experience for users.",
      "Took ownership of maintaining UI consistency across the entire product line by building our internal design system. Built components that are composable & easy to maintain.",
      "Collaborated with designers and participated in making UX decisions that made our onboarding experience much smoother.",
      "Took ownership of various decentralization efforts like integrating Ceramic into our stack & building subgraphs using Graph Protocol.",
      "Contributed to building APIs for our ongoing notification system using GraphQl, Prisma & Postgresql.",
      "Contributed to our internal package of React Hooks containing building blocks for working with wallets, ENS, contracts, transactions, signing, etc. using Ether.js",
    ],
    logo: "https://pbs.twimg.com/profile_images/1740493721601232896/3B7Nytzl_400x400.png",
    twitter: "@rabbithole_gg",
    website: "https://rabbithole.gg",
    projectUrl: "https://github.com/SouravInsights/create-permissionless-app",
    current: false,
  },
];

export default function Home() {
  const sortedCompanies = [...companies].sort((a, b) => (b.current ? 1 : -1));

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

        {/* Work Experience Section */}
        <motion.div
          className="mt-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold mb-8 text-green-800 dark:text-green-400 text-center">
            My Journey So Far
          </h2>
          <div className="space-y-16">
            {sortedCompanies.map((company, index) => (
              <motion.div
                key={company.name}
                className={`rounded-lg shadow-lg overflow-hidden ${
                  company.current
                    ? "bg-green-50 dark:bg-gray-700 border-2 border-green-500 dark:border-green-400"
                    : "bg-white dark:bg-gray-800"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
                    <div className="flex items-center mb-4 sm:mb-0">
                      <div className="relative">
                        <Image
                          src={company.logo}
                          alt={`${company.name} logo`}
                          width={60}
                          height={60}
                          className="rounded-full"
                        />
                        {company.current && (
                          <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="ml-4">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {company.name}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300">
                          {company.role}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p>{company.period}</p>
                      <p>{company.location}</p>
                    </div>
                  </div>
                  {company.description ? (
                    <ul className="space-y-4 mb-6 list-none">
                      {company.description.map((point, i) => (
                        <li key={i} className="flex items-start">
                          <ChevronRight className="w-5 h-5 text-green-500 dark:text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {point}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 italic mb-6">
                      Description coming soon...
                    </p>
                  )}
                  <div className="flex items-center space-x-4">
                    {company.website && (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-700 dark:text-green-300 hover:underline flex items-center"
                      >
                        <Globe className="w-4 h-4 mr-1" />
                        Website
                      </a>
                    )}
                    {company.twitter && (
                      <a
                        href={`https://twitter.com/${company.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-700 dark:text-green-300 hover:underline flex items-center"
                      >
                        <Twitter className="w-4 h-4 mr-1" />
                        Twitter
                      </a>
                    )}
                    {company.projectUrl && (
                      <a
                        href={company.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-700 dark:text-green-300 hover:underline flex items-center"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Project
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
