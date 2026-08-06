import { useEffect, useRef } from "react";
import type { Mood } from "../../types";
import { predictEmotion, type PredictionResult } from "../../lib/mockModel";
import { EmoRobot } from "../../components/common/EmoRobot";

/**
 * Calls the (mocked, see lib/mockModel.ts) emotion classifier on the image
 * the child tapped and reports the result back to App once it resolves. A
 * minimum display time keeps the "thinking" animation feeling substantial
 * even though the mock itself resolves quickly.
 */
export function LoadingScreen({trueEmotion,onDone}:{trueEmotion:Mood;onDone:(result:PredictionResult)=>void}){
  const onDoneRef=useRef(onDone);
  onDoneRef.current=onDone;

  useEffect(()=>{
    let cancelled=false;
    const minDelay=new Promise<void>(r=>setTimeout(r,1500));
    Promise.all([predictEmotion(trueEmotion),minDelay]).then(([result])=>{
      if(!cancelled) onDoneRef.current(result);
    });
    return ()=>{cancelled=true;};
  },[trueEmotion]);

  return(
    <div className="min-h-screen w-full flex flex-col items-center justify-center" style={{background:"linear-gradient(140deg,#E0F7FA 0%,#B2EBF2 100%)"}}>
      <div className="relative flex items-center justify-center mb-6" style={{width:"200px",height:"200px"}}>
        <svg className="absolute" width="200" height="200" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(0,188,212,.15)" strokeWidth="8"/>
          <circle cx="100" cy="100" r="90" fill="none" stroke="#00BCD4" strokeWidth="8" strokeLinecap="round"
            strokeDasharray="0 565" className="aaf" style={{transformOrigin:"center",transform:"rotate(-90deg)"}}/>
        </svg>
        <div className="af"><EmoRobot expression="magnifying" width={160}/></div>
      </div>
      <div className="flex gap-3 mb-4">
        {[0,1,2].map(i=>(
          <div key={i} className="w-4 h-4 rounded-full abd" style={{background:"#00BCD4",animationDelay:`${i*.2}s`}}/>
        ))}
      </div>
      <p className="ff text-center" style={{fontSize:"28px",color:"#00838F"}}>Emo is thinking... 🤔</p>
      <p className="fn text-center mt-2 font-semibold" style={{fontSize:"16px",color:"#78909C"}}>Teaching the AI to understand feelings!</p>
    </div>
  );
}
