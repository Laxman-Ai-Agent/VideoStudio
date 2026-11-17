# Health Decode: upload rules (titles, descriptions, tags, products, captions)

Only for Health Decode projects (The Dark World has its own: `docs/DARKWORLD_UPLOAD.md`).
Process and file shape: `docs/UPLOAD_METADATA.md`. Sheet only, never posted to the channel by Claude.

## Rules
- Title (16x9): the words Telugu viewers search with: "లక్షణాలు" (symptoms), "కారణాలు" (causes), "ఎలా
  తగ్గించుకోవాలి / control" (care), e.g. "థైరాయిడ్ లక్షణాలు & కారణాలు | Thyroid Symptoms in Telugu". Disease
  name + one of these words first, Telugu + English, 60-70 chars. Say "control / manage", never "cure"; no fear words.
  Shorts title: short hook + `#shorts`.
  Title rules (user, 2026-11-18), both formats:
  1. The main keyword inside the first 40 characters (mobile cuts the rest).
  2. A number or a specific fact when the video has one ("3 లక్షణాలు", "5 కారణాలు"), not vague words like "interesting facts".
  3. Curiosity (a question or a contrast, "...సాధ్యమా?", "అసలు నిజం") but only what the video really delivers:
     no clickbait, no false promise (YouTube misleading-metadata rules; viewers leave and reach drops).
  4. Telugu for the feeling, English for the search keyword; "in Telugu" at the end.
  5. Pairs with the thumbnail: never repeat the thumbnail text; thumbnail = the shock, title = the question.
  6. Clean: no ALL CAPS, no "!!!", at most one emoji (usually none); no fear words, no "cure".
  7. Shorts title: hook under 40 characters + " #shorts".
  8. Three options: `title_options` (3 titles, the first = `title`) in the 16x9 metadata.json -> sheet column S,
     for YouTube Studio "Test & Compare" or for the user to pick.
- Description: the templates below (long and Shorts).
- Tags: NO Telugu letters (user, 2026-11-18): English ("thyroid symptoms") + Tenglish / misspellings people type
  ("thyroid lakshanalu", "thairoid telugu"), 500 characters max as YouTube counts them (commas count, a tag with
  spaces counts 2 more), ending with "Health Decode".
  How to build them (both formats):
  1. Order: the exact main keyword from the title first, then its variations, broad words last (the first tags
     weigh most).
  2. Telugu words written in English letters, as people type them ("thyroid lakshanalu", "sugar vyadhi", "kidney rallu").
  3. The main keyword twice: "... telugu" and "... in telugu".
  4. 2-3 question tags people search ("what causes thyroid", "how to control sugar").
  5. Common misspellings people type: "thairoid", "diabetis", "epilapsy", "astma".
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
  5. Health Decode: devices and aids only, with "ISI certified" in the search name where such a standard
     exists (e.g. "pulse oximeter ISI certified"); books. Never medicines, prescription drugs, supplements,
     "Ayurvedic cure" products or diet pills.
  6. Names close to the Flipkart catalog wording, so YouTube Shopping (India) tagging finds them.
  7. Column T "Product Links" (`product_links`, one per line, same order): only links the user gives; never
     invent one. When links are there, the description gets the affiliate line (ASCI / YouTube rules):
     "Some links in this description may be affiliate links; we may earn a small commission at no extra cost to you."
  8. Anything the video itself names (a device, a book) comes first.
- Myths vs Facts: 2-3 common beliefs about the topic, each with the fact (from the script or WHO / ICMR / NIH).
- "Last reviewed: [Mon YYYY]" = the month of the final render.
- Sensitive topics (mental health, suicide, cancer, epilepsy / seizures, addiction): add the Tele-MANAS line (India
  government's free 24x7 mental health helpline, 14416 or 1-800-891-4416) next to 108.
- Facebook (user rules 2026-11-18): two captions. `facebook` = Reel caption (9x16 clip, sheet column P);
  `facebook_post` = long-video post caption (16x9, sheet column U). Both in the 16x9 metadata.json.
  1. The strongest line first, under ~80 characters (mobile shows 2-3 lines before "See more").
  2. Mostly Telugu (the Facebook audience reads Telugu), English only for key words.
  3. No link in the caption (Facebook cuts the reach of link posts): the video is uploaded to Facebook itself and
     the YouTube link goes in the first comment; the caption says "Full video link comments లో 👇".
  4. One question that is easy to answer ("Avunu / Kaadu", "1 leka 2").
  5. No engagement bait ("like cheyandi", "10 mandiki share"); a soft "useful అనిపిస్తే family తో share చేయండి" is fine.
  6. 2-3 short bullet lines with ✅ / ❌ / 👉 so the content is clear at a glance.
  7. 2-3 hashtags only: topic + channel (#HealthDecode).
  8. Always end with "ℹ️ సమాచారం కోసం మాత్రమే, doctor సలహా తీసుకోండి." (Facebook health policy).
  9. The Reel caption is short (hook, 3 bullets, question, link line, hashtags); the post caption tells a bit more
     (what the full video covers, its length) with the same rules. Written fresh for each video.
- Instagram (sheet column Q, `instagram` in the 16x9 file; user rules 2026-11-18):
  1. Hook in the first line, about 50 characters (Instagram cuts at ~125 with "more").
  2. English search keywords inside a natural sentence (Instagram search reads captions more than hashtags),
     e.g. "aging reverse science in Telugu".
  3. 3-5 hashtags only (Instagram's new limit is 5): 1 topic, 1-2 niche, 1 channel (#healthdecode).
  4. A "send to a friend who..." line (DM shares weigh most), Save CTA optional.
  5. No link (not clickable): "full video link bio లో 🔗", or "Comment <KEYWORD>, link DM చేస్తాం" (the user sends
     the DM by hand until an automation exists).
  6. Short paragraphs, one point per line, emojis as bullets that fit the point.
  7. The first line repeats the Reel's cover / first-frame hook in other words: one message in both places.
  8. Always end with "ℹ️ సమాచారం కోసం మాత్రమే, doctor సలహా తీసుకోండి." (Instagram health policy).
  9. Telugu for the feeling, a few more English keywords than Facebook (search).
- Thumbnail text (user rules 2026-11-18): `thumbnail_text` in the 16x9 metadata.json = 5 options -> column W;
  in the 9x16 file = 2 options (Shorts cover) -> column X. Each option:
  `{"main": "...", "sub": "...", "highlight": "<one word of main>", "visual": "<one-line image idea>"}`.
  1. main = line 1: 2-4 words, big Telugu letters, a number or a shock word; `highlight` = the one word to color.
  2. sub = line 2: 3-6 words, smaller, curiosity or an English keyword.
  3. Never repeats the title: title = the question, thumbnail = the shock or the contrast.
  4. Under 8 words in all, readable at a glance on a phone.
  5. The 5 options take different angles: number, emotion, science, mystery, contrast.
  6. No fear or graphic words or images (no blood, no wounds, no "maranam"), no "cure", no before/after body
     promises.
  7. `visual` = one line the user can turn into the image (subject, one prop, mood), clean light clinical look, glossy 3D organ / body detail.
- Pinned comment (user rules 2026-11-18): `pinned_comment` in the 16x9 metadata.json -> column R (long video);
  `pinned_comment` in the 9x16 metadata.json -> column V (Shorts).
  1. The question first, in Telugu (only the first 1-2 lines show).
  2. The same question the video asks at its end, so the comment continues the video.
  3. Easy to answer: Avunu / Kaadu, 1 / 2, or an emoji vote ("❤️ = అవును, 😮 = కాదు").
  4. One "Next ఏ topic కావాలి? Comments లో చెప్పండి" line (ideas for the next videos).
  5. Long video: one key-moment timestamp ("... 1:10 దగ్గర చూడండి"); timestamps in comments are clickable.
  6. Later changes go in as a "📌 Update: ..." line (the user edits the pinned comment on YouTube).
  7. Never ask viewers for personal medical details; sensitive topics add "మీ symptoms comments లో చెప్పకండి,
     doctor ని కలవండి". Ends with "⚠️ Educational only, not medical advice. Please consult your doctor."
     (+ "Tele-MANAS 14416" on sensitive topics).
  8. 3-4 lines, no links (spam filter), no subscribe link.
  9. Shorts pinned comment: the question + "Full video: Short పైన ఉన్న related video link నొక్కండి 🔗" (remind the
     user to set the Short's Related video in YouTube Studio) + the short disclaimer.
- YouTube medical misinformation + advertiser-friendly rules: no cure claims ("100% cure"), no "stop your medicine",
  no home remedy promoted as a treatment, no fear words ("maranam", "danger") in titles; facts in line with
  WHO / ICMR / NIH; first ~150 characters = Telugu question + English question with the main keyword; keywords in
  natural sentences (no comma keyword lists); no markdown `#` / `###`; topic hashtags first; never invent a link or
  a source; (if known) lines are left out when the link is not known.
- "When to see a doctor" points come from the script, or standard warning signs from WHO / NHS for that topic.
- The Telugu disclaimer line and 108 (India emergency number) are always in the long description.
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
Fill the [brackets]; keep the fixed lines.

### Long video (16x9)
```
[Telugu curiosity question]? [Same curiosity question in English, with the main health keyword]?
[One natural sentence with the main search keywords: what the condition is, its symptoms / causes / care] – explained simply.

In this video, we explore the science behind [TOPIC] through simple explanations, educational visuals, and cinematic storytelling.

🔬 WHAT YOU WILL LEARN
• [Important point 1]
• [Important point 2]
• [Important point 3]
• [Important point 4]

🚨 WHEN TO SEE A DOCTOR
• [Warning sign 1]
• [Warning sign 2]
• [Warning sign 3]

❌ MYTHS vs ✅ FACTS
❌ [Common belief 1] → ✅ [Fact 1]
❌ [Common belief 2] → ✅ [Fact 2]
[❌ belief 3 → ✅ fact 3, optional]

⏱️ CHAPTERS
0:00 [chapter]
[m:ss chapter ... from work/scenes.json; first 0:00, each >= 10 s, at least 3]

📚 SOURCES
[Only the sources the script really used (WHO, ICMR, NIH, journals), one line, separated by " · "]

🩺 ABOUT HEALTH DECODE
Welcome to Health Decode!
Health Decode explores the fascinating world of human health, medical science, diseases, symptoms, nutrition, human anatomy, and the science behind the human body.
Our mission is to make complex medical and scientific information easy to understand through educational storytelling, cinematic visuals, and research-based explanations.
From understanding how your organs function to exploring the science behind everyday health conditions, we bring you informative content that encourages scientific curiosity and health awareness.

⚠️ MEDICAL DISCLAIMER
This video is created for educational and informational purposes only. It is not intended to provide medical advice, diagnosis, or treatment.
The information presented is based on available scientific research and publicly accessible medical information. Medical knowledge and recommendations may change over time.
Always consult a qualified healthcare professional for personal medical concerns. Never ignore professional medical advice, delay medical treatment, or change prescribed medications based on information presented in this video.
Individual health conditions and medical needs may vary. This content does not guarantee any specific health outcome.
In a medical emergency, call 108 immediately.
[Sensitive topics only: Need someone to talk to? Call Tele-MANAS 14416 (free, 24x7, Government of India).]
ఈ వీడియో అవగాహన కోసం మాత్రమే, ఇది వైద్య సలహా కాదు. మందులు మొదలుపెట్టే / ఆపే ముందు మీ డాక్టర్‌ను సంప్రదించండి.
[AI-visuals line when it applies]
[Affiliate links only: Some links in this description may be affiliate links; we may earn a small commission at no extra cost to you.]
Last reviewed: [Mon YYYY]

📌 STAY CONNECTED
Subscribe to Health Decode for more educational videos about health, medical science, diseases, nutrition, and the mysteries of the human body.
🔔 Subscribe: [channel link]?sub_confirmation=1   (if known)
▶️ Watch next: [related video or playlist link]   (if known)

#[TopicKeyword] #HealthAwareness #HealthDecode #HealthScience #MedicalScience
```

### Shorts (9x16)
```
[Telugu hook question]? [English hook sentence with the main health keyword].
👉 Full video: [link]   (if known; otherwise: Comment "[keyword]" for the full video link.)
⚠️ Educational only, not medical advice. Consult your doctor. Emergency: 108.[ Tele-MANAS: 14416.][ Some visuals are AI-generated.]
#shorts #[TopicKeyword] #HealthDecode
```
