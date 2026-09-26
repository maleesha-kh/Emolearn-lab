import { useState } from "react";
import type { GirlP, GameRound } from "../../types";
import { TopBar, Btn } from "../../components/common/UI";
import { EmoRobot } from "../../components/common/EmoRobot";
import { CharacterImage } from "../../components/character/CharacterImage";

export function GameRoundScreen({round:r,roundIndex,totalRounds,score,onSelect,onHome,soundOn,onSound}:{round:GameRound;roundIndex:number;totalRounds:number;score:number;onSelect:(idx:number)=>void;onHome:()=>void;soundOn:boolean;onSound:()=>void}){
  const [sel,setSel]=useState<number|null>(null);
  const poses:GirlP[]=r.opts.map(m=>m as GirlP);
  return(
    <div className="min-h-screen w-full relative" style={{background:"#FFFDE7"}}>
      <div className="absolute inset-0 pointer-events-none" style={{backgroundImage:"radial-gradient(circle,rgba(0,188,212,.07) 1px,transparent 1px)",backgroundSize:"28px 28px"}}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex flex-col items-center px-4 pb-10">
        {/* Progress */}
        <div className="flex items-center gap-3 mb-1">
          {Array.from({length:totalRounds},(_,i)=>(
            <span key={i} className="text-3xl ash" style={{opacity:i<=roundIndex?1:.25,animationDelay:`${i*.15}s`}}>
              {i<roundIndex?"⭐":i===roundIndex?"🌟":"☆"}
            </span>
          ))}
        </div>
        <p className="ff mb-3" style={{fontSize:"22px",color:"#00838F"}}>Round {roundIndex+1} of {totalRounds}</p>

        {/* Speech bubble */}
        <div className="relative mb-4 rounded-3xl px-8 py-5 text-white ff text-center"
          style={{background:"#FF9800",fontSize:"32px",boxShadow:"0 8px 30px rgba(255,152,0,.4)",maxWidth:"520px",width:"90%"}}>
          <h1>Find the <span style={{textDecoration:"underline"}}>{r.find}</span> character! {r.emoji}</h1>
          <div className="absolute left-1/2 -bottom-4 -translate-x-1/2 w-0 h-0"
            style={{borderLeft:"18px solid transparent",borderRight:"18px solid transparent",borderTop:`18px solid #FF9800`}}/>
        </div>

        {/* Emo hint */}
        <div className="flex items-center gap-3 mb-5">
          <div className="afb"><EmoRobot expression="curious" width={80}/></div>
          <div className="rounded-2xl px-4 py-2 fn font-bold" style={{background:"white",border:"2px solid #00BCD4",fontSize:"16px",color:"#00838F"}}>Teach the AI! 🤖</div>
        </div>

        {/* Cards — shuffled order and images are fixed for the whole game (see buildGameRounds) */}
        <div className="flex flex-wrap justify-center gap-6 mb-8">
          {poses.map((pose,i)=>{
            const isSel=sel===i;
            return(
              <button key={i} type="button" onClick={()=>setSel(i)} aria-pressed={isSel}
                className="emotion-card cursor-pointer rounded-2xl bg-white flex flex-col items-center pt-4 pb-3 transition-all hover:scale-105 relative"
                style={{width:"220px",height:"340px",background:"white",
                  border:isSel?"4px solid #FF9800":"2.5px solid #E0E0E0",
                  boxShadow:isSel?"0 0 0 4px rgba(255,152,0,.25),0 12px 40px rgba(255,152,0,.2)":"0 4px 20px rgba(0,0,0,.08)"}}>
                <CharacterImage pose={pose} width={185} src={r.images[i]}/>
                {isSel&&<span aria-hidden="true" className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-white api"
                  style={{background:"#FF9800",fontSize:"14px"}}>✓</span>}
              </button>
            );
          })}
        </div>

        <Btn ch="Tell the AI! ✨" onClick={()=>sel!==null&&onSelect(sel)} disabled={sel===null} w="300px" color="#00BCD4"/>
        <p className="fn mt-3 font-semibold" style={{color:"#00838F",fontSize:"16px"}}>Tap a character to select! 👆</p>
      </div>
    </div>
  );
}
