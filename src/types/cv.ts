export interface CVHeader {
  name: string;
  location: string;
  phone: string;
  email: string;
  website: string;
  linkedin: string;
  twitter: string;
}

export interface CVWorkExperience {
  id: string;
  startDate: string;
  endDate: string;
  role: string;
  company: string;
  location: string;
  bullets: string[];
  logoUrl?: string; // Added for the requested feature
  companyUrl?: string; // Link to the company
}

export interface CVProjectLink {
  label: string;
  url: string;
}

export interface CVProject {
  id: string;
  startDate: string;
  endDate: string;
  role: string;
  name: string;
  bullets: string[];
  logoUrl?: string;
  projectUrl?: string;
  links?: CVProjectLink[];
}

export interface CVEducation {
  id: string;
  startDate: string;
  endDate: string;
  degree: string;
  institution: string;
  location: string;
}

export interface CVSkillCategory {
  id: string;
  category: string;
  items: string | string[];
}

export interface CVData {
  header: CVHeader;
  about: string;
  workExperience: CVWorkExperience[];
  projects: CVProject[];
  education: CVEducation[];
  skills: CVSkillCategory[];
}

export const defaultCVData: CVData = {
  header: {
    name: "Sourav Kumar Nanda",
    location: "Bengaluru, India",
    phone: "+91 8018048129",
    email: "souravinsights@gmail.com",
    website: "www.souravinsights.com",
    linkedin: "linkedin.com/in/souravinsights/",
    twitter: "x.com/souravinsights",
  },
  about: "Product Engineer with 4+ years of experience building and shipping products end-to-end, from data model and API design to interface and deployment. Proven track record of taking ownership of messy problems across the stack. Currently building open-source developer tooling for WebMCP and writing a handbook on reliable software in the age of AI agents. Thrives in small fast-moving teams and contributes to open-source ecosystems.",
  workExperience: [
    {
      id: "1",
      startDate: "Jul 2024",
      endDate: "Feb 2025",
      role: "Software Engineer",
      company: "Paragraph",
      location: "Remote",
      logoUrl: "",
      companyUrl: "https://paragraph.com/home",
      bullets: [
        "Architected and refined the WYSIWYG editor and public blog UI, collaborating with design to overhaul the dashboard and publishing workflow for improved user experience.",
        "Reduced JavaScript bundle size by 35% and improved Largest Contentful Paint (LCP) by 400ms, and improved SEO for public blog pages by migrating core public blog pages from Next.js Pages to the App Router using React Server Components.",
        "Contributed to a state management migration from Redux to Jotai by modularizing large state objects into granular atoms, which improved maintainability and reduced hard-to-trace state bugs.",
        "Reviewed frontend and backend PRs with constructive feedback and refactors where necessary.",
        "Took ownership of investigating and fixing quirky, hard-to-reproduce bugs by talking directly to power users, gathering context, and handling the edge cases.",
      ],
    },
    {
      id: "2",
      startDate: "Jan 2024",
      endDate: "June 2024",
      role: "Software Engineer",
      company: "Pimlico",
      location: "Remote",
      logoUrl: "",
      companyUrl: "https://www.pimlico.io/",
      bullets: [
        "Built an open-source CLI tool that reduced developer onboarding time by providing optimized boilerplate projects and sensible defaults for dApp scaffolding.",
      ],
    },
    {
      id: "3",
      startDate: "Jul 2023",
      endDate: "Nov 2023",
      role: "Frontend Engineer",
      company: "Gallery",
      location: "Remote",
      logoUrl: "",
      companyUrl: "https://gallery.so/",
      bullets: [
        "Worked on the social platform for creators, contributing across web and React Native on primary UI surfaces: feeds, profile pages, gallery views, and community pages.",
        "The platform relied on heavily inter-related data, so a large part of the work was writing scalable, type-safe queries with Relay and GraphQL that let components declare their own data requirements and avoid over-fetching or fragile queries.",
        "Increased feature velocity by shipping 45+ pull requests in 60 days, delivering UI work across comments, notifications, and community modules on both platforms.",
        "Collaborated cross-functionally to ship markdown support, community profile enhancements, and NFT content previews.",
        "Implemented data-fetching and loading patterns that cut redundant queries and improved perceived performance.",
        "Contributed to fixing cross-platform UI bugs and building the shared component library with styled-components.",
      ],
    },
    {
      id: "4",
      startDate: "Apr 2021",
      endDate: "Aug 2022",
      role: "Founding Frontend Engineer",
      company: "RabbitHole",
      location: "Remote",
      logoUrl: "",
      companyUrl: "https://rabbithole.gg/",
      bullets: [
        "Redesigned the v1 client app from scratch, focused on improving onboarding and reducing friction during first-time setup.",
        "Owned UI consistency across the product suite by building and maintaining an internal design system: composable components aligned with design tokens and accessibility guidelines.",
        "Worked closely with designers and contributed to UX decisions, shaping flows that improved engagement and reduced drop-offs during onboarding.",
        "Owned the decentralization workstream: integrated Ceramic into the client stack for decentralized identity and data storage, and built subgraphs on The Graph protocol to query blockchain data efficiently.",
        "Contributed to the backend notification API, designing and implementing GraphQL resolvers with Prisma and PostgreSQL.",
      ],
    }
  ],
  projects: [
    {
      id: "1",
      startDate: "Aug 2026",
      endDate: "Present",
      role: "Creator & Maintainer",
      name: "webmcp-stack",
      logoUrl: "https://webmcp.souravinsights.com/icon.svg",
      projectUrl: "https://webmcp.souravinsights.com",
      links: [
        { label: "webmcp.souravinsights.com", url: "https://webmcp.souravinsights.com" },
        { label: "npm", url: "https://www.npmjs.com/package/@webmcp-stack/codegen" },
        { label: "GitHub", url: "https://github.com/SouravInsights/webmcp-stack" },
      ],
      bullets: [
        "Built and published an open-source CLI (MIT, on npm) that turns the API contract a team already maintains into WebMCP tools agents can call in the browser, written into their own repo so there is no runtime to depend on.",
        "Made safety the product rather than a wrapper: auth, admin and webhook paths stay off the agent surface until a developer opts in, and payments and deletes stop at a human confirmation.",
        "Proved it on a real production API: 73 tools generated, including a payment webhook that would otherwise have become callable by an agent.",
      ],
    },
    {
      id: "2",
      startDate: "Jul 2025",
      endDate: "Present",
      role: "Engineering, Design & Infrastructure",
      name: "BeenThere",
      logoUrl: "",
      projectUrl: "https://www.beenthere.page",
      links: [
        { label: "beenthere.page", url: "https://www.beenthere.page" },
        { label: "api.beenthere.page/reference", url: "https://api.beenthere.page/reference/" },
      ],
      bullets: [
        "Built and launched BeenThere, a travel storytelling product where people publish trips as journals on a canvas timeline, as the sole engineer across product, design, API, database and deployment.",
        "Led the end-to-end product design and developed the block-based editor the product is built around, supporting 16 content types (e.g., photo clusters, checklists) inside a modular, extensible component architecture, with opinionated UX like a horizontal scroll canvas, seamless inline editing and a morphing block picker.",
        "Elevated the editor with fluid layout animations and micro-interactions using Motion for a premium, app-like feel, and managed its state with Zustand, handling optimistic UI updates, field-level diffing so only changed fields are synced, and safe background cleanup of unreferenced media.",
        "Designed a media pipeline that handles concurrent batch uploads, converting HEIC photos and reading EXIF in a web worker, keeping the editor responsive under load and eliminating layout shifts via Blurhashes.",
        "Built an AI story generation engine that turns a trip's photos, dates and field notes into a publishable journal draft, using a dedicated generator per block type and skipping the model entirely for blocks that don't need it.",
        "Configured a reliable CI/CD pipeline using GitHub Actions, enforcing strict type-drift, API schema and linting checks. Set up observability and analytics using Sentry, BetterStack, and PostHog for error tracking, uptime monitoring, and data-driven UX decisions.",
      ],
    },
    {
      id: "3",
      startDate: "Aug 2026",
      endDate: "Present",
      role: "Author",
      name: "Safe to Merge",
      logoUrl: "",
      projectUrl: "https://safetomerge.com",
      links: [{ label: "safetomerge.com", url: "https://safetomerge.com" }],
      bullets: [
        "Writing a practical handbook for teams shipping software as AI agents write more of the code, built around one loop: Observe, Understand, Change, Verify, Ship and Learn.",
        "Writing it by studying teams who are actually doing it, and separating emerging practice from established practice instead of publishing speculation. One example: a team whose PR volume went from 1,441 to 4,725 a month, with agent-authored PRs going from around 20% to over 70%.",
      ],
    },
  ],
  education: [
    {
      id: "1",
      startDate: "2015",
      endDate: "2019",
      degree: "Bachelor of Technology - BTech, Computer Science Engineering",
      institution: "Gandhi Institute for Technological Advancement",
      location: "Bhubaneswar, India",
    }
  ],
  skills: [
    {
      id: "1",
      category: "Languages & Frameworks",
      items: "TypeScript, JavaScript, React, React Native, Next.js (App Router), Expo, Node.js, TailwindCSS, NativeWind, Shadcn, Radix UI, TanStack, Zustand, Jotai",
    },
    {
      id: "2",
      category: "UI & Interaction",
      items: "Motion, GSAP, TipTap, dnd-kit, Web Workers",
    },
    {
      id: "3",
      category: "Backend & Data",
      items: "Fastify, PostgreSQL, Drizzle ORM, Neon, TypeBox, Zod, REST / OpenAPI, GraphQL (Relay, Apollo), Prisma, Better Auth, Razorpay, Google Maps API, Resend",
    },
    {
      id: "4",
      category: "AI & Agents",
      items: "Agent skills, agent evals, OpenRouter, Replicate, vLLM",
    },
    {
      id: "5",
      category: "Tooling & Infrastructure",
      items: "Turborepo, GitHub Actions, Docker, Vercel, AWS (Lightsail), Cloudflare (R2, Workers, Image Transformations), CLI design and code generation, npm publishing, Sentry, BetterStack, PostHog",
    },
    {
      id: "6",
      category: "Remote Work & Collaboration",
      items: [
        "Timezone Flexibility: 3+ years working with US-based startups in EST/PST",
        "Communication: Proficient in async updates, Slack, Notion, Linear",
        "Team Experience: Cross-functional collaboration with designers, PMs, and backend engineers",
        "Culture: Fast-paced startup environments, iterative product development, strong ownership mindset"
      ],
    }
  ]
};
