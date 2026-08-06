import type { Mood, GirlP } from "../types";
import { EI } from "../data/emotions";
import { TopBar, BgDeco } from "../components/common/UI";
import { CharacterImage } from "../components/character/CharacterImage";

export function DictionaryScreen({onHome,soundOn,onSound}:{onHome:()=>void;soundOn:boolean;onSound:()=>void}){
  const entries:[Mood,GirlP,string,string,string][]=[
    ["happy",    "happy",    "When something wonderful happens and you feel like jumping for joy!",    "big smile, shoulders back, open arms 🤖",    "You might feel happy when you get a surprise gift!"],
    ["sad",      "sad",      "When something makes your heart feel heavy and you want to cry.",         "downcast eyes, drooping posture, slow movement 🤖","You might feel sad when you miss someone you love."],
    ["angry",    "angry",    "When something feels very unfair and you want to stomp your feet!",       "tight fists, frowning eyebrows, tense body 🤖",   "You might feel angry when someone takes your toy."],
    ["surprised","surprised","When something totally unexpected happens and your eyes go BIG!",          "wide eyes, open mouth, raised eyebrows 🤖",       "You might feel surprised at a birthday party!"],
  ];
  return(
    <div className="min-h-screen w-full relative" style={{background:"#FFFDE7"}}>
      <BgDeco items={["📖","⭐","✨","📚","💡","⭐","📖"]} opacity={.25}/>
      <TopBar onHome={onHome} onSound={onSound} soundOn={soundOn}/>
      <div className="relative z-10 flex flex-col items-center px-4 pb-12">
        <h1 className="ff text-center mb-8" style={{fontSize:"36px",color:"#00838F"}}>Emotion Dictionary 📖</h1>
        <div className="flex flex-col gap-6" style={{maxWidth:"680px",width:"95%"}}>
          {entries.map(([mood,pose,def,clue,example],i)=>{
            const e=EI[mood];
            const flip=i%2===1;
            return(
              <div key={mood} className="rounded-3xl overflow-hidden bg-white"
                style={{border:`3px solid ${e.border}`,boxShadow:`0 8px 30px ${e.border}22`}}>
                <div className={`flex flex-wrap ${flip?"flex-row-reverse":"flex-row"}`}>
                  {/* Character */}
                  <div className="flex items-center justify-center p-4" style={{background:e.bg,minWidth:"200px"}}>
                    <CharacterImage pose={pose} width={165}/>
                  </div>
                  {/* Text */}
                  <div className="flex-1 p-6">
                    <div className="ff mb-2" style={{fontSize:"32px",color:e.text}}>{e.label} {e.emoji}</div>
                    <p className="fn font-semibold mb-3" style={{fontSize:"16px",color:"#546E7A"}}>{def}</p>
                    <div className="rounded-xl p-3 mb-3 fn font-bold" style={{background:e.bg,border:`1.5px solid ${e.border}`,fontSize:"14px",color:e.text}}>
                      <span className="ff mr-1" style={{color:"#00838F"}}>🤖 Emo sees:</span> {clue}
                    </div>
                    <div className="fn font-semibold" style={{fontSize:"14px",color:"#78909C"}}>💡 {example}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
