import { useEffect, useState } from "react";
import type { EmotionDictionaryEntry } from "../../data/emotionDictionary";
import { playSound } from "../../lib/sounds";
import { useSpeech } from "../../lib/speech";

export function MeetTheFeeling({entry,soundOn}:{entry:EmotionDictionaryEntry;soundOn:boolean}){
  const {info,characterImages:images}=entry;
  const [idx,setIdx]=useState(0);
  const {supported,speaking,speak,stop}=useSpeech(soundOn);
  const nextIdx=(idx+1)%images.length;

  useEffect(()=>{
    const preload=new Image();
    preload.src=images[nextIdx];
  },[images,nextIdx]);

  function showNext(){
    playSound("whoosh",soundOn);
    setIdx(nextIdx);
  }

  function toggleReading(){
    if(speaking) stop();
    else speak(`${info.label}. ${entry.meaning}`);
  }

  return(
    <div className="flex flex-col items-center text-center">
      <button onClick={showNext} aria-label={`Show another ${info.label.toLowerCase()} picture`}
        className="rounded-3xl bg-white flex items-center justify-center transition-transform active:scale-95"
        style={{width:"min(260px,70vw)",aspectRatio:"2 / 3",border:`4px solid ${info.border}`,boxShadow:`0 8px 30px ${info.border}33`,cursor:"pointer"}}>
        <img key={idx} src={images[idx]} alt={`${info.label} character`} draggable={false} className="api"
          style={{width:"92%",height:"92%",objectFit:"contain"}}/>
      </button>
      <p className="fn font-bold mt-2 mb-4" style={{fontSize:"14px",color:info.text}}>👆 Tap the picture to see another one ({idx+1}/{images.length})</p>
      <h1 className="ff mb-2" style={{fontSize:"clamp(36px,8vw,48px)",color:info.text}}>{info.label} {info.emoji}</h1>
      <p className="fn font-bold mb-5" style={{fontSize:"20px",color:"#455A64",maxWidth:"560px",lineHeight:1.45}}>{entry.meaning}</p>
      {supported&&(
        <button onClick={toggleReading} disabled={!soundOn}
          className="fn font-bold rounded-full px-6 transition-all hover:brightness-110 active:scale-95"
          style={{minHeight:"56px",fontSize:"18px",background:soundOn?"white":"#ECEFF1",color:soundOn?info.text:"#90A4AE",
            border:`3px solid ${soundOn?info.border:"#CFD8DC"}`,cursor:soundOn?"pointer":"not-allowed"}}>
          {!soundOn?"🔇 Sound is off":speaking?"⏹ Stop":"🔊 Read to me"}
        </button>
      )}
    </div>
  );
}
