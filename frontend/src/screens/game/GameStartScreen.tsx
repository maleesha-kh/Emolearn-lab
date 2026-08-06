import { useState } from "react";
import { TopBar, Btn, BgDeco, Confetti } from "../../components/common/UI";
import { EmoRobot } from "../../components/common/EmoRobot";

export function GameStartScreen({onStart,onHome,soundOn,onSound}:{onStart:()=>void;onHome:()=>void;soundOn:boolean;onSound:()=>void}){
  const [count,setCount]=useState(3);
  const [go,setGo]=useState(false);
  return(
    <div className="min-h-screen w-full relative overflow-hidden" style={{background:"linear-gradient(140deg,#00BCD4 0%,#1565C0 100%)"}}>
      <Confetti count={35}/>
      <BgDeco items={["⭐","🌟","💫","✨","⭐","🌟","💫","✨","⭐","🌟"]} opacity={.4}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex flex-col items-center justify-center py-10 px-4 min-h-[calc(100vh-88px)]">
        <div className="af mb-4"><EmoRobot expression="excited" width={200}/></div>
        <h1 className="ff text-white text-center mb-3" style={{fontSize:"52px",textShadow:"0 4px 20px rgba(0,0,0,.25)"}}>Get Ready!</h1>
        <p className="fn text-white text-center mb-8 font-bold" style={{fontSize:"26px",opacity:.9}}>Time to teach Emo about emotions! 🤖</p>
        <div className="ff text-white text-center mb-6" style={{fontSize:"80px",textShadow:"0 0 30px rgba(255,255,255,.4)"}}>
          {go?"GO! 🚀":`${count}...`}
        </div>
        <div className="flex gap-6 mb-8">
          {["😊","😢","😠","😲"].map((e,i)=>(
            <span key={i} className="text-5xl animate-bounce" style={{animationDelay:`${i*.15}s`}}>{e}</span>
          ))}
        </div>
        <Btn ch="Start the Game! 🎮" onClick={()=>{setGo(true);setTimeout(onStart,600)}} color="#FF9800" w="340px"/>
      </div>
    </div>
  );
}
