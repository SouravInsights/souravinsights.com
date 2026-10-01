import React from "react";
import { Tweet } from "react-tweet";

interface TweetEmbedProps {
  /** The numeric ID from the tweet URL: x.com/<user>/status/<id> */
  id: string;
}

/**
 * Tweet card for essays, re-toned to the site's palette via the
 * `.tweet-embed` rules in globals.css.
 *
 * react-tweet fetches the tweet server-side at build time, so the page
 * ships a real post (avatar, metrics, date linking out to X) with zero
 * client-side Twitter JS. The wrapper is `not-prose` so article typography
 * doesn't leak into the card, and it centers the card rather than
 * stretching it across the column — short aphoristic tweets need the
 * narrow card to hold their weight.
 */
export default function TweetEmbed({ id }: TweetEmbedProps) {
  return (
    <div className="tweet-embed not-prose my-8 flex justify-center sm:my-10">
      <Tweet id={id} />
    </div>
  );
}
