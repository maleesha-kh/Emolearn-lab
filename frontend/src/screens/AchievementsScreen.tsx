import { BADGES } from "../data/badges";
import { TopBar, BgDeco } from "../components/common/UI";

export function AchievementsScreen({onHome,soundOn,onSound}:{onHome:()=>void;soundOn:boolean;onSound:()=>void}){
  return(
    <div className="min-h-screen w-full relative" style={{background:"linear-gradient(140deg,#9C27B0 0%,#00BCD4 100%)"}}>
      <BgDeco items={["🏆","⭐","🌟","✨","🏅","🎖️","⭐","🌟"]} opacity={.3}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex flex-col items-center px-4 pb-12">
        <h1 className="ff text-center mb-1" style={{fontSize:"36px",color:"#FFD700",textShadow:"0 2px 15px rgba(0,0,0,.3)"}}>My Achievements 🏆</h1>
        <p className="fn text-center mb-8 font-bold text-white opacity-90" style={{fontSize:"20px"}}>Collect all the badges!</p>
        <div className="grid gap-6 justify-items-center" style={{gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",maxWidth:"820px",width:"95%"}}>
          {BADGES.map(b=>(
            <div key={b.id} className="flex flex-col items-center gap-2">
              <div className="relative flex items-center justify-center rounded-full transition-all hover:scale-110"
                style={{width:"140px",height:"140px",
                  background:b.unlocked?`radial-gradient(circle at 30% 30%, ${b.color}88, ${b.color})`:"#9E9E9E",
                  border:b.unlocked?`4px solid #FFD700`:"4px solid #BDBDBD",
                  boxShadow:b.unlocked?`0 8px 30px ${b.color}55,0 0 0 2px #FFD70066`:"0 4px 15px rgba(0,0,0,.2)"}}>
                <span className="text-5xl" style={{filter:b.unlocked?"none":"grayscale(1) opacity(0.4)"}}>
                  {b.emoji}
                </span>
                {b.unlocked&&(
                  <div className="absolute inset-0 pointer-events-none">
                    {[0,1,2,3].map(i=>(
                      <span key={i} className="absolute text-sm atw" style={{
                        top:`${20+i*15}%`,left:`${10+i*20}%`,
                        animationDelay:`${i*.4}s`,fontSize:"10px",opacity:.7
                      }}>✦</span>
                    ))}
                  </div>
                )}
                {!b.unlocked&&(
                  <div className="absolute inset-0 flex items-end justify-end p-2">
                    <span className="text-2xl">🔒</span>
                  </div>
                )}
              </div>
              <span className="fn font-bold text-center text-white" style={{fontSize:"13px",maxWidth:"130px"}}>{b.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

