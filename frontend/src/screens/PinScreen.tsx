import { useState } from "react";

export function PinScreen({onSuccess,onBack}:{onSuccess:()=>void;onBack:()=>void}){
  const [digits,setDigits]=useState(["","","",""]);
  const [error,setError]=useState(false);
  const PIN="1234";

  const press=(d:string)=>{
    const idx=digits.findIndex(x=>x==="");
    if(idx<0)return;
    const next=[...digits];
    next[idx]=d;
    setDigits(next);
    if(idx===3){
      const entered=next.join("");
      if(entered===PIN){onSuccess();}
      else{setError(true);setTimeout(()=>{setDigits(["","","",""]);setError(false);},800);}
    }
  };

  const del=()=>{
    const last=[...digits].reverse().findIndex(x=>x!=="");
    if(last<0)return;
    const idx=3-last;
    const next=[...digits];
    next[idx]="";
    setDigits(next);
    setError(false);
  };

  return(
    <div className="min-h-screen w-full flex flex-col items-center justify-center" style={{background:"linear-gradient(140deg,#ECEFF1 0%,#CFD8DC 100%)"}}>
      <div className="flex flex-col items-center" style={{maxWidth:"360px",width:"90%"}}>
        <button onClick={onBack} className="fn font-bold self-start mb-6"
          style={{color:"#00BCD4",fontSize:"16px",background:"none",border:"none",cursor:"pointer"}}>← Back</button>
        <span className="text-5xl mb-4" style={{color:"#00838F"}}>🔒</span>
        <h1 className="text-center mb-2" style={{fontFamily:"system-ui,sans-serif",fontSize:"28px",fontWeight:"600",color:"#37474F"}}>Parent Access</h1>
        <p className="text-center mb-8" style={{fontFamily:"system-ui,sans-serif",fontSize:"16px",color:"#78909C"}}>Enter the 4-digit PIN to continue</p>

        {/* PIN boxes */}
        <div className="flex gap-3 mb-8">
          {digits.map((d,i)=>(
            <div key={i} className="flex items-center justify-center rounded-xl"
              style={{width:"60px",height:"60px",border:`2px solid ${error?"#EF5350":d?"#00BCD4":"#B0BEC5"}`,
                background:"white",fontSize:"24px",fontWeight:"700",color:"#00838F",
                transition:"border-color .2s",boxShadow:"0 2px 10px rgba(0,0,0,.06)"}}>
              {d?"●":""}
            </div>
          ))}
        </div>
        {error&&<p className="fn font-bold mb-4" style={{color:"#EF5350",fontSize:"15px"}}>Incorrect PIN. Try again!</p>}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full mb-4">
          {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k,i)=>(
            <button key={i} onClick={()=>k==="⌫"?del():k?press(k):undefined}
              disabled={!k}
              className="rounded-xl fn font-bold transition-all hover:brightness-95 active:scale-95"
              style={{height:"56px",background:k?"white":"transparent",
                border:k?"1.5px solid #ECEFF1":"none",fontSize:"20px",color:"#37474F",
                boxShadow:k?"0 2px 8px rgba(0,0,0,.06)":"none",cursor:k?"pointer":"default"}}>
              {k}
            </button>
          ))}
        </div>
        <p style={{fontFamily:"system-ui,sans-serif",fontSize:"13px",color:"#90A4AE",textAlign:"center"}}>Default PIN is 1234 — change it in Settings</p>
      </div>
    </div>
  );
}

