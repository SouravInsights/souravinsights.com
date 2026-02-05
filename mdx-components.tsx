import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import Link from "next/link";
import { Terminal, Clipboard, Check } from "lucide-react";
import { useState } from "react";
import React from "react";

// Properly typed components
type HTMLProps = {
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
};

// Custom link component for internal and external links
const CustomLink = (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  const href = props.href;

  if (href?.startsWith("/")) {
    return (
      <Link
        href={href}
        {...props}
        className={`text-green-600 dark:text-green-400 hover:underline ${
          props.className || ""
        }`}
      >
        {props.children}
      </Link>
    );
  }

  if (href?.startsWith("http") || href?.startsWith("mailto:")) {
    return (
      <a
        target="_blank"
        rel="noopener noreferrer"
        {...props}
        className={`text-green-600 dark:text-green-400 hover:underline ${
          props.className || ""
        }`}
      >
        {props.children}
      </a>
    );
  }

  return (
    <a
      {...props}
      className={`text-green-600 dark:text-green-400 hover:underline ${
        props.className || ""
      }`}
    />
  );
};

// Custom image component with caption support
const CustomImage = ({
  src,
  alt,
  ...rest
}: {
  src?: string;
  alt?: string;
  [key: string]: any;
}) => {
  const imgSrc = src || "";
  const imgAlt = alt || "Image";

  return (
    <figure className="my-8 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="relative aspect-video w-full">
        <Image
          alt={imgAlt}
          src={imgSrc}
          fill
          sizes="(max-width: 768px) 100vw, 800px"
          className="object-cover"
          priority={true}
        />
      </div>
      {imgAlt && imgAlt !== "Image" && (
        <figcaption className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
          {imgAlt}
        </figcaption>
      )}
    </figure>
  );
};

// Headings with improved typography
const CustomH1 = (props: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h1
    {...props}
    className={`mt-12 mb-6 text-4xl font-bold tracking-tight text-gray-900 dark:text-white ${
      props.className || ""
    }`}
  />
);

const CustomH2 = (props: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2
    {...props}
    className={`mt-10 mb-4 text-3xl font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2 ${
      props.className || ""
    }`}
  />
);

const CustomH3 = (props: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    {...props}
    className={`mt-8 mb-3 text-2xl font-medium text-gray-800 dark:text-gray-200 ${
      props.className || ""
    }`}
  />
);

const CustomP = (props: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    {...props}
    className={`my-4 text-gray-700 dark:text-gray-300 leading-relaxed ${
      props.className || ""
    }`}
  />
);

// Let rehype-pretty-code handle the pre and code elements
// We just add a wrapper with copy button
const CustomPre = ({
  children,
  ...props
}: React.HTMLAttributes<HTMLPreElement>) => {
  const [copied, setCopied] = useState(false);

  // Get text content from pre for copy functionality
  const preElement = React.Children.only(children) as React.ReactElement;

  // Extract the code text for copying
  // This works with rehype-pretty-code's output structure
  let codeText = "";
  if (preElement && preElement.props && preElement.props.children) {
    // Find all text nodes in the code block and join them
    const findTextNodes = (node: any): string => {
      if (typeof node === "string") {
        return node;
      }
      if (Array.isArray(node)) {
        return node.map(findTextNodes).join("");
      }
      if (node?.props?.children) {
        return findTextNodes(node.props.children);
      }
      return "";
    };

    codeText = findTextNodes(preElement.props.children);
  }

  const handleCopy = async () => {
    if (codeText) {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Determine the language from the className
  let language = "";
  const classes = preElement?.props?.className || "";
  const languageMatch = classes.match(/language-(\w+)/);
  if (languageMatch) {
    language = languageMatch[1];
  }

  return (
    <div className="relative my-8 group">
      {/* Header with language and copy button */}
      <div className="flex items-center justify-between bg-muted border-b border-border px-4 py-2 text-muted-foreground rounded-t-lg">
        <div className="flex items-center">
          <Terminal size={16} className="mr-2" aria-hidden="true" />
          <span className="text-xs font-mono">{language || "Code"}</span>
        </div>
        <button
          onClick={handleCopy}
          className="text-gray-400 hover:text-gray-200 focus:outline-none"
          aria-label={copied ? "Copied!" : "Copy code"}
        >
          {copied ? (
            <Check size={16} className="text-green-500" />
          ) : (
            <Clipboard size={16} />
          )}
        </button>
      </div>

      {/* The actual pre element that will be enhanced by rehype-pretty-code */}
      <div className="rounded-b-lg overflow-hidden">{children}</div>
    </div>
  );
};

// We don't need to customize code blocks as rehype-pretty-code handles them
const CustomCode = (props: React.HTMLAttributes<HTMLElement>) => {
  // Only add styling for inline code (not inside pre)
  const isInline = !React.useContext(React.createContext(false));

  if (isInline) {
    return (
      <code
        {...props}
        className={`font-mono text-sm bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-800 dark:text-gray-200 ${
          props.className || ""
        }`}
      />
    );
  }

  // Pass through for code blocks handled by rehype-pretty-code
  return <code {...props} />;
};

// Blockquote with left border styling
const CustomBlockquote = (props: React.HTMLAttributes<HTMLQuoteElement>) => (
  <blockquote
    {...props}
    className={`border-l-4 border-green-500 dark:border-green-400 pl-6 my-6 italic text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 py-2 px-2 rounded ${
      props.className || ""
    }`}
  />
);

// Lists
const CustomUl = (props: React.HTMLAttributes<HTMLUListElement>) => (
  <ul
    {...props}
    className={`my-4 ml-6 list-disc text-gray-700 dark:text-gray-300 space-y-2 ${
      props.className || ""
    }`}
  />
);

const CustomOl = (props: React.HTMLAttributes<HTMLOListElement>) => (
  <ol
    {...props}
    className={`my-4 ml-6 list-decimal text-gray-700 dark:text-gray-300 space-y-2 ${
      props.className || ""
    }`}
  />
);

const CustomLi = (props: React.HTMLAttributes<HTMLLIElement>) => (
  <li {...props} className={`leading-relaxed ${props.className || ""}`} />
);

// Thematic break (horizontal rule)
const CustomHr = (props: React.HTMLAttributes<HTMLHRElement>) => (
  <hr
    {...props}
    className={`my-8 border-none h-px bg-gradient-to-r from-transparent via-green-500/30 dark:via-green-400/30 to-transparent ${
      props.className || ""
    }`}
  />
);

// Client Components wrapper to handle useState usage
import dynamic from "next/dynamic";

// Dynamically import the client components that need useState
const DynamicPre = dynamic(() => Promise.resolve(CustomPre), { ssr: false });

// Add some CSS to style the code blocks without modifying global.css
const CodeBlockStyles = () => (
  <style jsx global>{`
    /* Styling for rehype-pretty-code */
    [data-rehype-pretty-code-fragment] {
      overflow: hidden;
    }

    [data-rehype-pretty-code-fragment] pre {
      overflow-x: auto;
      padding: 1rem;
      border-radius: 0;
      border-radius: 0 0 0.5rem 0.5rem;
      margin: 0;
    }

    [data-rehype-pretty-code-title] {
      border-top-left-radius: 0.5rem;
      border-top-right-radius: 0.5rem;
      padding: 0.5rem 1rem;
      background-color: hsl(var(--muted));
      color: hsl(var(--muted-foreground));
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
        "Liberation Mono", "Courier New", monospace;
      font-size: 0.875rem;
    }

    [data-line] {
      border-left: 2px solid transparent;
      padding: 0 0.5rem;
      display: inline-block;
      width: 100%;
    }

    .line--highlighted {
      background-color: rgba(255, 255, 255, 0.1);
      border-left: 2px solid rgb(59, 130, 246);
    }

    .word--highlighted {
      background-color: rgba(255, 255, 255, 0.1);
      padding: 0.2rem;
      border-radius: 0.25rem;
    }
  `}</style>
);

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: CustomH1,
    h2: CustomH2,
    h3: CustomH3,
    p: CustomP,
    a: CustomLink,
    img: CustomImage,
    blockquote: CustomBlockquote,
    pre: DynamicPre,
    code: CustomCode,
    ul: CustomUl,
    ol: CustomOl,
    li: CustomLi,
    hr: CustomHr,
    // Add the styles component
    wrapper: ({ children }) => (
      <>
        <CodeBlockStyles />
        {children}
      </>
    ),
    ...components,
  };
}
