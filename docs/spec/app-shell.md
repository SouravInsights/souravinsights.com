# The app shell

What the site's chrome is. `src/components/nav/AppShell.tsx` draws it;
`globals.css` owns its geometry.

## Why it exists

The navigation used to be a floating pill: `fixed top-4`, centred, hiding on
scroll, and **714px wide at every window size** — 50% of a 1440 window, 70% of
1024, 93% of 768. Two things followed from that:

- Six labelled destinations plus two toggles in one row cannot fit between 768
  and 1024, and every page added (`/curio` was the sixth) made the row longer.
- Being an overlay, it forced every full-height screen to reserve its band *by
  hand* — `4rem, 5rem on desktop`, copied into `/play`'s layout and `/curio`'s.
  The copies drifted: the pill is 4rem **plus 2px of border**, so `/curio`'s
  header sat 2px underneath it until it was measured.

## The frame

```
md+                                        <md
┌────────┬────────────────────────┐        ┌────────────────────────┐
│ ⬤ SI   │                        │        │                        │
│ Home   │                        │        │                        │
│ Blog   │    the content panel   │        │    the content panel   │
│ Books  │    (every page)        │        │    (every page)        │
│ Curio  │                        │        │                        │
│ Game   │                        │        ├────────────────────────┤
│ ☾ ♪    │                        │        │ ⌂  ▤  ✦  ▦   ⋯        │
└────────┴────────────────────────┘        └────────────────────────┘
 rail, fixed, --rail-default wide            tab bar, fixed, --tabbar-space tall
 sections, a MORE group, then the footer      four destinations + More
 collapsed below xl, open from xl
```

- **The rail never hides, and neither does the tab bar.** A frame that ducks
  away as you scroll is a website telling you it is a website.
- **Collapsed below xl, open from xl, tooltips only while collapsed.** Measured
  rather than taste: a labelled rail at 1024 left a blog post 443px of text —
  *narrower* than the same page at 820 — because post pages go two-column at lg
  and the rail and the table of contents want the same width. Which is also why
  the breakpoint sets the *state* and not the *width*: shadcn draws its rows by
  state, so a 76px box in the expanded state stretched every row to the full
  column and clipped its label instead of centring. The state decides; the box
  follows it.
- **Both draw from one list** (`destinations` + `elsewhere` in AppShell). The
  phone shows the four with `tab: true`; More opens the rest, the three
  non-section pages, the socials, and the theme and sound switches.
- The footer stays for content pages and is skipped where a screen owns the
  whole frame (`/play`, `/cv`, `/curio`).

## The socials, and copying them

The rail's foot and the More sheet draw the same `socials` list, so the two
cannot drift. Each link stays a link — click opens it — and gains a copy control,
so taking an address costs one click instead of a tab, or the browser's own
long-press menu on a phone. (The phone's sheet carried no socials at all before
this; it does now.)

The rail has no room for a second control beside a 32px icon, and a chip on the
icon's corner covers the link it belongs to. So the copy control lives in the
link's tooltip, which the tooltip primitive positions outside the icon: hover the
icon and the label and the copy button appear. The copy is pointer-only there —
the link itself stays keyboard-reachable, but Radix closes a tooltip when its
trigger blurs, so the copy button inside it cannot be Tabbed to. Forcing the
tooltip open on focus was tried and removed: clicking a link leaves focus on it,
so one tooltip stuck open while the next opened, and two welded together. The
phone has no hover, so the sheet gives the socials a single row of icon-plus-copy
pairs. They are a row and not a list on purpose: the sheet is a menu, and five
more rows would turn it into a page. The link wears a filled square there and
the copy is a quiet glyph beside it, so open and copy do not read as buttons of
equal rank. The email copies the bare address, not its `mailto:` scheme, because
that is what ends up pasted.

## The contract

`globals.css` owns the numbers; nothing else may hard-code a band.

| | value |
|---|---|
| `--rail-default` | `9rem` — the open rail, compact on purpose |
| `--rail-user` | whatever a drag last left behind, or unset |
| `--sidebar-width-icon` | `4.75rem` — the collapsed rail; `RAIL_ICON` in use-rail.ts |
| `--rail-icon-user` | the collapsed rail's width *during* a drag, or unset |
| `--tabbar` | `3.5rem` below md, `0rem` from md |
| `--tabbar-space` | `--tabbar` plus the bottom safe-area inset |

The open rail's width is a compactness decision, not a breakpoint one, and the
reference is the widest thing in it: one word. "Insights" in a 14px mono face is
~67px, and the group's padding, the row's padding and the icon take 56px more —
so words fit from **128px** of rail, and the 144px default leaves them 88px.
`RAIL_MAX` (224) is only a reader's own ceiling. Its default was 192px before
this and a drag could reach 320, both spending panel width on a border and
nothing else.

shadcn's `Sidebar` reads `--sidebar-width` (which AppShell points at
`--rail-user`, falling back to `--rail-default`) and `--sidebar-width-icon`
(pointing at `--rail-icon-user`, falling back to `4.75rem`). The two
indirections exist because shadcn picks one of those two variables by *state*,
and a drag straddles both — see the gesture below.
The panel every page lives in applies `padding-bottom: var(--tabbar-space)` and
nothing else: the rail's offset is the gap the `Sidebar` leaves in the flow. The
tab bar's own height is `--tabbar-space` too, so its content keeps its full 56px
and the home indicator's inset is added beneath it rather than eaten out of it.
A page:

- **may not reserve a band of its own** — there is no overlay above it any more;
- **may subtract `--tabbar-space`** if it wants to own the viewport height
  (`/curio` does with `h-[calc(100svh-...)]`, and so does `/play` above md, which
  is what keeps its deck below the header instead of the header off the top
  edge) — and **must not also set a viewport min-height**, because the shell
  already hands it the height and `100dvh` inside the panel overshoots the tab
  bar's band by exactly `--tabbar-space`;
- is otherwise untouched. Pages stayed centred containers; only the width they
  are centred in changed.

## The resize gesture

The rail's edge is both a toggle and a handle, and telling them apart is the
whole of it.

- **A click toggles** — shadcn's `SidebarRail` handler. A press that never moved
  is left alone, so the click arrives where it always did.
- **A drag resizes** — 2px of pointer travel, measured on the *pointer's* own
  path. Not on the rail's width: the strip shadcn ships is a **16px** button
  parked on the edge, so a drag that seeded itself from the handle's own width
  asked for a 16px rail and squeezed the entire shell into a sliver on a plain
  click. The pointer's x is the width, because the rail is pinned to x=0.
- **A drag that moved is not a click**, and its trailing click is swallowed at
  the document in the capture phase, before React sees it.
- **Under the label threshold the rail snaps back.** Released below 128px the
  drag ends collapsed, so the rail can never rest in the zone where the labels
  are clipped — and the reader's last open width is restored, so the next open
  is where they left it rather than where the drag gave up.
- **The drag is live from a collapsed rail**, which needs both width variables
  written together: shadcn draws a collapsed rail at `--sidebar-width-icon` and
  an open one at `--sidebar-width`, so moving only `--rail-user` left the
  pointer pulling on a box that did not move until the release. Because both are
  written to the same px on the same frame, the state flip that lands mid-drag
  is invisible, and the labels arrive with the pointer rather than after it.

Where the toggle lives is part of the same problem, because a control nobody
finds is a control that does not exist. It is the **brand row**: the mark is the
button, with `PanelLeftClose` beside it while there is room to show it and the
tooltip carrying the meaning in icon mode, where the whole 76px column is the
target. The mark itself is the site's sticker set: while the row is hovered the
faces cycle in with a spring, and the shuffle stops where the pointer leaves. It
is the shell's only wink, and free because the face is decorative and the button
still only toggles. The row also drops the menu button's hover wash: a rectangle
behind a transparent cut-out is the box the mark exists to avoid. The cut-outs
are ~300KB each, so the mark draws `next/image` thumbnails rather than the full
artwork.
Before, the mark was a link home — which the Home row one item below already
does — and the only toggle was a `PanelLeft` buried in the footer's row of five
social icons. `Cmd/Ctrl+B` and the edge strip still work.

## Overlays

Two things sit above the frame, both of them chrome rather than content: the tab
bar's More sheet, and the cat. The cat mounts itself on `document.body`, so it
cannot be hidden by a wrapper — it is gated on `(min-width: 768px)` instead,
which is the rail's breakpoint, because the rail is the only thing it walks. On
a phone the wander zone resolves to nothing and it sleeps in the middle of the
page, which is where it used to be found.

## Motion

Collapsing the rail is one motion, not five: the rail's box, the gap that carries
the panel, the group label, every row's box and the labels' opacity all take
`.shell-transition` — 180ms on `cubic-bezier(0.23, 1, 0.32, 1)` — so nothing lags
the thing it sits inside. It is a plain class in globals.css rather than the
Tailwind arbitrary values it replaced, because `duration-[var(--x)]` is scanned
and then dropped from the build: those elements kept the transition property and
lost the duration, which is a jump, not a transition. Verified in the emitted CSS.

Nothing in the shell animates before the first frame has settled
(`html:not([data-shell-ready])`): the rail's arrival state cannot come from the
server, and a slide nobody asked for is worse than a jump. Nothing animates
mid-drag either (`html[data-resizing]`) — a panel that follows the pointer a beat
late is the whole difference between resizing and lagging.

## The one exception

A live Shipstack run takes the phone's band back: `html[data-game="playing"]`
zeroes `--tabbar` and fades `.site-tabbar`. The geometry follows from the
variable, so the game needs no band math of its own — measured: `.play-root`
788px → 844px on a 390×844 phone, with the tab bar at opacity 0. On desktop the
rail stays, because a shell that vanishes for a game is not a shell.

## Costs, stated

- The rail is chrome that never goes away: 76px collapsed, 144px open, and it
  arrives collapsed below xl. A blog post's text column measures 612px at 768,
  664 at 820, 541 at 1024 (the TOC takes its share there), 711 at 1279, and 635
  once labels appear — the one step down in that sequence, and the price of
  words where there were icons. Those figures were taken with the rail at its old
  12rem; at 9rem the panel itself starts 48px ahead of them. Below xl that step
  only happens if the reader opens the rail, which is theirs to decide.
- Icons alone (768–1279) are less legible than words; the tooltip and the
  highlighted icon are what carry meaning there.
- `src/hooks/useScrollDirection.ts` went with the pill: nothing hides on scroll
  any more.
