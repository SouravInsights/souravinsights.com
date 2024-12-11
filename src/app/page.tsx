/* eslint-disable react/no-unescaped-entities */
"use client";
import Image from "next/image";
import Macintosh from "@/components/Macintosh";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ChevronRight,
  ExternalLink,
  Globe,
  Twitter,
  Github,
  ChevronDown,
  Folder,
  File,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const companies = [
  {
    name: "Paragraph",
    role: "Full-stack Engineer",
    period: "2024",
    location: "Remote",
    logo: "https://pbs.twimg.com/profile_images/1693793364380938240/wvr-wszx_400x400.jpg",
    twitter: "@paragraph_xyz",
    website: "https://paragraph.xyz/",
    projectUrl: "https://github.com/paragraph-xyz",
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
    projectUrl:
      "https://github.com/SouravInsights/permissionless.js/tree/main/packages/create-permissionless-app",
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
    projectUrl:
      "https://github.com/gallery-so/gallery/pulls?q=is%3Apr+is%3Aclosed+author%3ASouravInsights",
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
    current: false,
  },
];

const sideProjects = [
  {
    name: "create-permissionless-app",
    description:
      "CLI tool for bootstrapping Account Abstraction apps, similar to create-next-app but for Pimlico's AA infrastructure",
    repoUrl:
      "https://github.com/SouravInsights/permissionless.js/tree/main/packages/create-permissionless-app",
    techStack: ["TypeScript", "Node.js", "React", "Viem"],
  },
  // more projects coming soon
];

// Custom Terminal-style components
const TerminalWindow = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
    <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 flex items-center gap-2">
      <div className="flex space-x-2">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
      </div>
      <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
        {title}
      </span>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const Directory = ({
  name,
  children,
  className = "",
}: {
  name: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`pl-4 border-l border-gray-200 dark:border-gray-700 ${className}`}
  >
    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-2">
      <ChevronDown className="w-4 h-4" />
      <Folder className="w-4 h-4 text-yellow-500" />
      <span>{name}/</span>
    </div>
    <div className="pl-6">{children}</div>
  </div>
);

const FileItem = ({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-2">
      <File className="w-4 h-4 text-blue-500" />
      <span>{name}</span>
    </div>
    {children}
  </div>
);

const TerminalPrompt = () => {
  const [displayedText, setDisplayedText] = useState("");
  // Shorter text for mobile screens
  const mobileText = 'sourav.exe --role="Full-stack Engineer"';
  const desktopText =
    'sourav.exe --location="Somewhere on the internet" --role="Full-stack Engineer" --status="Building cool stuff"';

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const fullText = isMobile ? mobileText : desktopText;

    let i = 0;
    const typing = setInterval(() => {
      setDisplayedText(fullText.substring(0, i));
      i++;
      if (i > fullText.length) clearInterval(typing);
    }, 50);
    return () => clearInterval(typing);
  }, []);

  return (
    <div className="font-mono">
      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
        <span>➜</span>
        <span>~/</span>
        <span className="text-blue-600 dark:text-blue-400">whoami</span>
      </div>
      <div className="mt-2 flex gap-2">
        <span className="text-gray-500">$</span>
        <span className="text-gray-800 dark:text-gray-200 break-all">
          {displayedText}
        </span>
        <span className="animate-pulse">▊</span>
      </div>
    </div>
  );
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
            <TerminalPrompt />

            <div className="mt-6 md:mt-8 space-y-4 text-gray-600 dark:text-gray-300 text-sm md:text-base">
              <p className="leading-relaxed">
                And this is my{" "}
                <a
                  href="https://matthiasott.com/articles/into-the-personal-website-verse"
                  className="text-green-600 dark:text-green-400 underline hover:text-green-500 dark:hover:text-green-300 transition-colors"
                >
                  tiny home on the internet
                </a>
                , a place to tell my own stories, share what I'm excited about,
                what I'm thinking and what I'm currently up to.
              </p>
              <p className="leading-relaxed">
                I believe,{" "}
                <a
                  href="https://thecreativeindependent.com/essays/laurel-schwulst-my-website-is-a-shifting-house-next-to-a-river-of-knowledge-what-could-yours-be/"
                  className="text-green-600 dark:text-green-400 underline hover:text-green-500 dark:hover:text-green-300 transition-colors"
                >
                  a personal website has endless possibilities
                </a>
                , our identities, ideas, and dreams are created and expanded by
                them.
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, -50]);

  const sortedCompanies = [...companies].sort((a, b) => (b.current ? 1 : -1));

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4 sm:p-6 md:p-12 transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <HeroSection />
        </motion.div>

        {/* Side Projects Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <TerminalWindow title="~/projects">
            <Directory name="open-source" className="overflow-x-auto">
              {sideProjects.map((project) => (
                <FileItem key={project.name} name={`${project.name}.ts`}>
                  <div className="border border-gray-200 dark:border-gray-700 rounded p-4 mb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {project.name}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">
                          {project.description}
                        </p>
                      </div>
                      <a
                        href={project.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 dark:text-green-400 hover:text-green-700"
                      >
                        <Github className="w-5 h-5" />
                      </a>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {project.techStack.map((tech) => (
                        <span
                          key={tech}
                          className="px-2 py-1 text-sm rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </FileItem>
              ))}
            </Directory>
          </TerminalWindow>
        </motion.section>

        {/* Work Experience Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <TerminalWindow title="~/experience">
            <Directory name="companies" className="overflow-x-auto">
              {sortedCompanies.map((company) => (
                <FileItem
                  key={company.name}
                  name={`${company.name.toLowerCase()}.md`}
                >
                  <motion.div
                    className={`border rounded-lg overflow-hidden mb-4 ${
                      company.current
                        ? "border-green-500 dark:border-green-400"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
                        <div className="flex items-center">
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
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-4 sm:mt-0">
                          <p>{company.period}</p>
                          <p>{company.location}</p>
                        </div>
                      </div>
                      {company.description && (
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
                </FileItem>
              ))}
            </Directory>
          </TerminalWindow>
        </motion.section>
      </div>
    </div>
  );
}
