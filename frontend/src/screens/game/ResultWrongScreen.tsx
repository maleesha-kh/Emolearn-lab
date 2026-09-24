import { useState, useEffect } from "react";
import type { Mood, GirlP } from "../../types";
import { ROUNDS } from "../../data/rounds";
import { EI } from "../../data/emotions";
import { TopBar, Btn, BgDeco } from "../../components/common/UI";
import { EmoRobot } from "../../components/common/EmoRobot";
import { CharacterImage } from "../../components/character/CharacterImage";
import { ResultImage, AiReason } from "../../components/game/ResultParts";
import type { PredictionResult } from "../../lib/predictionClient";
import { playSound } from "../../lib/sounds";

const NEXT_BUTTON_DELAY_MS = 2500;

export function ResultWrongScreen({round,score,selectedIdx,images,prediction,onNext,onHome,soundOn,onSound}:{round:number;score:number;selectedIdx:number;images:string[];prediction:PredictionResult;onNext:()=>void;onHome:()=>void;soundOn:boolean;onSound:()=>void}){
  const [showHeat,setShowHeat]=useState(true);
  const [canProceed,setCanProceed]=useState(false);
  const r=ROUNDS[round];
  const targetEmotion=r.opts[r.correct] as Mood;
  const pickedEmotion=r.opts[selectedIdx] as Mood;
  const aiEmotion=prediction.emotion;
  const isLastRound=round===ROUNDS.length-1;

  useEffect(()=>{
    playSound("chime",soundOn);
    setCanProceed(false);
    const t=setTimeout(()=>setCanProceed(true),NEXT_BUTTON_DELAY_MS);
    return ()=>clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[round]);

  // What the tapped character really shows, and how the AI's view compares
  const teach=aiEmotion===pickedEmotion
    ?<>This character looks <b style={{color:EI[pickedEmotion].text}}>{pickedEmotion.toUpperCase()}</b>, not <b style={{color:EI[targetEmotion].text}}>{targetEmotion.toUpperCase()}</b>.</>
    :aiEmotion===targetEmotion
      ?<>Tricky one! The AI was fooled too — but this character is really <b style={{color:EI[pickedEmotion].text}}>{pickedEmotion.toUpperCase()}</b>.</>
      :<>This character is really <b style={{color:EI[pickedEmotion].text}}>{pickedEmotion.toUpperCase()}</b> — the AI is still learning this one!</>;

  return(
    <div className="min-h-screen w-full relative" style={{background:"#FFF8F0"}}>
      <BgDeco items={["💛","❤️","✨","💕","💛","⭐","💕"]} opacity={.28}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex flex-col items-center px-4 pb-10">
        <div className="absolute top-4 right-20 ff rounded-full px-5 py-2 text-white"
          style={{background:"#FF9800",fontSize:"18px",boxShadow:"0 4px 15px rgba(255,152,0,.4)"}}>
          ⭐ {score}/{ROUNDS.length}
        </div>
        <div className="rounded-2xl py-4 px-8 mb-8 ff text-white text-center"
          style={{background:"#FF9800",fontSize:"clamp(18px,2.5vw,32px)",boxShadow:"0 6px 25px rgba(255,152,0,.4)",width:"90%",maxWidth:"700px"}}>
          💛 Good try! Let us learn together!
        </div>
        <div className="flex flex-wrap justify-center gap-6" style={{maxWidth:"780px",width:"95%"}}>
          <div className="flex flex-col items-center gap-2">
            <div className="fn font-bold" style={{color:"#6D4C41",fontSize:"15px"}}>You picked:</div>
            <ResultImage src={images[selectedIdx]} emotion={pickedEmotion} heatmapBase64={prediction.heatmapBase64} showHeat={showHeat}/>
          </div>
          <div className="rounded-2xl p-6 bg-white flex flex-col" style={{flex:1,minWidth:"260px",maxWidth:"420px",border:"3px solid #FF9800",boxShadow:"0 8px 30px rgba(255,152,0,.12)"}}>
            <div className="flex items-start gap-3 mb-3">
              <div className="afb flex-shrink-0"><EmoRobot expression="caring" width={80}/></div>
              <AiReason prediction={prediction} accent="#FF9800"/>
            </div>
            <div className="fn font-bold" style={{fontSize:"17px",color:"#4E342E",lineHeight:1.4}}>{teach}</div>
            <div className="flex items-center gap-3 mt-3 rounded-xl p-2" style={{background:EI[targetEmotion].bg,border:`2px dashed ${EI[targetEmotion].border}`}}>
              <div className="rounded-lg bg-white flex items-center justify-center overflow-hidden flex-shrink-0" style={{width:"64px",height:"80px"}}>
                <CharacterImage pose={targetEmotion as GirlP} width={52} src={images[r.correct]}/>
              </div>
              <div className="fn font-bold" style={{fontSize:"16px",color:EI[targetEmotion].text}}>
                The {targetEmotion.toUpperCase()} {EI[targetEmotion].emoji} character was this one!
              </div>
            </div>
            <div className="fn font-bold mt-3" style={{fontSize:"16px",color:"#E91E63"}}>You are getting better! Keep going! 💪</div>
            {prediction.heatmapBase64&&<div className="mt-3">
              <button onClick={()=>setShowHeat(h=>!h)}
                className="fn font-bold rounded-full px-4 py-2 transition-all hover:brightness-110"
                style={{background:"#FFF3E0",color:"#E65100",border:"2px solid #FF9800",fontSize:"14px",cursor:"pointer"}}>
                {showHeat?"Hide AI Vision":"Show AI Vision 🔍"}
              </button>
            </div>}
            <Btn
              ch={canProceed?(isLastRound?"See My Results! 🏆":"Next Round →"):"Reading..."}
              onClick={onNext}
              disabled={!canProceed}
              className="mt-4"
            />
          </div>
        </div>
      </div>
    </div>
  );
}