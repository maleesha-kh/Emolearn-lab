import { useEffect, useRef, useState } from "react";
import type { Mood } from "../../types";
import { getPrediction, PredictionError, type PredictionResult } from "../../lib/predictionClient";
import { EmoRobot } from "../../components/common/EmoRobot";
import { Btn } from "../../components/common/UI";

/**
 * Sends the tapped image to the prediction service (real API or mock, see
 * lib/predictionClient.ts) and reports the result back to App once it
 * resolves. A minimum display time keeps the "thinking" animation feeling
 * substantial even when the response comes back quickly.
 */
export function LoadingScreen({imageUrl,trueEmotion,onDone,onBack}:{imageUrl:string;trueEmotion:Mood;onDone:(result:PredictionResult)=>void;onBack:()=>void}){
  const onDoneRef=useRef(onDone);
  onDoneRef.current=onDone;
  const [error,setError]=useState<PredictionError|null>(null);
  const [attempt,setAttempt]=useState(0);

  useEffect(()=>{
    let cancelled=false;
    setError(null);
    const minDelay=new Promise<void>(r=>setTimeout(r,1500));
    Promise.all([getPrediction({imageUrl,trueEmotion}),minDelay])
      .then(([result])=>{
        if(!cancelled) onDoneRef.current(result);
      })
      .catch((err)=>{
        if(cancelled) return;
        setError(err instanceof PredictionError ? err : new PredictionError("server"));
      });
    return ()=>{cancelled=true;};
  },[imageUrl,trueEmotion,attempt]);

  if(error){
    return(
      <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 text-center" style={{background:"linear-gradient(140deg,#FFF3E0 0%,#FFE0B2 100%)"}}>
        <EmoRobot expression="caring" width={140}/>
        <h1 className="ff mt-4" style={{fontSize:"24px",color:"#E65100"}}>{error.message}</h1>
        <div className="flex gap-3 mt-6">
          <Btn ch="Try Again" onClick={()=>setAttempt(a=>a+1)} color="#00BCD4" w="160px"/>
          <Btn ch="Pick Again" onClick={onBack} color="#FF9800" w="160px"/>
        </div>
      </div>
    );
  }

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
      <h1 className="ff text-center" style={{fontSize:"28px",color:"#00838F"}}>Emo is thinking... 🤔</h1>
      <p className="fn text-center mt-2 font-semibold" style={{fontSize:"16px",color:"#78909C"}}>Teaching the AI to understand feelings!</p>
    </div>
  );
}
