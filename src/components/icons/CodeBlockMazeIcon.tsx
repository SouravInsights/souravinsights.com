import React from "react";

export const CodeBlockMazeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
  props
) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M3 3H21V21H3V3Z" stroke="currentColor" strokeWidth="2" />
    <path d="M7 7H17V17H7V7Z" stroke="currentColor" strokeWidth="2" />
    <path d="M11 11H13V13H11V11Z" fill="currentColor" />
    <path d="M3 7H7" stroke="currentColor" strokeWidth="2" />
    <path d="M17 7H21" stroke="currentColor" strokeWidth="2" />
    <path d="M3 17H7" stroke="currentColor" strokeWidth="2" />
    <path d="M17 17H21" stroke="currentColor" strokeWidth="2" />
    <path d="M11 3V7" stroke="currentColor" strokeWidth="2" />
    <path d="M11 17V21" stroke="currentColor" strokeWidth="2" />
  </svg>
);
