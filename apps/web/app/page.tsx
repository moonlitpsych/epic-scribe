'use client';

import { useState, useRef, useEffect } from "react";

/* ───────────────────────── TRANSCRIPT ───────────────────────── */
const TRANSCRIPT = `[00:00:12] DR: Good morning. Come on in, have a seat. I'm Dr. Chen. Thanks for coming in today.

[00:00:18] PT: Thanks. Yeah, my therapist said I should see a psychiatrist, so... here I am.

[00:00:25] DR: I'm glad you followed up on that. Can you tell me what's been going on?

[00:00:30] PT: Honestly it's been kind of a rough year. I guess the main thing is I just feel really flat. Like nothing really makes me happy anymore. I used to love painting — I'm an art teacher at a middle school — and now I can't even look at a canvas without feeling exhausted.

[00:00:52] DR: When did you first notice that shift?

[00:00:55] PT: Probably around last September. My mom was diagnosed with early-onset Alzheimer's, and I think that's when everything started unraveling. I was the one coordinating all her care, going to appointments, fighting with insurance. My sister lives in Portland so it's basically all on me.

[00:01:18] DR: That's a tremendous amount to carry. How has your sleep been through all of this?

[00:01:23] PT: Terrible. I fall asleep okay but I wake up at like 3 AM every night and just lie there with my mind racing. Thinking about my mom, thinking about work, thinking about whether I'm a bad daughter for feeling resentful about the whole situation. I'm getting maybe four or five hours on a good night.

[00:01:45] DR: And your appetite?

[00:01:47] PT: Down. I've lost maybe fifteen pounds since October without trying. My pants don't fit anymore. I just don't feel hungry, and when I do eat it's like... cereal at 10 PM because I forgot to have dinner.

[00:02:02] DR: What about your energy level during the day?

[00:02:05] PT: I'm exhausted. I can barely get through my classes. I used to stay after school to help kids with their art projects and now I leave the second the bell rings. My principal actually asked me if everything was okay, which was mortifying.

[00:02:22] DR: Have you noticed any trouble with concentration or making decisions?

[00:02:26] PT: Yes, definitely. I can't focus on lesson planning. I'll sit there staring at my laptop for an hour and get nothing done. Even choosing what to wear in the morning feels overwhelming. My partner has started picking out my clothes which is sweet but also kind of concerning, you know?

[00:02:47] DR: You mentioned a partner. Can you tell me about your support system?

[00:02:51] PT: Yeah, I've been with my partner Jamie for six years. They're really supportive, honestly. They're the one who pushed me to see a therapist after I had a really bad night in January where I just couldn't stop crying. Jamie is great but I can tell they're worried and I feel guilty about being such a burden.

[00:03:14] DR: I want to ask about that bad night in January. Can you tell me more about what happened?

[00:03:19] PT: I had been at my mom's memory care facility and she didn't recognize me. Like, at all. She asked who I was. And I drove home and I just broke down. I was crying for hours. And I had this thought like, what's even the point? Like, everything I'm doing, all the caregiving, she doesn't even know who I am. What's the point of any of it?

[00:03:47] DR: When you were having that thought — what's the point — were you thinking about harming yourself or ending your life?

[00:03:54] PT: I... kind of. Not like a plan or anything. But I did think, for a few minutes, that everyone would be better off without me. That Jamie could find someone who isn't broken. That my mom wouldn't even notice I was gone. It passed pretty quickly, maybe ten or fifteen minutes, and then Jamie came home and I told them about it. They were the one who called the therapist the next morning.

[00:04:22] DR: I'm really glad you told Jamie and that you're here now. Have you had thoughts like that before, either recently or in the past?

[00:04:29] PT: I had some similar thoughts in college, like twenty years ago. I was going through a bad breakup and I remember thinking about it. But I never did anything. And since January, I've had maybe two or three fleeting moments where I thought about it, but nothing where I made a plan or anything.

[00:04:50] DR: Have you ever made a suicide attempt?

[00:04:53] PT: No, never.

[00:04:55] DR: Do you have access to any firearms at home?

[00:04:57] PT: No, neither of us are gun people.

[00:05:01] DR: Okay. And how about alcohol or any substances — has your use changed at all during this time?

[00:05:07] PT: I've been drinking more than I used to, honestly. I used to have maybe a glass of wine on weekends. Now it's two or three glasses most nights. It helps me fall asleep. I know that's not great.

[00:05:22] DR: Thank you for being honest about that. Any cannabis or other substances?

[00:05:26] PT: I take a CBD gummy sometimes for anxiety. No THC, nothing else.

[00:05:32] DR: Have you ever seen a psychiatrist before or been on any psychiatric medications?

[00:05:37] PT: No, this is my first time. My therapist mentioned she thought an SSRI might help but wanted me to talk to an actual psychiatrist first.

[00:05:46] DR: And your therapist — what kind of therapy are you doing?

[00:05:49] PT: CBT, I think? We've been meeting weekly since February. It helps to talk about it but honestly my mood hasn't really budged.

[00:05:59] DR: Any medical conditions I should know about?

[00:06:02] PT: Hypothyroidism. I've been on levothyroxine for about eight years. Last TSH was normal, my PCP checked it in November. And I get migraines, maybe once a month, I take sumatriptan for those.

[00:06:17] DR: Any family history of mental health conditions?

[00:06:20] PT: My dad was on Prozac for years, I think for depression. My maternal grandmother, the one before my mom, she had some kind of breakdown in her fifties — I think it was depression too but nobody really talked about it back then.

[00:06:38] DR: Okay. Let me do a brief mental status assessment.

[00:06:42] OBSERVATION: Patient is a 42-year-old female who appears stated age, casually dressed in jeans and a cardigan. She is cooperative but appears fatigued, with psychomotor slowing noted. Speech is soft, slightly slowed but coherent. She describes her mood as "flat" and "exhausted." Affect is constricted, tearful at times particularly when discussing her mother. Thought process is linear and goal-directed. Thought content notable for passive suicidal ideation in recent past, no current SI, no HI, no psychotic symptoms. She is oriented to all spheres, attention and concentration appear mildly impaired based on her report. Insight is good — she recognizes the need for help. Judgment is intact.

[00:08:15] DR: Based on everything we've discussed, I think what you're experiencing is a major depressive episode, and it makes a lot of clinical sense given what you've been going through with your mother. I'd like to talk about starting an antidepressant — specifically sertraline, which is an SSRI. I'd want to start at 50 milligrams daily and we'd plan to increase if needed. I also think we should talk about the alcohol use because that's likely making your sleep and mood worse.

[00:08:45] PT: I figured you'd say that about the drinking. Yeah, I need to cut back. Do you think the medication will help with the sleep too?

[00:08:52] DR: It can, though sometimes SSRIs can initially cause some sleep disruption. If sleep remains a major issue after a few weeks, we can address it directly. For now, I'd recommend some sleep hygiene strategies and I'll send you a handout.

[00:09:08] DR: I want to see you back in three weeks to check how you're doing on the medication. And I want to be clear — if those dark thoughts come back, or if you feel like you're in crisis, please go to the emergency department or call 988. Can we agree on that?

[00:09:22] PT: Yes, absolutely. Jamie knows about all of this too, so they'd make sure I went.

[00:09:28] DR: Good. I'm glad you have that support. I also want to validate something — feeling resentful about the caregiving burden doesn't make you a bad daughter. It makes you human. That's something worth exploring with your therapist too.

[00:09:42] PT: Thank you. That actually means a lot to hear.

[00:09:47] DR: Of course. Let's get that sertraline started and I'll see you in three weeks.`;

/* ───────────────────────── PROMPTS ───────────────────────── */
const GENERIC_SYSTEM_PROMPT = `You are an AI medical scribe. Generate a clinical note from the following patient encounter transcript. Use standard H&P format with the following sections: Chief Complaint, History of Present Illness, Past Medical History, Past Psychiatric History, Medications, Social History, Family History, Review of Systems, Mental Status Examination, Assessment, and Plan. Be concise and professional. Output the note only, no commentary.`;

const STRONG_SYSTEM_PROMPT = `You are a HIPAA-compliant clinical documentation assistant specialized in psychiatry. Generate an Epic-ready psychiatry note from the following transcript for Dr. Chen. Follow these precise instructions:

PATIENT DEMOGRAPHICS: The patient is a 42-year-old female.

SECTIONS (in this exact order):

1. CHIEF COMPLAINT: Brief, 1-2 sentences.

2. HISTORY OF PRESENT ILLNESS (HPI): Generate a comprehensive, detailed narrative. Include temporal course, specific symptoms with patient's own descriptions when available, severity and impact on functioning (work, relationships, ADLs), precipitating factors, what makes symptoms better/worse. Include relevant quotes from the patient. Do NOT over-condense. Aim for 2-3 detailed paragraphs.

3. PAST PSYCHIATRIC HISTORY:
SAFETY CRITICAL — ONLY document what is EXPLICITLY stated in the transcript. NEVER infer hospitalizations or suicide attempts. If not discussed, write "Not discussed."
- Previous diagnoses
- Previous medications
- Previous therapy
- Hospitalizations
- Suicide attempts
- Self-harm

4. PSYCHIATRIC REVIEW OF SYMPTOMS: Cover depression, mania, psychosis, anxiety, OCD, trauma, eating disorders, ADHD, substance use. Use "Positive for..." or "Denies..." format.

5. SOCIAL HISTORY: Cover relationships, living situation, employment, support system.

6. SUBSTANCE USE HISTORY: Detail each substance with frequency, amount, duration, changes.

7. FAMILY PSYCHIATRIC HISTORY: Include relation, condition, and treatment if known.

8. MEDICAL HISTORY & CURRENT MEDICATIONS: List conditions and all current medications with doses.

9. MENTAL STATUS EXAMINATION: Appearance, behavior, speech, mood (patient's words in quotes), affect, thought process, thought content, perception, cognition, insight, judgment. Be objective and descriptive.

10. RISK ASSESSMENT (REQUIRED — this is a critical section):
Risk factors: [list specific risk factors from transcript]
Protective factors: [list specific protective factors from transcript]

[Then a narrative paragraph weighing risk vs protective factors, stating overall risk level, explaining why outpatient care is appropriate, and including instruction to present to ED or call 988 if worsening]

11. FORMULATION — Generate EXACTLY 4 paragraphs:
Paragraph 1 (ONE SENTENCE): "[Name] is a [age]-year-old [gender] with history of [conditions] who presents for [reason]."
Paragraph 2: Diagnosis with DSM-5-TR criteria met, then biopsychosocial formulation addressing ALL THREE domains: biological, psychological, and social.
Paragraph 3: Differential diagnosis with specific reasoning for/against each alternative.
Paragraph 4: Brief bridge to plan ending with colon (:)

12. DIAGNOSES: List with ICD-10 codes, primary first.

13. PLAN — Use these EXACT 5 subsections:
Medications: "[Action] [medication] [dose] [frequency] for [indication]" format
Referral to Psychotherapy: State continuing/new referral with details
Therapy: Document therapy YOU provided today with themes, techniques, and duration
Follow-up: "Return in [timeframe] for [purpose], or sooner if needed"
Signature: Dr. Chen

14. LISTENING CODER — Suggested CPT Codes (append AFTER signature):
---
Analyze the encounter and suggest:
- Primary E/M code with reasoning (99205 for new patient high complexity, 99204 for moderate)
- Psychotherapy add-on if therapy was provided (+90833: 16-37 min, +90836: 38-52 min)
- Total encounter time from transcript timestamps
Keep reasoning concise, 1-2 sentences per code.

FORMAT: Use paragraphs, NOT bullet points (except in medication list). Maintain clinical prose. Do not invent data not in transcript. Output the complete note only, no meta-commentary.`;

/* ───────────────────────── STREAMING TEXT ───────────────────────── */
function StreamingText({ text, isComplete, speed = 8 }: { text: string; isComplete: boolean; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [charIndex, setCharIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!text) return;
    if (charIndex < text.length) {
      intervalRef.current = setTimeout(() => {
        const chunkSize = Math.floor(Math.random() * 3) + speed;
        setDisplayed(text.slice(0, charIndex + chunkSize));
        setCharIndex((prev) => Math.min(prev + chunkSize, text.length));
      }, 16);
    }
    return () => { if (intervalRef.current) clearTimeout(intervalRef.current); };
  }, [text, charIndex, speed]);

  useEffect(() => {
    setDisplayed("");
    setCharIndex(0);
  }, [text]);

  return (
    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
      {displayed || text}
      {!isComplete && displayed.length < (text?.length || 0) && (
        <span style={{
          display: "inline-block", width: 2, height: "1em",
          background: "#10b981", marginLeft: 2,
          animation: "blink .8s step-end infinite",
          verticalAlign: "text-bottom",
        }} />
      )}
    </div>
  );
}

/* ───────────────────────── SECTION COMPONENT ───────────────────────── */
function Section({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <section id={id} style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "100px 24px",
      maxWidth: 960,
      margin: "0 auto",
    }}>
      {children}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 11,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: "#10b981",
      marginBottom: 20,
      opacity: 0.8,
    }}>
      {children}
    </div>
  );
}

function SectionHeadline({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: "clamp(28px, 4vw, 48px)",
      fontWeight: 600,
      color: "#f0f1f3",
      letterSpacing: "-0.03em",
      lineHeight: 1.15,
      marginBottom: 24,
    }}>
      {children}
    </h2>
  );
}

function SectionBody({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: "clamp(15px, 1.8vw, 18px)",
      lineHeight: 1.75,
      color: "#6a6d75",
      maxWidth: 640,
      fontWeight: 300,
    }}>
      {children}
    </p>
  );
}

/* ───────────────────────── TRIBUNE SAMPLE DATA ───────────────────────── */
const TRIBUNE_ARTICLES = [
  {
    category: "PRACTICE INDEPENDENCE",
    title: "What It Actually Costs to Start a Psychiatric Practice in 2026",
    subtitle: "Real numbers from a real practice. Not the sanitized version.",
    date: "March 2026",
    readTime: "8 min",
    featured: true,
  },
  {
    category: "CLINICAL EDGE",
    title: "I Started 7 Patients on Pramipexole for Anhedonia. Here\u2019s What Happened.",
    subtitle: "Practice-based evidence from the only kind of trial that matters \u2014 yours.",
    date: "March 2026",
    readTime: "12 min",
    featured: true,
  },
  {
    category: "TECHNOLOGY",
    title: "Why Every AI Scribe Writes Terrible Psych Notes",
    subtitle: "And what happens when you build one that doesn\u2019t.",
    date: "March 2026",
    readTime: "10 min",
    featured: true,
  },
];

const TRIBUNE_SATIRE = [
  {
    title: "Area Psychiatrist Discovers Prior Auth Reviewer Has Never Heard of Pramipexole",
    subtitle: "\u201cI had to spell it three times,\u201d reports increasingly despondent physician.",
  },
  {
    title: "BREAKING: Resident Finishes Notes Before 9 PM, Immediately Evaluated for Mania",
    subtitle: "Attending cites \u2018pressured charting\u2019 and \u2018grandiose documentation speed\u2019 as red flags.",
  },
  {
    title: "Hospital Unveils 47th Wellness Initiative While Cutting Staff by 15%",
    subtitle: "New mindfulness room to be located in recently closed nursing station.",
  },
  {
    title: 'Study Finds 100% of Psychiatrists Who Say "The Note Writes Itself" Are Lying',
    subtitle: "Researchers also confirm water is wet.",
  },
  {
    title: "New AI Scribe Generates Perfect Note; Physician Edits It for 20 Minutes Anyway Out of Guilt",
    subtitle: "\u201cIt felt too easy. I didn\u2019t suffer enough for this note to be good.\u201d",
  },
  {
    title: "Man Who Spent 14 Years Training to Be a Doctor Now Spends 3 Hours a Day Arguing with Insurance Companies",
    subtitle: "Medical school orientation strangely silent on hold music endurance training.",
  },
];

const MORE_ARTICLES = [
  { category: "PRACTICE INDEPENDENCE", title: "The 70/30 Split: What \u2018Fair\u2019 Actually Looks Like in a Psychiatry Group Practice", readTime: "6 min" },
  { category: "CLINICAL EDGE", title: "Why 90792 Is Costing You Money on Every Intake", readTime: "5 min" },
  { category: "TECHNOLOGY", title: "The Mental Status Exam Is Broken. Computer Vision Might Fix It.", readTime: "9 min" },
  { category: "PRACTICE INDEPENDENCE", title: "Credentialing Takes 120 Days. Here\u2019s How to Not Starve While You Wait.", readTime: "7 min" },
  { category: "CLINICAL EDGE", title: "The Case for Measurement-Based Psychiatry (and Why Almost Nobody Does It)", readTime: "11 min" },
  { category: "TECHNOLOGY", title: "What Happens When Your EHR Knows Your Payer\u2019s Fee Schedule", readTime: "6 min" },
];

/* ───────────────────────── TRIBUNE PAGE ───────────────────────── */
function TribunePage({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <>
      {/* TRIBUNE HERO */}
      <div style={{
        paddingTop: 120, paddingBottom: 80,
        paddingLeft: 24, paddingRight: 24,
        maxWidth: 900, margin: "0 auto",
      }}>
        {/* Masthead */}
        <div style={{ marginBottom: 56 }}>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(32px, 5vw, 56px)",
            fontWeight: 700, letterSpacing: "-0.035em",
            color: "#f0f1f3", lineHeight: 1.1,
            marginBottom: 16,
          }}>
            The Strong Work<br />
            <span style={{ color: "#10b981" }}>Tribune</span>
          </h1>
          <p style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13, color: "#4a4d55",
            letterSpacing: "0.03em", lineHeight: 1.6,
            maxWidth: 520,
          }}>
            Evidence-based. Emphasis on based.
          </p>
          <div style={{
            width: 40, height: 1,
            background: "#10b981", opacity: 0.4,
            marginTop: 28,
          }} />
        </div>

        {/* FEATURED ARTICLES */}
        <div style={{ marginBottom: 72 }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, letterSpacing: "0.15em",
            textTransform: "uppercase", color: "#10b981",
            marginBottom: 24, opacity: 0.8,
          }}>
            Featured
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "#1a1c22" }}>
            {TRIBUNE_ARTICLES.map((article, i) => (
              <div
                key={i}
                style={{
                  background: "#0d0e12",
                  padding: "28px 28px",
                  cursor: "pointer",
                  transition: "background .2s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#111217"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#0d0e12"; }}
              >
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: "#10b981",
                  marginBottom: 10, opacity: 0.7,
                }}>
                  {article.category}
                </div>
                <h3 style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "clamp(18px, 2.5vw, 24px)",
                  fontWeight: 600, color: "#e2e4e9",
                  letterSpacing: "-0.02em", lineHeight: 1.3,
                  marginBottom: 8,
                }}>
                  {article.title}
                </h3>
                <p style={{
                  fontSize: 14, color: "#5a5d65",
                  lineHeight: 1.5, marginBottom: 12,
                  fontWeight: 300,
                }}>
                  {article.subtitle}
                </p>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11, color: "#2e3038",
                }}>
                  {article.date} &middot; {article.readTime} read
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SATIRE SECTION */}
        <div style={{ marginBottom: 72 }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            marginBottom: 24,
          }}>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, letterSpacing: "0.15em",
              textTransform: "uppercase", color: "#10b981",
              opacity: 0.8,
            }}>
              Satire
            </div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, color: "#2e3038",
              letterSpacing: "0.06em",
            }}>
              Conditions are satirical. The frustration is real.
            </div>
          </div>

          <div style={{
            background: "#0d0e12",
            border: "1px solid #1a1c22",
            borderRadius: 2,
          }}>
            {TRIBUNE_SATIRE.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: "20px 24px",
                  borderBottom: i < TRIBUNE_SATIRE.length - 1 ? "1px solid #1a1c22" : "none",
                  cursor: "pointer",
                  transition: "background .2s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#111217"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >
                <h4 style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 16, fontWeight: 600,
                  color: "#c0c3ca", letterSpacing: "-0.01em",
                  lineHeight: 1.35, marginBottom: 6,
                }}>
                  {item.title}
                </h4>
                <p style={{
                  fontSize: 13, color: "#4a4d55",
                  fontStyle: "italic", lineHeight: 1.5,
                  fontWeight: 300,
                }}>
                  {item.subtitle}
                </p>
              </div>
            ))}
          </div>

          {/* Submit satire CTA */}
          <div style={{
            marginTop: 16, padding: "14px 20px",
            background: "#0d0e12",
            border: "1px dashed #1a1c22",
            borderRadius: 2,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12, color: "#3a3d45",
            }}>
              Got a headline? We accept submissions.
            </span>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, color: "#10b981",
              cursor: "pointer",
            }}>
              Submit &rarr;
            </span>
          </div>
        </div>

        {/* MORE ARTICLES */}
        <div style={{ marginBottom: 72 }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, letterSpacing: "0.15em",
            textTransform: "uppercase", color: "#10b981",
            marginBottom: 24, opacity: 0.8,
          }}>
            All Articles
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {MORE_ARTICLES.map((article, i) => (
              <div
                key={i}
                style={{
                  padding: "18px 0",
                  borderBottom: "1px solid #14151a",
                  cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "baseline",
                  transition: "padding-left .2s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.paddingLeft = "8px"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.paddingLeft = "0"; }}
              >
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10, letterSpacing: "0.1em",
                    textTransform: "uppercase", color: "#2e3038",
                    marginRight: 12,
                  }}>
                    {article.category}
                  </span>
                  <span style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 15, color: "#c0c3ca",
                    fontWeight: 500, letterSpacing: "-0.01em",
                  }}>
                    {article.title}
                  </span>
                </div>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11, color: "#2e3038",
                  marginLeft: 16, flexShrink: 0,
                }}>
                  {article.readTime}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* TRIBUNE ABOUT */}
        <div style={{
          padding: "36px 32px",
          background: "#0d0e12",
          border: "1px solid #1a1c22",
          borderRadius: 2,
          marginBottom: 72,
        }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, letterSpacing: "0.15em",
            textTransform: "uppercase", color: "#10b981",
            marginBottom: 16, opacity: 0.8,
          }}>
            About the Tribune
          </div>
          <p style={{
            fontSize: 15, color: "#6a6d75",
            lineHeight: 1.75, marginBottom: 16, fontWeight: 300,
          }}>
            The Strong Work Tribune is written for physicians who want to practice medicine on their own terms. It covers practice independence, clinical strategy, technology as leverage, and the occasional satirical observation about the absurdity of modern healthcare administration.
          </p>
          <p style={{
            fontSize: 15, color: "#6a6d75",
            lineHeight: 1.75, marginBottom: 20, fontWeight: 300,
          }}>
            Written by Rufus Sweeney, MD &mdash; a psychiatry resident building strong.work, a psychiatry-specific clinical intelligence platform. The opinions are his own. The satire is regrettably close to reality.
          </p>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <button
              onClick={() => { onNavigate("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              style={{
                background: "none", border: "1px solid #1e2028",
                color: "#10b981", padding: "10px 20px",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12, letterSpacing: "0.04em",
                cursor: "pointer", borderRadius: 2,
                transition: "all .2s",
              }}
              onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.borderColor = "#10b981"; (e.target as HTMLButtonElement).style.background = "rgba(16,185,129,.05)"; }}
              onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.borderColor = "#1e2028"; (e.target as HTMLButtonElement).style.background = "none"; }}
            >
              See the product &rarr;
            </button>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, color: "#2e3038",
            }}>
              strong.work
            </span>
          </div>
        </div>

        {/* NEWSLETTER SIGNUP */}
        <div style={{
          textAlign: "center",
          padding: "48px 0 24px",
        }}>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22, fontWeight: 600,
            color: "#e2e4e9", letterSpacing: "-0.02em",
            marginBottom: 8,
          }}>
            Get the Tribune in your inbox.
          </div>
          <p style={{
            fontSize: 14, color: "#4a4d55",
            marginBottom: 24, fontWeight: 300,
          }}>
            One serious article. One satirical headline. Every week.
          </p>
          <div style={{
            display: "flex", gap: 8,
            maxWidth: 400, margin: "0 auto",
          }}>
            <input
              type="email" placeholder="you@program.edu"
              style={{
                flex: 1,
                background: "#111217", border: "1px solid #1a1c22",
                color: "#c0c3ca", padding: "12px 16px", fontSize: 13,
                fontFamily: "'IBM Plex Sans', sans-serif",
                borderRadius: 2, outline: "none",
                transition: "border-color .2s",
              }}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "#10b981"; }}
              onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "#1a1c22"; }}
            />
            <button style={{
              background: "#10b981", border: "1px solid #10b981",
              color: "#0a0b0d", padding: "12px 20px", fontSize: 13,
              fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
              cursor: "pointer", borderRadius: 2,
              transition: "all .2s", flexShrink: 0,
            }}
              onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = "#0ea472"; }}
              onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = "#10b981"; }}
            >
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ───────────────────────── MAIN ───────────────────────── */
export default function StrongWork() {
  const [page, setPage] = useState("home");
  const [genericNote, setGenericNote] = useState("");
  const [strongNote, setStrongNote] = useState("");
  const [genericDone, setGenericDone] = useState(false);
  const [strongDone, setStrongDone] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [genericTime, setGenericTime] = useState<string | null>(null);
  const [strongTime, setStrongTime] = useState<string | null>(null);
  const genericStart = useRef<number | null>(null);
  const strongStart = useRef<number | null>(null);
  const notesRef = useRef<HTMLDivElement | null>(null);

  async function generateNote(
    systemPrompt: string,
    setNote: (n: string) => void,
    setDone: (d: boolean) => void,
    startRef: React.MutableRefObject<number | null>,
    setTime: (t: string) => void,
  ) {
    startRef.current = Date.now();
    try {
      const response = await fetch("/api/demo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, transcript: TRANSCRIPT }),
      });
      const data = await response.json();
      if (!response.ok) {
        setNote("Error: " + (data.error || "Failed to generate"));
      } else {
        setNote(data.text || "Error generating note.");
      }
      setTime(((Date.now() - startRef.current!) / 1000).toFixed(1));
    } catch (err: any) {
      setNote("Error: " + err.message);
    }
    setDone(true);
  }

  async function handleGenerate() {
    setIsGenerating(true);
    setGenericNote(""); setStrongNote("");
    setGenericDone(false); setStrongDone(false);
    setGenericTime(null); setStrongTime(null);
    setHasGenerated(true);
    setTimeout(() => notesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    await Promise.all([
      generateNote(GENERIC_SYSTEM_PROMPT, setGenericNote, setGenericDone, genericStart, setGenericTime),
      generateNote(STRONG_SYSTEM_PROMPT, setStrongNote, setStrongDone, strongStart, setStrongTime),
    ]);
    setIsGenerating(false);
  }

  return (
    <div style={{
      background: "#0a0b0d",
      color: "#e2e4e9",
      minHeight: "100vh",
      fontFamily: "'IBM Plex Sans', 'Helvetica Neue', sans-serif",
    }}>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glow { 0%,100% { box-shadow: 0 0 20px rgba(16,185,129,.12); } 50% { box-shadow: 0 0 40px rgba(16,185,129,.22); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e2028; border-radius: 3px; }
      `}</style>

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "20px 36px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "linear-gradient(to bottom, #0a0b0d 60%, transparent)",
        backdropFilter: "blur(12px)",
      }}>
        <div
          onClick={() => { setPage("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 500, fontSize: 16,
            letterSpacing: "0.06em", color: "#10b981",
            cursor: "pointer",
          }}
        >
          strong.work
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <button
            onClick={() => { setPage("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            style={{
              background: "none", border: "none",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase",
              color: page === "home" ? "#10b981" : "#3a3d45",
              cursor: "pointer", padding: 0,
              transition: "color .2s",
            }}
            onMouseEnter={(e) => { if (page !== "home") (e.target as HTMLButtonElement).style.color = "#6a6d75"; }}
            onMouseLeave={(e) => { if (page !== "home") (e.target as HTMLButtonElement).style.color = "#3a3d45"; }}
          >
            Product
          </button>
          <button
            onClick={() => { setPage("tribune"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            style={{
              background: "none", border: "none",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase",
              color: page === "tribune" ? "#10b981" : "#3a3d45",
              cursor: "pointer", padding: 0,
              transition: "color .2s",
            }}
            onMouseEnter={(e) => { if (page !== "tribune") (e.target as HTMLButtonElement).style.color = "#6a6d75"; }}
            onMouseLeave={(e) => { if (page !== "tribune") (e.target as HTMLButtonElement).style.color = "#3a3d45"; }}
          >
            Tribune
          </button>
          <a
            href="/flow"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase",
              color: "#3a3d45",
              cursor: "pointer", padding: 0,
              transition: "color .2s",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => { (e.target as HTMLAnchorElement).style.color = "#10b981"; }}
            onMouseLeave={(e) => { (e.target as HTMLAnchorElement).style.color = "#3a3d45"; }}
          >
            Open App &rarr;
          </a>
        </div>
      </nav>

      {page === "tribune" ? <TribunePage onNavigate={setPage} /> : <>{/* PRODUCT PAGE START */}

      {/* HERO */}
      <div style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        textAlign: "center", padding: "40px 24px",
        position: "relative",
        background: "radial-gradient(ellipse at 50% 35%, rgba(16,185,129,.03) 0%, transparent 55%)",
      }}>
        <div style={{ maxWidth: 780, animation: "fadeUp .9s ease-out" }}>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(38px, 5.5vw, 68px)",
            fontWeight: 700, lineHeight: 1.08,
            letterSpacing: "-0.035em",
            marginBottom: 32, color: "#f0f1f3",
          }}>
            Every physician needs<br />
            <span style={{ color: "#10b981" }}>a skunk works.</span>
          </h1>
          <p style={{
            fontSize: "clamp(16px, 2vw, 20px)",
            lineHeight: 1.65, color: "#6a6d75",
            maxWidth: 520, margin: "0 auto 52px", fontWeight: 300,
          }}>
            Psychiatry-specific clinical intelligence.<br />
            Start with the note. End with the practice you actually want.
          </p>
          <button
            onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
            style={{
              background: "transparent",
              border: "1px solid #1e2028", color: "#10b981",
              padding: "14px 40px", fontSize: 14,
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 500, cursor: "pointer",
              letterSpacing: "0.04em", borderRadius: 2,
              transition: "all .3s ease",
            }}
            onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.borderColor = "#10b981"; (e.target as HTMLButtonElement).style.background = "rgba(16,185,129,.05)"; }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.borderColor = "#1e2028"; (e.target as HTMLButtonElement).style.background = "transparent"; }}
          >
            See the difference &darr;
          </button>
        </div>
        <div style={{
          position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)",
          width: 1, height: 48,
          background: "linear-gradient(to bottom, #1e2028, transparent)",
        }} />
      </div>

      {/* DEMO */}
      <div id="demo" style={{ maxWidth: 1320, margin: "0 auto", padding: "80px 24px 140px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <SectionLabel>Head to Head</SectionLabel>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(26px, 3.5vw, 44px)",
            fontWeight: 600, color: "#f0f1f3",
            letterSpacing: "-0.025em", marginBottom: 12,
          }}>
            Same transcript. Different note.
          </h2>
          <p style={{ color: "#5a5d65", fontSize: 16, fontWeight: 300 }}>
            One of these is ready to sign.
          </p>
        </div>

        {/* Transcript toggle */}
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            style={{
              background: "#111217", border: "1px solid #1a1c22",
              color: "#8a8d95", padding: "12px 20px", fontSize: 13,
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: "pointer", display: "flex", alignItems: "center",
              gap: 8, width: "100%", justifyContent: "space-between",
              borderRadius: 2, transition: "border-color .2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2d35"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#1a1c22"; }}
          >
            <span><span style={{ color: "#10b981", marginRight: 8 }}>&blacktriangleright;</span>Encounter Transcript &mdash; Psychiatric Intake, 42F, Depression</span>
            <span style={{ fontSize: 11, color: "#3a3d45" }}>{showTranscript ? "collapse" : "expand"} &middot; ~10 min</span>
          </button>
          {showTranscript && (
            <div style={{
              background: "#0d0e12", border: "1px solid #1a1c22", borderTop: "none",
              padding: "20px 24px", maxHeight: 380, overflow: "auto",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12, lineHeight: 1.8, color: "#5a5d65",
              whiteSpace: "pre-wrap",
            }}>
              {TRANSCRIPT}
            </div>
          )}
        </div>

        {/* Generate */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <button
            onClick={handleGenerate} disabled={isGenerating}
            style={{
              background: isGenerating ? "#111217" : "#10b981",
              border: isGenerating ? "1px solid #1e2028" : "1px solid #10b981",
              color: isGenerating ? "#4a4d55" : "#0a0b0d",
              padding: "16px 52px", fontSize: 15,
              fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
              cursor: isGenerating ? "not-allowed" : "pointer",
              letterSpacing: "0.03em", borderRadius: 2,
              transition: "all .3s", animation: isGenerating ? "none" : "glow 3s ease-in-out infinite",
            }}
            onMouseEnter={(e) => { if (!isGenerating) (e.target as HTMLButtonElement).style.background = "#0ea472"; }}
            onMouseLeave={(e) => { if (!isGenerating) (e.target as HTMLButtonElement).style.background = "#10b981"; }}
          >
            {isGenerating
              ? <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ animation: "pulse 1.4s ease-in-out infinite" }}>&bull;</span>Generating both notes&hellip;
                </span>
              : hasGenerated ? "Regenerate" : "Generate Notes"}
          </button>
          {!hasGenerated && (
            <div style={{ fontSize: 11, color: "#2a2d25", marginTop: 14, fontFamily: "'IBM Plex Mono', monospace" }}>
              same transcript &middot; two prompts &middot; you decide
            </div>
          )}
        </div>

        {/* Columns */}
        {hasGenerated && (
          <div ref={notesRef} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, animation: "fadeUp .5s ease-out" }}>
            {/* Generic */}
            <div style={{ background: "#0d0e12", border: "1px solid #1a1c22", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                padding: "14px 20px", borderBottom: "1px solid #1a1c22",
                display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f1014",
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#5a5d65" }}>Generic AI Scribe</div>
                  <div style={{ fontSize: 11, color: "#2e3038", fontFamily: "'IBM Plex Mono', monospace", marginTop: 3 }}>standard H&amp;P &middot; generic prompt</div>
                </div>
                {genericTime && <div style={{ fontSize: 11, color: "#2e3038", fontFamily: "'IBM Plex Mono', monospace" }}>{genericTime}s</div>}
              </div>
              <div style={{ padding: "20px 24px", maxHeight: 720, overflow: "auto", fontSize: 13, lineHeight: 1.7, color: "#5a5d65" }}>
                {genericNote
                  ? <StreamingText text={genericNote} isComplete={genericDone} speed={12} />
                  : <div style={{ color: "#1e2028", fontStyle: "italic" }}>Waiting&hellip;</div>}
              </div>
            </div>

            {/* strong.work */}
            <div style={{ background: "#0d0e12", border: "1px solid #10b98128", borderRadius: 2, overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, #10b98135, transparent)" }} />
              <div style={{
                padding: "14px 20px", borderBottom: "1px solid #10b98118",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "linear-gradient(135deg, #0f1014, #0d110f)",
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#10b981", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.03em" }}>strong.work</div>
                  <div style={{ fontSize: 11, color: "#3a5347", fontFamily: "'IBM Plex Mono', monospace", marginTop: 3 }}>psychiatry-tuned &middot; section-level architecture</div>
                </div>
                {strongTime && <div style={{ fontSize: 11, color: "#3a5347", fontFamily: "'IBM Plex Mono', monospace" }}>{strongTime}s</div>}
              </div>
              <div style={{ padding: "20px 24px", maxHeight: 720, overflow: "auto", fontSize: 13, lineHeight: 1.7, color: "#c0c3ca" }}>
                {strongNote
                  ? <StreamingText text={strongNote} isComplete={strongDone} speed={6} />
                  : <div style={{ color: "#1e2028", fontStyle: "italic" }}>Waiting&hellip;</div>}
              </div>
            </div>
          </div>
        )}

        {/* Post-gen CTA */}
        {genericDone && strongDone && (
          <div style={{ textAlign: "center", marginTop: 72, animation: "fadeUp .6s ease-out" }}>
            <div style={{ width: 40, height: 1, background: "#1a1c22", margin: "0 auto 28px" }} />
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 20,
              fontWeight: 500, color: "#e8e9ec", marginBottom: 10,
            }}>
              Notice the difference?
            </p>
            <p style={{
              fontSize: 14, color: "#4a4d55", maxWidth: 520,
              margin: "0 auto", lineHeight: 1.7, fontWeight: 300,
            }}>
              Risk assessment. Biopsychosocial formulation. DSM-5-TR criteria.
              Five-subsection plan. CPT code suggestions with clinical reasoning.
              That&apos;s what psychiatry-specific means.
            </p>
          </div>
        )}
      </div>

      {/* divider */}
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #1a1c22 30%, #1a1c22 70%, transparent)", margin: "0 auto", maxWidth: 1200 }} />

      {/* CLOSE THE LAPTOP */}
      <Section id="presence">
        <SectionLabel>01 &mdash; Presence</SectionLabel>
        <SectionHeadline>
          Close the laptop.<br />
          <span style={{ color: "#10b981" }}>We&apos;ve got the note.</span>
        </SectionHeadline>
        <SectionBody>
          You know the moment. Your patient is telling you something important and you&apos;re half-listening because you&apos;re typing. You hate it. They can tell.
        </SectionBody>
        <div style={{ height: 20 }} />
        <SectionBody>
          Be with your patient. Let the conversation breathe. When it&apos;s over, the note is already there &mdash; structured the way you structure it, with the clinical detail you would have caught if you weren&apos;t staring at a screen.
        </SectionBody>
      </Section>

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #1a1c22 30%, #1a1c22 70%, transparent)", margin: "0 auto", maxWidth: 1200 }} />

      {/* FINDING A FIVER */}
      <Section id="billing">
        <SectionLabel>02 &mdash; Listening Coder</SectionLabel>
        <SectionHeadline>
          Like finding money<br />
          <span style={{ color: "#10b981" }}>in your coat pocket.</span>
        </SectionHeadline>
        <SectionBody>
          That code you keep forgetting to bill? We don&apos;t forget. G2211 complexity add-on. After-hours 99051. The psychotherapy add-on you earned but didn&apos;t document properly. Every visit, every time.
        </SectionBody>
        <div style={{ height: 20 }} />
        <SectionBody>
          The Listening Coder suggests the highest-reimbursing clinically defensible code combination for every encounter &mdash; tuned to your payer, backed by your documentation, with the reasoning spelled out.
        </SectionBody>

        {/* Mini code card */}
        <div style={{
          marginTop: 40, padding: "24px 28px",
          background: "#0d0e12", border: "1px solid #1a1c22",
          borderRadius: 2, maxWidth: 520,
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5,
          lineHeight: 2, color: "#5a5d65",
        }}>
          <div style={{ color: "#10b981", marginBottom: 8, fontSize: 11, letterSpacing: "0.1em" }}>LISTENING CODER &mdash; SAMPLE OUTPUT</div>
          <div><span style={{ color: "#c0c3ca" }}>99205</span> &mdash; New patient, high complexity <span style={{ color: "#2a2d35" }}>&middot;</span> <span style={{ color: "#10b981" }}>$218.40</span></div>
          <div><span style={{ color: "#c0c3ca" }}>+90833</span> &mdash; Psychotherapy add-on, 22 min <span style={{ color: "#2a2d35" }}>&middot;</span> <span style={{ color: "#10b981" }}>$68.12</span></div>
          <div><span style={{ color: "#c0c3ca" }}>G2211</span> &mdash; Complexity add-on <span style={{ color: "#2a2d35" }}>&middot;</span> <span style={{ color: "#10b981" }}>$16.50</span></div>
          <div style={{ borderTop: "1px solid #1a1c22", marginTop: 12, paddingTop: 12, color: "#8a8d95" }}>
            Total recommended: <span style={{ color: "#10b981", fontWeight: 500 }}>$303.02</span>
          </div>
        </div>
      </Section>

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #1a1c22 30%, #1a1c22 70%, transparent)", margin: "0 auto", maxWidth: 1200 }} />

      {/* CHART BIOPSY */}
      <Section id="context">
        <SectionLabel>03 &mdash; Clinical Context</SectionLabel>
        <SectionHeadline>
          We&apos;ve already done<br />
          <span style={{ color: "#10b981" }}>the chart biopsy.</span>
        </SectionHeadline>
        <SectionBody>
          Your scribe didn&apos;t just skim the chart. It read the whole thing. Structured medications with doses, routes, and frequencies pulled from the patient&apos;s health records. Lab trends. Diagnosis history. Not a list of facts &mdash; a narrative your note can build on.
        </SectionBody>
        <div style={{ height: 20 }} />
        <SectionBody>
          When you walk into the room, you&apos;re already oriented. You know the sertraline went from 50 to 100mg eight weeks ago. You know the PHQ-9 dropped from 18 to 14 but plateaued. You know what to ask about first.
        </SectionBody>

        {/* Mini timeline */}
        <div style={{
          marginTop: 40, display: "flex", gap: 0, maxWidth: 560,
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
        }}>
          {[
            { date: "Sep 12", event: "Started sertraline 50mg", color: "#10b981" },
            { date: "Oct 24", event: "PHQ-9: 18 \u2192 14", color: "#f59e0b" },
            { date: "Nov 15", event: "Increased to 100mg", color: "#10b981" },
            { date: "Jan 8", event: "PHQ-9: 14 (plateau)", color: "#ef4444" },
          ].map((item, i) => (
            <div key={i} style={{ flex: 1, position: "relative", paddingTop: 20 }}>
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 2,
                background: i === 0 ? "transparent" : "#1a1c22",
              }} />
              <div style={{
                position: "absolute", top: -4, left: 0,
                width: 10, height: 10, borderRadius: "50%",
                background: item.color, opacity: 0.7,
              }} />
              <div style={{ color: "#3a3d45", marginBottom: 4 }}>{item.date}</div>
              <div style={{ color: "#6a6d75", lineHeight: 1.4, paddingRight: 8 }}>{item.event}</div>
            </div>
          ))}
        </div>
      </Section>

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #1a1c22 30%, #1a1c22 70%, transparent)", margin: "0 auto", maxWidth: 1200 }} />

      {/* MICRO-TRIALS */}
      <Section id="evidence">
        <SectionLabel>04 &mdash; Practice-Based Evidence</SectionLabel>
        <SectionHeadline>
          Your patients say nothing&apos;s changed.<br />
          <span style={{ color: "#10b981" }}>Your data says otherwise.</span>
        </SectionHeadline>
        <SectionBody>
          You started seven patients on pramipexole for anhedonia. You tagged the intervention. Over three months, the system tracked their anhedonia subscales automatically. The trend line goes down. You didn&apos;t run a trial. You just practiced medicine &mdash; and measured what happened.
        </SectionBody>
        <div style={{ height: 20 }} />
        <SectionBody>
          Show them the graph. That&apos;s not research. That&apos;s care.
        </SectionBody>

        {/* Mini chart */}
        <div style={{
          marginTop: 44, maxWidth: 480,
          padding: "28px 28px 20px",
          background: "#0d0e12", border: "1px solid #1a1c22",
          borderRadius: 2,
        }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, color: "#3a3d45",
            marginBottom: 16, letterSpacing: "0.06em",
          }}>
            ANHEDONIA SUBSCALE &middot; 7 PATIENTS &middot; PRAMIPEXOLE 0.5MG
          </div>
          <svg viewBox="0 0 400 120" style={{ width: "100%", display: "block" }}>
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map((i) => (
              <line key={i} x1="40" y1={10 + i * 25} x2="390" y2={10 + i * 25} stroke="#1a1c22" strokeWidth="1" />
            ))}
            {/* Y-axis labels */}
            <text x="32" y="14" fill="#2a2d35" fontSize="9" textAnchor="end" fontFamily="IBM Plex Mono">12</text>
            <text x="32" y="39" fill="#2a2d35" fontSize="9" textAnchor="end" fontFamily="IBM Plex Mono">9</text>
            <text x="32" y="64" fill="#2a2d35" fontSize="9" textAnchor="end" fontFamily="IBM Plex Mono">6</text>
            <text x="32" y="89" fill="#2a2d35" fontSize="9" textAnchor="end" fontFamily="IBM Plex Mono">3</text>
            <text x="32" y="114" fill="#2a2d35" fontSize="9" textAnchor="end" fontFamily="IBM Plex Mono">0</text>
            {/* X-axis labels */}
            <text x="40" y="118" fill="#2a2d35" fontSize="9" fontFamily="IBM Plex Mono">Wk 0</text>
            <text x="156" y="118" fill="#2a2d35" fontSize="9" fontFamily="IBM Plex Mono">Wk 4</text>
            <text x="273" y="118" fill="#2a2d35" fontSize="9" fontFamily="IBM Plex Mono">Wk 8</text>
            <text x="375" y="118" fill="#2a2d35" fontSize="9" fontFamily="IBM Plex Mono">Wk 12</text>
            {/* Gradient area */}
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d="M40,15 L98,22 L156,35 L215,48 L273,62 L332,72 L390,82 L390,110 L40,110 Z" fill="url(#areaGrad)" />
            {/* Line */}
            <path d="M40,15 L98,22 L156,35 L215,48 L273,62 L332,72 L390,82" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Dots */}
            {([[40,15],[98,22],[156,35],[215,48],[273,62],[332,72],[390,82]] as [number, number][]).map(([x,y], i) => (
              <circle key={i} cx={x} cy={y} r="3" fill="#0a0b0d" stroke="#10b981" strokeWidth="1.5" />
            ))}
          </svg>
        </div>
      </Section>

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #1a1c22 30%, #1a1c22 70%, transparent)", margin: "0 auto", maxWidth: 1200 }} />

      {/* PATIENTS FEEL IT */}
      <Section id="patients">
        <SectionLabel>05 &mdash; The Point</SectionLabel>
        <SectionHeadline>
          Your patients<br />
          <span style={{ color: "#10b981" }}>feel the difference.</span>
        </SectionHeadline>
        <SectionBody>
          When you&apos;re not typing, they notice. When you remember the details from last time, they feel cared for. When the follow-up is scheduled at the right interval, they don&apos;t fall through the cracks.
        </SectionBody>
        <div style={{ height: 20 }} />
        <SectionBody>
          Every other scribe promises to make you faster. We want to make you the doctor you imagined when you applied to medical school. Present. Curious. Actually listening.
        </SectionBody>
        <div style={{ height: 20 }} />
        <p style={{
          fontSize: "clamp(15px, 1.8vw, 18px)",
          lineHeight: 1.75, fontWeight: 300,
          color: "#4a4d55", fontStyle: "italic",
          maxWidth: 640,
        }}>
          Technology that remembers you became a doctor for a reason.
        </p>
      </Section>

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #1a1c22 30%, #1a1c22 70%, transparent)", margin: "0 auto", maxWidth: 1200 }} />

      {/* PRIVACY */}
      <Section id="trust">
        <SectionLabel>06 &mdash; Trust</SectionLabel>
        <SectionHeadline>
          An unhealthy obsession<br />
          <span style={{ color: "#10b981" }}>with privacy.</span>
        </SectionHeadline>
        <SectionBody>
          Your patients trust you with their stories. We take that as seriously as you do. Maybe more. We&apos;re a little intense about it.
        </SectionBody>
        <div style={{ height: 20 }} />
        <SectionBody>
          HIPAA-compliant. Encrypted in transit and at rest. No training on your data. No selling. No sharing. Your notes are yours. Your patients&apos; stories stay between you and them.
        </SectionBody>
      </Section>

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #1a1c22 30%, #1a1c22 70%, transparent)", margin: "0 auto", maxWidth: 1200 }} />

      {/* CTA */}
      <div style={{
        minHeight: "80vh", display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        textAlign: "center", padding: "100px 24px",
        background: "radial-gradient(ellipse at 50% 60%, rgba(16,185,129,.03) 0%, transparent 50%)",
      }}>
        <SectionLabel>Early Access</SectionLabel>
        <h2 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "clamp(26px, 3.5vw, 42px)",
          fontWeight: 600, color: "#f0f1f3",
          letterSpacing: "-0.025em", marginBottom: 16,
        }}>
          Built by a psychiatry resident<br />
          who got tired of waiting.
        </h2>
        <p style={{
          fontSize: 16, color: "#5a5d65", maxWidth: 480,
          margin: "0 auto 44px", lineHeight: 1.7, fontWeight: 300,
        }}>
          strong.work is entering early access for psychiatry residents and attendings. If you want documentation that thinks like you do &mdash; not a generic scribe with a medical dictionary &mdash; we&apos;d love to hear from you.
        </p>

        {/* Waitlist questions */}
        <div style={{
          maxWidth: 440, width: "100%",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <input
            type="email" placeholder="you@program.edu"
            style={{
              background: "#111217", border: "1px solid #1a1c22",
              color: "#c0c3ca", padding: "14px 18px", fontSize: 14,
              fontFamily: "'IBM Plex Sans', sans-serif",
              borderRadius: 2, outline: "none",
              transition: "border-color .2s",
            }}
            onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "#10b981"; }}
            onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "#1a1c22"; }}
          />
          <input
            type="text" placeholder="What program are you at?"
            style={{
              background: "#111217", border: "1px solid #1a1c22",
              color: "#c0c3ca", padding: "14px 18px", fontSize: 14,
              fontFamily: "'IBM Plex Sans', sans-serif",
              borderRadius: 2, outline: "none",
              transition: "border-color .2s",
            }}
            onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "#10b981"; }}
            onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "#1a1c22"; }}
          />
          <textarea
            placeholder="What&apos;s the one thing about your documentation workflow that makes you want to throw your laptop?"
            rows={3}
            style={{
              background: "#111217", border: "1px solid #1a1c22",
              color: "#c0c3ca", padding: "14px 18px", fontSize: 14,
              fontFamily: "'IBM Plex Sans', sans-serif",
              borderRadius: 2, outline: "none", resize: "vertical",
              transition: "border-color .2s", lineHeight: 1.5,
            }}
            onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "#10b981"; }}
            onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "#1a1c22"; }}
          />
          <button style={{
            background: "#10b981", border: "1px solid #10b981",
            color: "#0a0b0d", padding: "14px 20px", fontSize: 14,
            fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
            cursor: "pointer", letterSpacing: "0.03em",
            borderRadius: 2, transition: "all .3s",
            marginTop: 4,
          }}
            onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = "#0ea472"; }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = "#10b981"; }}
          >
            Request Early Access
          </button>
        </div>
      </div>

      </>}{/* PRODUCT PAGE END */}

      {/* FOOTER */}
      <div style={{
        borderTop: "1px solid #14151a",
        padding: "48px 24px", textAlign: "center",
      }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 14, color: "#10b981",
          letterSpacing: "0.05em", marginBottom: 12,
        }}>
          strong.work
        </div>
        <div style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 13, color: "#2a2d35", lineHeight: 1.6,
        }}>
          Psychiatry-specific clinical intelligence.<br />
          Built by a resident. For residents. For the physicians they become.
        </div>
      </div>
    </div>
  );
}
