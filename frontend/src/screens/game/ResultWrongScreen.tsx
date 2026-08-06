import { useState } from "react";
import type { Mood, GirlP } from "../../types";
import { ROUNDS } from "../../data/rounds";
import { EI } from "../../data/emotions";
import { TopBar, Btn, BgDeco } from "../../components/common/UI";
import { EmoRobot } from "../../components/common/EmoRobot";
import { HeatmapOverlay } from "../../components/common/HeatmapOverlay";
import { CharacterImage } from "../../components/character/CharacterImage";

export function ResultWrongScreen({round,score,selectedIdx,images,onNext,onHome,soundOn,onSound}:{round:number;score:number;selectedIdx:number;images:string[];onNext:()=>void;onHome:()=>void;soundOn:boolean;onSound:()=>void}){
  const [showHeat,setShowHeat]=useState(true);
  const r=ROUNDS[round];
  const correctEmotion=r.opts[r.correct] as Mood;
  return(
    <div className="min-h-screen w-full relative" style={{background:"#FFF8F0"}}>
      <BgDeco items={["💛","❤️","✨","💕","💛","⭐","💕"]} opacity={.28}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex flex-col items-center px-4 pb-10">
        <div className="absolute top-4 right-20 ff rounded-full px-5 py-2 text-white"
          style={{background:"#FF9800",fontSize:"18px",boxShadow:"0 4px 15px rgba(255,152,0,.4)"}}>
          ⭐ {score}/{ROUNDS.length}
        </div>
        {/* Banner */}
        <div className="rounded-2xl py-4 px-8 mb-8 ff text-white text-center"
          style={{background:"#FF9800",fontSize:"clamp(18px,2.5vw,32px)",boxShadow:"0 6px 25px rgba(255,152,0,.4)",width:"90%",maxWidth:"700px"}}>
          💛 Good try! Let us learn together!
        </div>
        {/* Two columns */}
        <div className="flex flex-wrap justify-center gap-6" style={{maxWidth:"780px",width:"95%"}}>
          <div className="relative rounded-2xl overflow-hidden flex-shrink-0" style={{width:"300px",height:"380px",border:`3px solid ${EI[correctEmotion].border}`,boxShadow:`0 0 0 3px ${EI[correctEmotion].border}44`}}>
            <div className="flex items-center justify-center h-full bg-white">
              <CharacterImage pose={correctEmotion as GirlP} width={240} src={images[r.correct]}/>
            </div>
            {showHeat&&<HeatmapOverlay emotion={correctEmotion}/>}
            {showHeat&&<div className="absolute bottom-0 left-0 right-0 text-center py-2 fn font-bold text-white"
              style={{background:"rgba(0,0,0,.6)",fontSize:"14px"}}>🔍 AI Vision Map</div>}
          </div>
          <div className="rounded-2xl p-6 bg-white flex flex-col" style={{flex:1,minWidth:"260px",maxWidth:"380px",border:"3px solid #FF9800",boxShadow:"0 8px 30px rgba(255,152,0,.12)"}}>
            <div className="flex items-start gap-3 mb-4">
              <div className="afb flex-shrink-0"><EmoRobot expression="caring" width={100}/></div>
              <div>
                <div className="ff text-xs mb-2" style={{color:"#FF9800",letterSpacing:"1px"}}>THE AI NOTICED:</div>
                <div className="ff" style={{fontSize:"22px",color:"#004D40",lineHeight:1.4}}>
                  This character has {r.ai}
                </div>
              </div>
            </div>
            <div className="fn font-bold mt-2" style={{fontSize:"18px",color:"#E91E63"}}>You are getting better! Keep going! 💪</div>
            <div className="mt-4">
              <button onClick={()=>setShowHeat(h=>!h)}
                className="fn font-bold rounded-full px-4 py-2 transition-all hover:brightness-110"
                style={{background:"#FFF3E0",color:"#E65100",border:"2px solid #FF9800",fontSize:"14px",cursor:"pointer"}}>
                {showHeat?"Hide AI Vision":"Show AI Vision 🔍"}
              </button>
            </div>
            <Btn ch="Next Round →" onClick={onNext} className="mt-auto"/>
          </div>
        </div>
      </div>
    </div>
  );
}
