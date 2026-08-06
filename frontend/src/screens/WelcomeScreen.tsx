import { BgDeco } from "../components/common/UI";
import { EmoRobot } from "../components/common/EmoRobot";

export function WelcomeScreen({onPlay,playerName,setPlayerName}:{onPlay:()=>void;playerName:string;setPlayerName:(n:string)=>void}){
  return(
    <div className="min-h-screen w-full relative overflow-hidden" style={{background:"linear-gradient(140deg,#E0F7FA 0%,#B2DFDB 100%)"}}>
      <BgDeco items={["⭐","💛","✨","❤️","🌟","💫","⭐","💕","🌟","✨","🎊","⭐","💕","✨","🌟","💛","❤️","🎉"]} opacity={.38}/>
      <div className="relative z-10 flex min-h-screen" style={{flexWrap:"wrap"}}>

        {/* LEFT column */}
        <div className="flex flex-col justify-center py-16" style={{padding:"4rem 3rem 4rem 5rem",width:"55%",minWidth:"340px",flexShrink:0}}>
          <div className="ff mb-2" style={{fontSize:"clamp(36px,4.5vw,58px)",color:"#00838F",lineHeight:1.1}}>EmoLearn Lab ✨</div>
          <div className="fn mb-8 font-semibold" style={{fontSize:"clamp(16px,2vw,22px)",color:"#546E7A"}}>Learn Emotions Through Play!</div>
          <div className="ff mb-6" style={{fontSize:"clamp(22px,2.5vw,32px)",color:"#004D40",lineHeight:1.3}}>
            Hi there! I'm Emo, your AI friend!<br/>
            <span style={{fontSize:"clamp(18px,2vw,26px)"}}>What's your name? 😊</span>
          </div>
          <div className="relative mb-5" style={{maxWidth:"420px"}}>
            <span className="absolute text-2xl" style={{left:"18px",top:"50%",transform:"translateY(-50%)"}}>😊</span>
            <input type="text" value={playerName} onChange={e=>setPlayerName(e.target.value)}
              placeholder="Type your name here..." maxLength={20}
              onKeyDown={e=>e.key==="Enter"&&playerName.trim()&&onPlay()}
              className="fn font-bold w-full outline-none rounded-full transition-all"
              style={{height:"64px",paddingLeft:"54px",paddingRight:"20px",border:"3px solid #00BCD4",background:"white",color:"#004D40",fontSize:"18px",boxShadow:"0 4px 20px rgba(0,188,212,.2)",fontFamily:"'Nunito',sans-serif"}}/>
          </div>
          <button onClick={()=>playerName.trim()&&onPlay()} disabled={!playerName.trim()}
            className="ff font-bold rounded-full mb-4 transition-all hover:brightness-110 active:scale-95"
            style={{maxWidth:"420px",height:"68px",background:playerName.trim()?"#FF9800":"#ccc",color:"white",
              boxShadow:playerName.trim()?"0 8px 28px rgba(255,152,0,.45), 0 4px 0 #E65100":"none",
              fontSize:"clamp(18px,2vw,22px)",cursor:playerName.trim()?"pointer":"not-allowed"}}>
            Let's Play! 🎮
          </button>
        </div>

        {/* RIGHT column */}
        <div className="flex-1 flex flex-col items-center justify-center relative py-16" style={{minWidth:"280px"}}>
          {/* halo */}
          <div className="absolute" style={{width:"380px",height:"380px",background:"radial-gradient(circle,rgba(0,188,212,.22) 0%,transparent 70%)",borderRadius:"50%"}}/>
          {/* orbiting stars */}
          <div className="absolute asr" style={{width:"320px",height:"320px"}}>
            {["⭐","✨","💫","🌟","💛","✦"].map((s,i)=>(
              <span key={i} className="absolute text-2xl" style={{
                top:`${50-48*Math.sin(i*Math.PI/3)}%`,
                left:`${50+48*Math.cos(i*Math.PI/3)}%`,
                transform:"translate(-50%,-50%)",
                fontSize:i%2===0?"26px":"18px",
              }}>{s}</span>
            ))}
          </div>
          <div className="relative af" style={{zIndex:2}}>
            <EmoRobot expression="waving" width={300}/>
          </div>
        </div>
      </div>

      {/* bottom emotion strip */}
      <div className="absolute bottom-0 left-0 right-0 py-3" style={{borderTop:"1px solid rgba(0,188,212,.18)",background:"rgba(255,255,255,.25)"}}>
        <div className="flex gap-8 justify-center opacity-20 overflow-hidden">
          {Array.from({length:18}).map((_,i)=>(
            <span key={i} className="text-4xl">{["😊","😢","😠","😲"][i%4]}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

