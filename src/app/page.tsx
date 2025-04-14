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
import { truncate } from "@/lib/utils";
import {
  InteractiveTerminal,
  MatrixRain,
} from "@/components/InteractiveElements";

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
    current: false,
    description: [
      "Contributed to the migration from Next.js Pages Router to App Router, focusing on refactoring key pages with Server Components to reduce JavaScript payload and improve load performance. Used Client Components selectively to preserve interactivity where needed, balancing UX and performance.",
      "Redesigned the editor dashboard UI and improved the publishing flow in collaboration with our product designer and other engineers.",
      "Contributed to a state management migration from Redux to Jotai by modularizing large state objects into granular atoms, improving maintainability and clarity.",
      "Refactored UI components by abstracting business logic into custom React hooks and utility functions, creating a cleaner, reusable component library.",
      "Actively participated in reviewing frontend & backend PRs, offering constructive feedback and hands-on refactors when necessary.",
      "Took ownership of investigating and fixing quirky, hard-to-reproduce bugs by talking to users, gathering context, and handling multiple edge cases.",
    ],
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

interface Projects {
  name: string;
  description: string;
  repoUrl?: string;
  techStack: string[];
  deployedUrl?: string;
}

const sideProjects = [
  {
    name: "FairForms",
    description:
      "A self-hosted form builder that doesn't cost a kidney per month. Create beautiful, conversational forms without breaking the bank.",
    repoUrl: "https://github.com/SouravInsights/fairforms",
    techStack: ["TypeScript", "Next.js", "Shadcn", "PostgreSQL", "Drizzle"],
    deployedUrl: "https://www.fairforms.xyz/",
  },
  {
    name: "Vendorly",
    description:
      "A web app for fashion retailers to manage vendor meetings, organize design collections, and share designs with customizable privacy options. Built with Next.js, TypeScript, and PostgreSQL.",
    repoUrl: "https://github.com/SouravInsights/vendorly",
    techStack: ["TypeScript", "Next.js", "Shadcn", "PostgreSQL", "Drizzle"],
    deployedUrl: "https://vendorly.vercel.app/",
  },
  {
    name: "create-permissionless-app",
    description:
      "CLI tool for bootstrapping Account Abstraction apps, similar to create-next-app but for Pimlico's AA infrastructure",
    repoUrl:
      "https://github.com/SouravInsights/permissionless.js/tree/main/packages/create-permissionless-app",
    techStack: ["TypeScript", "Node.js", "React", "Viem"],
  },
];

const funProjects = [
  {
    name: "justanotherday",
    description:
      "A minimalist, sarcastic landing page for those enjoying a completely normal day (especially when others aren't)",
    techStack: ["Next.js", "React", "Tailwind", "Shadcn", "Framer Motion"],
    deployedUrl: "https://www.justanotherday.lol/",
  },
  {
    name: "levelmeup",
    description:
      "Smart resume analysis to match people with relevant opportunities & skills!",
    repoUrl: "https://github.com/SouravInsights/levelmeup",
    techStack: [
      "Next.js",
      "React",
      "Tailwind",
      "Shadcn",
      "Framer Motion",
      "HuggingFace",
    ],
    deployedUrl: "https://levelmeup.vercel.app/",
  },
  {
    name: "NightOwls Community",
    description: `🦉 A cozy corner on the internet where night owls share their code, music, and late-night building adventures`,
    repoUrl: "https://github.com/SouravInsights/nightowl-community",
    techStack: ["TypeScript", "Next.js", "Shadcn", "PostgreSQL", "Drizzle"],
    deployedUrl: "https://nightowl-community.vercel.app/",
  },
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
    <div className="bg-gray-100 dark:bg-gray-800 px-3 sm:px-4 py-2 flex items-center gap-2">
      <div className="flex space-x-1.5 sm:space-x-2">
        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500"></div>
        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500"></div>
        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500"></div>
      </div>
      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 ml-2">
        {title}
      </span>
    </div>
    <div className="p-2 sm:p-4">{children}</div>
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
    className={`pl-2 sm:pl-4 border-l border-gray-200 dark:border-gray-700 ${className}`}
  >
    <div className="flex items-center gap-1.5 sm:gap-2 text-gray-700 dark:text-gray-300 mb-2">
      <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
      <Folder className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
      <span className="text-sm sm:text-base">{name}/</span>
    </div>
    <div className="pl-3 sm:pl-6">{children}</div>
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
    <div className="flex items-center gap-1.5 sm:gap-2 text-gray-700 dark:text-gray-300 mb-2">
      <File className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
      <span className="text-sm sm:text-base">{name}</span>
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

const SideProjectItem = ({ project }: { project: Projects }) => (
  <FileItem key={project.name} name={`${project.name}.ts`}>
    <div className="border border-gray-200 dark:border-gray-700 rounded p-3 sm:p-4 mb-3 sm:mb-4">
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
          {project.name}
        </h3>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1.5 sm:mt-2">
          {project.description || "<No description provided>"}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
        {project.techStack.map((tech) => (
          <span
            key={tech}
            className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs sm:text-sm rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            {tech}
          </span>
        ))}
      </div>
      <div className="mt-3 sm:mt-4 text-xs sm:text-sm font-mono text-gray-600 dark:text-gray-400 flex flex-col gap-1.5 sm:gap-2">
        {project.repoUrl && (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
            <div className="flex-grow min-w-0 flex items-center">
              <span className="inline-block w-[80px] sm:w-[105px]">
                Source:
              </span>
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline inline-block max-w-[calc(100%-80px)] sm:max-w-[calc(100%-105px)] truncate"
              >
                {truncate(project.repoUrl.replace(/https?:\/\//, ""), 30)}
              </a>
            </div>
          </div>
        )}
        {project.deployedUrl && (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
            <div className="flex-grow min-w-0 flex items-center">
              <span className="inline-block w-[80px] sm:w-[105px]">Live:</span>
              <a
                href={project.deployedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline inline-block max-w-[calc(100%-80px)] sm:max-w-[calc(100%-105px)] truncate"
              >
                {truncate(project.deployedUrl.replace(/https?:\/\//, ""), 30)}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  </FileItem>
);

const WorkExperienceItem = ({
  company,
}: {
  company: (typeof companies)[0];
}) => (
  <FileItem key={company.name} name={`${company.name.toLowerCase()}.md`}>
    <motion.div
      className={`border rounded-lg overflow-hidden mb-3 sm:mb-4 ${
        company.current
          ? "border-green-500 dark:border-green-400"
          : "border-gray-200 dark:border-gray-700"
      }`}
    >
      <div className="p-3 sm:p-6">
        {/* Company Header - Optimized for mobile */}
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
          {/* Company Info */}
          <div className="flex items-start space-x-3 sm:space-x-4">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 sm:w-[60px] sm:h-[60px] relative">
                <Image
                  src={company.logo}
                  alt={`${company.name} logo`}
                  fill
                  className="rounded-full object-cover"
                />
              </div>
              {company.current && (
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-medium px-1.5 py-0.5 rounded-full">
                  Current
                </span>
              )}
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                {company.name}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                {company.role}
              </p>
              {/* Move period and location into the main info section on mobile */}
              <div className="block sm:hidden mt-1 text-xs text-gray-500 dark:text-gray-400">
                <p>
                  {company.period} • {company.location}
                </p>
              </div>
            </div>
          </div>

          {/* Period and Location - Hidden on mobile, shown on desktop */}
          <div className="hidden sm:block text-sm text-gray-600 dark:text-gray-400">
            <p>{company.period}</p>
            <p>{company.location}</p>
          </div>
        </div>

        {/* Description Points */}
        {company.description && (
          <ul className="space-y-3 sm:space-y-4 mb-4 sm:mb-6 list-none">
            {company.description.map((point, i) => (
              <li key={i} className="flex items-start">
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 dark:text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                  {point}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Links Section - Optimized for mobile */}
        <div className="flex flex-wrap gap-2 sm:gap-4">
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-700 dark:text-green-300 hover:underline flex items-center text-xs sm:text-sm"
            >
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              Website
            </a>
          )}
          {company.twitter && (
            <a
              href={`https://twitter.com/${company.twitter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-700 dark:text-green-300 hover:underline flex items-center text-xs sm:text-sm"
            >
              <Twitter className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              Twitter
            </a>
          )}
          {company.projectUrl && (
            <a
              href={company.projectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-700 dark:text-green-300 hover:underline flex items-center text-xs sm:text-sm"
            >
              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              Project
            </a>
          )}
        </div>
      </div>
    </motion.div>
  </FileItem>
);

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
      {/* 0cred verification */}
      <div className="f2934f51-f127-4d33-aed6-0d621f9e3f07"></div>

      {/* Add Matrix rain effect */}
      <MatrixRain />

      <div className="max-w-6xl mx-auto space-y-12 pt-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <HeroSection />
        </motion.div>

        {/* Interactive Terminal Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <InteractiveTerminal />
        </motion.section>

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
                <SideProjectItem key={project.name} project={project} />
              ))}
            </Directory>
          </TerminalWindow>
        </motion.section>

        {/* Fun Projects Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <TerminalWindow title="~/fun-projects">
            <Directory name="experiments" className="overflow-x-auto">
              {funProjects.map((project) => (
                <SideProjectItem key={project.name} project={project} />
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
                <WorkExperienceItem key={company.name} company={company} />
              ))}
            </Directory>
          </TerminalWindow>
        </motion.section>
      </div>
    </div>
  );
}
