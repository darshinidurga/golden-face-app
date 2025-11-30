/* --------------------------------------------------------
   Golden Ratio Analyzer ✨ (Final Version + Animations)
   - Lenient scoring
   - Compliment engine
   - Crown + confetti + soft particles
   - Shimmer analyzing
   - Score pulse + compliment slide
   - Share card generator
   -------------------------------------------------------- */

const phi = 1.618;
const tolerance = 1.0;

/* UI elements */
const upload = document.getElementById('upload');
const img = document.getElementById('photo');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');

const crown = document.getElementById('crown');
const analyzingEl = document.getElementById('analyzing');
const resultsEl = document.getElementById('results');
const scoreEl = document.getElementById('score');
const messageEl = document.getElementById('message');
const shareCardBtn = document.getElementById('share-card');
const downloadBtn = document.getElementById('download');
const ratiosTableBody = document.querySelector('#ratios-table tbody');

/* --------------------------------------------------------
   Compliments Library 
-------------------------------------------------------- */

const msgs90 = [
`You look like a scene from a classic portrait — impossible not to look away. 
Your features flow in a rhythm that feels unreal. 
Honestly, the Golden Ratio should take notes from you.`,

`This is beauty with quiet confidence. 
Soft, clean, elegant — like a frame from a movie where everything feels perfect. 
You look effortlessly iconic.`,

`You have symmetry with personality — the rarest combination. 
Balanced, striking, and impossible to forget. 
This is main-character energy.`,
];

const msgs75 = [
`You have a naturally calm, elegant balance. 
It’s gentle, soft, warm — the kind of beauty people feel comfortable around. 
Very aesthetic, very pleasant.`,

`There’s a soothing harmony to your features. 
Soft curves, balanced angles, warm expression. 
Completely lovable presence.`,
];

const msgs50 = [
`You have the kind of charm that numbers can't calculate. 
Soft, approachable, and easy to adore. 
There’s warmth in your expression.`,

`Your beauty is the comfortable kind — real, warm, inviting. 
The type that grows on people instantly.`,
];

const msgs0 = [
`Perfectly imperfect — and somehow that’s the best kind. 
Symmetry fades; personality stays. 
You have a face with story.`,

`You’re the definition of unique charm. 
A little quirky, a little warm, extremely lovable. 
Numbers don’t get the vibe.`,
];

function pickMsgByScore(score){
  if(score >= 90) return randomFrom(msgs90);
  if(score >= 75) return randomFrom(msgs75);
  if(score >= 50) return randomFrom(msgs50);
  return randomFrom(msgs0);
}

function randomFrom(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

/* Store last result */
let lastResult = {
  score: 0,
  comps: [],
  imgLoaded: false
};

/* Upload handler */
upload.addEventListener('change', () => {
  const file = upload.files && upload.files[0];
  if(!file) return;

  img.src = URL.createObjectURL(file);
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    crown.style.display = 'none';
    startAnalysisSequence();
  };
});

/* Analysis animation */
function startAnalysisSequence(){
  analyzingEl.classList.remove('hidden');
  analyzingEl.classList.add('shimmer');

  // reset result animations
  resultsEl.classList.add('hidden');
  resultsEl.classList.remove('show');
  scoreEl.classList.remove('pulse');
  messageEl.classList.remove('slide');

  ratiosTableBody.innerHTML = '';
  scoreEl.innerText = '—';
  messageEl.innerText = '';

  setTimeout(() => runFaceMesh(), 600);
}

/* FaceMesh */
function runFaceMesh(){
  const fm = new FaceMesh({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}` });
  fm.setOptions({ maxNumFaces: 1, refineLandmarks: true });
  fm.onResults(onResults);
  fm.send({ image: img });
}

function px(p, W, H){ return { x: p.x * W, y: p.y * H }; }
function dist(a,b){ return Math.hypot(a.x - b.x, a.y - b.y); }

/* On FaceMesh Results */
function onResults(result){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  analyzingEl.classList.add('hidden');

  if(!result.multiFaceLandmarks || result.multiFaceLandmarks.length === 0){
    scoreEl.innerText = 'No face detected';
    messageEl.innerText = 'Try a clearer, front-facing photo.';
    resultsEl.classList.remove('hidden');
    return;
  }

  const lm = result.multiFaceLandmarks[0];
  const W = canvas.width, H = canvas.height;

  const chin = px(lm[152],W,H);
  const noseTip = px(lm[1],W,H);
  const noseBridge = px(lm[168],W,H);
  const leftInnerEye = px(lm[33],W,H);
  const rightInnerEye = px(lm[263],W,H);
  const leftMouth = px(lm[61],W,H);
  const rightMouth = px(lm[291],W,H);
  const upperLip = px(lm[13],W,H);

  let minY = Infinity;
  for(let i=0;i<lm.length;i++){
    const y = lm[i].y * H;
    if(y < minY) minY = y;
  }
  const topFace = { x: W/2, y: minY };

  const faceLen = dist(topFace, chin);
  const noseLen = dist(noseBridge, noseTip);
  const inter = dist(leftInnerEye, rightInnerEye);
  const mouthW = dist(leftMouth, rightMouth);
  const phil = dist(noseTip, upperLip);

  drawOverlay(topFace, chin, noseBridge, noseTip, leftInnerEye, rightInnerEye, leftMouth, rightMouth, noseTip, upperLip);

  /* Ratios */
  const ratios = [
    { name: 'Face / Nose', value: faceLen / (noseLen || 1) },
    { name: 'Face / Interocular', value: faceLen / (inter || 1) },
    { name: 'Interocular / Mouth', value: inter / (mouthW || 1) },
    { name: '(Nose + Philtrum) / Mouth', value: (noseLen + phil) / (mouthW || 1) }
  ];

  const comps = ratios.map(r => {
    const closeness = 1 - (Math.abs(r.value - phi) / (phi * tolerance));
    return { name: r.name, ratio: r.value, closeness: Math.max(0, Math.min(1, closeness)) };
  });

  // ---------------------------------------------
  // LENIENT SCORING ENGINE
  // ---------------------------------------------
  let raw = (comps.reduce((s,c) => s + c.closeness, 0) / comps.length) * 100;

  raw = raw * 1.15;
  if (raw < 55) raw += 15;
  if (raw < 65) raw = 60 + Math.random()*12;
  if (raw > 95) raw = 92 + Math.random()*8;

  const score = Math.round(Math.max(0, Math.min(100, raw)));

  // Save
  lastResult.score = score;
  lastResult.comps = comps;
  lastResult.imgLoaded = true;

  // UI Update
  scoreEl.innerText = `${score}%`;
  messageEl.innerText = pickMsgByScore(score);

  // table
  ratiosTableBody.innerHTML = "";
  comps.forEach(c =>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.name}</td>
      <td>${c.ratio.toFixed(3)}</td>
      <td>${Math.round(c.closeness*100)}%</td>
    `;
    ratiosTableBody.appendChild(tr);
  });

  // Crown & effects
  crown.style.display = score >= 85 ? 'block' : 'none';

  // Soft gold particles
  if(score >= 85){
      confetti({
          particleCount: 35,
          spread: 30,
          origin: { y: 0.8 },
          colors: ['#d6b169','#f9e7c5']
      });
  }

  // Big confetti for 90+
  if(score >= 90){
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.3 } });
  }

  // show with animation
  resultsEl.classList.remove('hidden');
  resultsEl.classList.add('show');
  scoreEl.classList.add('pulse');
  messageEl.classList.add('slide');
}

/* Overlay lines */
function drawOverlay(tf, chin, nb, nt, lei, rei, lmL, lmR, nt2, ul){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = 'rgba(184,136,48,0.95)';

  const lines = [
    [tf, chin],
    [nb, nt],
    [lei, rei],
    [lmL, lmR],
    [nt2, ul]
  ];

  lines.forEach(([a,b])=>{
    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.lineTo(b.x,b.y);
    ctx.stroke();
  });

  const dots = [tf, chin, nb, nt, lei, rei, lmL, lmR, ul];
  dots.forEach(p=>{
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.4,0,Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(184,136,48,0.3)';
    ctx.stroke();
  });
}

/* Download annotated image */
downloadBtn.addEventListener('click', ()=>{
  if(!lastResult.imgLoaded) return;

  const out = document.createElement('canvas');
  out.width = canvas.width;
  out.height = canvas.height;

  const c = out.getContext('2d');
  c.drawImage(img,0,0);
  c.drawImage(canvas,0,0);

  const a = document.createElement('a');
  a.href = out.toDataURL('image/png');
  a.download = 'golden_selfie.png';
  a.click();
});

/* SHARE CARD (1080x1080) */
shareCardBtn.addEventListener('click', async ()=>{
  if(!lastResult.imgLoaded){
    alert("Upload a photo first.");
    return;
  }

  const W=1080, H=1080;
  const card = document.createElement('canvas');
  card.width=W;
  card.height=H;
  const c = card.getContext('2d');

  c.fillStyle="#fffaf6";
  c.fillRect(0,0,W,H);

  const g=c.createRadialGradient(W/2,H/2,200,W/2,H/2,850);
  g.addColorStop(0,'#fffaf6');
  g.addColorStop(1,'#f7efe4');
  c.fillStyle=g;
  c.fillRect(0,0,W,H);

  const frame=40;
  c.strokeStyle='rgba(184,136,48,0.9)';
  c.lineWidth=8;
  c.strokeRect(frame,frame,W-frame*2,H-frame*2);

  const psize=640;
  const px=(W-psize)/2;
  const py=70;

  await drawImageCover(c,img,null,{x:px,y:py,w:psize,h:psize});

  const scoreStr=`${lastResult.score}%`;
  c.fillStyle='#b88f40';
  c.font='700 72px "Playfair Display"';
  const sw=c.measureText(scoreStr).width;
  c.fillText(scoreStr,(W-sw)/2,820);

  c.fillStyle='#7c6a5d';
  c.font='500 28px Poppins';
  c.fillText("Golden Score",W/2 - c.measureText("Golden Score").width/2,865);

  const compliment=pickMsgByScore(lastResult.score);
  c.fillStyle='#4a3f35';
  c.font="600 24px 'Playfair Display'";
  wrapText(c,compliment,140,900,800,32);

  const wm='SHIVISH ✨';
  c.font='600 26px Poppins';
  c.fillStyle='rgba(120,90,50,0.25)';
  c.fillText(wm,W/2 - c.measureText(wm).width/2,H-40);

  const a=document.createElement('a');
  a.href=card.toDataURL('image/png');
  a.download=`golden_card_${Date.now()}.png`;
  a.click();
});

/* Draw Image Cover (crop center) */
async function drawImageCover(ctx2,imageEl,srcArea,dest){
  let dx=dest.x, dy=dest.y, dw=dest.w, dh=dest.h;

  const imgW=imageEl.naturalWidth, imgH=imageEl.naturalHeight;
  const srcRatio=imgW/imgH;
  const destRatio=dw/dh;

  let sx,sy,sw,sh;

  if(srcRatio>destRatio){
    sh=imgH;
    sw=imgH*destRatio;
    sx=(imgW-sw)/2;
    sy=0;
  } else {
    sw=imgW;
    sh=imgW/destRatio;
    sx=0;
    sy=(imgH-sh)/2;
  }

  ctx2.drawImage(imageEl,sx,sy,sw,sh,dx,dy,dw,dh);
}

/* Text Wrapper */
function wrapText(ctx2,text,x,y,maxWidth,lineHeight){
  const words=text.split(' ');
  let line='';
  let cy=y;

  words.forEach((word,i)=>{
    const test=line+word+' ';
    const w=ctx2.measureText(test).width;
    if(w>maxWidth && i>0){
      ctx2.fillText(line,x,cy);
      line=word+' ';
      cy+=lineHeight;
    } else {
      line=test;
    }
  });
  ctx2.fillText(line,x,cy);
}

/* Safety */
setTimeout(()=>{
  if(!window.FaceMesh){
    console.warn("FaceMesh library isn't loading.");
  }
},1500);
