import { useState } from "react";
import type { Mood, GirlP } from "../../types";
import { EI } from "../../data/emotions";
import { CharacterImage } from "../character/CharacterImage";
import type { PredictionResult } from "../../lib/predictionClient";

const FOCUS_LABEL: Record<string, string> = {
  eyebrows: "👀 Eyebrows",
  eyes: "👁️ Eyes",
  mouth: "👄 Mouth",
  forehead: "🧠 Forehead",
  other: "💇 Hair / head",
};

const BODY_LABEL: Record<string, string> = {
  head: "🙂 Head",
  shoulders: "🤷 Shoulders",
  arms: "💪 Arms & hands",
  hips: "🕺 Hips",
  legs: "🦵 Legs & feet",
};

/**
 * The character the child tapped, with the Grad-CAM overlay for that same
 * image on top. Hiding the overlay reveals the tapped image underneath.
 */
export function ResultImage({src,emotion,heatmapBase64,showHeat}:{src:string;emotion:Mood;heatmapBase64:string|null;showHeat:boolean}){
  return(
    <div className="relative rounded-2xl overflow-hidden flex-shrink-0" style={{width:"300px",height:"380px",border:`3px solid ${EI[emotion].border}`,boxShadow:`0 0 0 3px ${EI[emotion].border}44`}}>
      <div className="flex items-center justify-center h-full bg-white">
        <CharacterImage pose={emotion as GirlP} width={240} src={src}/>
      </div>
      {heatmapBase64&&showHeat&&<>
        <img src={heatmapBase64} alt="AI vision heatmap" className="absolute inset-0 w-full h-full object-contain bg-white" style={{pointerEvents:"none"}}/>
        <div className="absolute bottom-0 left-0 right-0 text-center py-2 fn font-bold text-white"
          style={{background:"rgba(0,0,0,.6)",fontSize:"14px"}}>🔍 AI Vision Map — red = where the AI looked</div>
      </>}
    </div>
  );
}

/** "AI says" chip plus the model's own reason for this image. */
export function AiReason({prediction,accent}:{prediction:PredictionResult;accent:string}){
  const [showWhy,setShowWhy]=useState(false);
  const info=EI[prediction.emotion];
  const ex=prediction.explanation;
  const reason=ex?.reason ?? `I think this character looks ${prediction.emotion.toUpperCase()}.`;

  return(
    <div>
      <div className="ff text-xs mb-2" style={{color:accent,letterSpacing:"1px"}}>THE AI NOTICED:</div>
      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-2 fn font-bold"
        style={{background:info.bg,color:info.text,border:`2px solid ${info.border}`,fontSize:"15px"}}>
        AI says: {info.emoji} {info.label.toUpperCase()} · {Math.round(prediction.confidence*100)}%
      </div>
      <div className="ff" style={{fontSize:"19px",color:"#004D40",lineHeight:1.4}}>{reason}</div>
      {ex&&<div className="flex flex-wrap gap-2 mt-2">
        <span className="fn font-bold rounded-full px-2 py-1" style={{background:"#E0F2F1",color:"#00695C",fontSize:"12px"}}>
          Face: {FOCUS_LABEL[ex.face_focus] ?? ex.face_focus}
        </span>
        {ex.pose_focus&&<span className="fn font-bold rounded-full px-2 py-1" style={{background:"#EDE7F6",color:"#4527A0",fontSize:"12px"}}>
          Body: {BODY_LABEL[ex.pose_focus] ?? ex.pose_focus}
        </span>}
      </div>}
      {ex&&ex.evidence.length>0&&<div className="mt-2">
        <button onClick={()=>setShowWhy(w=>!w)} className="fn font-semibold underline" style={{color:"#607D8B",fontSize:"13px",minHeight:"44px",cursor:"pointer",background:"none",border:"none",padding:"0 8px 0 0"}}>
          {showWhy?"Hide details":"How did the AI decide? 🤖"}
        </button>
        {showWhy&&<ul className="fn mt-1 pl-4" style={{color:"#455A64",fontSize:"13px",listStyle:"disc"}}>
          {ex.evidence.map((line,i)=><li key={i}>{line}</li>)}
        </ul>}
      </div>}
    </div>
  );
}