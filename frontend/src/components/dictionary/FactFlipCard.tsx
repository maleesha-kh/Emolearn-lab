import { useState } from "react";
import type { EmotionInfo } from "../../types";

export function FactFlipCard({fact,info,onFlip}:{fact:string;info:EmotionInfo;onFlip:()=>void}){
  const [flipped,setFlipped]=useState(false);

  function flip(){
    if(!flipped)onFlip();
    setFlipped(f=>!f);
  }

  return(
    <button onClick={flip} aria-pressed={flipped} aria-label={flipped?fact:"Did you know? Tap to flip"}
      className="relative w-full" style={{height:"190px",perspective:"1000px",cursor:"pointer"}}>
      <div className="absolute inset-0 rounded-2xl transition-transform duration-500"
        style={{transformStyle:"preserve-3d",transform:flipped?"rotateY(180deg)":"rotateY(0deg)"}}>
        <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center ff"
          style={{background:info.text,border:`3px solid ${info.text}`,backfaceVisibility:"hidden",color:"white"}}>
          <div style={{fontSize:"44px"}}>💡</div>
          <div style={{fontSize:"22px"}}>Did you know?</div>
          <div className="fn font-bold" style={{fontSize:"15px"}}>Tap me!</div>
        </div>
        <div className="absolute inset-0 rounded-2xl p-5 flex items-center justify-center fn font-bold text-center"
          style={{background:"white",border:`3px solid ${info.border}`,backfaceVisibility:"hidden",transform:"rotateY(180deg)",
            fontSize:"17px",color:"#37474F",lineHeight:1.4}}>
          {fact}
        </div>
      </div>
    </button>
  );
}
