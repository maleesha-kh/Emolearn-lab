import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { EmoRobot } from "../components/common/EmoRobot";
import { changePin } from "../lib/api";

function digitsOnly(v:string){
  return v.replace(/\D/g,"").slice(0,4);
}

function ChangePinForm({onBack}:{onBack:()=>void}){
  const [currentPin,setCurrentPin]=useState("");
  const [newPin,setNewPin]=useState("");
  const [confirmPin,setConfirmPin]=useState("");
  const [message,setMessage]=useState<{text:string;ok:boolean}|null>(null);
  const [saving,setSaving]=useState(false);

  const canSubmit=currentPin.length===4&&newPin.length===4&&confirmPin.length===4&&!saving;

  const handleSubmit=async()=>{
    if(newPin!==confirmPin){
      setMessage({text:"New PINs didn't match. Try again.",ok:false});
      return;
    }
    setSaving(true);
    const res=await changePin(currentPin,newPin);
    setSaving(false);
    if(res.kind==="ok"){
      setMessage({text:"PIN changed! ✅",ok:true});
      setCurrentPin("");setNewPin("");setConfirmPin("");
    } else if(res.status===403){
      setMessage({text:"Current PIN is wrong",ok:false});
    } else {
      setMessage({text:"Emo can't connect right now 🔌",ok:false});
    }
  };

  return(
    <div className="rounded-2xl p-6 bg-white" style={{maxWidth:"420px",border:"1.5px solid #E0E0E0",boxShadow:"0 4px 15px rgba(0,0,0,.05)"}}>
      <button onClick={onBack} className="fn font-bold mb-4" style={{color:"#00BCD4",fontSize:"15px",background:"none",border:"none",cursor:"pointer"}}>← Back</button>
      <h2 className="fn font-bold mb-4" style={{fontSize:"20px",color:"#212121"}}>Change Parent PIN</h2>

      {[
        {label:"Current PIN",value:currentPin,set:setCurrentPin},
        {label:"New PIN",value:newPin,set:setNewPin},
        {label:"Confirm New PIN",value:confirmPin,set:setConfirmPin},
      ].map(f=>(
        <div key={f.label} className="mb-4">
          <label className="fn font-bold block mb-1" style={{fontSize:"13px",color:"#546E7A"}}>{f.label}</label>
          <input type="password" inputMode="numeric" maxLength={4} value={f.value}
            onChange={e=>f.set(digitsOnly(e.target.value))}
            className="fn font-bold rounded-xl outline-none w-full"
            style={{height:"48px",padding:"0 16px",border:"2px solid #CFD8DC",fontSize:"18px",letterSpacing:"4px"}}/>
        </div>
      ))}

      {message&&(
        <p className="fn font-bold mb-4" style={{color:message.ok?"#4CAF50":"#EF5350",fontSize:"14px"}}>{message.text}</p>
      )}

      <button onClick={handleSubmit} disabled={!canSubmit}
        className="fn font-bold rounded-full w-full" style={{height:"52px",background:canSubmit?"#00BCD4":"#ccc",color:"white",border:"none",cursor:canSubmit?"pointer":"not-allowed"}}>
        {saving?"Saving...":"Change PIN"}
      </button>
    </div>
  );
}

export function ParentScreen({playerName,onBack}:{playerName:string;onBack:()=>void}){
  const [view,setView]=useState<"dashboard"|"settings">("dashboard");
  const chartData=[
    {name:"Happy",accuracy:75,color:"#FFC107"},
    {name:"Sad",  accuracy:50,color:"#42A5F5"},
    {name:"Angry",accuracy:25,color:"#EF5350"},
    {name:"Surprised",accuracy:100,color:"#AB47BC"},
  ];
  const sessions=[
    {date:"Jul 20 2026",score:"4/4",happy:"✅",sad:"✅",angry:"✅",surprised:"✅"},
    {date:"Jul 19 2026",score:"3/4",happy:"✅",sad:"✅",angry:"❌",surprised:"✅"},
    {date:"Jul 18 2026",score:"2/4",happy:"✅",sad:"❌",angry:"✅",surprised:"❌"},
    {date:"Jul 17 2026",score:"1/4",happy:"✅",sad:"❌",angry:"❌",surprised:"❌"},
    {date:"Jul 16 2026",score:"3/4",happy:"✅",sad:"✅",angry:"✅",surprised:"❌"},
  ];
  return(
    <div className="min-h-screen w-full flex" style={{background:"#FAFAFA"}}>
      {/* Sidebar */}
      <div className="flex-shrink-0 flex flex-col py-8 px-6" style={{width:"240px",background:"#006064",minHeight:"100vh"}}>
        <div className="ff text-white mb-8" style={{fontSize:"22px"}}>EmoLearn Lab ✨</div>
        {["📊 Sessions","👤 Profile","🏆 Achievements","📖 Dictionary","⚙️ Settings"].map(item=>(
          <button key={item} onClick={item==="⚙️ Settings"?()=>setView("settings"):undefined}
            className="fn font-bold text-left py-3 px-4 rounded-xl mb-2 transition-all hover:bg-white hover:bg-opacity-20"
            style={{color:"rgba(255,255,255,.85)",fontSize:"16px",background:"none",border:"none",cursor:"pointer"}}>
            {item}
          </button>
        ))}
        <div className="mt-auto">
          <div className="afb"><EmoRobot expression="curious" width={100}/></div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="fn font-bold mb-1" style={{fontSize:"32px",color:"#212121"}}>Session Overview 📊</h1>
            <p className="fn font-semibold" style={{fontSize:"16px",color:"#757575"}}>{playerName||"Explorer"} · 5 sessions</p>
          </div>
          <button onClick={onBack} className="fn font-bold rounded-full px-5 py-2 text-white transition-all hover:brightness-110 cursor-pointer"
            style={{background:"#00BCD4",fontSize:"16px",boxShadow:"0 4px 14px rgba(0,188,212,.4)"}}>
            Back to Game
          </button>
        </div>

        {view==="settings" ? (
          <ChangePinForm onBack={()=>setView("dashboard")}/>
        ) : (
        <>
        {/* Stat cards */}
        <div className="grid gap-4 mb-8" style={{gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))"}}>
          {[
            {label:"Total Sessions",value:"5",color:"#4CAF50",bg:"#E8F5E9"},
            {label:"Average Score",value:"3.2/4",color:"#FFC107",bg:"#FFF9C4"},
            {label:"Best Emotion",value:"Surprised ✓",color:"#00BCD4",bg:"#E0F7FA"},
            {label:"Needs Practice",value:"Angry 💪",color:"#E91E63",bg:"#FCE4EC"},
          ].map(c=>(
            <div key={c.label} className="rounded-2xl p-5 fn font-bold" style={{background:c.bg,border:`2px solid ${c.color}`}}>
              <div style={{fontSize:"13px",color:"#757575",marginBottom:"6px"}}>{c.label}</div>
              <div style={{fontSize:"22px",color:c.color}}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="rounded-2xl p-6 bg-white mb-8" style={{border:"1.5px solid #E0E0E0",boxShadow:"0 4px 15px rgba(0,0,0,.05)"}}>
          <h2 className="fn font-bold mb-4" style={{fontSize:"20px",color:"#212121"}}>Emotion Accuracy</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{top:5,right:20,left:0,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0"/>
              <XAxis dataKey="name" tick={{fontSize:14,fontFamily:"Nunito",fontWeight:600}}/>
              <YAxis unit="%" tick={{fontSize:13}}/>
              <Tooltip formatter={(v)=>`${v}%`}/>
              <Bar dataKey="accuracy" radius={[8,8,0,0]}>
                {chartData.map((d,i)=>(
                  <Cell key={i} fill={d.color}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Session history table */}
        <div className="rounded-2xl bg-white overflow-hidden" style={{border:"1.5px solid #E0E0E0",boxShadow:"0 4px 15px rgba(0,0,0,.05)"}}>
          <div className="flex justify-between items-center p-5 border-b" style={{borderColor:"#F0F0F0"}}>
            <h2 className="fn font-bold" style={{fontSize:"20px",color:"#212121"}}>Session History</h2>
            <button className="fn font-bold rounded-full px-4 py-2 text-white cursor-pointer"
              style={{background:"#FF9800",fontSize:"14px",boxShadow:"0 3px 12px rgba(255,152,0,.4)"}}>
              Download Report CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:"#F8F9FA"}}>
                  {["Date","Score","Happy 😊","Sad 😢","Angry 😠","Surprised 😲"].map(h=>(
                    <th key={h} className="fn font-bold px-4 py-3 text-left" style={{fontSize:"14px",color:"#546E7A"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map((s,i)=>(
                  <tr key={i} style={{borderTop:"1px solid #F0F0F0",background:i%2===0?"white":"#FAFAFA"}}>
                    <td className="fn px-4 py-3" style={{fontSize:"15px",color:"#37474F"}}>{s.date}</td>
                    <td className="ff px-4 py-3" style={{fontSize:"16px",color:"#00838F"}}>{s.score}</td>
                    <td className="px-4 py-3 text-center text-xl">{s.happy}</td>
                    <td className="px-4 py-3 text-center text-xl">{s.sad}</td>
                    <td className="px-4 py-3 text-center text-xl">{s.angry}</td>
                    <td className="px-4 py-3 text-center text-xl">{s.surprised}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

