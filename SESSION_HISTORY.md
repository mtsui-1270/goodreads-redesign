# Session History

A log of the design and build session for this Goodreads redesign concept, worked on by Mariah Tsui with her assistant brok on **Nov 19, 2026** (times are Pacific).

## 1. Static UI concepts (3:18 PM)
**Ask:** Visual examples of UI for a Goodreads redesign: more interpretable, more animated, and with fewer hyperlinks cluttering the page.

**Made:** Three generated mockups in a warm cream and terracotta style:
- **Home:** a Currently Reading card with a progress ring, a reading challenge bar, a "Picked for you" carousel and a friend activity feed.
- **Book page:** one main "Want to Read" button, a rating breakdown chart, genre chips instead of links, and tabs for About, Reviews, Quotes and Similar books.
- **Mobile:** a shelf with progress bars, a Year in Books stats screen, and a rating panel that slides up from the bottom.

## 2. GSAP homepage prototype and Book Jam (3:21 PM)
**Ask:** Add a GSAP animation to the homepage with a library feel (pages flipping, a bookshelf), plus a "Book Jam" feature, like Spotify Jam but for books (a live book club).

**Built:** `index.html`, a single file with inline CSS and JS.
- **Intro:** a book whose pages flip in sequence, then a zoom into the homepage. It can be skipped.
- **Bookshelf:** spines drop onto a wooden shelf, tilt out on hover, and flip to a detail card on click. A Reshelve button drops them again.
- **Motion:** sections reveal on scroll, plus parallax, an animated progress ring, an animated reading challenge bar and counters that count up.
- **Book Jam:** a shared progress track with reader markers, chapter checkpoints, a "bring everyone to my page" button, an invite code with a QR placeholder, spoiler-safe chat and floating emoji reactions.
- **Reduced motion:** supported.

## 3. Palette recolor (3:41 PM)
**Ask:** Less white, more of a supplied earthy palette.

**Changed:** Clockwork `#72583E`, Cedar `#7C7960`, Latte `#DBC4A5`, Deep Olive `#44422D`, Café Noir `#443223`, Mauve `#755151`, Weathered `#A08670`, Linen `#FFF9F3`.
- Mauve replaced terracotta as the main accent.
- Cedar and Deep Olive are used for secondary accents.
- The shelf is Clockwork and Café Noir.
- Linen is kept only for text on dark surfaces.
- Text was checked against WCAG AA contrast.

## 4. Live API scope (4:06 PM)
We outlined what a real backend for Book Jam would need:
- jam sessions
- a live connection (WebSockets)
- reading progress
- spoiler-safe chat
- checkpoints
- book and user data
- notifications
- safety and moderation

## 5. Real-time mock server (4:07 PM)
**Ask:** Wire the prototype to a small mock server so jams actually sync.

**Built:** `server/server.js`, a Node server using `ws`.
- **Jams:** create and join by code or link, see who's present, page positions, pause/resume and turn page.
- **Host requests:** "bring everyone to my page" is sent as a request that each reader accepts.
- **Chat and discussion:** spoiler-locked chat delivered by page, reactions, and checkpoints.
- **Fallback:** opened as a plain file with no server, the page runs the simulated jam instead.
- **Testing:** verified with two separate browsers.

## 6. Public deployment (4:13 to 4:25 PM)
**Ask:** A public link anyone can open, on a free host.

**Done:**
- Free tunnels from the build machine were blocked, so we deployed to Render's free plan instead.
- The code was put in this public repo.
- The site is live at **https://goodreads-redesign.onrender.com**.
- Two browsers syncing a jam over the public link were verified.

## 7. Cream background (4:30 PM)
**Ask:** Change the background to cream.

**Changed:**
- The page background is now `#F3EADB`, with softer paper grain.
- The cards stay Latte tints.
- The live site was redeployed manually, because Render's GitHub app isn't installed for this repo.

## 8. README refresh (4:37 PM)
**Done:**
- Rewrote `README.md`: features, palette, tech stack, run steps, deploy notes and known limits.
- Refreshed the screenshots in `screenshots/`.

## 9. This file (4:48 PM)
**Ask:** Export the session history to the repo as a separate file.

---

## Known limits
- **Memory only:** jam state lives in memory and resets when the server restarts or sleeps.
- **Not for real users yet:** there are no accounts or auth, so it's for demos only.
- **Free-tier sleep:** the site sleeps after about 15 minutes with no visitors, and the next visit takes 30 to 60 seconds to wake it.
- **All mock data:** every book, friend and activity is placeholder content.
