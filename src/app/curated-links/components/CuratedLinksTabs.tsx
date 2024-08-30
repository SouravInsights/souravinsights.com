"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import LinkCard from "./LinkCard";
import ColorPicker from "./ColorPicker";
import { AnimatePresence, motion } from "framer-motion";
import { DiscordChannel, LinkData } from "../utils/discordApi";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Layout,
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
} from "lucide-react";
import { colorPresets, ColorPreset } from "../utils/colorPresets";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import posthog from "posthog-js";

interface CuratedLinksTabsProps {
  channels: DiscordChannel[];
  linkData: { [key: string]: LinkData[] };
}

const themesWithCustomColors = ["tilted", "layered", "polaroid"];
const ITEMS_PER_PAGE = 12; // Number of items to load initially and on each "Load More" click

export default function CuratedLinksTabs({
  channels,
  linkData,
}: CuratedLinksTabsProps) {
  const [visibleItems, setVisibleItems] = useState(ITEMS_PER_PAGE);
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

  const orderedChannelNames = [
    "reading-list",
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
      default:
        return null;
    }
  };

  const loadMore = () => {
    setVisibleItems((prevVisibleItems) => prevVisibleItems + ITEMS_PER_PAGE);
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
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="flex-grow flex items-center gap-2 px-2 bg-white dark:bg-gray-700 rounded-md shadow-sm">
            <Search className="text-gray-400 dark:text-gray-300" size={20} />
            <Input
              type="text"
              placeholder="Search links..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCustomizePanelOpen(!isCustomizePanelOpen)}
            className="whitespace-nowrap h-10"
          >
            {isCustomizePanelOpen ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" /> Hide Options
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" /> Customize
              </>
            )}
          </Button>
        </div>

        {isCustomizePanelOpen && (
          <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-700 p-4 rounded-md shadow-sm">
            <div className="flex-1">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
                <Layout size={16} />
                Card Theme
              </Label>
              <Select value={cardDesign} onValueChange={handleCardDesignChange}>
                <SelectTrigger className="w-full bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100">
                  <SelectValue placeholder="Select card design" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-600">
                  <SelectItem
                    value="tilted"
                    className="text-gray-900 dark:text-gray-100"
                  >
                    Tilted
                  </SelectItem>
                  <SelectItem
                    value="layered"
                    className="text-gray-900 dark:text-gray-100"
                  >
                    Layered
                  </SelectItem>

                  <SelectItem
                    value="polaroid"
                    className="text-gray-900 dark:text-gray-100"
                  >
                    Polaroid
                  </SelectItem>
                  <SelectItem
                    value="notebook"
                    className="text-gray-900 dark:text-gray-100"
                  >
                    Notebook
                  </SelectItem>
                  <SelectItem
                    value="postcard"
                    className="text-gray-900 dark:text-gray-100"
                  >
                    Postcard
                  </SelectItem>
                  <SelectItem
                    value="minimalist"
                    className="text-gray-900 dark:text-gray-100"
                  >
                    Minimalist
                  </SelectItem>
                  <SelectItem
                    value="retro-tech"
                    className="text-gray-900 dark:text-gray-100"
                  >
                    Retro Tech
                  </SelectItem>
                  <SelectItem
                    value="blueprint"
                    className="text-gray-900 dark:text-gray-100"
                  >
                    Blueprint
                  </SelectItem>
                  <SelectItem
                    value="typewriter"
                    className="text-gray-900 dark:text-gray-100"
                  >
                    Typewriter
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {supportsCustomColors && (
              <div className="flex-1">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
                  <Palette size={16} />
                  Color Scheme
                </Label>
                <RadioGroup
                  defaultValue="preset"
                  onValueChange={(value: "preset" | "custom") =>
                    setColorMode(value)
                  }
                  className="flex space-x-4 mb-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="preset"
                      id="preset"
                      className="dark:border-gray-400"
                    />
                    <Label htmlFor="preset" className="dark:text-gray-200">
                      Presets
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="custom"
                      id="custom"
                      className="dark:border-gray-400"
                    />
                    <Label htmlFor="custom" className="dark:text-gray-200">
                      Custom
                    </Label>
                  </div>
                </RadioGroup>

                {colorMode === "preset" ? (
                  <Select
                    value={selectedPreset.name}
                    onValueChange={(value) =>
                      setSelectedPreset(
                        colorPresets.find((preset) => preset.name === value) ||
                          colorPresets[0]
                      )
                    }
                  >
                    <SelectTrigger className="w-full bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100">
                      <SelectValue placeholder="Select a color preset" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-600">
                      {colorPresets.map((preset) => (
                        <SelectItem
                          key={preset.name}
                          value={preset.name}
                          className="text-gray-900 dark:text-gray-100"
                        >
                          {preset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex space-x-4">
                    <ColorPicker
                      color={customStartColor}
                      onChange={setCustomStartColor}
                      label="Start"
                    />
                    <ColorPicker
                      color={customEndColor}
                      onChange={setCustomEndColor}
                      label="End"
                    />
                  </div>
                )}
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
