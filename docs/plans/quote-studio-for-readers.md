# Quote Studio for Readers

The kit is a component library: useful to developers, invisible to the readers
who quote the words. This is the plan for the surface a reader can use without a
codebase, and why it is not another highlighter.

## The gap

Highlighting is commoditised. Every browser has an extension that marks text,
and the good ones sync across devices. Competing there means competing on
storage and accounts — a race to the bottom.

What is not commoditised is the **card**. A marked sentence is private until it
is turned into something you can post: set in a chosen design, with the title
and the publication, exported at the right aspect ratio. That is the part a
reader cannot do today without opening Figma.

## The product

Select a line on any page → open the studio → leave with a card.

| Step | What happens |
| :--- | :--- |
| Select | A bookmarklet or extension reads the selection and the page's title/URL. |
| Design | The same studio as the kit: four designs, eight hues, Story/Post/Square. |
| Export | PNG download or clipboard copy, with the page's title, publication and URL. |

No marks are stored, no account is created, nothing is highlighted on the page
after the card is exported. The output is the product.

## Why it should exist

- A reader who shares a quote sends traffic back to the publication; the credit
  line travels with the image.
- Publications get a consistent look for every reader's card, instead of a
  screenshot of the browser's selection colour.
- It is the one part of the kit a non-developer can use, which is what makes the
  landing page's promise credible.

## Milestones

1. **Bookmarklet.** One line of JavaScript, opens the studio in a popup with the
   selection passed in. Proves the loop without a store listing.
2. **Extension.** Chrome first; reads the selection, page title and URL; runs the
   studio in an extension page. No page injection.
3. **Hosted studio.** `ui.souravinsights.com/studio` with a manual paste fallback,
   so a reader can try it without installing anything.

## Open questions

- Attribution: the publication name comes from the page's metadata or the
  reader's input. Which wins?
- Tracking: no analytics on the card, but the publication may want to know how
  often its quotes are exported. Decide before milestone 2.
- Permissions: selection-only, activeTab-only. No host permissions beyond the
  page the reader is on.
- Mobile: out of scope for v1. The desktop browser is where the studio fits.

## Non-goals

- No persistent highlights, sync, accounts or notebooks.
- No editor integration.
- No new themes beyond the four the kit ships.