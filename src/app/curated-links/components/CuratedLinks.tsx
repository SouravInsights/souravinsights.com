"use client";

import React, { useMemo, useState } from "react";
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
  Leaf,
  Flower,
  Trees,
  TentTree,
  Search,
  Layout,
  Palette,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { colorPresets, ColorPreset } from "../utils/colorPresets";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";

interface CuratedLinksTabsProps {
  channels: DiscordChannel[];
  linkData: { [key: string]: LinkData[] };
}

const themesWithCustomColors = ["tilted", "layered", "polaroid"];

export default function CuratedLinksTabs({
  channels,
  linkData,
}: CuratedLinksTabsProps) {
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
  >("retro-tech");

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

  const filterLinks = (links: LinkData[]) => {
    return links.filter(
      (link) =>
        link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.url.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const gradientStart =
    colorMode === "preset" ? selectedPreset.startColor : customStartColor;
  const gradientEnd =
    colorMode === "preset" ? selectedPreset.endColor : customEndColor;

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
              <Select
                value={cardDesign}
                onValueChange={(value: typeof cardDesign) =>
                  setCardDesign(value)
                }
              >
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

      <Tabs defaultValue={channels[0]?.name} className="w-full">
        <TabsList className="flex justify-start mb-6 bg-transparent overflow-x-auto">
          {channels.map((channel) => (
            <TabsTrigger
              key={channel.id}
              value={channel.name}
              className="px-4 py-2 mx-1 rounded-full bg-white dark:bg-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300 flex items-center dark:text-white dark:hover:bg-gray-600"
            >
              {channel.name.includes("fav") && (
                <Leaf className="w-4 h-4 mr-2" />
              )}
              {channel.name.includes("design") && (
                <Flower className="w-4 h-4 mr-2" />
              )}
              {channel.name.includes("product") && (
                <Trees className="w-4 h-4 mr-2" />
              )}
              {channel.name.includes("mint") && (
                <TentTree className="w-4 h-4 mr-2" />
              )}
              <span>{channel.name.replace("-", " ")}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {channels.map((channel) => (
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
                {filterLinks(linkData[channel.name] || []).map((link) => (
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
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
