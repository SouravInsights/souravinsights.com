"use client";

import React from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { nightOwl, githubLight } from "@codesandbox/sandpack-themes";
import { useTheme } from "@/context/ThemeContext";
import { RotateCcw } from "lucide-react";

// Reset button component
const ResetButton = () => {
  const { sandpack } = useSandpack();

  return (
    <button
      onClick={() => sandpack.resetAllFiles()}
      className="absolute top-3 right-3 z-10 p-1.5 rounded text-xs flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      title="Reset code"
    >
      <RotateCcw size={14} />
      <span>Reset</span>
    </button>
  );
};

interface PlaygroundProps {
  files: Record<string, string>;
  template?: "react-ts" | "react";
  defaultFile?: string;
  editorHeight?: string;
  title?: string;
  description?: string;
}

export default function Playground({
  files,
  template = "react-ts",
  defaultFile,
  editorHeight = "350px",
  title,
  description,
}: PlaygroundProps) {
  const { isDarkMode } = useTheme();

  return (
    <div className="my-8 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Optional Title & Description */}
      {(title || description) && (
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
          {title && (
            <h3 className="font-medium text-gray-900 dark:text-white">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      )}

      <SandpackProvider
        template={template}
        files={files}
        theme={isDarkMode ? nightOwl : githubLight}
        options={{
          activeFile: defaultFile,
          visibleFiles: Object.keys(files),
          recompileMode: "delayed",
          recompileDelay: 500,
        }}
        customSetup={{
          dependencies: {
            "framer-motion": "latest",
          },
        }}
      >
        <div className="relative">
          <ResetButton />
          <SandpackLayout style={{ border: "none", borderRadius: 0 }}>
            <SandpackCodeEditor
              style={{ height: editorHeight }}
              showLineNumbers={true}
              showInlineErrors={true}
              wrapContent={true}
            />
            <SandpackPreview
              showOpenInCodeSandbox={false}
              showRefreshButton={true}
              style={{
                height: editorHeight,
                backgroundColor: isDarkMode ? "#1A1B26" : "#FFFFFF",
                color: isDarkMode ? "#FFFFFF" : "#000000",
              }}
            />
          </SandpackLayout>
        </div>
      </SandpackProvider>
    </div>
  );
}
