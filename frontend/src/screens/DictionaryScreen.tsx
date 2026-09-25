import { useState } from "react";
import type { Mood } from "../types";
import { EMOTION_DICTIONARY } from "../data/emotionDictionary";
import { TopBar, BgDeco } from "../components/common/UI";
import { FeelingPicker } from "../components/dictionary/FeelingPicker";
import { EmotionPage } from "../components/dictionary/EmotionPage";
import { playSound } from "../lib/sounds";

export function DictionaryScreen({onHome,soundOn,onSound,onPractice}:{onHome:()=>void;soundOn:boolean;onSound:()=>void;onPractice:()=>void}){
  const [selected,setSelected]=useState<Mood|null>(null);

  function open(m:Mood|null){
    setSelected(m);
    window.scrollTo({top:0});
  }

  function pick(m:Mood){
    playSound("pop",soundOn);
    open(m);
  }

  const background=selected?EMOTION_DICTIONARY[selected].info.bg:"#FFFDE7";
  const deco=selected?[EMOTION_DICTIONARY[selected].info.emoji,"✨","⭐","💡","✨",EMOTION_DICTIONARY[selected].info.emoji]:["📖","⭐","✨","📚","💡","⭐","📖"];

  return(
    <div className="min-h-screen w-full relative overflow-x-hidden" style={{background}}>
      <BgDeco items={deco} opacity={.22}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex flex-col items-center px-4 pb-12">
        {selected
          ?<EmotionPage key={selected} emotion={selected} soundOn={soundOn} onBack={()=>open(null)} onPractice={onPractice}/>
          :<FeelingPicker onPick={pick}/>}
      </div>
    </div>
  );
}
