export const GLOBAL_STYLES = `
  @keyframes float{0%,100%{transform:translateY(0px)}50%{transform:translateY(-14px)}}
  @keyframes floatB{0%,100%{transform:translateY(0px)}50%{transform:translateY(-8px)}}
  @keyframes spinRing{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes confettiFall{0%{transform:translateY(-40px) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(800deg);opacity:0}}
  @keyframes popIn{0%{transform:scale(0.3);opacity:0}65%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
  @keyframes shimmer{0%,100%{opacity:0.45}50%{opacity:1}}
  @keyframes bounceDot{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-18px)}}
  @keyframes slideUp{0%{transform:translateY(32px);opacity:0}100%{transform:translateY(0);opacity:1}}
  @keyframes twinkle{0%,100%{opacity:0.25;transform:scale(0.75)}50%{opacity:1;transform:scale(1.3)}}
  @keyframes arcFill{0%{stroke-dasharray:0 283}100%{stroke-dasharray:283 0}}
  @keyframes blink{0%,90%,100%{transform:scaleY(1)}95%{transform:scaleY(0.1)}}
  .af{animation:float 3s ease-in-out infinite}
  .afb{animation:floatB 4s ease-in-out infinite}
  .asr{animation:spinRing 10s linear infinite}
  .api{animation:popIn .45s cubic-bezier(.34,1.56,.64,1) forwards}
  .ash{animation:shimmer 2.4s ease-in-out infinite}
  .abd{animation:bounceDot 1.4s ease-in-out infinite}
  .asu{animation:slideUp .5s ease-out forwards}
  .atw{animation:twinkle 2.5s ease-in-out infinite}
  .aaf{animation:arcFill 2.2s ease-out forwards}
  .ff{font-family:'Fredoka One',cursive!important}
  .fn{font-family:'Nunito',sans-serif!important}
  *::-webkit-scrollbar{width:5px}
  *::-webkit-scrollbar-thumb{background:rgba(0,188,212,.25);border-radius:3px}
  *::-webkit-scrollbar-track{background:transparent}
`;
