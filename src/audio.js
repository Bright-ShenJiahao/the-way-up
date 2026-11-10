// 音乐与音效：全部用 WebAudio 现场合成（不需要音频文件）。
// 音乐：4 首西方奇幻风——地图（鲁特琴+长笛）、战斗（弦乐+提琴）、精英（号角+战鼓）、Boss（合唱+铜管）。哥布林叫声也是合成的。
// 首次点击/按键后才能出声（浏览器规定）。M 键静音。
export function createAudio(){
 let ac=null,master,musicBus,sfxBus,on=true,mode='silent',inten=0,started=false,next=0,step=0;
 try{on=localStorage.getItem('mute')!=='1'}catch(e){}
 let V={m:1,mu:1,s:1};try{Object.assign(V,JSON.parse(localStorage.getItem('tw_vol')||'{}'))}catch(e){}
 function init(){if(ac)return;ac=new (window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=on?.9*V.m:0;master.connect(ac.destination);
  musicBus=ac.createGain();musicBus.gain.value=.32*V.mu;musicBus.connect(master);sfxBus=ac.createGain();sfxBus.gain.value=.5*V.s;sfxBus.connect(master);
  const rv=ac.createConvolver(),len=ac.sampleRate*1.6,b=ac.createBuffer(2,len,ac.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.5)}
  rv.buffer=b;const wet=ac.createGain();wet.gain.value=.22;musicBus.connect(rv);rv.connect(wet);wet.connect(master);T.rv=rv}
 const T={};
 const unlock=()=>{init();if(ac.state==='suspended')ac.resume();};
 addEventListener('pointerdown',unlock);addEventListener('keydown',e=>{unlock();if(e.target&&e.target.tagName==='INPUT')return;if(e.key==='m'||e.key==='M'){on=!on;try{localStorage.setItem('mute',on?'0':'1')}catch(_){}if(master)master.gain.setTargetAtTime(on?.9*V.m:0,ac.currentTime,.05)}});
 const hz=m=>440*Math.pow(2,(m-69)/12);
 function tone(t,m,d,{type='triangle',vol=.2,bus=musicBus,att=.01,rel=.25,det=0,lp=0}={}){const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=hz(m);o.detune.value=det;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+att);g.gain.setTargetAtTime(0,t+d,rel/3);let n=o;if(lp){const f=ac.createBiquadFilter();f.frequency.value=lp;o.connect(f);n=f}n.connect(g);g.connect(bus);o.start(t);o.stop(t+d+rel+.1)}
 function noise(t,d,{vol=.3,hp=0,lp=0,bus=sfxBus}={}){const len=Math.ceil(ac.sampleRate*d),b=ac.createBuffer(1,len,ac.sampleRate),x=b.getChannelData(0);for(let i=0;i<len;i++)x[i]=(Math.random()*2-1)*(1-i/len);
  const s=ac.createBufferSource();s.buffer=b;let n=s;if(hp){const f=ac.createBiquadFilter();f.type='highpass';f.frequency.value=hp;n.connect(f);n=f}if(lp){const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=lp;n.connect(f);n=f}
  const g=ac.createGain();g.gain.value=vol;n.connect(g);g.connect(bus);s.start(t)}
 function kick(t,v=.5){const o=ac.createOscillator(),g=ac.createGain();o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(40,t+.15);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+.25);o.connect(g);g.connect(musicBus);o.start(t);o.stop(t+.3)}
 // ---------- 曲子（4 首，西方奇幻风） ----------
 // 每首 8 小节循环，每小节 8 个八分音符；mel 里 -1 表示延长上一个音
 function voice(t,pts,{sz=1,vol=.16,vow='i',rasp=0}={}){
  const o=ac.createOscillator(),g=ac.createGain(),out=ac.createGain();o.type='sawtooth';
  pts.forEach(([dt,f],i)=>{const fr=f*sz;if(i===0)o.frequency.setValueAtTime(fr,t+dt);else o.frequency.exponentialRampToValueAtTime(fr,t+dt)});
  if(rasp){const l=ac.createOscillator(),lg=ac.createGain();l.frequency.value=38;lg.gain.value=pts[0][1]*sz*rasp;l.connect(lg);lg.connect(o.frequency);l.start(t);l.stop(t+pts.at(-1)[0]+.1)}
  const F={i:[320,2400],e:[500,1900],a:[750,1200],o:[480,850]}[vow];
  F.forEach((ff,j)=>{const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=ff*Math.sqrt(sz);f.Q.value=6;const fg=ac.createGain();fg.gain.value=j?.7:1;o.connect(f);f.connect(fg);fg.connect(g)});
  const end=pts.at(-1)[0];g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.015);g.gain.setValueAtTime(vol,t+end*.75);g.gain.linearRampToValueAtTime(0,t+end);
  g.connect(sfxBus);o.start(t);o.stop(t+end+.05)}
 function gob(kind,sz=1){if(!ac||!ok('gob'+kind,kind==='hurt'?120:200))return;const t=ac.currentTime+.01,r=1+(Math.random()-.5)*.12,s=sz*r,big=sz<.8?.06:0;
  if(kind==='laugh')for(let i=0;i<4;i++)voice(t+i*.11,[[0,520],[.06,620],[.09,480]],{sz:s,vol:.11,vow:'i',rasp:big});
  else if(kind==='buff')for(let i=0;i<5;i++)voice(t+i*.09,[[0,700-i*40],[.05,820-i*40],[.08,600]],{sz:s,vol:.1,vow:'e',rasp:big});
  else if(kind==='atk')voice(t,[[0,300],[.05,420],[.2,240]],{sz:s,vol:.17,vow:'a',rasp:.08+big});
  else if(kind==='hurt')voice(t,[[0,600],[.04,950],[.14,520]],{sz:s,vol:.14,vow:'i',rasp:big});
  else if(kind==='die')voice(t,[[0,700],[.08,820],[.6,180]],{sz:s,vol:.15,vow:'o',rasp:.05+big});
  else if(kind==='growl'){voice(t,[[0,110],[.1,140],[.45,90]],{sz:1,vol:.16,vow:'o',rasp:.25});noise(t,.4,{vol:.06,lp:600})}
  else if(kind==='howl')voice(t,[[0,300],[.3,520],[.9,380]],{sz:1,vol:.12,vow:'o',rasp:.02});}
 // ---------- 音效 ----------
 let last={};const ok=(k,gap)=>{const n=performance.now();if(n-(last[k]||0)<gap)return false;last[k]=n;return true};
 const S={
  shoot(){if(!ac||!ok('sh',70))return;const t=ac.currentTime;tone(t,88,.04,{type:'square',vol:.06,bus:sfxBus,rel:.03});tone(t+.03,95,.03,{type:'square',vol:.04,bus:sfxBus,rel:.03})},
  slash(){if(!ac||!ok('sl',80))return;noise(ac.currentTime,.12,{vol:.12,hp:2500})},
  wave(){if(!ac||!ok('wv',150))return;const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.frequency.setValueAtTime(220,t);o.frequency.exponentialRampToValueAtTime(70,t+.3);g.gain.setValueAtTime(.18,t);g.gain.exponentialRampToValueAtTime(.001,t+.35);o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+.4)},
  boom(){if(!ac||!ok('bm',90))return;noise(ac.currentTime,.35,{vol:.25,lp:700})},
  zap(){if(!ac||!ok('zp',90))return;const t=ac.currentTime;for(let i=0;i<4;i++)tone(t+i*.02,96-i*5,.03,{type:'sawtooth',vol:.04,bus:sfxBus,rel:.02})},
  holy(){if(!ac||!ok('hl',120))return;const t=ac.currentTime;tone(t,96,.35,{type:'sine',vol:.03,bus:sfxBus,rel:.5});tone(t+.04,103,.3,{type:'sine',vol:.02,bus:sfxBus,rel:.5});tone(t,84,.2,{type:'triangle',vol:.02,bus:sfxBus,rel:.3})},
  hit(k='rng'){if(!ac)return;const t=ac.currentTime;if(!k||!ok('h'+k,k==='mel'?60:50))return;
   if(k==='mel'){noise(t,.07,{vol:.14,lp:900});tone(t,45,.06,{type:'square',vol:.05,bus:sfxBus,rel:.05,lp:500})}
   else if(k==='rng')noise(t,.04,{vol:.09,hp:1800})
   else if(k==='fire')noise(t,.12,{vol:.1,lp:1400})
   else if(k==='zap'){for(let i=0;i<3;i++)tone(t+i*.015,100-i*6,.025,{type:'sawtooth',vol:.03,bus:sfxBus,rel:.02})}
   else if(k==='ice')tone(t,100+Math.floor(Math.random()*3),.05,{type:'sine',vol:.04,bus:sfxBus,rel:.12})
   else if(k==='holy')tone(t,98,.06,{type:'sine',vol:.04,bus:sfxBus,rel:.15})
   else if(k==='dark')tone(t,40,.1,{type:'triangle',vol:.07,bus:sfxBus,rel:.12})
   else noise(t,.05,{vol:.1,lp:1500})},
  kill(){if(!ac||!ok('kl',60))return;const t=ac.currentTime;tone(t,60,.06,{type:'square',vol:.05,bus:sfxBus,rel:.05,lp:900})},
  gem(n=0){if(!ac||!ok('gm',40))return;const t=ac.currentTime;tone(t,84+Math.min(24,n*.5|0),.05,{type:'sine',vol:.07,bus:sfxBus,rel:.08})},
  hurt(){if(!ac||!ok('hu',250))return;const t=ac.currentTime;tone(t,52,.12,{type:'sawtooth',vol:.12,bus:sfxBus,rel:.1,lp:600})},
  level(){if(!ac)return;const t=ac.currentTime;[74,78,81,86].forEach((m,i)=>tone(t+i*.07,m,.12,{type:'triangle',vol:.12,bus:sfxBus,rel:.3}))},
  boss(){if(!ac)return;const t=ac.currentTime;[38,38,41,38].forEach((m,i)=>tone(t+i*.35,m,.3,{type:'sawtooth',vol:.14,bus:sfxBus,rel:.4,lp:700}))},
  banner(){if(!ac)return;const t=ac.currentTime;tone(t,69,.1,{type:'triangle',vol:.1,bus:sfxBus});tone(t+.1,74,.18,{type:'triangle',vol:.1,bus:sfxBus})}};
 return {...S,gob,vol:V,setVol(k,v){V[k]=v;try{localStorage.setItem('tw_vol',JSON.stringify(V))}catch(e){}if(!ac)return;const t=ac.currentTime;master.gain.setTargetAtTime(on?.9*V.m:0,t,.05);musicBus.gain.setTargetAtTime(.32*V.mu,t,.05);sfxBus.gain.setTargetAtTime(.5*V.s,t,.05)},setMode(m){mode=m},setIntensity(x){inten=Math.max(0,Math.min(1,x))},get muted(){return !on}};
}
