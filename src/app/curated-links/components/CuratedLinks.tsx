"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import LinkCard from "./LinkCard";
import TabIcon from "./TabIcon";
import { AnimatePresence, motion } from "framer-motion";
import { DiscordChannel, LinkData } from "../utils/discordApi";

interface CuratedLinksTabsProps {
  channels: DiscordChannel[];
  linkData: { [key: string]: LinkData[] };
}

export default function CuratedLinksTabs({
  channels,
  linkData,
}: CuratedLinksTabsProps) {
  return (
    <div className="bg-gradient-to-b from-green-50 to-blue-50 p-8 rounded-lg shadow-inner">
      <Tabs defaultValue={channels[0]?.name} className="w-full">
        <TabsList className="flex justify-center mb-8 bg-transparent">
          {channels.map((channel) => (
            <TabsTrigger
              key={channel.id}
              value={channel.name}
              className="px-4 py-2 mx-1 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow duration-300"
            >
              <TabIcon category={channel.name} />
              <span className="ml-2 hidden sm:inline">
                {channel.name.replace("-", " ")}
              </span>
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
                {linkData[channel.name]?.map((link) => (
                  <LinkCard key={link.id} link={link} />
                ))}
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
