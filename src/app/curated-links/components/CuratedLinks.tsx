"use client";

import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import LinkCard from "./LinkCard";
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
import { Leaf, Flower, Trees, TentTree } from "lucide-react";

interface CuratedLinksTabsProps {
  channels: DiscordChannel[];
  linkData: { [key: string]: LinkData[] };
}

export default function CuratedLinksTabs({
  channels,
  linkData,
}: CuratedLinksTabsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [cardDesign, setCardDesign] = useState<
    "tilted" | "layered" | "polaroid"
  >("tilted");

  const filterLinks = (links: LinkData[]) => {
    return links.filter(
      (link) =>
        link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.url.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <div className="p-6 rounded-lg shadow-inner">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <Input
          type="text"
          placeholder="Search links..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-64"
        />
        <Select
          value={cardDesign}
          onValueChange={(value: "tilted" | "layered" | "polaroid") =>
            setCardDesign(value)
          }
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Card Design" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tilted">Tilted</SelectItem>
            <SelectItem value="layered">Layered</SelectItem>
            <SelectItem value="polaroid">Polaroid</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Tabs defaultValue={channels[0]?.name} className="w-full">
        <TabsList className="flex justify-start mb-6 bg-transparent overflow-x-auto">
          {channels.map((channel) => (
            <TabsTrigger
              key={channel.id}
              value={channel.name}
              className="px-4 py-2 mx-1 rounded-full bg-white shadow-sm hover:shadow-md transition-shadow duration-300 flex items-center"
            >
              {channel.name.includes("fav") && (
                <Leaf className="w-4 h-4 mr-2" />
              )}
              {channel.name.includes("design") && (
                <Flower className="w-4 h-4 mr-2" />
              )}
              {channel.name.includes("product") && (
                <TentTree className="w-4 h-4 mr-2" />
              )}
              {channel.name.includes("mint") && (
                <Trees className="w-4 h-4 mr-2" />
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
                  <LinkCard key={link.id} link={link} design={cardDesign} />
                ))}
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
