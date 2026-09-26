import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { EmotionInfo, Mood } from "../../types";
import { EMOTION_DICTIONARY } from "../../data/emotionDictionary";
import { Btn } from "../common/UI";
import { playSound } from "../../lib/sounds";
import { MeetTheFeeling } from "./MeetTheFeeling";
import { SpotTheClues, clueKey } from "./SpotTheClues";
import { FactFlipCard } from "./FactFlipCard";

function Section({title,color,border,children}:{title:string;color:string;border:string;children:ReactNode}){
  return(
    <section className="asu rounded-3xl bg-white p-5 sm:p-7 w-full" style={{border:`3px solid ${border}`,boxShadow:`0 8px 30px ${border}22`}}>
      <h2 className="ff text-center mb-5" style={{fontSize:"clamp(24px,5vw,30px)",color}}>{title}</h2>
      {children}
    </section>
  );
}

function ProgressHint({steps,info}:{steps:{label:string;done:boolean}[];info:EmotionInfo}){
  const doneCount=steps.filter(s=>s.done).length;
  const allDone=doneCount===steps.length;
  return(
    <div className="w-full rounded-2xl bg-white px-4 py-3 flex flex-col items-center gap-2" aria-live="polite"
      style={{border:`3px solid ${info.border}`}}>
      <div className="ff" style={{fontSize:"20px",color:info.text}}>
        {allDone?`🌟 All ${steps.length} things done!`:`⭐ ${doneCount} of ${steps.length} things done`}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {steps.map(s=>(
          <span key={s.label} className="fn font-bold rounded-full px-3 py-1"
            style={{fontSize:"14px",background:s.done?info.text:info.bg,color:s.done?"white":info.text,border:`2px solid ${s.done?info.text:info.border}`}}>
            {s.done?"✓ ":""}{s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function EmotionPage({emotion,soundOn,onBack,onPractice,onExplored}:{emotion:Mood;soundOn:boolean;onBack:()=>void;onPractice:()=>void;onExplored:()=>void}){
  const entry=EMOTION_DICTIONARY[emotion];
  const {info}=entry;
  const [ticked,setTicked]=useState<Record<string,boolean>>({});
  const [flipped,setFlipped]=useState<Record<number,boolean>>({});
  const [tried,setTried]=useState<Record<number,boolean>>({});
  const reportedRef=useRef(false);

  const steps=[
    {label:"👀 Face clues",done:entry.faceClues.every((_,i)=>ticked[clueKey("face",i)])},
    {label:"🧍 Body clues",done:entry.bodyClues.every((_,i)=>ticked[clueKey("body",i)])},
    {label:"💡 Both facts",done:entry.didYouKnow.every((_,i)=>flipped[i])},
    {label:"🙌 Try an action",done:Object.keys(tried).length>0},
  ];
  const explored=steps.every(s=>s.done);

  useEffect(()=>{
    if(explored&&!reportedRef.current){
      reportedRef.current=true;
      onExplored();
    }
  },[explored,onExplored]);

  function tryAction(i:number){
    if(tried[i])return;
    playSound("pop",soundOn);
    setTried(t=>({...t,[i]:true}));
  }

  return(
    <div className="flex flex-col items-center gap-6 w-full" style={{maxWidth:"720px"}}>
      <button onClick={onBack}
        className="self-start ff rounded-full px-6 bg-white transition-all hover:brightness-95 active:scale-95"
        style={{minHeight:"56px",fontSize:"20px",color:info.text,border:`3px solid ${info.border}`,cursor:"pointer"}}>
        ← All feelings
      </button>

      <ProgressHint steps={steps} info={info}/>

      <Section title="Meet the feeling" color={info.text} border={info.border}>
        <MeetTheFeeling entry={entry} soundOn={soundOn}/>
      </Section>

      <Section title="Spot the clues 🔍" color={info.text} border={info.border}>
        <SpotTheClues entry={entry} soundOn={soundOn} ticked={ticked} onTick={key=>setTicked(t=>({...t,[key]:true}))}/>
      </Section>

      <Section title="Did you know?" color={info.text} border={info.border}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {entry.didYouKnow.map((fact,i)=>(
            <FactFlipCard key={fact} fact={fact} info={info} onFlip={()=>setFlipped(f=>({...f,[i]:true}))}/>
          ))}
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
        <p className="fn font-bold text-center -mt-3 mb-4" style={{fontSize:"16px",color:"#546E7A"}}>Tap a card when you try it!</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {entry.actions.map((action,i)=>{
            const done=!!tried[i];
            return(
              <button key={action.text} onClick={()=>tryAction(i)} aria-pressed={done}
                className="rounded-2xl p-4 flex sm:flex-col items-center gap-4 sm:gap-2 text-left sm:text-center transition-all active:scale-95"
                style={{background:info.bg,border:`3px solid ${done?info.text:info.border}`,cursor:done?"default":"pointer",
                  boxShadow:done?`0 6px 18px ${info.border}55`:"none"}}>
                <div className="flex items-center justify-center flex-shrink-0" style={{width:"96px",height:"120px"}}>
                  {action.image
                    ?<img src={action.image} alt="" draggable={false} style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/>
                    :<span style={{fontSize:"60px"}}>{action.emoji}</span>}
                </div>
                <div className="flex flex-col gap-2 sm:items-center">
                  <p className="fn font-bold" style={{fontSize:"18px",color:"#37474F",lineHeight:1.35}}>
                    {action.image&&<span className="mr-1">{action.emoji}</span>}{action.text}
                  </p>
                  {done&&(
                    <span className="api fn font-bold rounded-full px-3 py-1 self-start sm:self-center"
                      style={{fontSize:"14px",background:info.text,color:"white"}}>✓ I tried it!</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <div className="w-full" style={{maxWidth:"460px"}}>
        <Btn ch="Practice this feeling ▶" onClick={onPractice} color={info.text}/>
      </div>
    </div>
  );
}
