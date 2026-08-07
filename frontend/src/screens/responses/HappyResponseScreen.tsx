import { useState } from "react";
import { TopBar, Btn, BgDeco, Confetti } from "../../components/common/UI";
import { EmoRobot } from "../../components/common/EmoRobot";
import { CharacterImage } from "../../components/character/CharacterImage";
import { playSound } from "../../lib/sounds";

const MINI_GAME_IMAGES = [
  "/images/responses/happy/happy_screen1.png",
  "/images/responses/happy/happy_screen2.png",
  "/images/responses/happy/happy_screen3.png",
];

const ACTIVITIES = [
  { emoji: "💃", text: "Do a happy wiggle dance!", bg: "#FFF9C4", border: "#FFC107" },
  { emoji: "😁", text: "Smile as wide as you can!", bg: "#FFE0B2", border: "#FF9800" },
  { emoji: "🎊", text: "Give yourself a big hug!", bg: "#FFF8E1", border: "#FFD700" },
];

export function HappyResponseScreen({playerName,onReady,onHome,soundOn,onSound}:{playerName:string;onReady:()=>void;onHome:()=>void;soundOn:boolean;onSound:()=>void}){
  void playerName;
  const [completed,setCompleted]=useState<boolean[]>([false,false,false]);
  const [openIdx,setOpenIdx]=useState<number|null>(null);
  const [burst,setBurst]=useState(false);

  const doneCount=completed.filter(Boolean).length;
  const allDone=doneCount===ACTIVITIES.length;

  function openActivity(i:number){
    if(completed[i])return;
    playSound("pop",soundOn);
    setOpenIdx(i);
  }

  function pickImage(){
    if(openIdx===null)return;
    playSound("success",soundOn);
    const next=[...completed]; next[openIdx]=true; setCompleted(next); setOpenIdx(null);
    if(next.every(Boolean)){ setBurst(true); setTimeout(()=>setBurst(false),2600); }
  }

  return(
    <div className="min-h-screen w-full relative overflow-hidden" style={{background:"linear-gradient(140deg,#FFD700 0%,#FFA726 100%)"}}>
      <Confetti count={40}/>
      {burst&&<Confetti count={90}/>}
      <BgDeco items={["🎊","⭐","✨","🎉","💛","🌟","🎊","⭐","🎈"]} opacity={.5}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex flex-col items-center px-4 pb-12">
        <div className="rounded-3xl bg-white p-8 flex flex-col items-center relative"
          style={{maxWidth:"700px",width:"95%",border:"4px solid #FFD700",boxShadow:"0 20px 60px rgba(255,215,0,.35)"}}>
          <div className="af mb-2"><EmoRobot expression="jumping" width={160}/></div>
          <h1 className="ff text-center mb-2" style={{fontSize:"38px",color:"#004D40"}}>You feel HAPPY today! 🎉</h1>
          <p className="fn text-center mb-4 font-semibold" style={{fontSize:"22px",color:"#546E7A"}}>Let's make your happy feeling even BIGGER!</p>

          <div className="w-full mb-6 flex flex-col gap-1">
            <span className="fn font-bold" style={{fontSize:"13px",color:"#E65100"}}>{doneCount}/{ACTIVITIES.length} activities done</span>
            <div className="w-full rounded-full" style={{height:"14px",background:"#FFF3E0",overflow:"hidden"}}>
              <div className="h-full rounded-full transition-all duration-500" style={{width:`${(doneCount/ACTIVITIES.length)*100}%`,background:"linear-gradient(90deg,#FFCA28,#FF9800)"}}/>
            </div>
          </div>

          {openIdx===null?(
            <div className="flex flex-wrap gap-4 justify-center mb-6">
              {ACTIVITIES.map((b,i)=>(
                <button key={i} onClick={()=>openActivity(i)} disabled={completed[i]}
                  className="rounded-full flex items-center gap-3 px-6 py-4 fn font-bold transition-transform hover:scale-105 active:scale-95"
                  style={{background:completed[i]?"#E8F5E9":b.bg,border:`3px solid ${completed[i]?"#66BB6A":b.border}`,fontSize:"18px",color:"#37474F",cursor:completed[i]?"default":"pointer"}}>
                  <span className="text-3xl">{completed[i]?"✅":b.emoji}</span>{b.text}
                </button>
              ))}
            </div>
          ):(
            <div className="api flex flex-col items-center mb-6 w-full">
              <p className="ff text-center mb-4" style={{fontSize:"22px",color:"#E65100"}}>Which one looks like YOU right now? 😊</p>
              <div className="flex flex-wrap gap-4 justify-center">
                {MINI_GAME_IMAGES.map((src,i)=>(
                  <button key={i} onClick={pickImage} className="rounded-2xl overflow-hidden transition-transform hover:scale-105 active:scale-95"
                    style={{border:"3px solid #FFC107",width:"140px",background:"#FFF8E1"}}>
                    <img src={src} alt={`happy option ${i+1}`} style={{width:"100%",height:"auto",display:"block"}}/>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Btn ch={allDone?"I'm ready to play! 🚀":`Complete ${ACTIVITIES.length-doneCount} more activit${ACTIVITIES.length-doneCount===1?"y":"ies"} first`}
            onClick={()=>allDone&&onReady()} disabled={!allDone} w="400px"/>
        </div>
        <div className="absolute right-4 bottom-0 opacity-30 pointer-events-none hidden xl:block">
          <CharacterImage pose="jumping" width={220}/>
        </div>
      </div>
    </div>
  );
}