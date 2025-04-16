"use client";

import React from "react";
import { LinkData } from "../utils/discordApi";
import { TiltedCard } from "./card-themes/TiltedCard";
import { LayeredCard } from "./card-themes/LayeredCard";
import { PolaroidCard } from "./card-themes/PolaroidCard";
import { NotebookCard } from "./card-themes/NotebookCard";
import { PostcardCard } from "./card-themes/PostcardCard";
import { MinimalistCard } from "./card-themes/MinimalistCard";
import { RetroTechCard } from "./card-themes/RetroTechCard";
import { BlueprintCard } from "./card-themes/BlueprintCard";
import { TypewriterCard } from "./card-themes/TypewriterCard";

interface LinkCardProps {
  link: LinkData;
  design:
    | "tilted"
    | "layered"
    | "polaroid"
    | "notebook"
    | "postcard"
    | "minimalist"
    | "retro-tech"
    | "blueprint"
    | "typewriter";
  gradientStart: string;
  gradientEnd: string;
  isAdminMode?: boolean;
  isCurated?: boolean;
  onAddToCuration?: (link: LinkData) => void;
}

export default function LinkCard({
  link,
  design,
  gradientStart,
  gradientEnd,
  isAdminMode = false,
  isCurated = false,
  onAddToCuration,
}: LinkCardProps) {
  switch (design) {
    case "tilted":
      return (
        <TiltedCard
          title={link.title}
          description={link.notes || link.description}
          url={link.url}
          gradientStart={gradientStart}
          gradientEnd={gradientEnd}
          isAdminMode={isAdminMode}
          onAddToCuration={() => onAddToCuration?.(link)}
        />
      );
    case "layered":
      return (
        <LayeredCard
          title={link.title}
          description={link.notes || link.description}
          url={link.url}
          gradientStart={gradientStart}
          gradientEnd={gradientEnd}
        />
      );
    case "polaroid":
      return (
        <PolaroidCard
          title={link.title}
          description={link.notes || link.description}
          url={link.url}
          gradientStart={gradientStart}
          gradientEnd={gradientEnd}
        />
      );
    case "notebook":
      return (
        <NotebookCard
          title={link.title}
          url={link.url}
          description={link.notes || link.description}
        />
      );
    case "postcard":
      return (
        <PostcardCard
          title={link.title}
          url={link.url}
          description={link.notes || link.description}
        />
      );
    case "minimalist":
      return <MinimalistCard title={link.title} url={link.url} />;
    case "retro-tech":
      return (
        <RetroTechCard
          title={link.title}
          url={link.url}
          description={link.notes || link.description}
        />
      );
    case "blueprint":
      return (
        <BlueprintCard
          title={link.title}
          url={link.url}
          description={link.notes || link.description}
        />
      );
    case "typewriter":
      return (
        <TypewriterCard
          title={link.title}
          url={link.url}
          description={link.notes || link.description}
        />
      );
    default:
      return (
        <TiltedCard
          title={link.title}
          description={link.notes || link.description}
          url={link.url}
          gradientStart={gradientStart}
          gradientEnd={gradientEnd}
          isAdminMode={isAdminMode}
          onAddToCuration={() => onAddToCuration?.(link)}
        />
      );
  }
}
