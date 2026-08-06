import { useState } from "react";
import { TopBar, Btn, BgDeco } from "../../components/common/UI";
import { EmoRobot } from "../../components/common/EmoRobot";
import { CharacterImage } from "../../components/character/CharacterImage";

export function AngryResponseScreen({onReady,onHome,soundOn,onSound}:{onReady:()=>void;onHome:()=>void;soundOn:boolean;onSound:()=>void}){
  const [done,setDone]=useState(false);
  return(
    <div className="min-h-screen w-full relative overflow-hidden" style={{background:"linear-gradient(140deg,#80CBC4 0%,#B2EBF2 100%)"}}>
      <BgDeco items={["🌊","❄️","💙","🌀","💎","🌊","❄️"]} opacity={.3}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex flex-col items-center px-4 pb-12">
        <div className="rounded-3xl bg-white p-8 flex flex-col items-center"
          style={{maxWidth:"680px",width:"95%",border:"4px solid #00BCD4",boxShadow:"0 20px 60px rgba(0,188,212,.2)"}}>
          <div className="afb mb-2"><EmoRobot expression="calm" width={150}/></div>
          <h1 className="ff text-center mb-2" style={{fontSize:"36px",color:"#00838F"}}>It is okay to feel angry 🌊</h1>
          <p className="fn text-center mb-6 font-semibold" style={{fontSize:"20px",color:"#546E7A"}}>Let us calm down together step by step</p>
          <div className="flex flex-col gap-4 w-full mb-6">
            {[
              {num:"1️⃣",text:"Shake your hands REALLY fast... then let go 🙌",bg:"#E3F2FD",border:"#42A5F5"},
              {num:"2️⃣",text:"Count slowly: 1... 2... 3... 4... 5 ⬇️",            bg:"#E0F7FA",border:"#00BCD4"},
              {num:"3️⃣",text:"Take one big breath: IN... and OUT 🌬️",              bg:"#E8F5E9",border:"#66BB6A"},
            ].map((s,i)=>(
              <div key={i} className="rounded-2xl flex items-center gap-4 px-5 py-4 fn font-bold cursor-pointer transition-all hover:scale-102"
                style={{background:s.bg,border:`2.5px solid ${s.border}`,fontSize:"18px",color:"#004D40"}}>
                <span className="text-3xl">{s.num}</span>{s.text}
              </div>
            ))}
          </div>
          {done&&<div className="text-5xl mb-4 api">✅</div>}
          <div className="flex flex-col items-center gap-4 w-full">
            <CharacterImage pose="calm" width={140}/>
            <Btn ch={done?"I feel calmer! Let us play! 💚":"Mark steps done ✓"}
              onClick={()=>done?onReady():setDone(true)} color={done?"#4CAF50":"#00BCD4"} w="380px"/>
          </div>
        </div>
      </div>
    </div>
  );
}
