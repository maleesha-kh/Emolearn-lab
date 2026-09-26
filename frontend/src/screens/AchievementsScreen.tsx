import { useEffect, useState } from "react";
import { BADGES } from "../data/badges";
import { TopBar, BgDeco } from "../components/common/UI";
import { getPlayerBadges } from "../lib/api";
import { formatShortDate } from "../lib/format";
import type { BadgeRecord } from "../types";

type Status = "idle" | "loading" | "error" | "loaded";

export function AchievementsScreen({playerId,onHome,soundOn,onSound}:{playerId:string;onHome:()=>void;soundOn:boolean;onSound:()=>void}){
  const [earned,setEarned]=useState<BadgeRecord[]>([]);
  const [status,setStatus]=useState<Status>(playerId?"loading":"idle");
  const [reloadTick,setReloadTick]=useState(0);

  useEffect(()=>{
    if(!playerId){ setStatus("idle"); return; }
    let cancelled=false;
    setStatus("loading");
    getPlayerBadges(playerId).then(res=>{
      if(cancelled)return;
      if(res.kind==="ok"){ setEarned(res.data); setStatus("loaded"); }
      else { setStatus("error"); }
    });
    return ()=>{cancelled=true;};
  },[playerId,reloadTick]);

  return(
    <div className="min-h-screen w-full relative" style={{background:"linear-gradient(140deg,#9C27B0 0%,#00BCD4 100%)"}}>
      <BgDeco items={["🏆","⭐","🌟","✨","🏅","🎖️","⭐","🌟"]} opacity={.3}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex flex-col items-center px-4 pb-12">
        <h1 className="ff text-center mb-1" style={{fontSize:"36px",color:"#FFD700",textShadow:"0 2px 15px rgba(0,0,0,.3)"}}>My Achievements 🏆</h1>
        <p className="fn text-center mb-8 font-bold text-white opacity-90" style={{fontSize:"20px"}}>Collect all the badges!</p>

        {status==="loading"&&(
          <p className="fn font-bold text-white text-center mb-8" style={{fontSize:"16px"}}>Loading your badges... 🔄</p>
        )}

        {status==="error"&&(
          <div className="flex flex-col items-center mb-8">
            <p className="fn font-bold mb-3" style={{color:"white",fontSize:"16px"}}>Emo can't connect right now 🔌</p>
            <button onClick={()=>setReloadTick(t=>t+1)}
              className="fn font-bold rounded-full px-5" style={{height:"48px",background:"white",color:"#9C27B0",border:"none",cursor:"pointer"}}>
              Try again
            </button>
          </div>
        )}

        {status==="loaded"&&(
          <div className="flex flex-wrap justify-center gap-6" style={{maxWidth:"820px",width:"95%"}}>
            {BADGES.map(b=>{
              const record=earned.find(e=>e.badge_id===b.id);
              const unlocked=!!record;
              return(
                <div key={b.id} className="flex flex-col items-center gap-2" style={{width:"140px"}}>
                  <div className="relative flex items-center justify-center rounded-full transition-all hover:scale-110"
                    style={{width:"140px",height:"140px",
                      background:unlocked?`radial-gradient(circle at 30% 30%, ${b.color}88, ${b.color})`:"#9E9E9E",
                      border:unlocked?`4px solid #FFD700`:"4px solid #BDBDBD",
                      boxShadow:unlocked?`0 8px 30px ${b.color}55,0 0 0 2px #FFD70066`:"0 4px 15px rgba(0,0,0,.2)"}}>
                    <span className="text-5xl" style={{filter:unlocked?"none":"grayscale(1) opacity(0.4)"}}>
                      {b.emoji}
                    </span>
                    {unlocked&&(
                      <div className="absolute inset-0 pointer-events-none">
                        {[0,1,2,3].map(i=>(
                          <span key={i} className="absolute text-sm atw" style={{
                            top:`${20+i*15}%`,left:`${10+i*20}%`,
                            animationDelay:`${i*.4}s`,fontSize:"10px",opacity:.7
                          }}>✦</span>
                        ))}
                      </div>
                    )}
                    {!unlocked&&(
                      <div className="absolute inset-0 flex items-end justify-end p-2">
                        <span className="text-2xl">🔒</span>
                      </div>
                    )}
                  </div>
                  <span className="fn font-bold text-center text-white" style={{fontSize:"13px",maxWidth:"130px"}}>{b.name}</span>
                  <span className="fn text-center" style={{fontSize:"11px",maxWidth:"130px",color:unlocked?"#FFD700":"rgba(255,255,255,.75)"}}>
                    {unlocked?`Earned ${formatShortDate(record!.earned_at)}`:b.hint}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
