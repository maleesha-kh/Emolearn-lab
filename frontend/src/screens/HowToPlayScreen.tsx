import { TopBar, Btn, BgDeco } from "../components/common/UI";
import { EmoRobot } from "../components/common/EmoRobot";

export function HowToPlayScreen({onStart,onHome,soundOn,onSound}:{onStart:()=>void;onHome:()=>void;soundOn:boolean;onSound:()=>void}){
  return(
    <div className="min-h-screen w-full relative" style={{background:"linear-gradient(140deg,#FFFDE7 0%,#FFF8E1 100%)"}}>
      <BgDeco items={["⭐","✨","💛","🌟","⭐","✨","💫","🎊"]} opacity={.28}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex justify-center items-start gap-6 pb-10 px-4" style={{paddingTop:"8px"}}>
        {/* card */}
        <div className="rounded-3xl p-8 bg-white" style={{width:"min(600px,90vw)",border:"3px solid #FFC107",boxShadow:"0 20px 60px rgba(255,193,7,.2)"}}>
          <div className="ff text-center mb-7" style={{fontSize:"40px",color:"#00838F"}}>How to Play! 🎮</div>
          {[
            {num:1,emoji:"😊",text:"Tell Emo how you feel today",         bg:"#FFF9C4",border:"#FFC107"},
            {num:2,emoji:"🌟",text:"Emo gives you a surprise activity!",   bg:"#E3F2FD",border:"#00BCD4"},
            {num:3,emoji:"🔍",text:"Play the emotion finding game",         bg:"#FFF3E0",border:"#FF9800"},
            {num:4,emoji:"⭐",text:"Earn stars for each correct answer",    bg:"#E8F5E9",border:"#4CAF50"},
          ].map(s=>(
            <div key={s.num} className="flex items-center gap-4 mb-4 rounded-2xl p-4 fn font-bold text-lg"
              style={{background:s.bg,border:`2.5px solid ${s.border}`}}>
              <span className="ff rounded-full flex items-center justify-center text-white"
                style={{background:s.border,minWidth:"40px",height:"40px",fontSize:"20px"}}>{s.num}</span>
              <span className="text-4xl">{s.emoji}</span>
              <span style={{color:"#37474F"}}>{s.text}</span>
            </div>
          ))}
          <Btn ch="Got it! Let's Start! 🚀" onClick={onStart} className="mt-2"/>
        </div>
        {/* Emo on right */}
        <div className="hidden lg:flex items-center af" style={{paddingTop:"60px"}}>
          <EmoRobot expression="curious" width={200}/>
        </div>
      </div>
    </div>
  );
}

