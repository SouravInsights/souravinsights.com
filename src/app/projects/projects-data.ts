export type FeaturedProject = {
  slug: string;
  name: string;
  logo: string;
  url: string;
  repo?: string;
  tagline: string;
  /** Short note shown on the home page. */
  note: string;
  /** What the project actually is. */
  what: string;
  /** Why I'm working on it, in my own words. */
  why: string;
};

/**
 * The projects that get featured on the home page and get a full write-up on
 * /projects. A few things I'm spending my time on lately.
 */
export const featuredProjects: FeaturedProject[] = [
  {
    slug: "beenthere",
    name: "Beenthere",
    logo: "/projects/beenthere-logo.png",
    url: "https://www.beenthere.page/",
    tagline: "A quiet place to keep the trips you've taken.",
    note: "A minimal travel app for the places you've been.",
    what: "BeenThere is a small travel app. You pin the places you've been, keep the photos and the little details a trip deserves, and end up with a clean record of where you've gone. No feed, no followers, nothing to perform for.",
    why: "I kept losing trips I loved: photos on old phones, tickets buried in email, stories I could only half remember. I built BeenThere so the good parts live somewhere I actually own. It's also the project that has taught me the most, both about designing calm software and about building with agents.",
  },
  {
    slug: "webmcp-stack",
    name: "webmcp-stack",
    logo: "/projects/webmcp-stack-logo.png",
    url: "https://webmcp.souravinsights.com/",
    repo: "https://github.com/SouravInsights/webmcp-stack",
    tagline: "Tooling that turns your API into something agents can safely use.",
    note: "Open-source codegen and tooling for the agent-facing web.",
    what: "WebMCP lets a website expose typed tools an AI agent can call in the browser. webmcp-stack takes the API contract you already have and generates those tools as real files in your repo. It classifies each one as read, write, or destructive, keeps the risky ones off until you turn them on, and lets you review and test the whole surface in a local dashboard.",
    why: "Right now an agent that wants to use your app reads the screen and clicks, which is slow and easy to break. WebMCP gives it a better path, but someone has to author that surface, and doing it carelessly means handing a model your payment and admin endpoints. I wanted the safe path to also be the easy one: generate from the contract you already trust, review the diff, gate it in CI. It's the developer tool I wished existed, so I'm building it.",
  },
  {
    slug: "safetomerge",
    name: "Safe to Merge",
    logo: "/projects/safetomerge-logo.svg",
    url: "https://www.safetomerge.com/",
    repo: "https://github.com/SouravInsights/safetomerge",
    tagline:
      "A handbook for building reliable software when agents write most of the code.",
    note: "A handbook about the engineering system around AI agents.",
    what: "A practical, research-led handbook about the system that has to exist around AI agents: how intent becomes something an agent can act on and verify, how a change is understood before it merges, how evidence is gathered, and how production feeds back into the next decision. It isn't about agents themselves. It's about everything around them.",
    why: "As a solo developer I leaned on agents to move faster, and learned quickly that writing code is the easy part. The hard part is the system around it: context, boundaries, evidence, recovery. I needed this handbook, so I started writing it. I study teams doing this in production, talk to engineers, and test the patterns on my own projects. The goal is safe velocity: moving fast without losing trust.",
  },
];

export type SmallProject = {
  name: string;
  logo: string;
  url: string;
};

/**
 * Smaller experiments and older side projects. Collapsed by default, revealed
 * on /projects so they never compete with the featured work.
 */
export const otherProjects: SmallProject[] = [
  {
    name: "BeenThere Stamps",
    logo: "/projects/stamps-beenthere-logo.png",
    url: "https://stamps.beenthere.page/",
  },
  {
    name: "Poetik",
    logo: "/projects/poetik-logo.png",
    url: "https://poetik.vercel.app/",
  },
  {
    name: "FairForms",
    logo: "/projects/fairforms-logo.png",
    url: "https://fairforms.vercel.app/",
  },
  {
    name: "Waitroom",
    logo: "/projects/waitroom-logo.png",
    url: "https://waitroom-api.vercel.app/",
  },
  {
    name: "3Reads",
    logo: "/projects/3reads-logo.png",
    url: "https://3reads.vercel.app/",
  },
];