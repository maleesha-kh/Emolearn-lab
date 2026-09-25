import { useState } from "react";
import type { EmotionDictionaryEntry } from "../../data/emotionDictionary";
import { playSound } from "../../lib/sounds";

type ClueTab = "face" | "body";

const TABS: { id: ClueTab; label: string }[] = [
  { id: "face", label: "👀 Face" },
  { id: "body", label: "🧍 Body" },
];

export function SpotTheClues({entry,soundOn}:{entry:EmotionDictionaryEntry;soundOn:boolean}){
  const {info}=entry;
  const [tab,setTab]=useState<ClueTab>("face");
  const [ticked,setTicked]=useState<Record<string,boolean>>({});
  const clues=tab==="face"?entry.faceClues:entry.bodyClues;

  function tick(key:string){
    if(ticked[key])return;
    playSound("chime",soundOn);
    setTicked(t=>({...t,[key]:true}));
  }

  return(
    <div className="flex flex-col items-center">
      <div className="flex gap-3 mb-5" role="tablist">
        {TABS.map(t=>{
          const active=t.id===tab;
          return(
            <button key={t.id} role="tab" aria-selected={active} onClick={()=>setTab(t.id)}
              className="ff rounded-full px-6 transition-all active:scale-95"
              style={{minHeight:"56px",fontSize:"20px",cursor:"pointer",background:active?info.text:"white",
                color:active?"white":info.text,border:`3px solid ${active?info.text:info.border}`}}>
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-3 w-full" style={{maxWidth:"460px"}}>
        {clues.map((clue,i)=>{
          const key=`${tab}-${i}`;
          const done=!!ticked[key];
          return(
            <button key={key} onClick={()=>tick(key)} aria-pressed={done}
              className="fn font-bold rounded-2xl px-5 flex items-center justify-between gap-3 text-left transition-all active:scale-95"
              style={{minHeight:"64px",fontSize:"19px",cursor:done?"default":"pointer",color:done?"white":info.text,
                background:done?info.text:"white",border:`3px solid ${done?info.text:info.border}`,boxShadow:done?`0 6px 18px ${info.border}55`:"none"}}>
              <span>{clue}</span>
              <span className={done?"api":""} style={{fontSize:"26px"}}>{done?"✅":"⬜"}</span>
            </button>
          );
        })}
      </div>
      <p className="fn font-bold text-center mt-5" style={{fontSize:"17px",color:"#00838F"}}>🤖 Emo looks at the face AND the body, just like you!</p>
    </div>
  );
}
