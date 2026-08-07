import { useState } from "react";
import { TopBar, Btn, BgDeco } from "../../components/common/UI";
import { EmoRobot } from "../../components/common/EmoRobot";
import { playSound } from "../../lib/sounds";

const STEPS = [
  { num: 1, text: "Shake your hands REALLY fast... then let go 🙌", bg: "#E3F2FD", border: "#42A5F5", img: "/images/responses/angry/angry_screen1.png" },
  { num: 2, text: "Count slowly: 1... 2... 3... 4... 5 ⬇️", bg: "#E0F7FA", border: "#00BCD4", img: "/images/responses/angry/angry_screen2.png" },
  { num: 3, text: "Take one big breath: IN... and OUT 🌬️", bg: "#E8F5E9", border: "#66BB6A", img: "/images/responses/angry/angry_screen3.png" },
];

export function AngryResponseScreen({onReady,onHome,soundOn,onSound}:{onReady:()=>void;onHome:()=>void;soundOn:boolean;onSound:()=>void}){
  const [activeStep,setActiveStep]=useState(0);
  const [completed,setCompleted]=useState<boolean[]>([false,false,false]);

  const doneCount=completed.filter(Boolean).length;
  const progressPct=Math.round((doneCount/STEPS.length)*100);
  const calmPct=Math.max(10,100-doneCount*30);
  const canFinish=doneCount>=2;

  function completeStep(i:number){
    if(completed[i])return;
    playSound("chime",soundOn);
    const next=[...completed]; next[i]=true; setCompleted(next);
    if(i<STEPS.length-1) setTimeout(()=>setActiveStep(i+1),500);
  }

  const current=STEPS[activeStep];

  return(
    <div className="min-h-screen w-full relative overflow-hidden" style={{background:"linear-gradient(140deg,#80CBC4 0%,#B2EBF2 100%)"}}>
      <BgDeco items={["🌊","❄️","💙","🌀","💎","🌊","❄️"]} opacity={.3}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex flex-col items-center px-4 pb-12">
        <div className="rounded-3xl bg-white p-8 flex flex-col items-center"
          style={{maxWidth:"680px",width:"95%",border:"4px solid #00BCD4",boxShadow:"0 20px 60px rgba(0,188,212,.2)"}}>
          <div className="afb mb-2"><EmoRobot expression="calm" width={150}/></div>
          <h1 className="ff text-center mb-2" style={{fontSize:"36px",color:"#00838F"}}>It is okay to feel angry 🌊</h1>
          <p className="fn text-center mb-4 font-semibold" style={{fontSize:"20px",color:"#546E7A"}}>Let us calm down together step by step</p>

          <div className="w-full mb-2 flex justify-between fn font-bold" style={{fontSize:"13px",color:"#00838F"}}>
            <span>Step {activeStep+1} of {STEPS.length}</span><span>{doneCount}/{STEPS.length} done</span>
          </div>
          <div className="w-full rounded-full mb-2" style={{height:"14px",background:"#E0F2F1",overflow:"hidden"}}>
            <div className="h-full rounded-full transition-all duration-500" style={{width:`${progressPct}%`,background:"linear-gradient(90deg,#26C6DA,#00838F)"}}/>
          </div>

          <div className="w-full mb-6 flex flex-col gap-1">
            <span className="fn font-bold" style={{fontSize:"13px",color:"#D84315"}}>Angry Meter</span>
            <div className="w-full rounded-full" style={{height:"14px",background:"#FFE0B2",overflow:"hidden"}}>
              <div className="h-full rounded-full transition-all duration-700" style={{width:`${calmPct}%`,background:calmPct>60?"#FF5722":calmPct>30?"#FFA726":"#66BB6A"}}/>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full mb-6">
            {STEPS.map((s,i)=>{
              const isDone=completed[i]; const isActive=i===activeStep&&!isDone; const isLocked=i>activeStep&&!isDone;
              return(
                <div key={i} className="rounded-2xl flex items-center gap-4 px-5 py-4 fn font-bold transition-all"
                  style={{background:isDone?"#E8F5E9":s.bg,border:`2.5px solid ${isDone?"#66BB6A":s.border}`,fontSize:"18px",color:"#004D40",opacity:isLocked?.45:1}}>
                  <span className="text-3xl">{isDone?"✅":`${s.num}️⃣`}</span>
                  <span className="flex-1">{s.text}</span>
                  {isActive&&<button onClick={()=>completeStep(i)} className="ff rounded-full px-4 py-2 text-white transition-transform hover:scale-105 active:scale-95" style={{background:"#00BCD4",fontSize:"14px",whiteSpace:"nowrap"}}>I did it! ✓</button>}
                </div>
              );
            })}
          </div>

          {activeStep===2&&!completed[2]&&(
            <div className="flex flex-col items-center mb-6">
              <div className="abr rounded-full flex items-center justify-center" style={{width:"90px",height:"90px",background:"radial-gradient(circle,#A5D6A7,#66BB6A)"}}>
                <span className="text-3xl">🌬️</span>
              </div>
              <p className="fn font-semibold mt-2" style={{fontSize:"14px",color:"#546E7A"}}>Breathe with the circle...</p>
            </div>
          )}

          <div className="flex flex-col items-center gap-4 w-full">
            <img src={current.img} alt="angry character step" width={140} style={{width:140,height:"auto"}}/>
            <Btn ch={canFinish?"I feel calmer! Let us play! 💚":`Complete ${2-doneCount} more step${2-doneCount===1?"":"s"} first`}
              onClick={()=>canFinish&&onReady()} disabled={!canFinish} w="380px"/>
          </div>
        </div>
      </div>
    </div>
  );
}