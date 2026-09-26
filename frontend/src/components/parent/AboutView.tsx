import type { ReactNode } from "react";
import { APP_VERSION } from "../../lib/version";

const CREDITS = [
  "FERG-DB (Aneja et al., 2016)",
  "MobileNetV2",
  "MediaPipe Pose",
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
          Emo looks at the character's face and body together. The heatmap shows which parts of the face Emo
          looked at most.
        </p>
      </AboutCard>

      <AboutCard title="Your child's privacy">
        <p>
          Only a nickname, a chosen picture, game results, diary entries (feelings, reasons and notes) and
          questions asked to Emo are saved, on this computer only. Diary entries and questions to Emo can only be
          seen by a parent, with the PIN, and parents can delete diary entries. No camera, no photos of your
          child, no internet connection and no email are used. The parent PIN and recovery code are stored in a
          scrambled (hashed) form.
        </p>
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
          children. The diary's safety check looks for certain words and can miss things, so it doesn't replace
          talking with your child.
        </p>
      </AboutCard>

      <AboutCard title="Project">
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
