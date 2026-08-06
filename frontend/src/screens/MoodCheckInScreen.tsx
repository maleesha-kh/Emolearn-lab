import { useState } from "react";
import type { Mood, GirlP } from "../types";
import { EI } from "../data/emotions";
import { rollMoodBank } from "../lib/imageBank";
import { TopBar, Btn, BgDeco } from "../components/common/UI";
import { EmoRobot } from "../components/common/EmoRobot";
import { CharacterImage } from "../components/character/CharacterImage";

export function MoodCheckInScreen({onSelect,onHome,soundOn,onSound}:{onSelect:(m:Mood)=>void;onHome:()=>void;soundOn:boolean;onSound:()=>void}){
  const [sel,setSel]=useState<Mood|null>(null);
  // One random image per emotion, re-rolled fresh every time this screen mounts.
  const [bank]=useState(()=>rollMoodBank());
  const cards:[Mood,GirlP][]=[["happy","happy"],["sad","sad"],["angry","angry"],["surprised","surprised"]];
  return(
    <div className="min-h-screen w-full relative" style={{background:"linear-gradient(140deg,#FFFDE7 0%,#FFF9C4 100%)"}}>
      <BgDeco items={["☀️","⭐","🌼","💛","✨","☀️","⭐","🌻"]} opacity={.28}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex flex-col items-center px-4 pb-10">
        <h1 className="ff text-center mb-2" style={{fontSize:"clamp(28px,3.5vw,40px)",color:"#004D40"}}>How are you feeling today? 🌞</h1>
        <p className="fn text-center mb-4 font-semibold" style={{fontSize:"20px",color:"#546E7A"}}>Tap the picture that matches how you feel!</p>
        <div className="mb-5 afb"><EmoRobot expression="curious" width={110}/></div>
        <div className="flex flex-row flex-wrap gap-5 mb-6 justify-center" style={{width:"100%",maxWidth:"1320px"}}>
          {cards.map(([mood,pose])=>{
            const e=EI[mood]; const isSel=sel===mood;
            return(
              <div key={mood} onClick={()=>setSel(mood)}
                className="rounded-3xl cursor-pointer transition-all hover:scale-105 relative flex flex-col items-center pt-4 pb-3"
                style={{width:"300px",height:"380px",background:e.bg,
                  border:isSel?`5px solid ${e.border}`:`3px solid ${e.border}`,
                  boxShadow:isSel?`0 0 0 5px ${e.border}38,0 14px 45px ${e.border}30`:"0 4px 20px rgba(0,0,0,.08)"}}>
                <CharacterImage pose={pose} width={215} src={bank[mood]}/>
                <div className="ff mt-1" style={{fontSize:"28px",color:e.text}}>{e.label} {e.emoji}</div>
                {isSel&&<div className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white text-lg api"
                  style={{background:e.border}}>✓</div>}
              </div>
            );
          })}
        </div>
        <Btn ch={sel?"Continue →":"Choose a feeling!"} onClick={()=>sel&&onSelect(sel)} disabled={!sel} w="280px"/>
      </div>
    </div>
  );
}
