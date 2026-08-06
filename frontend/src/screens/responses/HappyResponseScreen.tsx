import { TopBar, Btn, BgDeco, Confetti } from "../../components/common/UI";
import { EmoRobot } from "../../components/common/EmoRobot";
import { CharacterImage } from "../../components/character/CharacterImage";

export function HappyResponseScreen({playerName,onReady,onHome,soundOn,onSound}:{playerName:string;onReady:()=>void;onHome:()=>void;soundOn:boolean;onSound:()=>void}){
  return(
    <div className="min-h-screen w-full relative overflow-hidden" style={{background:"linear-gradient(140deg,#FFD700 0%,#FFA726 100%)"}}>
      <Confetti count={40}/>
      <BgDeco items={["🎊","⭐","✨","🎉","💛","🌟","🎊","⭐","🎈"]} opacity={.5}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex flex-col items-center px-4 pb-12">
        <div className="rounded-3xl bg-white p-8 flex flex-col items-center relative"
          style={{maxWidth:"700px",width:"95%",border:"4px solid #FFD700",boxShadow:"0 20px 60px rgba(255,215,0,.35)"}}>
          <div className="af mb-2"><EmoRobot expression="jumping" width={160}/></div>
          <h1 className="ff text-center mb-2" style={{fontSize:"38px",color:"#004D40"}}>You feel HAPPY today! 🎉</h1>
          <p className="fn text-center mb-6 font-semibold" style={{fontSize:"22px",color:"#546E7A"}}>Let's make your happy feeling even BIGGER!</p>
          <div className="flex flex-wrap gap-4 justify-center mb-6">
            {[
              {emoji:"💃",text:"Do a happy wiggle dance!",bg:"#FFF9C4",border:"#FFC107"},
              {emoji:"😁",text:"Smile as wide as you can!",bg:"#FFE0B2",border:"#FF9800"},
              {emoji:"🎊",text:"Give yourself a big hug!",bg:"#FFF8E1",border:"#FFD700"},
            ].map((b,i)=>(
              <div key={i} className="rounded-full flex items-center gap-3 px-6 py-4 fn font-bold"
                style={{background:b.bg,border:`3px solid ${b.border}`,fontSize:"18px",color:"#37474F"}}>
                <span className="text-3xl">{b.emoji}</span>{b.text}
              </div>
            ))}
          </div>
          <Btn ch="I'm ready to play! 🚀" onClick={onReady} w="400px"/>
        </div>
        {/* Girl in background */}
        <div className="absolute right-4 bottom-0 opacity-30 pointer-events-none hidden xl:block">
          <CharacterImage pose="jumping" width={220}/>
        </div>
      </div>
    </div>
  );
}
