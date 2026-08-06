import { EmoRobot } from "./EmoRobot";
import { Confetti, Btn } from "./UI";

export function BadgeModal({onClose}:{onClose:()=>void}){
  return(
    <div className="fixed inset-0 flex items-center justify-center" style={{background:"rgba(0,0,0,.55)",zIndex:100}}>
      <div className="relative flex flex-col items-center rounded-3xl p-8 api"
        style={{width:"380px",maxWidth:"92vw",background:"white",border:"4px solid #FFD700",
          boxShadow:"0 0 60px rgba(255,215,0,.5),0 20px 60px rgba(0,0,0,.25)"}}>
        {/* Gold rays */}
        <div className="absolute" style={{top:"-20px",left:"50%",transform:"translateX(-50%)"}}>
          {[0,30,60,90,120,150,180,210,240,270,300,330].map(a=>(
            <div key={a} className="absolute" style={{
              width:"2px",height:"40px",background:"linear-gradient(#FFD700,transparent)",
              transformOrigin:"bottom center",transform:`rotate(${a}deg)`,left:"0px",top:"-40px"
            }}/>
          ))}
        </div>

        <div className="rounded-full flex items-center justify-center mb-4 ash"
          style={{width:"110px",height:"110px",background:"radial-gradient(circle at 30% 30%,#FFE082,#FFD600)",
            border:"4px solid #FFD700",boxShadow:"0 8px 30px rgba(255,193,7,.5)",fontSize:"52px"}}>
          🔍
        </div>

        <div className="ff text-center mb-1" style={{fontSize:"26px",color:"#FFD700"}}>New Badge Unlocked! 🎉</div>
        <div className="ff text-center mb-4" style={{fontSize:"22px",color:"#00838F"}}>Emotion Explorer 🔍</div>

        <div className="absolute bottom-4 right-4">
          <div className="afb"><EmoRobot expression="excited" width={70}/></div>
        </div>

        <Confetti count={30}/>
        <Btn ch="Nice! ✨" onClick={onClose} color="#FF9800" w="200px"/>
      </div>
    </div>
  );
}

