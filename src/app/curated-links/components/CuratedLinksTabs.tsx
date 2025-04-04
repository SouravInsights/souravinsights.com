"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import LinkCard from "./LinkCard";
import { AnimatePresence, motion } from "framer-motion";
import { DiscordChannel, LinkData } from "../utils/discordApi";
import {
  Palette,
  ChevronDown,
  ChevronUp,
  User,
  Gem,
  Rocket,
  BookOpen,
  Mail,
  Briefcase,
  Folders,
  Layers,
  Check,
} from "lucide-react";
import { colorPresets, ColorPreset } from "../utils/colorPresets";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import posthog from "posthog-js";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface CuratedLinksTabsProps {
  channels: DiscordChannel[];
  linkData: { [key: string]: LinkData[] };
}

const themesWithCustomColors = ["tilted", "layered", "polaroid"];

const ITEMS_PER_PAGE_DESKTOP = 12;
const ITEMS_PER_PAGE_MOBILE = 5;

export default function CuratedLinksTabs({
  channels,
  linkData,
}: CuratedLinksTabsProps) {
  const isMobile = useMediaQuery("(max-width: 640px)");

  const itemsPerPage = isMobile
    ? ITEMS_PER_PAGE_MOBILE
    : ITEMS_PER_PAGE_DESKTOP;
  const [visibleItems, setVisibleItems] = useState(itemsPerPage);
  useEffect(() => {
    setVisibleItems(itemsPerPage);
  }, [isMobile, itemsPerPage]);

  const { isDarkMode } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [cardDesign, setCardDesign] = useState<
    | "tilted"
    | "layered"
    | "polaroid"
    | "notebook"
    | "postcard"
    | "minimalist"
    | "retro-tech"
    | "blueprint"
    | "typewriter"
  >("tilted");

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  type ThemeType =
    | "tilted"
    | "layered"
    | "polaroid"
    | "notebook"
    | "postcard"
    | "minimalist"
    | "retro-tech"
    | "blueprint"
    | "typewriter";

  // Create properly typed theme options
  const themeOptions: { id: ThemeType; name: string }[] = [
    { id: "tilted", name: "Tilted" },
    { id: "polaroid", name: "Polaroid" },
    { id: "notebook", name: "Notebook" },
    { id: "layered", name: "Layered" },
    { id: "retro-tech", name: "Retro Tech" },
    { id: "minimalist", name: "Minimalist" },
    { id: "postcard", name: "Postcard" },
    { id: "blueprint", name: "Blueprint" },
    { id: "typewriter", name: "Typewriter" },
  ];

  const orderedChannelNames = [
    "reading-list",
    "blockchain",
    "resources",
    "product-hunt",
    "fav-portfolios",
    "newsletters",
    "opportunities",
    "mint-worthy",
    "design-inspo",
  ];

  const sortedChannels = useMemo(() => {
    return [...channels].sort(
      (a, b) =>
        orderedChannelNames.indexOf(a.name) -
        orderedChannelNames.indexOf(b.name)
    );
  }, [channels]);

  const [activeTab, setActiveTab] = useState(sortedChannels[0]?.name || "");
  const tabStartTime = useRef(Date.now());

  useEffect(() => {
    // Track initial card theme when component mounts
    posthog.capture("card_theme_selected", {
      theme: cardDesign,
      action: "initial",
    });

    // Start tracking time for the initial tab
    tabStartTime.current = Date.now();

    // Cleanup function to send the final tab duration when the component unmounts
    return () => {
      const duration = (Date.now() - tabStartTime.current) / 1000; // Convert to seconds
      posthog.capture("tab_view_duration", { tab: activeTab, duration });
    };
  }, [cardDesign, activeTab]);

  useEffect(() => {
    // When activeTab changes, send the duration for the previous tab and reset the timer
    const duration = (Date.now() - tabStartTime.current) / 1000; // Convert to seconds
    posthog.capture("tab_view_duration", { tab: activeTab, duration });
    tabStartTime.current = Date.now();
  }, [activeTab]);

  const handleCardDesignChange = (value: typeof cardDesign) => {
    setCardDesign(value);
    posthog.capture("card_theme_selected", { theme: value, action: "changed" });
  };

  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName);
  };

  const [colorMode, setColorMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState<ColorPreset>(
    colorPresets.find((preset) => preset.name === "Mint Cream") ||
      colorPresets[0]
  );
  const [customStartColor, setCustomStartColor] = useState("#ccfbf1");
  const [customEndColor, setCustomEndColor] = useState("#14b8a6");
  const [isCustomizePanelOpen, setIsCustomizePanelOpen] = useState(false);

  const supportsCustomColors = useMemo(
    () => themesWithCustomColors.includes(cardDesign),
    [cardDesign]
  );

  const gradientStart = useMemo(() => {
    if (colorMode === "preset") {
      return isDarkMode ? selectedPreset.darkStart : selectedPreset.lightStart;
    }
    return customStartColor;
  }, [colorMode, isDarkMode, selectedPreset, customStartColor]);

  const gradientEnd = useMemo(() => {
    if (colorMode === "preset") {
      return isDarkMode ? selectedPreset.darkEnd : selectedPreset.lightEnd;
    }
    return customEndColor;
  }, [colorMode, isDarkMode, selectedPreset, customEndColor]);

  const getChannelIcon = (channelName: string) => {
    switch (channelName) {
      case "fav-portfolios":
        return <User className="w-4 h-4 mr-2" />;
      case "design-inspo":
        return <Palette className="w-4 h-4 mr-2" />;
      case "mint-worthy":
        return <Gem className="w-4 h-4 mr-2" />;
      case "product-hunt":
        return <Rocket className="w-4 h-4 mr-2" />;
      case "reading-list":
        return <BookOpen className="w-4 h-4 mr-2" />;
      case "newsletters":
        return <Mail className="w-4 h-4 mr-2" />;
      case "opportunities":
        return <Briefcase className="w-4 h-4 mr-2" />;
      case "resources":
        return <Folders className="w-4 h-4 mr-2" />;
      case "blockchain":
        return <Layers className="w-4 h-4 mr-2" />;
      default:
        return null;
    }
  };

  const loadMore = () => {
    setVisibleItems((prevVisibleItems) => prevVisibleItems + itemsPerPage);
  };

  const filterLinks = (links: LinkData[]) => {
    return links.filter(
      (link) =>
        link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.url.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <div className="dark:bg-gray-800 p-6 rounded-lg shadow-inner">
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        {/* Customization Toggle Button */}
        <button
          onClick={() => setIsCustomizePanelOpen(!isCustomizePanelOpen)}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <div className="flex items-center">
            <Palette className="mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" />
            <span className="font-medium">Customize Appearance</span>
          </div>
          {isCustomizePanelOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>

        {/* Customization Panel */}
        {isCustomizePanelOpen && (
          <div className="p-4 border-t dark:border-gray-700 animate-fadeIn">
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-3">Card Theme</h4>
              {/* Responsive grid for theme buttons - 2 columns on mobile, 3 on larger screens */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {themeOptions.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setCardDesign(theme.id);
                      posthog.capture("card_theme_selected", {
                        theme: theme.id,
                        action: "changed",
                      });
                    }}
                    className={`p-2 rounded-md text-center transition-all ${
                      cardDesign === theme.id
                        ? "bg-green-100 dark:bg-green-900 font-medium"
                        : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {theme.name}
                  </button>
                ))}
              </div>
            </div>

            {themesWithCustomColors.includes(cardDesign) && (
              <div>
                <h4 className="text-sm font-medium mb-3">Color Theme</h4>
                {/* Also make color grid responsive */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => setSelectedPreset(preset)}
                      className={`relative h-8 rounded-md overflow-hidden transition-all ${
                        selectedPreset.name === preset.name
                          ? "ring-2 ring-blue-500"
                          : ""
                      }`}
                      title={preset.name}
                    >
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(to right, ${preset.lightStart}, ${preset.lightEnd})`,
                        }}
                      />
                      {selectedPreset.name === preset.name && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check className="h-4 w-4 text-white drop-shadow-md" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Tabs
        defaultValue={sortedChannels[0]?.name}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="flex justify-start mb-6 bg-transparent overflow-x-auto">
          {sortedChannels.map((channel) => {
            //console.log("linkData:", linkData[channel.name]);
            return (
              <TabsTrigger
                key={channel.id}
                value={channel.name}
                className="px-4 py-2 mx-1 rounded-full bg-white dark:bg-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300 flex items-center dark:text-white dark:hover:bg-gray-600"
              >
                {getChannelIcon(channel.name)}
                <span>{channel.name.replace("-", " ")}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        {sortedChannels.map((channel) => (
          <TabsContent key={channel.id} value={channel.name}>
            <AnimatePresence mode="wait">
              <motion.div
                key={channel.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {filterLinks(linkData[channel.name] || [])
                  .slice(0, visibleItems)
                  .map((link) => (
                    <LinkCard
                      key={link.id}
                      link={link}
                      design={cardDesign}
                      gradientStart={gradientStart}
                      gradientEnd={gradientEnd}
                    />
                  ))}
              </motion.div>
            </AnimatePresence>
            {filterLinks(linkData[channel.name] || []).length >
              visibleItems && (
              <div className="mt-6 text-center">
                <Button onClick={loadMore} variant="outline">
                  Load More
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
