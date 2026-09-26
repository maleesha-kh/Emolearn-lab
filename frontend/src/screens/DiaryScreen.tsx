import { useEffect, useRef, useState } from "react";
import type { DiaryIntensity, DiaryReason, EmoE, Mood } from "../types";
import { EI } from "../data/emotions";
import { DIARY_CHIPS } from "../data/diary";
import { createDiaryEntry } from "../lib/api";
import { playSound } from "../lib/sounds";
import { TopBar, Btn, BgDeco } from "../components/common/UI";
import { EmoRobot } from "../components/common/EmoRobot";

const NOTE_MAX = 200;
const SAVE_FAILED_TEXT = "Your diary is resting, let's keep playing! 🌈";
const FALLBACK_REPLY = "Thank you for sharing with me! 💛";

const INTENSITIES: { value: DiaryIntensity; label: string }[] = [
  { value: "little", label: "A little" },
  { value: "lot", label: "A lot" },
];

type Phase = "form" | "reply" | "error";

export function DiaryScreen({playerId,mood,onDone,onBack,onHome,soundOn,onSound}:{
  playerId:string;mood:Mood;onDone:()=>void;onBack:()=>void;onHome:()=>void;soundOn:boolean;onSound:()=>void;
}){
  const e=EI[mood];
  const [tags,setTags]=useState<DiaryReason[]>([]);
  const [note,setNote]=useState("");
  const [intensity,setIntensity]=useState<DiaryIntensity>("little");
  const [saving,setSaving]=useState(false);
  const [phase,setPhase]=useState<Phase>("form");
  const [reply,setReply]=useState("");
  const [calm,setCalm]=useState(false);
  // A ref as well as state, so a fast double-tap can't send two saves
  const savingRef=useRef(false);
  const replyRef=useRef<HTMLDivElement>(null);

  const canSave=(tags.length>0||note.trim().length>0)&&!saving;

  useEffect(()=>{
    if(phase!=="form") replyRef.current?.focus();
  },[phase]);

  function toggleChip(reason:DiaryReason){
    playSound("pop",soundOn);
    setTags(ts=>ts.includes(reason)?ts.filter(t=>t!==reason):[...ts,reason]);
  }

  async function save(){
    if(savingRef.current||!canSave) return;
    savingRef.current=true;
    setSaving(true);
    const res=await createDiaryEntry(playerId,{emotion:mood,intensity,reason_tags:tags,note:note.trim()||null});
    if(res.kind==="ok"){
      // The concern level only changes how calmly the reply is shown; it is never displayed
      const high=res.data.concern_level==="high";
      setCalm(high);
      setReply(res.data.bot_reply||FALLBACK_REPLY);
      if(!high) playSound("pop",soundOn);
      setPhase("reply");
    }else{
      console.warn("createDiaryEntry failed",res.status);
      setPhase("error");
    }
    setSaving(false);
  }

  const robot:EmoE=phase==="error"?"happy":calm?"calm":mood==="sad"||mood==="angry"?"caring":"happy";

  return(
    <div className="min-h-screen w-full relative overflow-x-hidden" style={{background:"linear-gradient(140deg,#FFFDE7 0%,#FFF9C4 100%)"}}>
      <BgDeco items={["📔","⭐","🌼","💛","✨","📔","⭐","🌻"]} opacity={.22}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex flex-col items-center px-4 pb-10">
        <div className="w-full" style={{maxWidth:"720px"}}>
          {phase==="form"&&(
            <button onClick={onBack}
              className="fn font-bold rounded-full bg-white px-5 mb-3 transition-transform hover:scale-105 active:scale-95"
              style={{minHeight:"48px",fontSize:"18px",color:"#00838F",boxShadow:"0 4px 16px rgba(0,0,0,.1)"}}>
              ← Back
            </button>
          )}

          <div className="rounded-3xl bg-white w-full flex flex-col items-center px-5 py-6 sm:px-8"
            style={{border:`4px solid ${e.border}`,boxShadow:`0 14px 45px ${e.border}30`}}>

            {phase==="form"?(
              <>
                <div className="afb mb-2"><EmoRobot expression="happy" width={110}/></div>
                <h1 className="ff text-center mb-5" style={{fontSize:"clamp(26px,5vw,36px)",color:e.text}}>
                  Why do you feel {e.label.toLowerCase()} today? {e.emoji}
                </h1>

                <div role="group" aria-label="Why do you feel this way? Pick one or more" className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full mb-6">
                  {DIARY_CHIPS.map(c=>{
                    const on=tags.includes(c.reason);
                    return(
                      <button key={c.reason} onClick={()=>toggleChip(c.reason)} aria-pressed={on}
                        className="fn font-bold rounded-2xl flex items-center justify-center gap-2 px-3 transition-all hover:scale-105 active:scale-95"
                        style={{minHeight:"72px",fontSize:"20px",color:on?e.text:"#37474F",
                          background:on?e.bg:"#FFFFFF",border:on?`4px solid ${e.border}`:"3px solid #E0E0E0",
                          boxShadow:on?`0 0 0 4px ${e.border}30`:"0 3px 10px rgba(0,0,0,.06)"}}>
                        <span aria-hidden="true" style={{fontSize:"28px"}}>{c.emoji}</span>
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>

                <label htmlFor="diary-note" className="fn font-bold self-start mb-2" style={{fontSize:"19px",color:"#455A64"}}>
                  Tell me more (you can skip!)
                </label>
                <textarea id="diary-note" value={note} onChange={ev=>setNote(ev.target.value)} maxLength={NOTE_MAX} rows={3}
                  aria-describedby="diary-note-count"
                  className="fn w-full rounded-2xl px-4 py-3 outline-none focus:ring-4"
                  style={{fontSize:"19px",border:`3px solid ${e.border}`,resize:"vertical",color:"#37474F"}}/>
                <div id="diary-note-count" className="fn self-end mt-1 mb-6" style={{fontSize:"15px",color:"#78909C"}}>
                  {note.length}/{NOTE_MAX}
                </div>

                <div role="group" aria-label="How big is this feeling?" className="w-full mb-5">
                  <div className="fn font-bold mb-2" style={{fontSize:"19px",color:"#455A64"}}>How big is this feeling?</div>
                  <div className="grid grid-cols-2 gap-3">
                    {INTENSITIES.map(i=>{
                      const on=intensity===i.value;
                      return(
                        <button key={i.value} onClick={()=>setIntensity(i.value)} aria-pressed={on}
                          className="ff rounded-2xl transition-all hover:scale-105 active:scale-95"
                          style={{minHeight:"64px",fontSize:"22px",color:on?"white":e.text,
                            background:on?e.border:e.bg,border:`3px solid ${e.border}`}}>
                          {i.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="fn text-center mb-5" style={{fontSize:"16px",color:"#78909C"}}>Your grown-up can read your diary 💛</p>

                <div className="flex flex-col sm:flex-row gap-3 w-full justify-center items-center">
                  <Btn ch={saving?"Saving...":"Save"} onClick={save} disabled={!canSave} w="min(100%,260px)"/>
                  <Btn ch="Skip" onClick={onDone} color="#90A4AE" w="min(100%,200px)"/>
                </div>
              </>
            ):(
              <>
                <div className={calm?"mb-3":"afb mb-3"}><EmoRobot expression={robot} width={150}/></div>
                <div ref={replyRef} tabIndex={-1} role="status"
                  className="fn font-bold text-center rounded-3xl px-6 py-5 mb-6 relative outline-none"
                  style={{fontSize:"clamp(20px,4vw,24px)",color:"#37474F",background:e.bg,border:`3px solid ${e.border}`,maxWidth:"560px"}}>
                  {phase==="reply"?reply:SAVE_FAILED_TEXT}
                </div>
                <Btn ch="Continue →" onClick={onDone} w="min(100%,280px)"/>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
