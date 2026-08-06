import { Btn, BgDeco, Stars } from "../../components/common/UI";
import { EmoRobot } from "../../components/common/EmoRobot";
import { CharacterImage } from "../../components/character/CharacterImage";

export function TransWrongScreen({score,onContinue}:{score:number;onContinue:()=>void}){
  return(
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden" style={{background:"linear-gradient(140deg,#E1BEE7 0%,#CE93D8 100%)"}}>
      <BgDeco items={["💜","✨","💕","🌟","💜","✨","💕","🌟"]} opacity={.4}/>
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative mb-6">
          <div className="rounded-full flex items-center justify-center" style={{width:"240px",height:"240px",border:"6px solid rgba(255,255,255,.7)",boxShadow:"0 0 40px rgba(255,255,255,.35)"}}>
            <CharacterImage pose="welcoming" width={200}/>
          </div>
          <div className="absolute -bottom-4 -right-4 afb">
            <EmoRobot expression="caring" width={90}/>
          </div>
        </div>
        <h1 className="ff text-white text-center mb-2" style={{fontSize:"48px",textShadow:"0 4px 20px rgba(0,0,0,.2)"}}>Keep going! 💜</h1>
        <p className="ff text-white text-center mb-4" style={{fontSize:"30px",textShadow:"0 2px 10px rgba(0,0,0,.15)"}}>You are doing great! 🌟</p>
        <Stars total={4} filled={score} size={36}/>
        <div className="mt-8">
          <button onClick={onContinue}
            className="ff text-xl font-bold rounded-full transition-all hover:brightness-110 active:scale-95 cursor-pointer"
            style={{background:"white",color:"#9C27B0",height:"65px",width:"280px",boxShadow:"0 6px 22px rgba(0,0,0,.15)",fontSize:"20px"}}>
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}

