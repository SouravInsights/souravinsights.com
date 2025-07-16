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
  Rocket,
  BookOpen,
  Mail,
  Briefcase,
  Folders,
  Check,
  Send,
  Package,
} from "lucide-react";
import { colorPresets, ColorPreset } from "../utils/colorPresets";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import posthog from "posthog-js";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { NewsletterModal } from "./NewsletterModal";
import { NoteEditorModal } from "./NoteEditorModal";
import { appendUTMParams } from "../utils/urlUtils";

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

  const [isAdminMode, setIsAdminMode] = useState(false);
  const [selectedLinkForEditing, setSelectedLinkForEditing] =
    useState<LinkData | null>(null);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);

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
    "resources",
    "product-hunt",
    "newsletters",
    "fav-portfolios",
    "tools",
    "opportunities",
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
    const searchParams = new URLSearchParams(window.location.search);
    const adminKey = searchParams.get("adminKey");
    if (adminKey === process.env.NEXT_PUBLIC_ADMIN_KEY) {
      setIsAdminMode(true);
      console.log("Admin mode activated");
    }
  }, []);

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

  const [showNewsletterModal, setShowNewsletterModal] = useState(false);
  const [curatedLinks, setCuratedLinks] = useState<LinkData[]>([]);

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

  const openAddLinkModal = (link: LinkData) => {
    const newLink = {
      ...link,
      isCurated: false,
      notes: "",
    };
    setSelectedLinkForEditing(newLink);
    setIsEditorModalOpen(true);
  };

  const openEditLinkModal = (link: LinkData) => {
    setSelectedLinkForEditing(link);
    setIsEditorModalOpen(true);
  };

  // Function to save notes for a link
  const handleSaveNotes = async (
    linkId: string,
    notes: string,
    creatorTwitter?: string
  ): Promise<void> => {
    try {
      const response = await fetch("/api/curated-links/save-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_API_KEY}`,
        },
        body: JSON.stringify({
          linkId,
          notes,
          creatorTwitter,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save notes");
      }

      // If successful, update the link in our local state
      setCuratedLinks((prev) =>
        prev.map((link) =>
          link.id === linkId
            ? {
                ...link,
                notes,
                creatorTwitter: creatorTwitter || link.creatorTwitter,
              }
            : link
        )
      );

      // Refresh curated links
      fetchCuratedLinks();
    } catch (error) {
      console.error("Error saving notes:", error);
    }
  };

  // Helper function to normalize URLs for comparison
  const normalizeUrl = (url: string): string => {
    try {
      // Remove protocol, www, and trailing slashes for comparison
      return url
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/$/, "");
    } catch {
      return url;
    }
  };

  // Function to save a link to the curated collection
  const addToCollection = async (data: {
    linkId: string;
    notes: string;
    creatorTwitter: string;
    category: string;
  }) => {
    const link = linkData[data.category]?.find((l) => l.id === data.linkId);

    if (!link) {
      throw new Error("Link not found");
    }

    console.log("Adding link to collection:", link.url);

    const response = await fetch("/api/curated-links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_API_KEY}`,
      },
      body: JSON.stringify({
        title: link.title,
        url: link.url,
        description: link.description,
        category: data.category,
        notes: data.notes,
        creatorTwitter: data.creatorTwitter,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save link");
    }

    // Track in PostHog
    posthog.capture("link_added_to_curation", {
      url: link.url,
      category: data.category,
    });

    // Immediately refresh the curated links
    await fetchCuratedLinks();
  };

  // Function to fetch curated links
  const fetchCuratedLinks = async () => {
    try {
      const response = await fetch("/api/curated-links", {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch curated links");
      }

      const data = await response.json();
      setCuratedLinks(data.links);
    } catch (error) {
      console.error("Error fetching curated links:", error);
      alert("Could not load curated links");
    }
  };

  useEffect(() => {
    if (isAdminMode) {
      fetchCuratedLinks();
    }
  }, [isAdminMode, showNewsletterModal]);

  const getChannelIcon = (channelName: string) => {
    switch (channelName) {
      case "fav-portfolios":
        return <User className="w-4 h-4 mr-2" />;
      case "design-inspo":
        return <Palette className="w-4 h-4 mr-2" />;
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
      case "tools":
        return <Package className="w-4 h-4 mr-2" />;
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
      {isAdminMode && (
        <div className="mb-4 px-4 py-3 bg-yellow-100 dark:bg-yellow-800 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-200 rounded">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center mb-2 sm:mb-0">
              <span className="font-semibold">Admin Mode Active</span>
              <span className="ml-2 text-sm">
                {curatedLinks.length
                  ? `${curatedLinks.length} links in your collection`
                  : "Add links to your collection"}
              </span>
            </p>

            <Button
              onClick={() => setShowNewsletterModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center"
              size="sm"
            >
              <Send size={14} className="mr-1.5" />
              Create Newsletter
            </Button>
          </div>
        </div>
      )}

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
          {sortedChannels.map((channel) => (
            <TabsTrigger
              key={channel.id}
              value={channel.name}
              className="px-4 py-2 mx-1 rounded-full bg-white dark:bg-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300 flex items-center dark:text-white dark:hover:bg-gray-600"
            >
              {getChannelIcon(channel.name)}
              <span>{channel.name.replace("-", " ")}</span>
            </TabsTrigger>
          ))}
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
                  .map((link) => {
                    // Check if this link is already in our curated collection using normalized URLs
                    const normalizedLinkUrl = normalizeUrl(link.url);
                    const isCurated = curatedLinks.some(
                      (curatedLink) =>
                        normalizeUrl(curatedLink.url) === normalizedLinkUrl
                    );

                    console.log("Is Curated?", isCurated);

                    // To find the matching curated link if it exists
                    const curatedLink = isCurated
                      ? curatedLinks.find(
                          (cl) => normalizeUrl(cl.url) === normalizedLinkUrl
                        )
                      : null;

                    // Use thae existing data if it has a curated version
                    const enhancedLink = curatedLink
                      ? {
                          ...link,
                          ...curatedLink,
                          isCurated: true,
                        }
                      : link;

                    const linkWithUTM = {
                      ...enhancedLink,
                      url: appendUTMParams(enhancedLink.url, {
                        utm_source: "souravinsights.com",
                        utm_medium: "curated_links",
                      }),
                    };

                    return (
                      <LinkCard
                        key={link.id}
                        link={linkWithUTM}
                        design={cardDesign}
                        gradientStart={gradientStart}
                        gradientEnd={gradientEnd}
                        isAdminMode={isAdminMode}
                        isCurated={isCurated}
                        onAddToCuration={() => openAddLinkModal(link)}
                        onEditNotes={() => openEditLinkModal(enhancedLink)}
                      />
                    );
                  })}
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

      <NewsletterModal
        isOpen={showNewsletterModal}
        onClose={() => setShowNewsletterModal(false)}
        curatedLinks={curatedLinks}
      />

      <NoteEditorModal
        isOpen={isEditorModalOpen}
        onClose={() => setIsEditorModalOpen(false)}
        selectedLink={selectedLinkForEditing}
        onSaveNotes={handleSaveNotes}
        onAddToCollection={addToCollection}
        currentCategory={activeTab}
      />
    </div>
  );
}
