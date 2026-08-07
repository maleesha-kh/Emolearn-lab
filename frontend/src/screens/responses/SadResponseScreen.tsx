import { useState } from "react";
import { TopBar, Btn, BgDeco } from "../../components/common/UI";
import { EmoRobot } from "../../components/common/EmoRobot";
import { playSound } from "../../lib/sounds";

const STEPS = [
  { num: 1, text: "Take a deep breath... In... and Out 🌬️", bg: "#FFF3E0", border: "#FF9800", img: "/images/responses/sad/sad_screen1.png" },
  { num: 2, text: "Think of something that makes you smile 💭", bg: "#FFF9C4", border: "#FFC107", img: "/images/responses/sad/sad_screen2.png" },
  { num: 3, text: "Tell someone you trust how you feel 💬", bg: "#FFF8F1", border: "#FFB74D", img: "/images/responses/sad/sad_screen3.png" },
];

export function SadResponseScreen({onReady,onHome,soundOn,onSound}:{onReady:()=>void;onHome:()=>void;soundOn:boolean;onSound:()=>void}){
  const [activeStep,setActiveStep]=useState(0);
  const [completed,setCompleted]=useState<boolean[]>([false,false,false]);

  const doneCount=completed.filter(Boolean).length;
  const progressPct=Math.round((doneCount/STEPS.length)*100);
  const comfortPct=Math.min(100,15+doneCount*30);
  const canFinish=doneCount>=2;
  const allDone=doneCount===STEPS.length;

  function completeStep(i:number){
    if(completed[i])return;
    playSound("chime",soundOn);
    const next=[...completed]; next[i]=true; setCompleted(next);
    if(next.every(Boolean)) playSound("success",soundOn);
    if(i<STEPS.length-1) setTimeout(()=>setActiveStep(i+1),500);
  }

  const current=STEPS[activeStep];

  return(
    <div className="min-h-screen w-full relative overflow-hidden" style={{background:"linear-gradient(140deg,#FFE0B2 0%,#FFCCBC 100%)"}}>
      <BgDeco items={["💛","🌸","✨","🌼","💕","⭐","💛","🌸"]} opacity={.35}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex flex-col items-center px-4 pb-12">
        <div className="rounded-3xl bg-white p-8 flex flex-col items-center relative"
          style={{maxWidth:"680px",width:"95%",border:"4px solid #FF9800",boxShadow:"0 20px 60px rgba(255,152,0,.25)"}}>
          <div className="afb mb-2"><EmoRobot expression="caring" width={155}/></div>
          <h1 className="ff text-center mb-2" style={{fontSize:"36px",color:"#00838F"}}>It is okay to feel sad 💛</h1>
          <p className="fn text-center mb-4 font-semibold" style={{fontSize:"22px",color:"#546E7A"}}>We are here for you! Let us cheer you up!</p>

          <div className="w-full mb-2 flex justify-between fn font-bold" style={{fontSize:"13px",color:"#E65100"}}>
            <span>Step {activeStep+1} of {STEPS.length}</span><span>{doneCount}/{STEPS.length} done</span>
          </div>
          <div className="w-full rounded-full mb-2" style={{height:"14px",background:"#FFE0B2",overflow:"hidden"}}>
            <div className="h-full rounded-full transition-all duration-500" style={{width:`${progressPct}%`,background:"linear-gradient(90deg,#FFB74D,#FF9800)"}}/>
          </div>

          <div className="w-full mb-6 flex flex-col gap-1">
            <span className="fn font-bold" style={{fontSize:"13px",color:"#AD1457"}}>Comfort Meter</span>
            <div className="w-full rounded-full" style={{height:"14px",background:"#FCE4EC",overflow:"hidden"}}>
              <div className="h-full rounded-full transition-all duration-700" style={{width:`${comfortPct}%`,background:"linear-gradient(90deg,#F48FB1,#EC407A)"}}/>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full mb-6">
            {STEPS.map((s,i)=>{
              const isDone=completed[i]; const isActive=i===activeStep&&!isDone; const isLocked=i>activeStep&&!isDone;
              return(
                <div key={i} className="rounded-2xl flex items-center gap-4 px-5 py-4 fn font-bold transition-all"
                  style={{background:isDone?"#FCE4EC":s.bg,border:`2.5px solid ${isDone?"#EC407A":s.border}`,fontSize:"18px",color:"#37474F",opacity:isLocked?.45:1}}>
                  <span className="text-3xl">{isDone?"💗":`${s.num}️⃣`}</span>
                  <span className="flex-1">{s.text}</span>
                  {isActive&&<button onClick={()=>completeStep(i)} className="ff rounded-full px-4 py-2 text-white transition-transform hover:scale-105 active:scale-95" style={{background:"#FF9800",fontSize:"14px",whiteSpace:"nowrap"}}>I did it! ✓</button>}
                </div>
              );
            })}
          </div>

          {allDone&&(
            <div className="api rounded-2xl px-5 py-4 mb-6 text-center fn font-bold" style={{background:"#FFF3E0",border:"2px solid #FFB74D",color:"#E65100",fontSize:"16px"}}>
              You are loved, and it is okay to feel this way. 💛
            </div>
          )}

          <div className="flex items-end gap-6">
            <img src={current.img} alt="sad character step" width={160} style={{width:160,height:"auto"}}/>
            <Btn ch={canFinish?"I feel better! Let us play! 😊":`Try ${2-doneCount} more step${2-doneCount===1?"":"s"} first`}
              onClick={()=>canFinish&&onReady()} disabled={!canFinish} w="340px"/>
          </div>
        </div>
      </div>
    </div>
  );
}