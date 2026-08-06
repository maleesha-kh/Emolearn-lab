export function TopBar({onHome,onSound,soundOn}:{onHome:()=>void;onSound:()=>void;soundOn:boolean}){
  return(
    <div className="flex justify-between items-center px-6 py-4 relative z-20">
      <button onClick={onHome} title="Home"
        className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-2xl transition-transform hover:scale-110 active:scale-95"
        style={{boxShadow:"0 4px 16px rgba(0,0,0,.12)"}}>🏠</button>
      <div className="ff text-2xl" style={{color:"#00838F"}}>EmoLearn Lab ✨</div>
      <button onClick={onSound} title="Sound"
        className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-2xl transition-transform hover:scale-110 active:scale-95"
        style={{boxShadow:"0 4px 16px rgba(0,0,0,.12)"}}>
        {soundOn?"🔊":"🔇"}
      </button>
    </div>
  );
}


export function Btn({ch,onClick,color="#FF9800",textColor="white",w="100%",disabled=false,className=""}:{ch:React.ReactNode;onClick?:()=>void;color?:string;textColor?:string;w?:string;disabled?:boolean;className?:string}){
  return(
    <button onClick={onClick} disabled={disabled}
      className={`ff text-xl font-bold rounded-full transition-all hover:brightness-110 active:scale-95 ${disabled?"opacity-50 cursor-not-allowed":"cursor-pointer"} ${className}`}
      style={{background:disabled?"#ccc":color,color:disabled?"#aaa":textColor,height:"64px",width:w,boxShadow:disabled?"none":`0 6px 22px ${color}55`,fontSize:"20px"}}>
      {ch}
    </button>
  );
}


export function Stars({total=4,filled=0,size=32}:{total?:number;filled?:number;size?:number}){
  return(
    <div className="flex gap-2 justify-center">
      {Array.from({length:total}).map((_,i)=>(
        <span key={i} className="ash" style={{fontSize:size,animationDelay:`${i*.15}s`,opacity:i<filled?1:.28}}>
          {i<filled?"⭐":"☆"}
        </span>
      ))}
    </div>
  );
}


export function Confetti({count=50}:{count?:number}){
  const cols=["#FFC107","#FF9800","#E91E63","#9C27B0","#4CAF50","#00BCD4","#FF5722","#3F51B5","#FFD700"];
  const shapes=["●","■","▲","♦","✦"];
  return(
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{zIndex:4}}>
      {Array.from({length:count}).map((_,i)=>(
        <div key={i} className="absolute select-none"
          style={{left:`${(i*2.17+4)%100}%`,top:"-40px",fontSize:`${12+(i%4)*4}px`,color:cols[i%cols.length],
            animation:`confettiFall ${2.4+(i%5)*.55}s linear ${(i*.09)%2.8}s infinite`}}>
          {shapes[i%shapes.length]}
        </div>
      ))}
    </div>
  );
}


export function BgDeco({items=["⭐","💛","✨","❤️","🌟","💫","⭐","💕","🌟","✨"],opacity=.35}:{items?:string[];opacity?:number}){
  const pos=[
    {left:"3%",top:"9%"},{left:"11%",top:"74%"},{left:"21%",top:"19%"},{left:"38%",top:"6%"},
    {left:"56%",top:"88%"},{left:"70%",top:"14%"},{left:"83%",top:"62%"},{left:"92%",top:"32%"},
    {left:"48%",top:"46%"},{left:"7%",top:"43%"},{left:"62%",top:"3%"},{left:"30%",top:"90%"},
  ];
  return(
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{zIndex:0}}>
      {items.map((item,i)=>(
        <div key={i} className="absolute text-3xl af"
          style={{...pos[i%pos.length],opacity,animationDelay:`${i*.4}s`,animationDuration:`${2.4+(i%3)*.7}s`}}>
          {item}
        </div>
      ))}
    </div>
  );
}

