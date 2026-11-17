# The Dark World: upload rules (titles, descriptions, tags, products, captions)

Only for The Dark World projects (Health Decode has its own: `docs/HEALTHDECODE_UPLOAD.md`).
Process and file shape: `docs/UPLOAD_METADATA.md`. Approved example: Aging_150 (2026-11-17).
Sheet only, never posted to the channel by Claude.

## Rules
- Title (16x9): main keyword first, Telugu + English mix (how people search), 60-70 chars, curiosity without false
  claims. Shorts title: short hook + `#shorts`.
  Title rules (user, 2026-11-18), both formats:
  1. The main keyword inside the first 40 characters (mobile cuts the rest).
  2. A number or a specific fact when the video has one ("150 ఏళ్లు", "122 ఏళ్ల record"), not vague words like "interesting facts".
  3. Curiosity (a question or a contrast, "...సాధ్యమా?", "అసలు నిజం") but only what the video really delivers:
     no clickbait, no false promise (YouTube misleading-metadata rules; viewers leave and reach drops).
  4. Telugu for the feeling, English for the search keyword; "in Telugu" at the end.
  5. Pairs with the thumbnail: never repeat the thumbnail text; thumbnail = the shock, title = the question.
  6. Clean: no ALL CAPS, no "!!!", at most one emoji (usually none).
  7. Shorts title: hook under 40 characters + " #shorts".
  8. Three options: `title_options` (3 titles, the first = `title`) in the 16x9 metadata.json -> sheet column T,
     for YouTube Studio "Test & Compare" or for the user to pick.
- Description: the templates below (long and Shorts).
- Tags: NO Telugu letters (user, 2026-11-18): English + Tenglish only, 500 characters max as YouTube counts
  them (commas count, a tag with spaces counts 2 more), ending with "The Dark World".
  How to build them (both formats):
  1. Order: the exact main keyword from the title first, then its variations, broad words last (the first tags
     weigh most).
  2. Telugu words written in English letters, as people type them ("ayushu", "musalitanam").
  3. The main keyword twice: "... telugu" and "... in telugu".
  4. 2-3 question tags people search ("can humans live 150 years", "how to slow aging").
  5. Common other spellings / names of the topic when people use them (e.g. "AI doctor", "artificial intelligence doctor").
  6. Only what the video is really about: no trending names or other topics (YouTube "misleading metadata" = spam).
  7. 15-25 tags, each about 30 characters or less, total 400-480 (room under 500).
  8. Shorts: 8-10 tags only: main keyword, 2-3 variations, "shorts", the channel name.
  `pipeline/upload_sheet.check_tags` prints a warning on Telugu letters or more than 500.
- Products (sheet column O, `products` in the 16x9 file; user rules 2026-11-18):
  1. Written the way people type in the Amazon / Flipkart search box, so pasting it finds the right item
     ("fitness band with heart rate monitor", not "fitness band").
  2. One product per line in the cell (the sync joins the list with new lines).
  3. 3-5 products, the most relevant first.
  4. Generic names, no brands (a brand reads as an endorsement); books as "<title> by <author>".
  5. The Dark World: books, science kits, gadgets that fit the topic (space -> "beginner telescope", AI ->
     "AI book for beginners"). Never medicines or supplements.
  6. Names close to the Flipkart catalog wording, so YouTube Shopping (India) tagging finds them.
  7. Column U "Product Links" (`product_links`, one per line, same order): only links the user gives; never
     invent one. When links are there, the description gets the affiliate line (ASCI / YouTube rules):
     "Some links in this description may be affiliate links; we may earn a small commission at no extra cost to you."
  8. Anything the video itself names (a device, a book) comes first.
- Facebook (user rules 2026-11-18): two captions. `facebook` = Reel caption (9x16 clip, sheet column P);
  `facebook_post` = long-video post caption (16x9, sheet column V). Both in the 16x9 metadata.json.
  1. The strongest line first, under ~80 characters (mobile shows 2-3 lines before "See more").
  2. Mostly Telugu (the Facebook audience reads Telugu), English only for key words.
  3. No link in the caption (Facebook cuts the reach of link posts): the video is uploaded to Facebook itself and
     the YouTube link goes in the first comment; the caption says "Full video link comments లో 👇".
  4. One question that is easy to answer ("Avunu / Kaadu", "1 leka 2").
  5. No engagement bait ("like cheyandi", "10 mandiki share"); a soft "useful అనిపిస్తే family తో share చేయండి" is fine.
  6. 2-3 short bullet lines with ✅ / ❌ / 👉 so the content is clear at a glance.
  7. 2-3 hashtags only: topic + channel (#TheDarkWorld).
  8. Health-related topics end with "ℹ️ సమాచారం కోసం మాత్రమే."
  9. The Reel caption is short (hook, 3 bullets, question, link line, hashtags); the post caption tells a bit more
     (what the full video covers, its length) with the same rules. Written fresh for each video.
- Instagram (sheet column Q, `instagram` in the 16x9 file; user rules 2026-11-18):
  1. Hook in the first line, about 50 characters (Instagram cuts at ~125 with "more").
  2. English search keywords inside a natural sentence (Instagram search reads captions more than hashtags),
     e.g. "aging reverse science in Telugu".
  3. 3-5 hashtags only (Instagram's new limit is 5): 1 topic, 1-2 niche, 1 channel (#thedarkworld).
  4. A "send to a friend who..." line (DM shares weigh most), Save CTA optional.
  5. No link (not clickable): "full video link bio లో 🔗", or "Comment <KEYWORD>, link DM చేస్తాం" (the user sends
     the DM by hand until an automation exists).
  6. Short paragraphs, one point per line, emojis as bullets that fit the point.
  7. The first line repeats the Reel's cover / first-frame hook in other words: one message in both places.
  8. Health-related topics end with "ℹ️ సమాచారం కోసం మాత్రమే."
  9. Telugu for the feeling, a few more English keywords than Facebook (search).
- Pinned comment (sheet column R, `pinned_comment` in the 16x9 file): Telugu question that invites answers +
  the same question in English + "📚 Sources & chapters are in the description." (+ "Educational only, not medical
  advice." on health-related topics). 2-3 lines, no links unless known.
- Advertiser-friendly: facts, not rumours; company results stated as their own announcements; no defamation, no
  graphic or fear words in titles. Health-related topics: the "not medical advice" line in the disclaimer.
- Realistic AI images: the AI-visuals line, and remind the user to tick YouTube's "Altered or synthetic content".

## Not a routine template (user, 2026-11-18)
The templates below are a base, not a form to copy. Every video gets its own writing, shaped by its content:
- Write the hook, questions, bullets, myths, chapters titles, captions and pinned comment fresh for each video;
  never reuse the same sentences or the same hook pattern video after video.
- Claude may change the structure when the content needs it: add a section (e.g. a timeline for a history topic,
  "key numbers" for a data-heavy one, a comparison for "X vs Y"), drop one that does not fit, reorder, pick other
  emojis and hashtags.
- Kept word for word: the About block and the disclaimer text the user wrote (plus the safety lines these rules add).
- The safety rules above never change with the content.

## Description templates
Long video (16x9) and Shorts (9x16) `metadata.json` "description". Fill the [brackets]; keep the fixed lines.
Rules the user approved: the first ~150 characters (shown in search) = curiosity question + main keyword, one Telugu
line first; keywords inside natural sentences (no comma keyword lists: YouTube can treat them as spam); no markdown
`#` / `###` (YouTube shows them as plain text); topic hashtags first (the first 3 show above the title).
Lines marked (if known) are left out when the link is not known yet: never invent a link.
Health-related topics add to the disclaimer: "This video is not medical advice. Please consult a doctor before
starting any supplement or treatment." Realistic AI images add: "Some visuals in this video are AI-generated."

### Long video (16x9)
```
[Telugu curiosity question]? [Same curiosity question in English, with the main keyword]?
[One natural sentence that carries the main search keywords] – the real story behind [TOPIC].

In this video, we explore [TOPIC] through interesting facts, research-based explanations, and cinematic documentary storytelling.

🔍 WHAT YOU WILL DISCOVER
• [Important fact 1]
• [Important fact 2]
• [Interesting discovery 3]
• [Important explanation 4]

⏱️ CHAPTERS
0:00 [chapter]
[m:ss chapter ... from work/scenes.json; first 0:00, each >= 10 s, at least 3]

📚 SOURCES
[Only the sources the script really used, one line, separated by " · "]

🌍 ABOUT THE DARK WORLD
Welcome to The Dark World!
The Dark World explores fascinating stories and discoveries from science, technology, history, geopolitics, mysteries, and the world around us.
Our mission is to transform complex information into engaging, easy-to-understand stories through cinematic visuals, research-based explanations, and documentary-style storytelling.
Every video is designed to encourage curiosity, expand knowledge, and help viewers understand the world from a different perspective.

⚠️ CONTENT DISCLAIMER
This video is created for educational and informational purposes only.
The information presented is based on available research, publicly accessible sources, and relevant references. We aim to provide accurate and understandable information; however, certain facts, interpretations, and developments may change over time.
Where topics involve ongoing events, scientific debates, or differing perspectives, the information should be understood in its appropriate context.
This content is not intended to mislead, defame, or promote harmful activities.
[Health line / AI-visuals line when they apply]
[Affiliate links only: Some links in this description may be affiliate links; we may earn a small commission at no extra cost to you.]

📌 STAY CONNECTED
Subscribe to The Dark World for more fascinating stories, discoveries, facts, and educational documentaries.
🔔 Subscribe: [channel link]?sub_confirmation=1   (if known)
▶️ Watch next: [related video or playlist link]   (if known)

#[MainTopic] #[RelatedKeyword] #TheDarkWorld #Knowledge #Facts
```

### Shorts (9x16)
```
[Telugu hook question]? [English hook sentence with the main keyword].
👉 Full video: [link]   (if known; otherwise: Comment "[keyword]" for the full video link.)
ℹ️ Educational content only.[ Health line short: Not medical advice.][ AI line short: Some visuals are AI-generated.]
#shorts #[MainTopic] #TheDarkWorld
```
