import { useId } from "react";
import type { Mood } from "../../types";

export function HeatmapOverlay({emotion}:{emotion:Mood}){
  const uid=useId().replace(/:/g,"");
  const spots:Record<Mood,Array<{cx:number;cy:number;rx:number;ry:number;c:string}>>={
    happy:    [{cx:50,cy:22,rx:32,ry:26,c:"#FF4500"},{cx:20,cy:46,rx:22,ry:16,c:"#FF8C00"},{cx:78,cy:46,rx:22,ry:16,c:"#FFD700"}],
    sad:      [{cx:50,cy:22,rx:28,ry:22,c:"#4FC3F7"},{cx:35,cy:55,rx:22,ry:26,c:"#0288D1"},{cx:50,cy:72,rx:20,ry:14,c:"#29B6F6"}],
    angry:    [{cx:50,cy:20,rx:30,ry:22,c:"#FF4500"},{cx:18,cy:58,rx:20,ry:16,c:"#FF6D00"},{cx:82,cy:58,rx:20,ry:16,c:"#FF6D00"}],
    surprised:[{cx:50,cy:20,rx:36,ry:28,c:"#FF4500"},{cx:22,cy:37,rx:20,ry:14,c:"#FFD700"},{cx:78,cy:37,rx:20,ry:14,c:"#FFD700"}],
  };
  return(
    <svg viewBox="0 0 100 100" style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}} preserveAspectRatio="none">
      <defs>
        {spots[emotion].map((s,i)=>(
          <radialGradient key={i} id={`hm${uid}${i}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={s.c} stopOpacity=".75"/>
            <stop offset="55%" stopColor={s.c} stopOpacity=".35"/>
            <stop offset="100%" stopColor={s.c} stopOpacity="0"/>
          </radialGradient>
        ))}
      </defs>
      {spots[emotion].map((s,i)=>(
        <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={`url(#hm${uid}${i})`}/>
      ))}
    </svg>
  );
}

