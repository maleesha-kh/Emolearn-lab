import { useEffect, useState } from "react";
import { TopBar, Btn, BgDeco, Stars } from "../components/common/UI";
import { Avatar } from "../components/common/Avatar";
import { EI } from "../data/emotions";
import { getProfile } from "../lib/api";
import { formatShortDate } from "../lib/format";
import type { ProfileData, Mood } from "../types";

const EMOTION_ORDER: Mood[] = ["happy", "sad", "angry", "surprised"];

type Status = "idle" | "loading" | "error" | "loaded";

export function ProfileScreen({playerId,playerName,avatarId,onNewGame,onHome,soundOn,onSound,onParent,onAchievements,onSwitchPlayer}:{playerId:string;playerName:string;avatarId:string;onNewGame:()=>void;onHome:()=>void;soundOn:boolean;onSound:()=>void;onParent:()=>void;onAchievements:()=>void;onSwitchPlayer:()=>void}){
  const [profile,setProfile]=useState<ProfileData|null>(null);
  const [status,setStatus]=useState<Status>(playerId?"loading":"idle");
  const [reloadTick,setReloadTick]=useState(0);

  useEffect(()=>{
    if(!playerId){ setStatus("idle"); return; }
    let cancelled=false;
    setStatus("loading");
    getProfile(playerId).then(res=>{
      if(cancelled)return;
      if(res.kind==="ok"){ setProfile(res.data); setStatus("loaded"); }
      else { setStatus("error"); }
    });
    return ()=>{cancelled=true;};
  },[playerId,reloadTick]);

  return(
    <div className="min-h-screen w-full relative" style={{background:"linear-gradient(140deg,#00BCD4 0%,#80DEEA 100%)"}}>
      <BgDeco items={["⭐","✨","💛","🌟","⭐","✨"]} opacity={.25}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex flex-col items-center px-4 pb-12">
        <h1 className="ff text-white text-center mb-6" style={{fontSize:"32px",textShadow:"0 2px 10px rgba(0,0,0,.15)"}}>My Profile 👤</h1>
        <div className="rounded-3xl bg-white p-8 flex flex-col items-center" style={{maxWidth:"540px",width:"95%",border:"4px solid #00BCD4",boxShadow:"0 20px 60px rgba(0,188,212,.25)"}}>
          {/* Avatar */}
          <div className="rounded-full overflow-hidden mb-4" style={{width:"140px",height:"140px",border:"4px solid #FFC107",boxShadow:"0 8px 25px rgba(255,193,7,.3)"}}>
            <Avatar avatarId={avatarId} size={140}/>
          </div>
          <div className="ff mb-3" style={{fontSize:"42px",color:"#004D40"}}>{playerName||"Explorer"}</div>

          {status==="loading"&&(
            <div className="fn font-bold mb-6" style={{color:"#546E7A",fontSize:"16px"}}>Loading your profile... 🔄</div>
          )}

          {status==="error"&&(
            <div className="flex flex-col items-center mb-6">
              <p className="fn font-bold mb-3" style={{color:"#EF5350",fontSize:"16px"}}>Emo can't connect right now 🔌</p>
              <button onClick={()=>setReloadTick(t=>t+1)}
                className="fn font-bold rounded-full px-5" style={{height:"48px",background:"#00BCD4",color:"white",border:"none",cursor:"pointer"}}>
                Try again
              </button>
            </div>
          )}

          {status==="loaded"&&profile&&(
            <>
              <div className="ff rounded-full px-5 py-2 text-white mb-6" style={{background:"#00BCD4",fontSize:"18px"}}>
                Learning Stars ⭐ {profile.total_stars} total
              </div>

              {profile.sessions_played>0&&(
                <div className="w-full mb-6">
                  <div className="ff mb-3" style={{fontSize:"20px",color:"#00838F"}}>My Emotion Scores</div>
                  <div className="grid grid-cols-2 gap-3">
                    {EMOTION_ORDER.map(mood=>{
                      const e=EI[mood];
                      const stat=profile.emotion_stats[mood];
                      return(
                        <div key={mood} className="rounded-2xl p-3 text-center fn font-bold"
                          style={{background:e.bg,border:`2px solid ${e.color}`,fontSize:"15px",color:e.color}}>
                          {e.label} {e.emoji}<br/>
                          <span className="ff text-2xl" style={{color:e.color}}>
                            {stat.attempts===0?"Not tried yet":`${stat.correct}/${stat.attempts}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sessions played */}
              <div className="w-full mb-4">
                <div className="ff mb-2" style={{fontSize:"20px",color:"#00838F"}}>Sessions Played</div>
                <div className="ff text-center" style={{fontSize:"56px",color:"#00BCD4"}}>{profile.sessions_played}</div>
              </div>

              {profile.sessions_played>0&&(
                <div className="w-full mb-6">
                  <div className="ff mb-3" style={{fontSize:"18px",color:"#00838F"}}>My Sessions</div>
                  {profile.recent_sessions.map(s=>(
                    <div key={s.id} className="flex flex-wrap items-center gap-3 mb-2 rounded-xl px-4 py-3 fn font-bold"
                      style={{background:"#F8F9FA",border:"1.5px solid #E0E0E0",fontSize:"15px"}}>
                      <span style={{color:"#546E7A",minWidth:"55px"}}>{s.finished_at?formatShortDate(s.finished_at):""}</span>
                      <Stars total={4} filled={s.stars??0} size={18}/>
                      <div className="flex gap-1 ml-auto">
                        {[...s.rounds].sort((a,b)=>a.round_no-b.round_no).map(r=>(
                          <span key={r.round_no} className="text-lg">{r.child_correct?"✅":"❌"}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {profile.sessions_played===0&&(
                <div className="fn font-bold text-center mb-4" style={{color:"#546E7A",fontSize:"16px"}}>
                  Play your first game to fill this in! 🎮
                </div>
              )}
            </>
          )}

          <Btn ch="Start New Game 🎮" onClick={onNewGame} className="w-full mb-3"/>
          <button onClick={onAchievements} className="fn font-bold text-center w-full"
            style={{color:"#00838F",fontSize:"16px",minHeight:"44px",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>
            View Achievements 🏆
          </button>
          <div className="flex justify-between items-center w-full">
            <button onClick={onSwitchPlayer} className="fn font-bold" style={{color:"#9E9E9E",fontSize:"14px",minHeight:"44px",paddingRight:"8px",background:"none",border:"none",cursor:"pointer"}}>
              Switch Player
            </button>
            <button onClick={onParent} className="text-2xl hover:scale-110 transition-transform inline-flex items-center justify-center" title="Parent/Teacher"
              style={{width:"44px",height:"44px"}}>⚙️</button>
          </div>
        </div>
      </div>
    </div>
  );
}
