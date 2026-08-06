import { useState } from "react";
import { ROUNDS } from "../data/rounds";
import { TopBar, Btn, BgDeco, Confetti, Stars } from "../components/common/UI";
import { EmoRobot } from "../components/common/EmoRobot";
import { CharacterImage } from "../components/character/CharacterImage";

export function SummaryScreen({playerName,score,roundResults,onPlayAgain,onBye,onHome,soundOn,onSound,onBadge}:{playerName:string;score:number;roundResults:boolean[];onPlayAgain:()=>void;onBye:()=>void;onHome:()=>void;soundOn:boolean;onSound:()=>void;onBadge:()=>void}){
  const [moodBooster,setMoodBooster]=useState(false);
  const emotions=ROUNDS.map((r,i)=>({...r,correct_ans:roundResults[i]}));
  return(
    <div className="min-h-screen w-full relative" style={{background:"#FFF8F0"}}>
      {score>=4&&<Confetti count={45}/>}
      <BgDeco items={["🎊","⭐","🎉","💛","✨","🌟","💕"]} opacity={.3}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex flex-col items-center px-4 pb-12">
        {/* Avatar circle */}
        <div className="relative mb-4">
          <div className="rounded-full overflow-hidden flex items-center justify-center" style={{width:"160px",height:"160px",border:"5px solid #FFC107",boxShadow:"0 8px 30px rgba(255,193,7,.3)"}}>
            <CharacterImage pose="celebrating" width={150}/>
          </div>
          <div className="absolute -right-4 -bottom-4 af"><EmoRobot expression="excited" width={80}/></div>
        </div>
        <h1 className="ff text-center mb-4" style={{fontSize:"40px",color:"#00838F"}}>Amazing job, {playerName||"friend"}! 🎉</h1>
        <Stars total={4} filled={score} size={42}/>

        {/* Emotion progress */}
        <div className="rounded-2xl p-6 bg-white mt-8 mb-5" style={{maxWidth:"520px",width:"95%",border:"3px solid #00BCD4",boxShadow:"0 8px 30px rgba(0,188,212,.12)"}}>
          <div className="ff mb-4" style={{fontSize:"22px",color:"#00838F"}}>Emotion Progress 📊</div>
          {emotions.map((e,i)=>(
            <div key={i} className="flex items-center gap-3 mb-4">
              <span className="fn font-bold" style={{minWidth:"110px",fontSize:"16px",color:"#37474F"}}>{e.find} {e.emoji}</span>
              <div className="flex-1 rounded-full overflow-hidden" style={{height:"18px",background:"#f0f0f0"}}>
                <div className="rounded-full h-full transition-all"
                  style={{width:e.correct_ans?"100%":"20%",background:e.color,transition:"width 1s ease"}}/>
              </div>
              <span className="fn font-bold" style={{minWidth:"40px",fontSize:"16px",color:e.correct_ans?"#4CAF50":"#EF5350"}}>
                {e.correct_ans?"1/1":"0/1"}
              </span>
            </div>
          ))}
        </div>

        {/* Mood booster card */}
        <div className="rounded-2xl p-5 bg-white mb-6 flex items-center gap-4" style={{maxWidth:"520px",width:"95%",border:"3px solid #E91E63",boxShadow:"0 6px 20px rgba(233,30,99,.12)"}}>
          <div className="afb flex-shrink-0"><EmoRobot expression="peek" width={90}/></div>
          <div>
            <div className="ff mb-2" style={{fontSize:"20px",color:"#E91E63"}}>Emo has a funny surprise for you! 😄</div>
            {moodBooster?(
              <div className="fn font-bold" style={{fontSize:"16px",color:"#546E7A"}}>🌟 You are a SUPERSTAR emotion detective! Emo is SO proud of you! 🤖❤️</div>
            ):(
              <button onClick={()=>{setMoodBooster(true);setTimeout(onBadge,800)}}
                className="ff rounded-full px-5 py-2 text-white transition-all hover:brightness-110 cursor-pointer"
                style={{background:"#00BCD4",fontSize:"16px",boxShadow:"0 4px 14px rgba(0,188,212,.4)"}}>
                Show me! ✨
              </button>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 flex-wrap justify-center">
          <Btn ch="Play Again 🔄" onClick={onPlayAgain} color="#006064" w="220px"/>
          <Btn ch="Bye bye! 👋" onClick={onBye} color="#FF9800" w="220px"/>
        </div>
      </div>
    </div>
  );
}

