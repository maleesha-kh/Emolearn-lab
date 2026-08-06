import { Btn, BgDeco, Confetti, Stars } from "../../components/common/UI";
import { EmoRobot } from "../../components/common/EmoRobot";
import { CharacterImage } from "../../components/character/CharacterImage";

export function TransCorrectScreen({score,onContinue}:{score:number;onContinue:()=>void}){
  return(
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden" style={{background:"linear-gradient(140deg,#CCFF90 0%,#AED581 100%)"}}>
      <Confetti count={55}/>
      <BgDeco items={["🎊","⭐","🎉","✨","🌟","💛","🎊","⭐"]} opacity={.5}/>
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative mb-6">
          <div className="rounded-full flex items-center justify-center" style={{width:"240px",height:"240px",border:"6px solid white",boxShadow:"0 0 50px rgba(255,255,255,.5)"}}>
            <CharacterImage pose="jumping" width={200}/>
          </div>
          <div className="absolute -bottom-4 -right-4 af">
            <EmoRobot expression="jumping" width={90}/>
          </div>
        </div>
        <h1 className="ff text-white text-center mb-2" style={{fontSize:"52px",textShadow:"0 4px 20px rgba(0,0,0,.2)"}}>Amazing! 🎉</h1>
        <div className="ff text-center mb-4" style={{fontSize:"48px",color:"#FFD700",textShadow:"0 4px 20px rgba(0,0,0,.2)"}}>+1 Star! ⭐</div>
        <Stars total={4} filled={score} size={38}/>
        <div className="mt-8">
          <Btn ch="Continue →" onClick={onContinue} w="280px"/>
        </div>
      </div>
    </div>
  );
}

