import { useCallback, useEffect, useRef, useState } from "react";
import type { Mood } from "../types";
import { EMOTION_DICTIONARY } from "../data/emotionDictionary";
import { TopBar, BgDeco } from "../components/common/UI";
import { FeelingPicker } from "../components/dictionary/FeelingPicker";
import { EmotionPage } from "../components/dictionary/EmotionPage";
import { StickerCelebration } from "../components/dictionary/Sticker";
import { completeDictionaryEmotion, getDictionaryProgress } from "../lib/api";
import { playSound } from "../lib/sounds";

const AGAIN_MESSAGE_MS = 3000;

type Celebration = { emotion: Mood; newBadges: string[] };

export function DictionaryScreen({playerId,onHome,soundOn,onSound,onPractice,onNewBadges}:{playerId:string;onHome:()=>void;soundOn:boolean;onSound:()=>void;onPractice:()=>void;onNewBadges:(ids:string[])=>void}){
  const [selected,setSelected]=useState<Mood|null>(null);
  const [completed,setCompleted]=useState<Mood[]>([]);
  const [celebration,setCelebration]=useState<Celebration|null>(null);
  const [showAgain,setShowAgain]=useState(false);
  const mountedRef=useRef(true);

  useEffect(()=>{
    mountedRef.current=true;
    return ()=>{mountedRef.current=false;};
  },[]);

  useEffect(()=>{
    if(!playerId)return;
    let cancelled=false;
    getDictionaryProgress(playerId).then(res=>{
      if(cancelled)return;
      if(res.kind==="ok") setCompleted(res.data.completed.map(c=>c.emotion));
      else console.warn("getDictionaryProgress failed",res.status);
    });
    return ()=>{cancelled=true;};
  },[playerId]);

  useEffect(()=>{
    if(!showAgain)return;
    const t=setTimeout(()=>setShowAgain(false),AGAIN_MESSAGE_MS);
    return ()=>clearTimeout(t);
  },[showAgain]);

  const handleExplored=useCallback(async (emotion:Mood)=>{
    if(!playerId)return;
    const res=await completeDictionaryEmotion(playerId,emotion);
    if(res.kind!=="ok"){
      console.warn("completeDictionaryEmotion failed",res.status);
      return;
    }
    const {completed:rows,new_badges,newly_completed}=res.data;
    // The child may have left Learn before the response arrived; badges still get their popup
    if(!mountedRef.current){
      onNewBadges(new_badges);
      return;
    }
    setCompleted(rows.map(c=>c.emotion));
    if(newly_completed){
      setCelebration({emotion,newBadges:new_badges});
    }else{
      setShowAgain(true);
      onNewBadges(new_badges);
    }
  },[playerId,onNewBadges]);

  function closeCelebration(){
    if(celebration) onNewBadges(celebration.newBadges);
    setCelebration(null);
  }

  function open(m:Mood|null){
    setSelected(m);
    setShowAgain(false);
    window.scrollTo({top:0});
  }

  function pick(m:Mood){
    playSound("pop",soundOn);
    open(m);
  }

  const background=selected?EMOTION_DICTIONARY[selected].info.bg:"#FFFDE7";
  const deco=selected?[EMOTION_DICTIONARY[selected].info.emoji,"✨","⭐","💡","✨",EMOTION_DICTIONARY[selected].info.emoji]:["📖","⭐","✨","📚","💡","⭐","📖"];

  return(
    <div className="min-h-screen w-full relative overflow-x-hidden" style={{background}}>
      <BgDeco items={deco} opacity={.22}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex flex-col items-center px-4 pb-12">
        {selected
          ?<EmotionPage key={selected} emotion={selected} soundOn={soundOn} onBack={()=>open(null)} onPractice={onPractice}
              onExplored={()=>handleExplored(selected)}/>
          :<FeelingPicker completed={completed} onPick={pick}/>}
      </div>

      {showAgain&&selected&&(
        <div className="fixed inset-x-0 flex justify-center px-4 pointer-events-none" style={{bottom:"96px",zIndex:60}}>
          <div className="api fn font-bold rounded-full px-6 py-3 text-center" role="status"
            style={{background:"white",fontSize:"18px",color:EMOTION_DICTIONARY[selected].info.text,
              border:`3px solid ${EMOTION_DICTIONARY[selected].info.border}`,boxShadow:"0 8px 24px rgba(0,0,0,.15)"}}>
            You explored this feeling again! ⭐
          </div>
        </div>
      )}

      {celebration&&<StickerCelebration emotion={celebration.emotion} soundOn={soundOn} onClose={closeCelebration}/>}
    </div>
  );
}
