import { useMemo } from "react";
import type { Mood } from "../../types";
import { DICTIONARY_ORDER, EMOTION_DICTIONARY } from "../../data/emotionDictionary";

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function FeelingPicker({onPick}:{onPick:(m:Mood)=>void}){
  const images=useMemo(()=>Object.fromEntries(
    DICTIONARY_ORDER.map(m=>[m,randomItem(EMOTION_DICTIONARY[m].characterImages)])
  ) as Record<Mood,string>,[]);

  return(
    <div className="flex flex-col items-center w-full">
      <h1 className="ff text-center mb-2" style={{fontSize:"clamp(28px,6vw,40px)",color:"#00838F"}}>Pick a feeling 📖</h1>
      <p className="fn font-bold text-center mb-6" style={{fontSize:"18px",color:"#546E7A"}}>Tap a card to learn all about it!</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full" style={{maxWidth:"880px"}}>
        {DICTIONARY_ORDER.map((m,i)=>{
          const e=EMOTION_DICTIONARY[m].info;
          return(
            <div key={m} className="api" style={{opacity:0,animationDelay:`${i*.12}s`}}>
              <button onClick={()=>onPick(m)} aria-label={`Learn about ${e.label}`}
                className="w-full rounded-3xl flex flex-col items-center justify-end pt-3 pb-4 px-2 transition-transform hover:scale-105 active:scale-95"
                style={{background:e.bg,border:`4px solid ${e.border}`,boxShadow:`0 8px 24px ${e.border}44`,minHeight:"220px",cursor:"pointer"}}>
                <span className="afb" style={{fontSize:"40px",animationDelay:`${i*.5}s`}}>{e.emoji}</span>
                <img src={images[m]} alt="" draggable={false}
                  style={{height:"130px",width:"auto",objectFit:"contain",margin:"4px 0 8px"}}/>
                <span className="ff" style={{fontSize:"24px",color:e.text}}>{e.label}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
