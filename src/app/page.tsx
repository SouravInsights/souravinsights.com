/* eslint-disable react/no-unescaped-entities */
"use client";
import Image from "next/image";
import Macintosh from "@/components/Macintosh";
import { motion } from "framer-motion";
import { Twitter, Github, Bike, Footprints, Coffee, Music } from "lucide-react";
import LastDeployedInfo from "@/components/LastDeployedInfo";
import { FavoriteLinks } from "@/components/FavoriteLinks";
import { SectionHeader } from "@/components/SectionHeader";
import { FadeIn } from "@/components/FadeIn";
import { ReadingShelf } from "@/components/ReadingShelf";
import { MoviesShelf } from "@/components/MoviesShelf";
import { OpinionsSection } from "@/components/OpinionsSection";
import { EssayHighlights } from "@/components/EssayHighlights";
import { featuredProjects } from "@/app/projects/projects-data";
import {
  Docker,
  GitHubDark,
  Figma,
  Obsidian,
  Spotify,
  Raycast,
  Ghostty,
  Warp,
  Arc,
  Paper,
  GoogleAntigravity,
} from "@ridemountainpig/svgl-react";

const companies = [
  {
    name: "Paragraph",
    logo: "https://pbs.twimg.com/profile_images/2098098654347243525/bGWz6wKc_400x400.jpg",
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
    logo: "https://pbs.twimg.com/profile_images/2090749736764497920/jUEcfiH8_400x400.jpg",
    website: "https://rabbithole.gg",
  },
];

const myToolkit = {
  coding: {
    title: "Dev Tools",
    items: [
      { name: "OpenCode", logo: "/logos/opencode.png", url: null },
      {
        name: "Antigravity",
        logo: GoogleAntigravity,
        url: "https://antigravity.google/",
      },
      { name: "Ghostty", logo: Ghostty, url: "https://ghostty.org/" },
      { name: "Warp", logo: Warp, url: "https://www.warp.dev/" },
      {
        name: "Conductor",
        logo: "/logos/conductor.png",
        url: "https://www.conductor.build/",
      },
      {
        name: "Git Butler",
        logo: "/logos/gitbutler.png",
        url: "https://gitbutler.com/",
      },
      { name: "GitHub Desktop", logo: GitHubDark, url: "https://github.com" },
      { name: "Docker", logo: Docker, url: "https://www.docker.com/" },
      {
        name: "Obscura",
        logo: "/logos/obscura.svg",
        url: "https://obscura.net/",
      },
    ],
  },
  productivity: {
    title: "Getting Things Done",
    items: [
      { name: "Obsidian", logo: Obsidian, url: "https://obsidian.md/" },
      {
        name: "Session",
        logo: "/logos/session.png",
        url: "https://www.stayinsession.com/",
      },
      { name: "Ebb", logo: "/logos/ebb.ico", url: "https://ebb.cool/" },
      { name: "Craft", logo: "/logos/craft.png", url: "https://www.craft.do/" },
      { name: "Arc", logo: Arc, url: "https://arc.net/" },
      { name: "Raycast", logo: Raycast, url: "https://www.raycast.com/" },
    ],
  },
  creative: {
    title: "Creative Work",
    items: [
      { name: "Figma", logo: Figma, url: "https://www.figma.com/" },
      { name: "Paper", logo: Paper, url: "https://paper.design/" },
      { name: "Cap", logo: "/logos/cap.png", url: "https://cap.so/" },
      {
        name: "Jitter",
        logo: "/logos/jitter.png",
        url: "https://jitter.video/",
      },
      {
        name: "Sublime",
        logo: "/logos/sublime.png",
        url: "https://sublime.app/",
      },
    ],
  },
  daily: {
    title: "Daily Life",
    items: [
      { name: "Spotify", logo: Spotify, url: "https://www.spotify.com/" },
      {
        name: "Kindle",
        logo: "/logos/kindle.png",
        url: "https://read.amazon.com/landing",
      },
      { name: "Bike rides", logo: Bike, url: null },
      { name: "Solo walks", logo: Footprints, url: null },
      { name: "Cafes", logo: Coffee, url: null },
      { name: "Guitar", logo: Music, url: null },
    ],
  },
};

const HeroSection = () => (
  <div className="bg-background rounded-lg overflow-hidden relative border border-border transition-colors duration-200">
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

    <div className="relative z-10 p-5 sm:p-6 md:p-8">
      <div className="flex flex-col md:grid md:grid-cols-2 gap-8 items-center">
        {/* Content section - Reordered for mobile */}
        <div className="order-2 md:order-1 w-full">
          <div className="space-y-6">
            <div className="space-y-4 type-body text-foreground dark:text-muted-foreground">
              <p>
                Hey there! This is my{" "}
                <a
                  href="https://matthiasott.com/articles/into-the-personal-website-verse"
                  className="text-green-700 dark:text-green-500 underline hover:text-green-500 dark:hover:text-green-400 transition-colors"
                >
                  little corner of the internet
                </a>
                . I'm a Product Engineer who loves building underwhelming
                interfaces,{" "}
                <a
                  href="https://x.com/souravinsights/status/1898797157463015437"
                  className="text-green-700 dark:text-green-500 underline hover:text-green-500 dark:hover:text-green-400 transition-colors"
                >
                  learning new stuff
                </a>
                , and occasionally{" "}
                <a
                  href="https://www.souravinsights.com/blog"
                  className="text-green-700 dark:text-green-500 underline hover:text-green-500 dark:hover:text-green-400 transition-colors"
                >
                  writing
                </a>{" "}
                about it.
              </p>
              <p>
                I spend my days writing code, tinkering with side projects, and
                figuring out{" "}
                <a
                  href="https://www.souravinsights.com/blog/polymath-mode"
                  className="text-green-700 dark:text-green-500 underline hover:text-green-500 dark:hover:text-green-400 transition-colors"
                >
                  how to balance curiosity
                </a>{" "}
                with actually finishing things. When I'm not coding, you'll find
                me{" "}
                <a
                  href="https://chordcanvas.vercel.app/"
                  className="text-green-700 dark:text-green-500 underline hover:text-green-500 dark:hover:text-green-400 transition-colors"
                >
                  practicing chords
                </a>{" "}
                of my fav songs, on a{" "}
                <a
                  href="https://www.souravinsights.com/blog/why-riding-is-like-a-therapy"
                  className="text-green-700 dark:text-green-500 underline hover:text-green-500 dark:hover:text-green-400 transition-colors"
                >
                  bike ride
                </a>
                , or probably{" "}
                <a
                  href="https://www.souravinsights.com/books"
                  className="text-green-700 dark:text-green-500 underline hover:text-green-500 dark:hover:text-green-400 transition-colors"
                >
                  reading some books.
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
              className="flex flex-wrap gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2 }}
            >
              <a
                href="https://github.com/souravinsights"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-secondary text-secondary-foreground px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2"
              >
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </a>
              <a
                href="https://twitter.com/souravinsights"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-secondary text-secondary-foreground px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2"
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
            className="bg-secondary p-4 rounded-md transition-colors duration-200"
          >
            <Macintosh />
          </motion.div>
        </div>
      </div>
    </div>
  </div>
);

export default function Home() {
  return (
    <div className="min-h-screen bg-background transition-colors duration-200">
      {/* 0cred verification */}
      <div className="f2934f51-f127-4d33-aed6-0d621f9e3f07"></div>

      <div className="mx-auto max-w-5xl px-5 pb-24 pt-10 sm:px-6 sm:pt-12 md:pt-32 space-y-16 sm:space-y-24">
        {/* Hero Section */}
        <FadeIn y={20} duration={0.5}>
          <HeroSection />
        </FadeIn>

        {/* Experience Section */}
        <section>
          <FadeIn>
            <SectionHeader
              title="Companies"
              description="I've had the chance to work with some great teams building things people use"
            />
          </FadeIn>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            {companies.map((company, index) => (
              <motion.a
                key={company.name}
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2.5 transition-opacity hover:opacity-70"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index, 12) * 0.03 }}
              >
                <div className="relative w-6 h-6 shrink-0">
                  <Image
                    src={company.logo}
                    alt={`${company.name} logo`}
                    fill
                    className="rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10"
                  />
                </div>
                <span className="type-body text-foreground">
                  {company.name}
                </span>
              </motion.a>
            ))}
          </div>
        </section>

        {/* Projects Section */}
        <section className="group/section">
          <FadeIn>
            <SectionHeader
              title="Side Projects"
              href="/projects"
              description="Things I build when I'm curious about something or need to scratch a personal itch."
            />
          </FadeIn>
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-3">
            {featuredProjects.map((project, index) => {
              const logoIsSvg = project.logo.endsWith(".svg");

              return (
                <motion.a
                  key={project.slug}
                  href={`/projects#${project.slug}`}
                  className="group flex flex-col"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index, 12) * 0.03 }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md bg-secondary">
                      <Image
                        src={project.logo}
                        alt={`${project.name} logo`}
                        fill
                        unoptimized={logoIsSvg}
                        className="object-cover"
                      />
                    </div>
                    <h3 className="type-heading group-hover:text-green-700 dark:group-hover:text-green-500 transition-colors">
                      {project.name}
                    </h3>
                  </div>
                  <p className="type-caption mt-2">{project.note}</p>
                </motion.a>
              );
            })}
          </div>
        </section>

        {/* Paired sections — long link/article lists up top, then the two
            shelves, then tools beside the opinions, matched by height. */}
        <div className="grid grid-cols-1 gap-x-16 gap-y-16 sm:gap-y-24 md:grid-cols-2 md:items-start">
        {/* Blog Section */}
        <section className="group/section">
          <FadeIn>
            <SectionHeader
              title="Recent Essays"
              href="/blog"
              description="Some thoughts on life, learning, and whatever random things I get curious about at 2 AM"
            />
          </FadeIn>
          <EssayHighlights />
        </section>

        {/* Favorite Links Section */}
        <section className="group/section">
          <FadeIn>
            <SectionHeader
              title="Curated Links"
              href="/curated-links"
              description="A constantly updating collection of links I find worth keeping, including articles, tools, portfolios and more."
            />
          </FadeIn>
          <FavoriteLinks />
        </section>

        {/* Reading Section */}
        <ReadingShelf />

        {/* Movies Section */}
        <MoviesShelf />

        {/* My Toolkit Section */}
        <section>
          <FadeIn>
            <SectionHeader
              title="Things I Use"
              description="The software, tools, and habits that help me get things done"
            />
          </FadeIn>
          <div className="flex flex-col">
            {Object.entries(myToolkit).map(([key, category], groupIndex) => (
              <div key={key}>
                {groupIndex > 0 && (
                  <div className="rule my-4" aria-hidden="true" />
                )}
                <h3 className="type-label mb-3">{category.title}</h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
                  {category.items.map((item, index) => {
                    const ItemWrapper = item.url ? "a" : "span";
                    const logo = item.logo;
                    const isStringLogo = typeof logo === "string";
                    const LogoComponent = !isStringLogo ? logo : null;

                    return (
                      <ItemWrapper
                        key={`${key}-${index}`}
                        {...(item.url
                          ? {
                              href: item.url,
                              target: "_blank",
                              rel: "noopener noreferrer",
                            }
                          : {})}
                        className={`inline-flex items-center gap-1.5 type-caption ${
                          item.url
                            ? "text-foreground/80 hover:text-green-700 dark:hover:text-green-500 transition-colors"
                            : "text-muted-foreground"
                        }`}
                      >
                        {logo &&
                          (isStringLogo ? (
                            <Image
                              src={logo}
                              alt={`${item.name} logo`}
                              width={16}
                              height={16}
                              className="w-4 h-4"
                              style={{ flexShrink: 0 }}
                            />
                          ) : LogoComponent ? (
                            <LogoComponent
                              className="w-4 h-4"
                              style={{ flexShrink: 0 }}
                            />
                          ) : null)}
                        <span>{item.name}</span>
                      </ItemWrapper>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Unpopular Opinions Section */}
        <OpinionsSection />
        </div>
      </div>
    </div>
  );
}