// 音乐与音效：全部用 WebAudio 现场合成（不需要音频文件）。
// 音乐：D 多利亚调式的凯尔特风旋律（长笛音色）+ 竖琴分解和弦 + 低音 + 鼓；战斗层随怪物数量加强；Boss 时换激烈段。
// 首次点击/按键后才能出声（浏览器规定）。M 键静音。
export function createAudio(){
 let ac=null,master,musicBus,sfxBus,on=true,mode='menu',inten=0,started=false,next=0,step=0;
 try{on=localStorage.getItem('mute')!=='1'}catch(e){}
 function init(){if(ac)return;ac=new (window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=on?.9:0;master.connect(ac.destination);
  musicBus=ac.createGain();musicBus.gain.value=.32;musicBus.connect(master);sfxBus=ac.createGain();sfxBus.gain.value=.5;sfxBus.connect(master);
  const rv=ac.createConvolver(),len=ac.sampleRate*1.6,b=ac.createBuffer(2,len,ac.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.5)}
  rv.buffer=b;const wet=ac.createGain();wet.gain.value=.22;musicBus.connect(rv);rv.connect(wet);wet.connect(master);T.rv=rv}
 const T={};
 const unlock=()=>{init();if(ac.state==='suspended')ac.resume();if(!started){started=true;next=ac.currentTime+.1;tick()}};
 addEventListener('pointerdown',unlock);addEventListener('keydown',e=>{unlock();if(e.key==='m'||e.key==='M'){on=!on;try{localStorage.setItem('mute',on?'0':'1')}catch(_){}if(master)master.gain.setTargetAtTime(on?.9:0,ac.currentTime,.05)}});
 const hz=m=>440*Math.pow(2,(m-69)/12);
 function tone(t,m,d,{type='triangle',vol=.2,bus=musicBus,att=.01,rel=.25,det=0,lp=0}={}){const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=hz(m);o.detune.value=det;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+att);g.gain.setTargetAtTime(0,t+d,rel/3);let n=o;if(lp){const f=ac.createBiquadFilter();f.frequency.value=lp;o.connect(f);n=f}n.connect(g);g.connect(bus);o.start(t);o.stop(t+d+rel+.1)}
 function noise(t,d,{vol=.3,hp=0,lp=0,bus=sfxBus}={}){const len=Math.ceil(ac.sampleRate*d),b=ac.createBuffer(1,len,ac.sampleRate),x=b.getChannelData(0);for(let i=0;i<len;i++)x[i]=(Math.random()*2-1)*(1-i/len);
  const s=ac.createBufferSource();s.buffer=b;let n=s;if(hp){const f=ac.createBiquadFilter();f.type='highpass';f.frequency.value=hp;n.connect(f);n=f}if(lp){const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=lp;n.connect(f);n=f}
  const g=ac.createGain();g.gain.value=vol;n.connect(g);g.connect(bus);s.start(t)}
 function kick(t,v=.5){const o=ac.createOscillator(),g=ac.createGain();o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(40,t+.15);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+.25);o.connect(g);g.connect(musicBus);o.start(t);o.stop(t+.3)}
 // ---------- 曲子 ----------
 // D 多利亚：D E F G A B C；和弦进行 Dm – C – G – Dm（每小节 8 个八分音符）
 const CH=[[50,53,57],[48,52,55],[43,47,50],[50,53,57]],BASS=[38,36,31,38];
 const MEL_A=[74,72,69,67,69,72,74,77, 76,74,72,69,67,69,72,74, 71,72,74,71,67,69,71,74, 69,67,65,64,62,64,65,69];
 const MEL_B=[81,79,77,76,74,76,77,79, 79,77,76,74,72,74,76,77, 74,76,79,81,79,77,74,71, 74,72,69,67,69,72,74,74];
 function bar(t,beat,bi){
  const c=CH[bi%4],b=BASS[bi%4],menu=mode==='menu',boss=mode==='boss',e=boss?1:inten;
  for(let i=0;i<8;i++){const tt=t+i*beat;
   tone(tt,c[i%3]+12+(i>=4?12:0),beat*.9,{type:'triangle',vol:menu?.07:.05,rel:.6});          // 竖琴分解和弦
   if(!menu&&(i%2===0))tone(tt,b,beat*1.8,{type:'sawtooth',vol:.05+.04*e,lp:500,rel:.2});     // 低音
   if(!menu){if(i%4===0)kick(tt,.35+.25*e);if(i%4===2)noise(tt,.12,{vol:.08+.1*e,hp:1800,bus:musicBus});if(e>.5||boss)noise(tt+beat/2,.04,{vol:.05,hp:6000,bus:musicBus})}}
  const mel=(boss||(bi>>2)%2)?MEL_B:MEL_A,seg=(bi%4)*8;
  if(!menu||bi%2===0)for(let i=0;i<8;i++){const m=mel[seg+i];if(i%2===1&&menu)continue;tone(t+i*beat,m,beat*(menu?1.8:.9),{type:'sine',vol:menu?.09:.07,att:.03,rel:.3,det:Math.sin(i)*6});
   if(e>.6||boss)tone(t+i*beat,m-12,beat*.9,{type:'square',vol:.025,lp:1800})}                  // 激烈层：加一层低八度
 }
 function tick(){if(!ac)return;const beat=mode==='menu'?.34:mode==='boss'?.19:.24;
  while(next<ac.currentTime+.6){if(on)bar(next,beat,step);next+=beat*8;step++}
  setTimeout(tick,200)}
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
 return {...S,setMode(m){mode=m},setIntensity(x){inten=Math.max(0,Math.min(1,x))},get muted(){return !on}};
}
