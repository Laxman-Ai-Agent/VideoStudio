# Health Decode: upload rules (titles, descriptions, tags, products, captions)

Only for Health Decode projects (The Dark World has its own: `docs/DARKWORLD_UPLOAD.md`).
Process and file shape: `docs/UPLOAD_METADATA.md`. Sheet only, never posted to the channel by Claude.

## Rules
- Title (16x9): main health keyword first (symptoms / causes / care), Telugu + English mix, 60-70 chars, curiosity
  without fear or cure claims. Shorts title: short hook + `#shorts`.
- Description: the templates below (long and Shorts).
- Tags: 10-16, English + Telugu + Tenglish (e.g. "thyroid symptoms telugu"), under 500 chars, ending with "Health Decode".
- Products: safe health devices and aids only (glucometer, BP monitor, pulse oximeter, ORS packets, books).
  Never medicines, prescription drugs or supplements.
- Facebook: 2-3 line hook + one question for comments + 3 hashtags.
- Instagram: hook, 3 short lines, Save / Share CTA, 8-10 hashtags incl. #healthdecode.
- YouTube medical misinformation + advertiser-friendly rules: no cure claims ("100% cure"), no "stop your medicine",
  no home remedy promoted as a treatment, no fear words ("maranam", "danger") in titles; facts in line with
  WHO / ICMR / NIH; first ~150 characters = Telugu question + English question with the main keyword; keywords in
  natural sentences (no comma keyword lists); no markdown `#` / `###`; topic hashtags first; never invent a link or
  a source; (if known) lines are left out when the link is not known.
- "When to see a doctor" points come from the script, or standard warning signs from WHO / NHS for that topic.
- The Telugu disclaimer line and 108 (India emergency number) are always in the long description.
- Realistic AI images: the AI-visuals line, and remind the user to tick YouTube's "Altered or synthetic content".

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
ఈ వీడియో అవగాహన కోసం మాత్రమే, ఇది వైద్య సలహా కాదు. మందులు మొదలుపెట్టే / ఆపే ముందు మీ డాక్టర్‌ను సంప్రదించండి.
[AI-visuals line when it applies]

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
⚠️ Educational only, not medical advice. Consult your doctor. Emergency: 108.[ Some visuals are AI-generated.]
#shorts #[TopicKeyword] #HealthDecode
```
