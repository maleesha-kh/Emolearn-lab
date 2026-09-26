import { useEffect } from "react";
import type { Mood } from "../../types";
import { EI } from "../../data/emotions";
import { Btn, Confetti } from "../common/UI";
import { playSound } from "../../lib/sounds";

const AUTO_CLOSE_MS = 4000;

export function Sticker({emotion,size}:{emotion:Mood;size:number}){
  const e=EI[emotion];
  return(
    <div className="rounded-full flex items-center justify-center" aria-label={`${e.label} sticker`}
      style={{width:size,height:size,fontSize:size*.5,transform:"rotate(-10deg)",border:`${Math.max(3,size/20)}px solid white`,
        background:`radial-gradient(circle at 30% 30%, ${e.color}99, ${e.color})`,boxShadow:`0 4px 14px ${e.border}88`}}>
      {e.emoji}
    </div>
  );
}

export function StickerCelebration({emotion,soundOn,onClose}:{emotion:Mood;soundOn:boolean;onClose:()=>void}){
  const e=EI[emotion];

  useEffect(()=>{
    playSound("success",soundOn);
    const t=setTimeout(onClose,AUTO_CLOSE_MS);
    return ()=>clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  return(
    <div className="fixed inset-0 flex items-center justify-center px-4" style={{background:"rgba(0,0,0,.45)",zIndex:90}} onClick={onClose}>
      <Confetti count={30}/>
      <div className="api relative flex flex-col items-center rounded-3xl bg-white p-8 text-center" onClick={ev=>ev.stopPropagation()}
        style={{width:"360px",maxWidth:"92vw",border:`4px solid ${e.border}`,boxShadow:`0 20px 60px rgba(0,0,0,.25)`,zIndex:5}}>
        <div className="mb-4"><Sticker emotion={emotion} size={150}/></div>
        <div className="ff mb-1" style={{fontSize:"26px",color:e.text}}>New sticker! 🎉</div>
        <div className="fn font-bold mb-6" style={{fontSize:"19px",color:"#455A64"}}>You explored {e.label}!</div>
        <Btn ch="Yay! ✨" onClick={onClose} color={e.text} w="200px"/>
      </div>
    </div>
  );
}
