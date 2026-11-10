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
 const unlock=()=>{init();if(ac.state==='suspended')ac.resume();if(!started){started=true;next=ac.currentTime+.1;tick()}};
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
 const SONGS={
  menu:{beat:.36,ch:[[55,59,62],[50,54,57],[52,55,59],[48,52,55],[55,59,62],[48,52,55],[50,54,57],[55,59,62]],
   mel:[67,-1,71,74,72,71,69,-1, 69,-1,66,69,74,-1,72,71, 71,-1,67,71,76,74,72,71, 72,-1,-1,71,69,67,64,-1,
        67,71,74,79,78,76,74,-1, 76,-1,72,76,79,-1,76,74, 74,72,71,69,66,69,72,74, 71,-1,69,-1,67,-1,-1,-1]},
  battle:{beat:.22,ch:[[57,60,64],[53,57,60],[55,59,62],[52,55,59],[57,60,64],[53,57,60],[52,56,59],[57,60,64]],
   mel:[69,72,76,72,69,72,76,79, 77,76,72,69,72,-1,69,-1, 71,74,79,74,71,74,79,81, 79,76,71,67,71,-1,64,-1,
        76,-1,74,72,74,-1,72,71, 72,-1,71,69,77,76,74,72, 71,-1,68,71,76,-1,74,71, 69,-1,64,-1,69,-1,-1,-1]},
  elite:{beat:.21,ch:[[50,53,57],[46,50,53],[48,52,55],[45,49,52],[50,53,57],[46,50,53],[43,46,50],[45,49,52]],
   mel:[62,-1,-1,65,69,-1,67,65, 65,-1,62,-1,58,-1,-1,-1, 64,-1,-1,67,72,-1,70,69, 69,-1,-1,-1,61,64,67,69,
        74,-1,72,70,69,-1,65,62, 70,-1,69,67,65,-1,62,-1, 67,-1,65,62,58,62,65,67, 69,-1,-1,-1,61,-1,64,-1]},
  boss:{beat:.19,ch:[[48,51,55],[44,48,51],[46,50,53],[43,47,50],[48,51,55],[44,48,51],[41,44,48],[43,47,50]],
   mel:[60,-1,63,60,67,-1,66,67, 68,-1,67,63,60,-1,-1,-1, 62,-1,65,62,70,-1,69,70, 71,-1,67,-1,62,-1,59,-1,
        72,-1,70,68,67,-1,63,60, 68,-1,67,65,63,-1,60,-1, 65,-1,68,72,70,68,67,65, 67,-1,71,-1,74,-1,79,-1]}};
 // 乐器
 const lute=(t,m,v=.07)=>{tone(t,m,.05,{type:'triangle',vol:v,att:.003,rel:.5});tone(t,m+12,.03,{type:'sine',vol:v*.35,att:.003,rel:.25})};
 const flute=(t,m,d,v=.07)=>{const o=ac.createOscillator(),l=ac.createOscillator(),lg=ac.createGain(),g=ac.createGain();o.type='sine';o.frequency.value=hz(m);l.frequency.value=5.2;lg.gain.value=hz(m)*.006;l.connect(lg);lg.connect(o.frequency);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.06);g.gain.setTargetAtTime(0,t+d,.08);o.connect(g);g.connect(musicBus);o.start(t);l.start(t);o.stop(t+d+.4);l.stop(t+d+.4);noise(t,.05,{vol:v*.25,hp:3000,bus:musicBus})};
 const fiddle=(t,m,d,v=.045)=>{tone(t,m,d,{type:'sawtooth',vol:v,att:.02,rel:.12,lp:2200,det:4});tone(t,m,d,{type:'sawtooth',vol:v*.6,att:.02,rel:.12,lp:2200,det:-6})};
 const brass=(t,m,d,v=.05)=>{const o=ac.createOscillator(),f=ac.createBiquadFilter(),g=ac.createGain();o.type='sawtooth';o.frequency.value=hz(m);f.type='lowpass';f.frequency.setValueAtTime(300,t);f.frequency.linearRampToValueAtTime(1600,t+.08);f.frequency.setTargetAtTime(900,t+.1,.2);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.05);g.gain.setTargetAtTime(0,t+d,.07);o.connect(f);f.connect(g);g.connect(musicBus);o.start(t);o.stop(t+d+.4)};
 const choir=(t,c,d,v=.022)=>c.forEach(m=>[-9,0,8].forEach(det=>tone(t,m+12,d,{type:'sawtooth',vol:v,att:.35,rel:.6,lp:900,det})));
 const strings=(t,c,d,v=.02)=>c.forEach(m=>tone(t,m,d,{type:'sawtooth',vol:v,att:.25,rel:.5,lp:1200,det:(m%3-1)*7}));
 const tom=(t,v=.3,f=110)=>{const o=ac.createOscillator(),g=ac.createGain();o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.5,t+.2);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(g);g.connect(musicBus);o.start(t);o.stop(t+.35)};
 const snare=(t,v=.1)=>{noise(t,.14,{vol:v,hp:1500,bus:musicBus});tone(t,55,.04,{type:'triangle',vol:v*.5,rel:.05})};
 const tamb=(t,v=.03)=>noise(t,.05,{vol:v,hp:7000,bus:musicBus});
 function bar(t,beat,bi){
  if(mode==='silent')return;
  const S=SONGS[mode]||SONGS.menu,k=bi%8,c=S.ch[k],e=inten,mel=S.mel.slice(k*8,k*8+8);
  const notes=[];for(let i=0;i<8;i++)if(mel[i]>=0){let L=1;while(i+L<8&&mel[i+L]<0)L++;notes.push([i,mel[i],L])}
  if(mode==='menu'){ // 地图：鲁特琴 + 长笛 + 手鼓
   for(let i=0;i<8;i++){lute(t+i*beat,c[[0,1,2,1,0,2,1,2][i]]+12);if(i%4===0)tone(t+i*beat,c[0]-12,beat*3.5,{type:'triangle',vol:.06,rel:.4});if(i%2===1)tamb(t+i*beat)}
   if(bi%16>=8||bi>=8)notes.forEach(([i,m,L])=>flute(t+i*beat,m,beat*L*.95));
  }else if(mode==='battle'){ // 战斗：弦乐快速跑动 + 提琴旋律 + 鼓
   for(let i=0;i<8;i++){const tt=t+i*beat;tone(tt,c[i%3]+12,beat*.8,{type:'sawtooth',vol:.022,rel:.08,lp:1800});
    if(i%2===0)tone(tt,c[0]-12,beat*1.7,{type:'sawtooth',vol:.06,lp:450,rel:.15});
    if(i===0||i===3||i===6)tom(tt,.32+.15*e,70);if(i===2||i===6)snare(tt,.08+.05*e);if(e>.4)tamb(tt+beat/2,.025)}
   notes.forEach(([i,m,L])=>fiddle(t+i*beat,m,beat*L*.92));
  }else if(mode==='elite'){ // 精英：号角 + 低音弦 + 战鼓
   strings(t,c,beat*7.5,.018);
   for(let i=0;i<8;i++){const tt=t+i*beat;tone(tt,c[0]-12,beat*.9,{type:'sawtooth',vol:.07,lp:380,rel:.1});
    if(i%2===0)tom(tt,.38,60);if(i===4)snare(tt,.14);if(i===7)tom(tt,.25,95)}
   notes.forEach(([i,m,L])=>{brass(t+i*beat,m,beat*L*.9);brass(t+i*beat,m-12,beat*L*.9,.03)});
  }else{ // Boss：合唱 + 铜管 + 重战鼓
   choir(t,c,beat*7.6);
   for(let i=0;i<8;i++){const tt=t+i*beat;tone(tt,c[0]-12,beat*.9,{type:'sawtooth',vol:.08,lp:420,rel:.1});
    tom(tt,i%2===0?.45:.22,i%2===0?55:85);if(i===2||i===6)snare(tt,.15);if(i%4===0)brass(tt,c[0],beat*.6,.05)}
   notes.forEach(([i,m,L])=>brass(t+i*beat,m,beat*L*.9,.055));
  }
 }
 addEventListener('visibilitychange',()=>{if(ac&&!document.hidden)next=Math.max(next,ac.currentTime+.1)});
 function tick(){if(!ac)return;if(document.hidden){setTimeout(tick,500);return}const beat=(SONGS[mode]||SONGS.menu).beat;
  while(next<ac.currentTime+.6){if(on)bar(next,beat,step);next+=beat*8;step++}
  setTimeout(tick,200)}
 // ---------- 哥布林叫声（合成，不说话） ----------
 // sz：体型（>1 尖细小鬼，<1 低沉巨人）；kind: laugh 笑 / atk 吼 / hurt 痛叫 / die 惨叫 / buff 怪笑 / growl 狼嚎
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
