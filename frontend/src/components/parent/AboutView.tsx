import type { ReactNode } from "react";
import { APP_VERSION } from "../../lib/version";

const PRIVACY = [
  "EmoLearn Lab saves your child's nickname and chosen picture, game results, mood check-ins, badges, Learn progress, diary entries (with Emo's replies and safety flags) and the questions they ask Emo.",
  "Everything is saved on this computer only. The browser also remembers who played last and whether sound is on.",
  "The app never sends your child's information to any outside service or company.",
  "No camera and no photos of your child are used.",
  "With the PIN, parents can read and delete diary entries and questions to Emo.",
  "Deleting a child's profile removes everything about them.",
  "The parent PIN and recovery code are stored in a scrambled (hashed) form.",
  "A safety check looks for worrying words in diary notes and questions to Emo, and flags them for the parent.",
  "\"Read to me\" uses your computer's built-in voices. Some browsers may use an online voice if no offline one is installed. It only ever reads the app's own fixed text, never anything your child types.",
];

const CREDITS = [
  "FERG-DB (Aneja et al., 2016)",
  "MobileNetV2",
  "MediaPipe Pose",
  "rembg (U²-Net) for background removal",
  "Character images created using an AI image generation tool",
  "Fonts: Fredoka One and Nunito (SIL Open Font License)",
];

function AboutCard({ title, wide, children }: { title: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={`rounded-2xl p-6 bg-white${wide ? " lg:col-span-2" : ""}`}
      style={{ border: "1.5px solid #E0E0E0", boxShadow: "0 4px 15px rgba(0,0,0,.05)" }}>
      <h2 className="fn font-bold mb-2" style={{ fontSize: "20px", color: "#212121" }}>{title}</h2>
      <div className="fn" style={{ fontSize: "15px", color: "#455A64", lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

export function AboutView() {
  return (
    <div className="grid gap-4 lg:grid-cols-2" style={{ maxWidth: "1100px" }}>
      <AboutCard title="About EmoLearn Lab">
        <p>A game that helps children learn to recognise emotions by teaching Emo, an AI friend.</p>
      </AboutCard>

      <AboutCard title="How Emo decides">
        <p>
          Emo looks at the character's face, and at their body too when it can see it clearly. The heatmap shows
          which parts of the face Emo looked at most.
        </p>
      </AboutCard>

      <AboutCard title="Your child's privacy" wide>
        <ul className="list-disc pl-5 space-y-1">
          {PRIVACY.map(p => <li key={p}>{p}</li>)}
        </ul>
      </AboutCard>

      <AboutCard title="How the diary and Ask Emo work">
        <p>
          All of Emo's replies and tips are pre-written. Small models built for this app only choose which one to
          show. Nothing is sent to any outside service.
        </p>
      </AboutCard>

      <AboutCard title="Please note">
        <p>
          EmoLearn Lab is a research prototype for learning. It is not a tool for assessing or diagnosing
          children. The safety check looks for certain words and can miss things, so it doesn't replace talking
          with your child.
        </p>
      </AboutCard>

      <AboutCard title="Project" wide>
        <p>Final-year project, BSc (Hons) Software Engineering, NSBM Green University.</p>
        <p>Developed by Hiruni M. Kooragodage.</p>
        <p className="mt-2" style={{ color: "#78909C" }}>Version {APP_VERSION}</p>
      </AboutCard>

      <AboutCard title="Credits" wide>
        <ul className="list-disc pl-5">
          {CREDITS.map(c => <li key={c}>{c}</li>)}
        </ul>
      </AboutCard>
    </div>
  );
}
