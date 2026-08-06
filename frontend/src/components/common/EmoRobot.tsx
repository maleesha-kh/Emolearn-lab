import { useId } from "react";
import type { EmoE } from "../../types";

// ─────────────────────────────────────────────────────────────
// EMO ROBOT SVG
// ─────────────────────────────────────────────────────────────
export function EmoRobot({expression="happy" as EmoE, width=160, className=""}:{expression?:EmoE;width?:number;className?:string}) {
  const uid = useId().replace(/:/g,"");
  const bx=110, by=118, br=62;

  const mouth = ()=>{
    switch(expression){
      case "excited": case "jumping":
        return <ellipse cx={bx} cy={by+18} rx={15} ry={10} fill="#00574B"/>;
      case "calm":
        return <line x1={bx-14} y1={by+18} x2={bx+14} y2={by+18} stroke="#00574B" strokeWidth="3.5" strokeLinecap="round"/>;
      case "caring":
        return <path d={`M${bx-14} ${by+15} Q${bx} ${by+28} ${bx+14} ${by+15}`} fill="none" stroke="#00574B" strokeWidth="3.5" strokeLinecap="round"/>;
      case "peek":
        return <path d={`M${bx-8} ${by+16} Q${bx} ${by+22} ${bx+8} ${by+16}`} fill="none" stroke="#00574B" strokeWidth="3" strokeLinecap="round"/>;
      default:
        return <path d={`M${bx-16} ${by+14} Q${bx} ${by+28} ${bx+16} ${by+14}`} fill="none" stroke="#00574B" strokeWidth="3.5" strokeLinecap="round"/>;
    }
  };

  const arms = ()=>{
    const lw=10, rw=10;
    switch(expression){
      case "waving":
        return <>
          <line x1={bx-br+4} y1={by+8} x2={bx-br-14} y2={by+32} stroke="#0097A7" strokeWidth={lw} strokeLinecap="round"/>
          <circle cx={bx-br-14} cy={by+32} r={12} fill="#00BCD4" stroke="#0088A5" strokeWidth="2"/>
          <line x1={bx+br-4} y1={by-4} x2={bx+br+18} y2={by-38} stroke="#0097A7" strokeWidth={rw} strokeLinecap="round"/>
          <circle cx={bx+br+18} cy={by-38} r={12} fill="#4DD0E1" stroke="#0088A5" strokeWidth="2"/>
        </>;
      case "excited": case "jumping":
        return <>
          <line x1={bx-br+4} y1={by+4} x2={bx-br-20} y2={by-38} stroke="#0097A7" strokeWidth={lw} strokeLinecap="round"/>
          <circle cx={bx-br-20} cy={by-38} r={12} fill="#4DD0E1" stroke="#0088A5" strokeWidth="2"/>
          <line x1={bx+br-4} y1={by+4} x2={bx+br+20} y2={by-38} stroke="#0097A7" strokeWidth={rw} strokeLinecap="round"/>
          <circle cx={bx+br+20} cy={by-38} r={12} fill="#4DD0E1" stroke="#0088A5" strokeWidth="2"/>
        </>;
      case "curious":
        return <>
          <line x1={bx-br+4} y1={by+8} x2={bx-br-14} y2={by+28} stroke="#0097A7" strokeWidth={lw} strokeLinecap="round"/>
          <circle cx={bx-br-14} cy={by+28} r={12} fill="#00BCD4" stroke="#0088A5" strokeWidth="2"/>
          <line x1={bx+br-4} y1={by+2} x2={bx+br+22} y2={by-14} stroke="#0097A7" strokeWidth={rw} strokeLinecap="round"/>
          <circle cx={bx+br+22} cy={by-14} r={12} fill="#00BCD4" stroke="#0088A5" strokeWidth="2"/>
        </>;
      case "caring":
        return <>
          <line x1={bx-br+4} y1={by+10} x2={bx-br-16} y2={by+30} stroke="#0097A7" strokeWidth={lw} strokeLinecap="round"/>
          <circle cx={bx-br-16} cy={by+30} r={12} fill="#00BCD4" stroke="#0088A5" strokeWidth="2"/>
          <line x1={bx+br-4} y1={by+10} x2={bx+br+16} y2={by+30} stroke="#0097A7" strokeWidth={rw} strokeLinecap="round"/>
          <circle cx={bx+br+16} cy={by+30} r={12} fill="#00BCD4" stroke="#0088A5" strokeWidth="2"/>
        </>;
      case "calm":
        return <>
          <line x1={bx-br+4} y1={by+8} x2={bx-br-20} y2={by+22} stroke="#0097A7" strokeWidth={lw} strokeLinecap="round"/>
          <circle cx={bx-br-20} cy={by+22} r={12} fill="#00BCD4" stroke="#0088A5" strokeWidth="2"/>
          <line x1={bx+br-4} y1={by+8} x2={bx+br+20} y2={by+22} stroke="#0097A7" strokeWidth={rw} strokeLinecap="round"/>
          <circle cx={bx+br+20} cy={by+22} r={12} fill="#00BCD4" stroke="#0088A5" strokeWidth="2"/>
        </>;
      case "magnifying":
        return <>
          <line x1={bx-br+4} y1={by+8} x2={bx-br-16} y2={by+28} stroke="#0097A7" strokeWidth={lw} strokeLinecap="round"/>
          <circle cx={bx-br-16} cy={by+28} r={12} fill="#00BCD4" stroke="#0088A5" strokeWidth="2"/>
          <line x1={bx+br-4} y1={by} x2={bx+br+22} y2={by-26} stroke="#0097A7" strokeWidth={rw} strokeLinecap="round"/>
          <circle cx={bx+br+22} cy={by-26} r={12} fill="#4DD0E1" stroke="#0088A5" strokeWidth="2"/>
          <circle cx={bx+br+42} cy={by-48} r={22} fill="none" stroke="#FFC107" strokeWidth="4.5"/>
          <circle cx={bx+br+42} cy={by-48} r={16} fill="rgba(255,252,200,.45)"/>
          <text x={bx+br+42} y={by-43} textAnchor="middle" fontSize="16">😊</text>
          <line x1={bx+br+58} y1={by-32} x2={bx+br+68} y2={by-22} stroke="#FFC107" strokeWidth="5" strokeLinecap="round"/>
        </>;
      case "peek":
        return <>
          <line x1={bx-br+4} y1={by+8} x2={bx-br-14} y2={by+28} stroke="#0097A7" strokeWidth={lw} strokeLinecap="round"/>
          <circle cx={bx-br-14} cy={by+28} r={12} fill="#00BCD4" stroke="#0088A5" strokeWidth="2"/>
          <line x1={bx+br-4} y1={by+8} x2={bx+br+14} y2={by+28} stroke="#0097A7" strokeWidth={rw} strokeLinecap="round"/>
          <circle cx={bx+br+14} cy={by+28} r={12} fill="#00BCD4" stroke="#0088A5" strokeWidth="2"/>
        </>;
      default: // happy
        return <>
          <line x1={bx-br+4} y1={by+8} x2={bx-br-18} y2={by+28} stroke="#0097A7" strokeWidth={lw} strokeLinecap="round"/>
          <circle cx={bx-br-18} cy={by+28} r={12} fill="#00BCD4" stroke="#0088A5" strokeWidth="2"/>
          <line x1={bx+br-4} y1={by+8} x2={bx+br+18} y2={by+28} stroke="#0097A7" strokeWidth={rw} strokeLinecap="round"/>
          <circle cx={bx+br+18} cy={by+28} r={12} fill="#00BCD4" stroke="#0088A5" strokeWidth="2"/>
        </>;
    }
  };

  const eyeY = expression==="caring" ? by-10 : by-8;
  const exW = expression==="excited"||expression==="jumping" ? 16 : expression==="magnifying" ? 17 : 16;

  return (
    <svg viewBox="0 0 260 225" width={width} height={width*225/260} className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`bg${uid}`} cx="35%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#4DD0E1"/>
          <stop offset="55%" stopColor="#00BCD4"/>
          <stop offset="100%" stopColor="#0097A7"/>
        </radialGradient>
        <radialGradient id={`ey${uid}`} cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#FFEE58"/>
          <stop offset="65%" stopColor="#FFD600"/>
          <stop offset="100%" stopColor="#F9A825"/>
        </radialGradient>
        <filter id={`gw${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* floating shadow */}
      <ellipse cx={bx} cy={222} rx={38} ry={7} fill="rgba(0,150,170,.18)"/>

      {/* antenna */}
      <line x1={bx} y1={14} x2={bx} y2={52} stroke="#0088A5" strokeWidth="5" strokeLinecap="round"/>
      <polygon points={`${bx},2 ${bx+3.5},11 ${bx+13},11 ${bx+5.5},17 ${bx+8.5},26 ${bx},20.5 ${bx-8.5},26 ${bx-5.5},17 ${bx-13},11 ${bx-3.5},11`} fill="#FFC107"/>

      {/* arms (behind body) */}
      {arms()}

      {/* body */}
      <circle cx={bx} cy={by} r={br} fill={`url(#bg${uid})`}/>
      <circle cx={bx} cy={by} r={br} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="3.5"/>
      <ellipse cx={bx-22} cy={by-24} rx={22} ry={14} fill="white" opacity=".12"/>

      {/* left eye */}
      <circle cx={bx-26} cy={eyeY} r={20} fill="#FFF8E1"/>
      <circle cx={bx-26} cy={eyeY} r={16} fill={`url(#ey${uid})`} filter={`url(#gw${uid})`}/>
      <circle cx={bx-26} cy={eyeY} r={exW<17?8:9} fill="#1A237E"/>
      <circle cx={bx-31} cy={eyeY-6} r={4.5} fill="white" opacity=".88"/>
      <circle cx={bx-22} cy={eyeY+4} r={2} fill="white" opacity=".45"/>

      {/* right eye */}
      <circle cx={bx+26} cy={eyeY} r={20} fill="#FFF8E1"/>
      <circle cx={bx+26} cy={eyeY} r={16} fill={`url(#ey${uid})`} filter={`url(#gw${uid})`}/>
      <circle cx={bx+26} cy={eyeY} r={exW<17?8:9} fill="#1A237E"/>
      <circle cx={bx+21} cy={eyeY-6} r={4.5} fill="white" opacity=".88"/>
      <circle cx={bx+30} cy={eyeY+4} r={2} fill="white" opacity=".45"/>

      {/* expression extras */}
      {(expression==="excited"||expression==="jumping")&&<>
        <circle cx={bx-26} cy={eyeY} r={21} fill="none" stroke="#FFF9C4" strokeWidth="2" opacity=".5"/>
        <circle cx={bx+26} cy={eyeY} r={21} fill="none" stroke="#FFF9C4" strokeWidth="2" opacity=".5"/>
      </>}
      {expression==="caring"&&<>
        <path d={`M${bx-10} ${by+36} L${bx-2} ${by+42} L${bx+6} ${by+34}`} stroke="#00BCD4" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </>}

      {/* mouth */}
      {mouth()}

      {/* blush */}
      <ellipse cx={bx-50} cy={by+22} rx={12} ry={7} fill="#FF80AB" opacity=".22"/>
      <ellipse cx={bx+50} cy={by+22} rx={12} ry={7} fill="#FF80AB" opacity=".22"/>

      {/* body panel */}
      <rect x={bx-16} y={by+40} width="32" height="18" rx="7" fill="#00838F" opacity=".45"/>
      <circle cx={bx-6} cy={by+49} r={4.5} fill="#80DEEA" opacity=".88"/>
      <circle cx={bx+6} cy={by+49} r={4.5} fill="#80DEEA" opacity=".88"/>

      {/* caring heart */}
      {expression==="caring"&&(
        <text x={bx} y={by+74} textAnchor="middle" fontSize="28">💛</text>
      )}
    </svg>
  );
}

