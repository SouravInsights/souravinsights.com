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
}

export interface CVProject {
  id: string;
  startDate: string;
  endDate: string;
  role: string;
  name: string;
  bullets: string[];
  logoUrl?: string;
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
  about: "Product Engineer with 4+ years of experience in Frontend Engineering. I enjoy building simple, easy-to-use, underwhelming interfaces, and I care about open-source software. I like fast-moving teams where I can wear multiple hats, take ownership of messy problems, and move from idea to deployment without unnecessary overhead.",
  workExperience: [
    {
      id: "1",
      startDate: "June 2024",
      endDate: "Aug 2025",
      role: "Software Engineer",
      company: "Paragraph",
      location: "Remote",
      logoUrl: "",
      bullets: [
        "Contributed to the migration from Next.js Pages Router to App Router, focusing on refactoring key pages with Server Components to reduce JavaScript payload and improve load performance. Used Client Components selectively to preserve interactivity where needed, balancing UX and performance.",
        "Redesigned the editor dashboard UI and improved the publishing flow in collaboration with our product designer and other engineers.",
        "Contributed to a state management migration from Redux to Jotai by modularizing large state objects into granular atoms, improving maintainability and clarity.",
        "Refactored UI components by abstracting business logic into custom React hooks and utility functions, creating a cleaner, reusable component library.",
        "Actively participated in reviewing frontend & backend PRs, offering constructive feedback and hands-on refactors when necessary.",
        "Took ownership of investigating and fixing quirky, hard-to-reproduce bugs by talking to users, gathering context, and handling multiple edge cases.",
        "Helped build a backend feature for bulk importing subscribers via CSV. Worked on strategies to handle large datasets (40,000+ rows) reliably in Firestore by using batched writes and basic chunking, in collaboration with another backend engineer.",
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
      bullets: [
        "Built create-permissionless-app, an open-source CLI tool to scaffold dApps using Account Abstraction via Pimlico's infrastructure — inspired by create-next-app",
        "Enabled developers to configure their setup by selecting an account system, signer, bundler, and paymaster, and generated a clean, ready-to-use project",
        "The generated boilerplate included Next.js, TypeScript, Viem, Wagmi, Permissionless.js, and relevant provider packages, offering a streamlined starting point for ERC-4337-based applications",
      ],
    },
    {
      id: "3",
      startDate: "July 2023",
      endDate: "Nov 2023",
      role: "Frontend Engineer",
      company: "Gallery",
      location: "Remote",
      logoUrl: "",
      bullets: [
        "Worked extensively with Relay and GraphQL, writing scalable, type-safe queries, ensuring components declared their own data requirements for optimal fetch granularity.",
        "Utilized graphql-codegen to generate TypeScript types from the GraphQL schema, improving code confidence and reducing runtime errors",
        "Contributed to both web and React Native apps, fixing cross-platform UI bugs and building reusable components using styled-components",
        "Took ownership of improving comment UI, notification logic, hover cards, and community display modules across mobile and web, shipping over 45 pull requests in 2 months, including fixes, UI enhancements, and new feature implementations",
        "Collaborated cross-functionally to ship features like markdown support, community profile enhancements, and NFT content previews",
        "Worked on scalable data fetching patterns and optimized loading strategies to reduce redundant queries and improve perceived performance",
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
      bullets: [
        "Redesigned the v1 client app from scratch, with a focus on improving the onboarding experience and reducing user friction during first-time setup.",
        "Took ownership of maintaining UI consistency across the product suite by building and maintaining an internal design system, developing composable and maintainable components aligned with our design tokens and accessibility guidelines.",
        "Collaborated closely with designers and contributed to UX decisions, helping shape flows that improved user engagement and reduced drop-offs during onboarding.",
        "Took ownership of decentralization efforts by integrating Ceramic into the client stack for decentralized identity and data storage, and building subgraphs using The Graph Protocol to query blockchain data efficiently.",
        "Contributed to the backend API for our notification system, designing and implementing GraphQL resolvers using Prisma and PostgreSQL. Focused on modeling flexible notification types, handling user targeting logic, and ensuring queries remained performant at scale",
        "Contributed to our internal React hooks package — built hooks for wallet connections, ENS resolution, smart contract interactions, and signing flows using Ethers.js — made sure they were generic enough to reuse across features.",
      ],
    }
  ],
  projects: [
    {
      id: "1",
      startDate: "Jan 2025",
      endDate: "Present",
      role: "Founder, Solo Developer",
      name: "FairForms",
      logoUrl: "",
      bullets: [
        "Built a comprehensive form builder SaaS product from scratch, handling all aspects from concept to deployment including frontend, backend, database architecture, and DevOps",
        "Designed and implemented a drag-and-drop form builder interface with React, TypeScript and Next.js App Router, featuring a component-based architecture for maintainability and intuitive UX",
        "Developed a robust backend with PostgreSQL and Drizzle ORM for form data, user management, and response analytics",
        "Implemented advanced form features including file uploads, conditional logic, multi-step navigation, and themed UI customization",
        "Built a public responses dashboard with filtering capabilities and visualization tools for form submission insights",
        "Designed a collaboration system allowing users to invite team members with different permission levels",
        "Implemented secure sharing mechanisms for distributing forms and viewing responses while maintaining data privacy",
      ],
    }
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
      items: "TypeScript, JavaScript, React, React Native, Next.js (App Router), TailwindCSS, Shadcn UI, Zod, TanStack, Jotai, Zustland",
    },
    {
      id: "2",
      category: "Backend & Data",
      items: "PostgreSQL, Drizzle ORM, Prisma, GraphQL (Relay, Apollo), REST APIs",
    },
    {
      id: "3",
      category: "Tooling & Infrastructure",
      items: "Vercel, GitHub Actions, TurboRepo, PostHog Analytics, Sentry",
    },
    {
      id: "4",
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
