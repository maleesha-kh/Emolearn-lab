import { useState } from "react";
import { TopBar, Btn, BgDeco } from "../../components/common/UI";
import { EmoRobot } from "../../components/common/EmoRobot";
import { CharacterImage } from "../../components/character/CharacterImage";
import { pickRandomFacts } from "../../data/surprisedFacts";
import { playSound } from "../../lib/sounds";

export function SurprisedResponseScreen({onReady,onHome,soundOn,onSound}:{onReady:()=>void;onHome:()=>void;soundOn:boolean;onSound:()=>void}){
  const [facts]=useState(()=>pickRandomFacts(3));
  const [revealed,setRevealed]=useState<boolean[]>([false,false,false]);

  const revealedCount=revealed.filter(Boolean).length;
  const allRevealed=revealedCount===facts.length;

  function reveal(i:number){
    if(revealed[i])return;
    playSound("pop",soundOn);
    const next=[...revealed]; next[i]=true; setRevealed(next);
  }

  return(
    <div className="min-h-screen w-full relative overflow-hidden" style={{background:"linear-gradient(140deg,#CE93D8 0%,#80DEEA 100%)"}}>
      <BgDeco items={["❓","⭐","🔮","❓","💫","⭐","❓","🔮"]} opacity={.35}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex flex-col items-center px-4 pb-12">
        <div className="rounded-3xl bg-white p-8 flex flex-col items-center"
          style={{maxWidth:"700px",width:"95%",border:"4px solid #AB47BC",boxShadow:"0 20px 60px rgba(171,71,188,.25)"}}>
          <div className="afb mb-2"><EmoRobot expression="magnifying" width={180}/></div>
          <h1 className="ff text-center mb-2" style={{fontSize:"36px",color:"#6A1B9A"}}>You feel SURPRISED today! 🔍</h1>
          <p className="fn text-center mb-2 font-semibold" style={{fontSize:"21px",color:"#546E7A"}}>Let us turn your surprise into an adventure! 🚀</p>
          <p className="fn text-center mb-6 font-bold" style={{fontSize:"13px",color:"#8E24AA"}}>{revealedCount}/{facts.length} facts revealed — tap a card!</p>

          <div className="flex flex-wrap gap-4 justify-center mb-6" style={{perspective:"1000px"}}>
            {facts.map((f,i)=>{
              const isRevealed=revealed[i];
              return(
                <button key={i} onClick={()=>reveal(i)} className="relative" style={{width:"190px",height:"170px",cursor:isRevealed?"default":"pointer"}}>
                  <div className="absolute inset-0 rounded-2xl transition-transform duration-500"
                    style={{transformStyle:"preserve-3d",transform:isRevealed?"rotateY(180deg)":"rotateY(0deg)"}}>
                    <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center fn font-bold"
                      style={{background:"#F3E5F5",border:"2.5px solid #AB47BC",backfaceVisibility:"hidden",color:"#6A1B9A"}}>
                      <div className="text-4xl mb-2">❓</div>
                      <div style={{fontSize:"13px"}}>Tap to reveal!</div>
                    </div>
                    <div className="absolute inset-0 rounded-2xl p-4 flex flex-col items-center justify-center fn font-bold text-center"
                      style={{background:"#E0F7FA",border:"2.5px solid #00BCD4",backfaceVisibility:"hidden",transform:"rotateY(180deg)",fontSize:"14px",color:"#37474F"}}>
                      <div className="text-4xl mb-2">{f.emoji}</div>
                      <div className="text-xs font-bold mb-1" style={{color:"#00838F"}}>WOW FACT</div>
                      {f.text}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="fn text-center mb-5 font-bold" style={{fontSize:"18px",color:"#546E7A"}}>Surprise can be amazing! Let us explore together!</p>
          <div className="flex items-end gap-4">
            <CharacterImage pose="surprised" width={140}/>
            <Btn ch={allRevealed?"I am curious! Let us explore! 🌟":`Reveal ${facts.length-revealedCount} more fact${facts.length-revealedCount===1?"":"s"} first`}
              onClick={()=>allRevealed&&onReady()} color="#9C27B0" disabled={!allRevealed} w="340px"/>
          </div>
        </div>
      </div>
    </div>
  );
}