# The Dark World: upload rules (titles, descriptions, tags, products, captions)

Only for The Dark World projects (Health Decode has its own: `docs/HEALTHDECODE_UPLOAD.md`).
Process and file shape: `docs/UPLOAD_METADATA.md`. Approved example: Aging_150 (2026-11-17).
Sheet only, never posted to the channel by Claude.

## Rules
- Title (16x9): main keyword first, Telugu + English mix (how people search), 60-70 chars, curiosity without false
  claims. Shorts title: short hook + `#shorts`.
- Description: the templates below (long and Shorts).
- Tags: 10-16, English + Telugu + Tenglish, under 500 chars, ending with "The Dark World".
- Products: safe, topic-related things (books on the topic, gadgets, devices). Never medicines or supplements.
- Facebook: 2-3 line hook + one question for comments + 3 hashtags.
- Instagram: hook, 3 short lines, Save / Share CTA, 8-10 hashtags incl. #thedarkworld.
- Advertiser-friendly: facts, not rumours; company results stated as their own announcements; no defamation, no
  graphic or fear words in titles. Health-related topics: the "not medical advice" line in the disclaimer.
- Realistic AI images: the AI-visuals line, and remind the user to tick YouTube's "Altered or synthetic content".

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
