import { useEffect, useRef, useState } from "react";
import type { BuddySuggestion } from "../types";
import { askEmo } from "../lib/api";
import { playSound } from "../lib/sounds";
import { STARTER_QUESTIONS } from "../data/buddy";
import { TopBar, BgDeco } from "../components/common/UI";
import { EmoRobot } from "../components/common/EmoRobot";
import { NAV_HEIGHT_PX } from "../components/common/BottomNav";

const QUESTION_MAX = 150;
const GREETING = "Hi! Ask me anything about feelings 💛";
const FAILED_REPLY = "Emo is having a little rest, try again soon! 🌈";
const RESTING_NOTE = "Emo is resting, come back tomorrow! 😴 You can still tell Emo if something is wrong.";

type ChatMessage =
  | { from: "child"; text: string }
  | { from: "emo"; text: string; chips: BuddySuggestion[]; chipsLabel: string | null };

function pickStarters(): BuddySuggestion[] {
  return [...STARTER_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 3);
}

export function AskEmoScreen({playerId,onBack,onHome,soundOn,onSound}:{
  playerId:string;onBack:()=>void;onHome:()=>void;soundOn:boolean;onSound:()=>void;
}){
  const [starters]=useState(pickStarters);
  const [messages,setMessages]=useState<ChatMessage[]>([]);
  const [input,setInput]=useState("");
  const [sending,setSending]=useState(false);
  const [remaining,setRemaining]=useState<number|null>(null);
  const [resting,setResting]=useState(false);
  // A ref as well as state, so a double tap can't send the same question twice
  const sendingRef=useRef(false);
  const logRef=useRef<HTMLDivElement>(null);

  // Scrolls only the chat log, never the page. If the newest message is taller
  // than the log (small phones), show its start instead of its last chips.
  useEffect(()=>{
    const log=logRef.current;
    const newest=log?.lastElementChild as HTMLElement|null|undefined;
    if(!log||!newest) return;
    const top=newest.offsetHeight>log.clientHeight?newest.offsetTop-12:log.scrollHeight;
    const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    log.scrollTo({top,behavior:reducedMotion?"auto":"smooth"});
  },[messages,sending]);

  async function ask(raw:string){
    const question=raw.trim().slice(0,QUESTION_MAX);
    if(!question||sendingRef.current) return;
    sendingRef.current=true;
    setSending(true);
    setMessages(ms=>[...ms,{from:"child",text:question}]);
    setInput("");

    const res=await askEmo(playerId,question);
    if(res.kind==="ok"){
      const {answer,suggestions,related,remaining_today}=res.data;
      const chips=suggestions.length>0?suggestions:related;
      const chipsLabel=suggestions.length>0?"Try one of these:":related.length>0?"You can also ask:":null;
      setMessages(ms=>[...ms,{from:"emo",text:answer,chips,chipsLabel}]);
      setRemaining(remaining_today);
      setResting(res.data.resting);
      playSound("pop",soundOn);
    }else{
      console.warn("askEmo failed",res.status);
      setMessages(ms=>[...ms,{from:"emo",text:FAILED_REPLY,chips:[],chipsLabel:null}]);
    }
    sendingRef.current=false;
    setSending(false);
  }

  const canSend=input.trim().length>0&&!sending;

  return(
    // Fills the screen above the bottom nav: only the chat log scrolls, the input stays at the bottom
    <div className="w-full relative overflow-hidden flex flex-col"
      style={{height:`calc(100dvh - ${NAV_HEIGHT_PX}px)`,background:"linear-gradient(140deg,#E0F7FA 0%,#FFFDE7 100%)"}}>
      <BgDeco items={["💬","⭐","💛","✨","🤖","💬","⭐","💙"]} opacity={.2}/>
      <div className="flex-shrink-0"><TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/></div>
      <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center px-3 sm:px-4 pb-3">
        <div className="w-full flex-1 min-h-0 flex flex-col" style={{maxWidth:"720px"}}>
          <div className="flex-shrink-0 flex items-center gap-3 mb-2">
            <button onClick={onBack}
              className="fn font-bold rounded-full bg-white px-5 transition-transform hover:scale-105 active:scale-95"
              style={{minHeight:"48px",fontSize:"18px",color:"#00838F",boxShadow:"0 4px 16px rgba(0,0,0,.1)"}}>
              ← Back
            </button>
            <h1 className="ff" style={{fontSize:"clamp(22px,5vw,30px)",color:"#00838F"}}>Ask Emo 🤖</h1>
          </div>

          <div className="rounded-3xl bg-white w-full flex-1 min-h-0 flex flex-col"
            style={{border:"4px solid #00BCD4",boxShadow:"0 14px 45px rgba(0,188,212,.18)"}}>
            <div ref={logRef} role="log" aria-live="polite" aria-label="Chat with Emo"
              className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col gap-4 px-3 pt-4 pb-3 sm:px-5">
              <div className="flex justify-center"><div className="afb"><EmoRobot expression="waving" width={96}/></div></div>
              <EmoBubble text={GREETING} chips={starters} chipsLabel="Try one of these:" disabled={sending} onChip={ask}/>
              {messages.map((m,i)=>m.from==="child"
                ?<ChildBubble key={i} text={m.text}/>
                :<EmoBubble key={i} text={m.text} chips={m.chips} chipsLabel={m.chipsLabel} disabled={sending} onChip={ask}/>)}
              {sending&&(
                <div className="fn font-bold self-start" style={{fontSize:"18px",color:"#78909C",paddingLeft:"56px"}}>
                  Emo is thinking... 💭
                </div>
              )}
            </div>

            <form onSubmit={ev=>{ev.preventDefault();ask(input);}}
              className="flex-shrink-0 flex flex-col gap-1 px-3 pt-3 pb-3 sm:px-5"
              style={{borderTop:"2px solid #E0F7FA"}}>
              <div className="flex justify-between items-baseline gap-2">
                <label htmlFor="ask-emo-input" className="fn font-bold" style={{fontSize:"16px",color:"#455A64"}}>
                  Type your question
                </label>
                <span id="ask-emo-count" className="fn" style={{fontSize:"13px",color:"#78909C"}}>
                  {input.length}/{QUESTION_MAX}
                </span>
              </div>
              <div className="flex gap-2">
                <input id="ask-emo-input" type="text" value={input} onChange={ev=>setInput(ev.target.value)}
                  maxLength={QUESTION_MAX} autoComplete="off" aria-describedby="ask-emo-count"
                  className="fn flex-1 min-w-0 rounded-2xl px-3 outline-none focus:ring-4"
                  style={{minHeight:"56px",fontSize:"18px",border:"3px solid #00BCD4",color:"#37474F"}}/>
                <button type="submit" disabled={!canSend}
                  className="ff flex-shrink-0 rounded-full text-white px-5 transition-all active:scale-95"
                  style={{minHeight:"56px",fontSize:"20px",
                    background:canSend?"#FF9800":"#ccc",cursor:canSend?"pointer":"not-allowed",
                    boxShadow:canSend?"0 6px 22px rgba(255,152,0,.35)":"none"}}>
                  {sending?"...":"Send"}
                </button>
              </div>
              {resting?(
                <p className="fn font-bold text-center" style={{fontSize:"14px",color:"#6A1B9A"}}>{RESTING_NOTE}</p>
              ):remaining!==null&&(
                <p className="fn text-center" style={{fontSize:"14px",color:"#78909C"}}>
                  Emo can answer {remaining} more question{remaining===1?"":"s"} today
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmoBubble({text,chips,chipsLabel,disabled,onChip}:{
  text:string;chips:BuddySuggestion[];chipsLabel:string|null;disabled:boolean;onChip:(q:string)=>void;
}){
  return(
    <div className="flex items-start gap-2 self-start" style={{maxWidth:"92%"}}>
      <div className="flex-shrink-0" aria-hidden="true"><EmoRobot expression="happy" width={48}/></div>
      <div className="flex flex-col gap-2 min-w-0">
        <div className="fn font-bold rounded-3xl px-4 py-3"
          style={{fontSize:"19px",color:"#37474F",background:"#E0F7FA",border:"2px solid #80DEEA",borderTopLeftRadius:"8px"}}>
          <span className="sr-only">Emo says: </span>{text}
        </div>
        {chips.length>0&&chipsLabel&&(
          <div className="flex flex-col gap-2">
            <span className="fn font-bold" style={{fontSize:"14px",color:"#78909C"}}>{chipsLabel}</span>
            <div className="flex flex-wrap gap-2">
              {chips.map(c=>(
                <button key={c.id} type="button" onClick={()=>onChip(c.question)} disabled={disabled}
                  className="fn font-bold rounded-full px-4 text-left transition-transform hover:scale-105 active:scale-95"
                  style={{minHeight:"48px",fontSize:"16px",color:"#006064",background:"white",
                    border:"2px solid #00BCD4",cursor:disabled?"not-allowed":"pointer",opacity:disabled?.6:1}}>
                  {c.question}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChildBubble({text}:{text:string}){
  return(
    <div className="fn font-bold rounded-3xl px-4 py-3 self-end"
      style={{maxWidth:"85%",fontSize:"19px",color:"#37474F",background:"#FFF3E0",border:"2px solid #FFB74D",
        borderTopRightRadius:"8px",overflowWrap:"anywhere"}}>
      <span className="sr-only">You asked: </span>{text}
    </div>
  );
}
