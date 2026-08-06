import { TopBar, Btn, BgDeco } from "../components/common/UI";
import { CharacterImage } from "../components/character/CharacterImage";

export function ProfileScreen({playerName,totalStars,onNewGame,onHome,soundOn,onSound,onParent,onAchievements}:{playerName:string;totalStars:number;onNewGame:()=>void;onHome:()=>void;soundOn:boolean;onSound:()=>void;onParent:()=>void;onAchievements:()=>void}){
  const sessions=[
    {date:"Jul 20",stars:4,results:[true,true,true,true]},
    {date:"Jul 19",stars:3,results:[true,true,false,true]},
    {date:"Jul 18",stars:2,results:[true,false,true,false]},
  ];
  const bestScores=[
    {label:"Happy 😊",score:"2/4",color:"#FFC107",bg:"#FFF9C4"},
    {label:"Sad 😢",   score:"3/4",color:"#42A5F5",bg:"#E3F2FD"},
    {label:"Angry 😠", score:"1/4",color:"#EF5350",bg:"#FFEBEE"},
    {label:"Surprised 😲",score:"2/4",color:"#AB47BC",bg:"#F3E5F5"},
  ];
  return(
    <div className="min-h-screen w-full relative" style={{background:"linear-gradient(140deg,#00BCD4 0%,#80DEEA 100%)"}}>
      <BgDeco items={["⭐","✨","💛","🌟","⭐","✨"]} opacity={.25}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex flex-col items-center px-4 pb-12">
        <h1 className="ff text-white text-center mb-6" style={{fontSize:"32px",textShadow:"0 2px 10px rgba(0,0,0,.15)"}}>My Profile 👤</h1>
        <div className="rounded-3xl bg-white p-8 flex flex-col items-center" style={{maxWidth:"540px",width:"95%",border:"4px solid #00BCD4",boxShadow:"0 20px 60px rgba(0,188,212,.25)"}}>
          {/* Avatar */}
          <div className="rounded-full overflow-hidden mb-4" style={{width:"140px",height:"140px",border:"4px solid #FFC107",boxShadow:"0 8px 25px rgba(255,193,7,.3)"}}>
            <CharacterImage pose="confident" width={140}/>
          </div>
          <div className="ff mb-3" style={{fontSize:"42px",color:"#004D40"}}>{playerName||"Explorer"}</div>
          <div className="ff rounded-full px-5 py-2 text-white mb-6" style={{background:"#00BCD4",fontSize:"18px"}}>
            Learning Stars ⭐ {totalStars} total
          </div>

          {/* Best scores */}
          <div className="w-full mb-6">
            <div className="ff mb-3" style={{fontSize:"20px",color:"#00838F"}}>My Best Scores</div>
            <div className="grid grid-cols-2 gap-3">
              {bestScores.map(s=>(
                <div key={s.label} className="rounded-2xl p-3 text-center fn font-bold"
                  style={{background:s.bg,border:`2px solid ${s.color}`,fontSize:"15px",color:s.color}}>
                  {s.label}<br/><span className="ff text-2xl" style={{color:s.color}}>{s.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sessions played */}
          <div className="w-full mb-4">
            <div className="ff mb-2" style={{fontSize:"20px",color:"#00838F"}}>Sessions Played</div>
            <div className="ff text-center" style={{fontSize:"56px",color:"#00BCD4"}}>{sessions.length}</div>
          </div>

          {/* Session history */}
          <div className="w-full mb-6">
            <div className="ff mb-3" style={{fontSize:"18px",color:"#00838F"}}>My Sessions</div>
            {sessions.map((s,i)=>(
              <div key={i} className="flex items-center gap-3 mb-2 rounded-xl px-4 py-3 fn font-bold"
                style={{background:"#F8F9FA",border:"1.5px solid #E0E0E0",fontSize:"15px"}}>
                <span style={{color:"#546E7A",minWidth:"55px"}}>{s.date}</span>
                <span>{"⭐".repeat(s.stars)}{"☆".repeat(4-s.stars)}</span>
                <div className="flex gap-1 ml-auto">
                  {s.results.map((r,j)=>(
                    <span key={j} className="text-lg">{r?"✅":"❌"}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Btn ch="Start New Game 🎮" onClick={onNewGame} className="w-full mb-3"/>
          <button onClick={onAchievements} className="fn font-bold text-center w-full mb-2"
            style={{color:"#00838F",fontSize:"16px",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>
            View Achievements 🏆
          </button>
          <div className="flex justify-between items-center w-full mt-1">
            <button className="fn font-bold" style={{color:"#9E9E9E",fontSize:"14px",background:"none",border:"none",cursor:"pointer"}}>
              Switch Player
            </button>
            <button onClick={onParent} className="text-2xl hover:scale-110 transition-transform" title="Parent/Teacher">⚙️</button>
          </div>
        </div>
      </div>
    </div>
  );
}

