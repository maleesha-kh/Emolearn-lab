import type { ReactNode } from "react";
import type { Mood } from "../../types";
import { EMOTION_DICTIONARY } from "../../data/emotionDictionary";
import { Btn } from "../common/UI";
import { MeetTheFeeling } from "./MeetTheFeeling";
import { SpotTheClues } from "./SpotTheClues";
import { FactFlipCard } from "./FactFlipCard";

function Section({title,color,border,children}:{title:string;color:string;border:string;children:ReactNode}){
  return(
    <section className="asu rounded-3xl bg-white p-5 sm:p-7 w-full" style={{border:`3px solid ${border}`,boxShadow:`0 8px 30px ${border}22`}}>
      <h2 className="ff text-center mb-5" style={{fontSize:"clamp(24px,5vw,30px)",color}}>{title}</h2>
      {children}
    </section>
  );
}

export function EmotionPage({emotion,soundOn,onBack,onPractice}:{emotion:Mood;soundOn:boolean;onBack:()=>void;onPractice:()=>void}){
  const entry=EMOTION_DICTIONARY[emotion];
  const {info}=entry;

  return(
    <div className="flex flex-col items-center gap-6 w-full" style={{maxWidth:"720px"}}>
      <button onClick={onBack}
        className="self-start ff rounded-full px-6 bg-white transition-all hover:brightness-95 active:scale-95"
        style={{minHeight:"56px",fontSize:"20px",color:info.text,border:`3px solid ${info.border}`,cursor:"pointer"}}>
        ← All feelings
      </button>

      <Section title="Meet the feeling" color={info.text} border={info.border}>
        <MeetTheFeeling entry={entry} soundOn={soundOn}/>
      </Section>

      <Section title="Spot the clues 🔍" color={info.text} border={info.border}>
        <SpotTheClues entry={entry} soundOn={soundOn}/>
      </Section>

      <Section title="Did you know?" color={info.text} border={info.border}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {entry.didYouKnow.map(fact=><FactFlipCard key={fact} fact={fact} info={info}/>)}
        </div>
      </Section>

      <Section title="When might I feel this?" color={info.text} border={info.border}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {entry.whenMightIFeel.map(situation=>(
            <div key={situation} className="rounded-2xl p-4 flex flex-col items-center justify-center text-center fn font-bold"
              style={{background:info.bg,border:`2.5px solid ${info.border}`,minHeight:"110px",fontSize:"18px",color:info.text}}>
              <span style={{fontSize:"30px"}}>💭</span>
              {situation}
            </div>
          ))}
        </div>
      </Section>

      <Section title="What can I do?" color={info.text} border={info.border}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {entry.actions.map(action=>(
            <div key={action.text} className="rounded-2xl p-4 flex sm:flex-col items-center gap-4 sm:gap-2 sm:text-center"
              style={{background:info.bg,border:`2.5px solid ${info.border}`}}>
              <div className="flex items-center justify-center flex-shrink-0" style={{width:"96px",height:"120px"}}>
                {action.image
                  ?<img src={action.image} alt="" draggable={false} style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/>
                  :<span style={{fontSize:"60px"}}>{action.emoji}</span>}
              </div>
              <p className="fn font-bold" style={{fontSize:"18px",color:"#37474F",lineHeight:1.35}}>
                {action.image&&<span className="mr-1">{action.emoji}</span>}{action.text}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <div className="w-full" style={{maxWidth:"460px"}}>
        <Btn ch="Practice this feeling ▶" onClick={onPractice} color={info.text}/>
      </div>
    </div>
  );
}
