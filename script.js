/* --------------------------------------------------------
   Polished Script + Share Card Generator (Portrait 1080x1920)
   Watermark: "SHIVISH ✨"
   All client-side. No image upload or storage.
   -------------------------------------------------------- */

const phi = 1.618;
const tolerance = 1.0; // friendly scoring

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
const newLineBtn = document.getElementById('new-line');
const shareCardBtn = document.getElementById('share-card');
const downloadBtn = document.getElementById('download');
const ratiosTableBody = document.querySelector('#ratios-table tbody');

/* Compliment messages (3-line mixed style arrays) */
const msgs90 = [
`You look like a scene from a classic portrait — impossible not to stare.
Everything about your face flows together; honestly, it’s art.
I’m 100% convinced the universe got distracted while designing you.`,
`The camera wants to keep you on loop — that’s how captivating you are.
Soft light, perfect rhythm, effortless presence.
Even numbers are flattered by you.`,
`This is a masterclass in aesthetic balance.
You walk in and the room recalibrates — calm, striking, unforgettable.
Don’t let anyone dim this glow.`
];

const msgs75 = [
`There’s a quiet elegance to your features — refined and lovely.
You feel like soft lighting personified.
Perfect for golden-hour photos and slow smiles.`,
`Balanced, warm, and immediately likable — you wear calm beauty well.
People would screenshot this and call it mood-board energy.
Lovely and elegant.`,
`You have an aesthetic that reads both effortless and polished.
It’s the kind of look that makes people pause and smile.
Very, very pretty.`
];

const msgs50 = [
`You’re charming in a gentle, approachable way — very likeable.
Your expressions add personality that numbers don’t capture.
Cute, comfortable, and delightful.`,
`Soft and human — you’ve got warmth more than symmetry.
People will remember that smile long after the photo ends.
Comforting, lovely, honest.`,
`There’s a personality to your look that photos can’t fully measure.
Warm, real, and easy to connect with.
Delightfully memorable.`
];

const msgs0 = [
`Perfectly imperfect — and somehow that makes you irresistible.
Symmetry is a trend; character is forever.
You have a face with story, and that’s beautiful.`,
`You’re a limited edition — quirk, charm, and a vibe all your own.
The numbers might squint, but the heart doesn’t care.
Very lovable, very unique.`,
`You bring personality to the frame — unpredictable, warm, and fun.
Symmetry is optional; charm is mandatory.
You’re the kind of face everyone likes to look at.`
];

function pickMsgByScore(score){
  if(score >= 90) return randomFrom(msgs90);
  if(score >= 75) return randomFrom(msgs75);
  if(score >= 50) return randomFrom(msgs50);
  return randomFrom(msgs0);
}
function randomFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

/* Keep last result for reuse in new-line and share */
let lastResult = {
  score: 0,
  comps: [],   // array of {name, ratio, closeness}
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
    // hide crown while analyzing
    crown.style.display = 'none';
    startAnalysisSequence();
  };
});

/* Animated analyzing flow then run FaceMesh */
function startAnalysisSequence(){
  // show analyzing overlay
  analyzingEl.classList.remove('hidden');
  resultsEl.classList.add('hidden');
  ratiosTableBody.innerHTML = '';
  scoreEl.innerText = '—';
  messageEl.innerText = '';

  // small delay for UX
  setTimeout(() => runFaceMesh(), 600);
}

/* Initialize FaceMesh and process */
function runFaceMesh(){
  const fm = new FaceMesh({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}` });
  fm.setOptions({ maxNumFaces: 1, refineLandmarks: true });
  fm.onResults(onResults);
  fm.send({ image: img });
}

/* Small helpers */
function px(p, W, H){ return { x: p.x * W, y: p.y * H }; }
function dist(a,b){ return Math.hypot(a.x - b.x, a.y - b.y); }

/* Process results from FaceMesh */
function onResults(result){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  analyzingEl.classList.add('hidden');

  if(!result.multiFaceLandmarks || result.multiFaceLandmarks.length === 0){
    scoreEl.innerText = 'No face detected';
    messageEl.innerText = 'Try a clearer front-facing photo or better lighting.';
    resultsEl.classList.remove('hidden');
    return;
  }

  const lm = result.multiFaceLandmarks[0];
  const W = canvas.width, H = canvas.height;

  // landmarks we use
  const chin = px(lm[152],W,H);
  const noseTip = px(lm[1],W,H);
  const noseBridge = px(lm[168],W,H);
  const leftInnerEye = px(lm[33],W,H);
  const rightInnerEye = px(lm[263],W,H);
  const leftMouth = px(lm[61],W,H);
  const rightMouth = px(lm[291],W,H);
  const upperLip = px(lm[13],W,H);

  // robust top-of-head: minimum y among face landmarks
  let minY = Infinity;
  for(let i=0;i<lm.length;i++){
    const y = lm[i].y * H;
    if(y < minY) minY = y;
  }
  const topFace = { x: W/2, y: minY };

  // derived distances
  const faceLen = dist(topFace, chin);
  const noseLen = dist(noseBridge, noseTip);
  const inter = dist(leftInnerEye, rightInnerEye);
  const mouthW = dist(leftMouth, rightMouth);
  const phil = dist(noseTip, upperLip);

  // draw overlay
  drawOverlay(topFace, chin, noseBridge, noseTip, leftInnerEye, rightInnerEye, leftMouth, rightMouth, noseTip, upperLip);

  // ratios
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

  const avg = (comps.reduce((s,c) => s + c.closeness, 0) / comps.length) * 100;
  const score = Math.max(0, Math.min(100, avg));

  // save last result
  lastResult.score = score;
  lastResult.comps = comps;
  lastResult.imgLoaded = true;

  // UI update
  scoreEl.innerText = `${score.toFixed(0)}%`;
  messageEl.innerText = pickMsgByScore(score);

  // table populate
  ratiosTableBody.innerHTML = '';
  comps.forEach(c => {
    const tr = document.createElement('tr');
    const tdName = document.createElement('td'); tdName.textContent = c.name;
    const tdVal = document.createElement('td'); tdVal.textContent = c.ratio.toFixed(3);
    const tdCl = document.createElement('td'); tdCl.textContent = `${Math.round(c.closeness * 100)}%`;
    tr.appendChild(tdName); tr.appendChild(tdVal); tr.appendChild(tdCl);
    ratiosTableBody.appendChild(tr);
  });

  // crown & confetti
  crown.style.display = score > 85 ? 'block' : 'none';
  if(score > 90){
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.3 } });
  }

  resultsEl.classList.remove('hidden');
}

/* Draw overlay lines and landmark dots */
function drawOverlay(tf, chin, nb, nt, lei, rei, lmL, lmR, nt2, ul){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = 'rgba(184,136,48,0.95)';
  ctx.beginPath(); ctx.moveTo(tf.x, tf.y); ctx.lineTo(chin.x, chin.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(nb.x, nb.y); ctx.lineTo(nt.x, nt.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lei.x, lei.y); ctx.lineTo(rei.x, rei.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lmL.x, lmL.y); ctx.lineTo(lmR.x, lmR.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(nt2.x, nt2.y); ctx.lineTo(ul.x, ul.y); ctx.stroke();

  const pts = [tf, chin, nb, nt, lei, rei, lmL, lmR, ul];
  pts.forEach(p => {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(p.x, p.y, 3.4, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(184,136,48,0.3)'; ctx.stroke();
  });
}

/* New compliment button */
newLineBtn.addEventListener('click', () => {
  if(!lastResult.imgLoaded) return;
  messageEl.innerText = pickMsgByScore(lastResult.score);
});

/* Download combined annotated image (photo + overlay) */
downloadBtn.addEventListener('click', () => {
  if(!lastResult.imgLoaded) return;
  const out = document.createElement('canvas');
  out.width = canvas.width; out.height = canvas.height;
  const c = out.getContext('2d');
  c.drawImage(img, 0, 0);
  c.drawImage(canvas, 0, 0);
  const a = document.createElement('a');
  a.href = out.toDataURL('image/png');
  a.download = 'golden_selfie.png';
  a.click();
});

/* ---------------------- SHARE CARD (portrait 1080x1920) ---------------------- */
/* Generates an elegant portrait card and auto-downloads it (watermark: SHIVISH ✨) */

shareCardBtn.addEventListener('click', async () => {
  if(!lastResult.imgLoaded){
    alert('Please upload a photo and analyze first.');
    return;
  }

  // Square card 1080x1080
  const W = 1080, H = 1080;
  const card = document.createElement('canvas');
  card.width = W; 
  card.height = H;
  const c = card.getContext('2d');

  // Background
  c.fillStyle = '#fffaf6';
  c.fillRect(0,0,W,H);

  // Soft gradient
  const g = c.createRadialGradient(W/2, H/2, 200, W/2, H/2, 800);
  g.addColorStop(0, 'rgba(255,250,245,1)');
  g.addColorStop(1, 'rgba(245,238,228,0.9)');
  c.fillStyle = g;
  c.fillRect(0,0,W,H);

  // Golden frame
  const frame = 40;
  c.strokeStyle = 'rgba(184,136,48,0.95)';
  c.lineWidth = 8;
  c.strokeRect(frame, frame, W - frame*2, H - frame*2);

  // Photo box (square)
  const photoSize = 640;
  const photoX = (W - photoSize)/2;
  const photoY = 70;

  await drawImageCover(c, img, null, {
    x: photoX,
    y: photoY,
    w: photoSize,
    h: photoSize
  });

  // Gold gradient overlay
  const g2 = c.createLinearGradient(0, photoY + photoSize*0.5, 0, photoY + photoSize);
  g2.addColorStop(0, 'rgba(255,255,255,0)');
  g2.addColorStop(1, 'rgba(255,250,245,0.7)');
  c.fillStyle = g2;
  c.fillRect(photoX, photoY, photoSize, photoSize);

  // Score
  c.fillStyle = '#b88f40';
  c.font = '700 72px "Playfair Display"';
  const scoreStr = `${Math.round(lastResult.score)}%`;
  const scoreW = c.measureText(scoreStr).width;
  c.fillText(scoreStr, (W - scoreW)/2, 820);

  // Label
  c.font = '500 28px Poppins';
  c.fillStyle = '#7c6a5d';
  const label = 'Golden Score';
  const labelW = c.measureText(label).width;
  c.fillText(label, (W - labelW)/2, 860);

  // Compliment text
  const compliment = pickMsgByScore(lastResult.score);
  c.font = "600 24px 'Playfair Display'";
  c.fillStyle = '#4a3f35';
  wrapText(c, compliment, 140, 900, 800, 32);

  // Watermark
  const wm = 'SHIVISH ✨';
  c.font = '600 26px Poppins';
  c.fillStyle = 'rgba(120,90,50,0.28)';
  const wmW = c.measureText(wm).width;
  c.fillText(wm, (W - wmW)/2, H - 40);

  // Download
  const a = document.createElement('a');
  a.href = card.toDataURL('image/png');
  a.download = `golden_card_${Date.now()}.png`;
  a.click();
});


/* ---------------------- helper: draw image cover (with cropping) ---------------------- */
/* srcArea: {sx, sy, sw, sh} in source image coordinates OR null (do center cover) */
async function drawImageCover(ctx2, imageEl, srcArea, dest){
  // dest: {x, y, w, h} OR dest params passed individually
  let dx = dest.x, dy = dest.y, dw = dest.w, dh = dest.h;
  if(srcArea){
    // draw the chosen crop scaled to dest
    ctx2.drawImage(imageEl, srcArea.sx, srcArea.sy, srcArea.sw, srcArea.sh, dx, dy, dw, dh);
    return;
  }

  // fallback: cover center of source image
  const imgW = imageEl.naturalWidth, imgH = imageEl.naturalHeight;
  const srcRatio = imgW / imgH;
  const destRatio = dw / dh;
  let sx, sy, sw, sh;
  if(srcRatio > destRatio){
    // source wider -> crop left/right
    sh = imgH;
    sw = imgH * destRatio;
    sx = (imgW - sw)/2;
    sy = 0;
  } else {
    sw = imgW;
    sh = imgW / destRatio;
    sx = 0;
    sy = (imgH - sh)/2;
  }
  ctx2.drawImage(imageEl, sx, sy, sw, sh, dx, dy, dw, dh);
}

/* ---------------------- compute face-centered crop area from original image ---------------------- */
/* We will derive a crop area centered on average of facial landmarks visible in canvas overlay.
   If something fails, return null to use center crop fallback. */
function computeFaceCropArea(imageEl, overlayCanvas, lastResultObj, outW, outH){
  try {
    // We can attempt to find bounding box from overlay dots drawn on overlay canvas,
    // but because we don't store each landmark in lastResult, we will approximate using canvas overlay drawn extents.
    // Simpler: take center crop focusing on middle-top area where face likely is.
    // However we can improve: use canvas overlay pixel scanning to find where gold dots drawn are present.
    const oc = canvas; // overlay canvas has our landmark dots
    const ctxOverlay = oc.getContext('2d');
    const data = ctxOverlay.getImageData(0,0,oc.width,oc.height).data;
    // find bounds of non-transparent pixels (approx landmarks)
    let minX = oc.width, minY = oc.height, maxX = 0, maxY = 0;
    let found = false;
    for(let y=0; y<oc.height; y+=3){
      for(let x=0; x<oc.width; x+=3){
        const idx = (y*oc.width + x)*4;
        const alpha = data[idx+3];
        if(alpha > 40){ // presence of overlay stroke/point
          found = true;
          if(x < minX) minX = x;
          if(y < minY) minY = y;
          if(x > maxX) maxX = x;
          if(y > maxY) maxY = y;
        }
      }
    }
    if(!found) return null;

    // expand box a bit
    const padX = Math.round((maxX - minX) * 0.9) || 60;
    const padY = Math.round((maxY - minY) * 1.1) || 80;
    minX = Math.max(0, minX - padX);
    minY = Math.max(0, minY - padY);
    maxX = Math.min(oc.width, maxX + padX);
    maxY = Math.min(oc.height, maxY + padY);

    // convert to source image coordinates
    // overlay canvas dimensions equal to source display image natural drawing size, but we used img natural dims for canvas,
    // so mapping is 1:1 (canvas pixels correspond to image pixels).
    const sx = Math.round(minX * (imageEl.naturalWidth / oc.width));
    const sy = Math.round(minY * (imageEl.naturalHeight / oc.height));
    const sw = Math.round((maxX - minX) * (imageEl.naturalWidth / oc.width));
    const sh = Math.round((maxY - minY) * (imageEl.naturalHeight / oc.height));

    // make square crop centered around face to fit portrait box nicely
    const faceRatio = sw / sh;
    let cropW = sw, cropH = sh;
    if((outW / outH) > 1){ // rarely
      // keep
    } else {
      // For portrait region, we want roughly 3:4 or similar. We'll compute scale to fill dest region
      const desiredRatio = outW / outH;
      if(faceRatio > desiredRatio){
        // face box wider than desired -> increase height
        const newH = Math.round(sw / desiredRatio);
        const centerY = sy + Math.round(sh/2);
        const newSy = Math.max(0, centerY - Math.round(newH/2));
        cropW = sw; cropH = Math.min(imageEl.naturalHeight - newSy, newH);
        return { sx, sy: newSy, sw: cropW, sh: cropH };
      } else {
        // face box taller -> increase width
        const newW = Math.round(sh * desiredRatio);
        const centerX = sx + Math.round(sw/2);
        const newSx = Math.max(0, centerX - Math.round(newW/2));
        cropW = Math.min(imageEl.naturalWidth - newSx, newW);
        cropH = sh;
        return { sx: newSx, sy, sw: cropW, sh: cropH };
      }
    }

    return { sx, sy, sw, sh };
  } catch(e){
    // fallback
    return null;
  }
}

/* ---------------------- small canvas helpers ---------------------- */
function roundRect(ctx2, x, y, w, h, r){
  ctx2.beginPath();
  ctx2.moveTo(x + r, y);
  ctx2.arcTo(x + w, y, x + w, y + h, r);
  ctx2.arcTo(x + w, y + h, x, y + h, r);
  ctx2.arcTo(x, y + h, x, y, r);
  ctx2.arcTo(x, y, x + w, y, r);
  ctx2.closePath();
}

/* wrapText helper for compliments */
function wrapText(ctx2, text, x, y, maxWidth, lineHeight){
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for(let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx2.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx2.fillText(line.trim(), x, curY);
      line = words[n] + ' ';
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if(line) ctx2.fillText(line.trim(), x, curY);
}

/* ---------------------- message picker used by share card too ---------------------- */
function pickMsgByScore(score){
  if(score >= 90) return randomFrom(msgs90);
  if(score >= 75) return randomFrom(msgs75);
  if(score >= 50) return randomFrom(msgs50);
  return randomFrom(msgs0);
}

/* ---------------------- utility ---------------------- */
function randomFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

/* ---------------------- Safety: if FaceMesh not loaded, warn user after delay ---------------------- */
setTimeout(() => {
  if(!window.FaceMesh){
    console.warn('FaceMesh library not loaded yet. Make sure your internet connection allows loading CDN scripts.');
  }
}, 1500);

/* End of script.js */
