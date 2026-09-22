/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useState } from "react";
import { ApolloProvider } from "@apollo/client";
import client from "@/app/lib/literalApiClient";
import { BookshelfContent } from "./components/BookshelfContent";
import { CoverToggle } from "./components/CoverToggle";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { FadeIn } from "@/components/FadeIn";

const KINDLE_IMAGES = ["/kindle1.jpg", "/kindle2.jpg", "/kindle3.jpg"];

function KindleDisplay() {
  return (
    <section className="mt-16 sm:mt-24">
      <SectionHeader
        title="My reading companion"
        description="It's like carrying a whole library without the backache. One digital page at a time."
      />
      <div className="grid max-w-md grid-cols-3 gap-3">
        {KINDLE_IMAGES.map((src, index) => (
          <FadeIn key={src} delay={index * 0.05}>
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-border">
              <Image
                src={src}
                alt={`Kindle Oasis ${index + 1}`}
                fill
                sizes="(max-width: 640px) 33vw, 150px"
                className="object-cover"
              />
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

function LiteralCredit() {
  return (
    <section className="mt-16 sm:mt-24">
      <div className="flex flex-col gap-4 rounded-lg border border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          {/* The "light" wordmark is the one built for dark backgrounds. */}
          <Image
            src="/literal-wordmark-light.svg"
            alt="Literal Club"
            width={110}
            height={36}
            className="hidden opacity-90 dark:block"
          />
          <Image
            src="/literal-wordmark.svg"
            alt="Literal Club"
            width={110}
            height={36}
            className="block opacity-90 dark:hidden"
          />
          <p className="type-caption max-w-md">
            I use Literal Club to track my reading. They have a nice API that
            powers this page.
          </p>
        </div>
        <a
          href="https://literal.club"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 type-caption font-medium text-foreground transition-colors hover:bg-foreground/5"
        >
          Check it out <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </section>
  );
}

export default function BookshelfPage() {
  const [totalBooks, setTotalBooks] = useState<number | null>(null);
  const [showGenerativeCovers, setShowGenerativeCovers] = useState(false);

  return (
    <ApolloProvider client={client}>
      <div className="mx-auto max-w-5xl px-5 pb-24 pt-10 sm:px-6 sm:pt-12 md:pt-32">
        <FadeIn y={20} duration={0.5}>
          <PageHeader
            title="Library"
            description="Books I'm reading and have read lately."
            action={
              <CoverToggle
                checked={showGenerativeCovers}
                onChange={setShowGenerativeCovers}
              />
            }
          />
        </FadeIn>

        {totalBooks !== null && (
          <p className="type-caption mb-6 text-muted-foreground/70">
            {totalBooks} books
          </p>
        )}

        <BookshelfContent
          onBooksLoaded={setTotalBooks}
          showGenerativeCovers={showGenerativeCovers}
        />

        <KindleDisplay />
        <LiteralCredit />
      </div>
    </ApolloProvider>
  );
}