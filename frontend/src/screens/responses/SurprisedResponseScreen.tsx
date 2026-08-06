import { TopBar, Btn, BgDeco } from "../../components/common/UI";
import { EmoRobot } from "../../components/common/EmoRobot";
import { CharacterImage } from "../../components/character/CharacterImage";

export function SurprisedResponseScreen({onReady,onHome,soundOn,onSound}:{onReady:()=>void;onHome:()=>void;soundOn:boolean;onSound:()=>void}){
  return(
    <div className="min-h-screen w-full relative overflow-hidden" style={{background:"linear-gradient(140deg,#CE93D8 0%,#80DEEA 100%)"}}>
      <BgDeco items={["❓","⭐","🔮","❓","💫","⭐","❓","🔮"]} opacity={.35}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex flex-col items-center px-4 pb-12">
        <div className="rounded-3xl bg-white p-8 flex flex-col items-center"
          style={{maxWidth:"700px",width:"95%",border:"4px solid #AB47BC",boxShadow:"0 20px 60px rgba(171,71,188,.25)"}}>
          <div className="afb mb-2"><EmoRobot expression="magnifying" width={180}/></div>
          <h1 className="ff text-center mb-2" style={{fontSize:"36px",color:"#6A1B9A"}}>You feel SURPRISED today! 🔍</h1>
          <p className="fn text-center mb-6 font-semibold" style={{fontSize:"21px",color:"#546E7A"}}>Let us turn your surprise into an adventure! 🚀</p>
          <div className="flex flex-wrap gap-4 justify-center mb-6">
            {[
              {emoji:"🦒",text:"Giraffes have the same number of neck bones as humans!",   bg:"#FFF9C4",border:"#FFC107"},
              {emoji:"🐙",text:"Octopuses have 3 hearts and blue blood!",                   bg:"#F3E5F5",border:"#AB47BC"},
              {emoji:"🍓",text:"Strawberries are not actually berries — bananas are!",       bg:"#E0F7FA",border:"#00BCD4"},
            ].map((f,i)=>(
              <div key={i} className="rounded-2xl p-4 fn font-bold text-center"
                style={{background:f.bg,border:`2.5px solid ${f.border}`,fontSize:"16px",color:"#37474F",maxWidth:"190px"}}>
                <div className="text-4xl mb-2">{f.emoji}</div>
                <div className="text-xs font-bold mb-1" style={{color:f.border}}>WOW FACT</div>
                {f.text}
              </div>
            ))}
          </div>
          <p className="fn text-center mb-5 font-bold" style={{fontSize:"18px",color:"#546E7A"}}>Surprise can be amazing! Let us explore together!</p>
          <div className="flex items-end gap-4">
            <CharacterImage pose="surprised" width={140}/>
            <Btn ch="I am curious! Let us explore! 🌟" onClick={onReady} color="#9C27B0" w="340px"/>
          </div>
        </div>
      </div>
    </div>
  );
}
