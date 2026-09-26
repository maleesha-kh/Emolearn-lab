import { useEffect, useId, useRef } from "react";
import type { Badge } from "../../types";
import { EmoRobot } from "./EmoRobot";
import { Confetti, Btn } from "./UI";

export function BadgeModal({badge,onClose}:{badge:Badge;onClose:()=>void}){
  const dialogRef=useRef<HTMLDivElement>(null);
  const closeRef=useRef(onClose);
  closeRef.current=onClose;
  const titleId=useId();
  const nameId=useId();

  useEffect(()=>{
    const dialog=dialogRef.current;
    if(!dialog)return;
    const previousFocus=document.activeElement;
    const selector='button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
    const focusable=()=>Array.from(dialog.querySelectorAll<HTMLElement>(selector)).filter(el=>el.getClientRects().length>0);
    const focusInside=()=> (focusable()[0]??dialog).focus({preventScroll:true});
    const handleKey=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){
        event.preventDefault();
        event.stopPropagation();
        if(!event.repeat)closeRef.current();
      }else if(event.key==="Tab"){
        const items=focusable();
        const first=items[0];
        const last=items[items.length-1];
        if(!first){
          event.preventDefault();
          dialog.focus({preventScroll:true});
        }else if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){
          event.preventDefault();
          last.focus({preventScroll:true});
        }else if(!event.shiftKey&&document.activeElement===last){
          event.preventDefault();
          first.focus({preventScroll:true});
        }
      }
    };
    const containFocus=(event:FocusEvent)=>{
      if(!dialog.contains(event.target as Node))focusInside();
    };
    document.addEventListener("keydown",handleKey,true);
    document.addEventListener("focusin",containFocus);
    focusInside();
    return ()=>{
      document.removeEventListener("keydown",handleKey,true);
      document.removeEventListener("focusin",containFocus);
      if(previousFocus instanceof HTMLElement&&previousFocus!==document.body&&previousFocus.isConnected&&previousFocus.getClientRects().length>0){
        previousFocus.focus({preventScroll:true});
      }else{
        // A game transition may have removed the button that earned the badge.
        Array.from(document.querySelectorAll<HTMLElement>(selector))
          .find(el=>!dialog.contains(el)&&el.getClientRects().length>0)?.focus({preventScroll:true});
      }
    };
  },[]);

  return(
    <div className="fixed inset-0 flex items-center justify-center" style={{background:"rgba(0,0,0,.55)",zIndex:100}}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={`${titleId} ${nameId}`} tabIndex={-1}
        className="badge-dialog relative flex flex-col items-center rounded-3xl p-8 api"
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
          style={{width:"110px",height:"110px",background:`radial-gradient(circle at 30% 30%,${badge.color}cc,${badge.color})`,
            border:"4px solid #FFD700",boxShadow:`0 8px 30px ${badge.color}80`,fontSize:"52px"}}>
          {badge.emoji}
        </div>

        <div id={titleId} className="ff text-center mb-1" style={{fontSize:"26px",color:"#FFD700"}}>New Badge Unlocked! 🎉</div>
        <div id={nameId} className="ff text-center mb-4" style={{fontSize:"22px",color:badge.color}}>{badge.name} {badge.emoji}</div>

        <div className="absolute bottom-4 right-4">
          <div className="afb"><EmoRobot expression="excited" width={70}/></div>
        </div>

        <Confetti count={30}/>
        <Btn ch="Nice! ✨" onClick={onClose} color="#FF9800" w="200px"/>
      </div>
    </div>
  );
}

