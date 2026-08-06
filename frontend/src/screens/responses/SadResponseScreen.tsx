import { TopBar, Btn, BgDeco } from "../../components/common/UI";
import { EmoRobot } from "../../components/common/EmoRobot";
import { CharacterImage } from "../../components/character/CharacterImage";

export function SadResponseScreen({onReady,onHome,soundOn,onSound}:{onReady:()=>void;onHome:()=>void;soundOn:boolean;onSound:()=>void}){
  return(
    <div className="min-h-screen w-full relative overflow-hidden" style={{background:"linear-gradient(140deg,#FFE0B2 0%,#FFCCBC 100%)"}}>
      <BgDeco items={["💛","🌸","✨","🌼","💕","⭐","💛","🌸"]} opacity={.35}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex flex-col items-center px-4 pb-12">
        <div className="rounded-3xl bg-white p-8 flex flex-col items-center relative"
          style={{maxWidth:"680px",width:"95%",border:"4px solid #FF9800",boxShadow:"0 20px 60px rgba(255,152,0,.25)"}}>
          <div className="afb mb-2"><EmoRobot expression="caring" width={155}/></div>
          <h1 className="ff text-center mb-2" style={{fontSize:"36px",color:"#00838F"}}>It is okay to feel sad 💛</h1>
          <p className="fn text-center mb-6 font-semibold" style={{fontSize:"22px",color:"#546E7A"}}>We are here for you! Let us cheer you up!</p>
          <p className="ff mb-4 text-center" style={{fontSize:"22px",color:"#FF9800"}}>Try these together!</p>
          <div className="flex flex-col gap-4 w-full mb-6">
            {[
              {emoji:"🌬️",text:"Take 3 deep breaths... In... and Out",bg:"#FFF3E0",border:"#FF9800"},
              {emoji:"🤪",text:"Make the silliest face you can!",bg:"#FFF9C4",border:"#FFC107"},
              {emoji:"🙌",text:"Shake your hands and shake the sadness away!",bg:"#FFF8F1",border:"#FFB74D"},
            ].map((c,i)=>(
              <div key={i} className="rounded-2xl flex items-center gap-4 px-5 py-4 fn font-bold"
                style={{background:c.bg,border:`2.5px solid ${c.border}`,fontSize:"18px",color:"#37474F"}}>
                <span className="text-3xl">{c.emoji}</span>{c.text}
              </div>
            ))}
          </div>
          <div className="flex items-end gap-6">
            <CharacterImage pose="welcoming" width={160}/>
            <Btn ch="I feel better! Let us play! 😊" onClick={onReady} w="340px"/>
          </div>
        </div>
      </div>
    </div>
  );
}
