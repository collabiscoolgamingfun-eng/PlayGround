import * as THREE from 'three';

const HEROES = [
  { id:'bolt',   name:'BOLT',  role:'Duelist',    color:0x00d4ff, hp:100, speed:9,  dmg:12, desc:'Fast blaster. High fire rate.' },
  { id:'aegis',  name:'AEGIS', role:'Vanguard',   color:0x3b82f6, hp:220, speed:6,  dmg:10, desc:'Shield tank. Soaks damage.' },
  { id:'shade',  name:'SHADE', role:'Duelist',    color:0x9d4edd, hp:90,  speed:10, dmg:14, desc:'Shadow striker. Hit and run.' },
  { id:'pulse',  name:'PULSE', role:'Strategist', color:0x22e07a, hp:120, speed:8,  dmg:9,  desc:'Heals self over time.' },
  { id:'titan',  name:'TITAN', role:'Vanguard',   color:0xff8a3b, hp:200, speed:6.5,dmg:16, desc:'Heavy slam. Slow but deadly.' },
  { id:'nova',   name:'NOVA',  role:'Strategist', color:0xff3b5c, hp:110, speed:8.5,dmg:11, desc:'Balanced blaster with ULT burst.' },
];
let heroIndex = 0;

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);
scene.fog = new THREE.Fog(0x0b1020, 40, 110);

const camera = new THREE.PerspectiveCamera(68, innerWidth/innerHeight, 0.1, 300);
const hemi = new THREE.HemisphereLight(0x8ea2ff, 0x1a0f2e, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(20, 30, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);
scene.add(new THREE.AmbientLight(0x404060, 0.6));

// arena
const ARENA = 34;
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(ARENA*2, ARENA*2),
  new THREE.MeshStandardMaterial({ color:0x182040, roughness:0.9 })
);
floor.rotation.x = -Math.PI/2;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(ARENA*2, 34, 0xff3b5c, 0x2a3a6a);
grid.position.y = 0.02;
scene.add(grid);

function wall(x, z, w, d, c=0x2a3a6a) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 4, d), new THREE.MeshStandardMaterial({ color:c, roughness:0.7 }));
  m.position.set(x, 2, z);
  m.castShadow = m.receiveShadow = true;
  scene.add(m);
  return m;
}
const colliders = [];
// border
wall(0, -ARENA, ARENA*2+2, 1); wall(0, ARENA, ARENA*2+2, 1);
wall(-ARENA, 0, 1, ARENA*2+2); wall(ARENA, 0, 1, ARENA*2+2);
// pillars / cover
const covers = [[-10,-10,4,4],[10,-10,4,4],[-10,10,4,4],[10,10,4,4],[0,-16,10,2],[0,16,10,2],[-16,0,2,10],[16,0,2,10],[0,0,3,3]];
for (const [x,z,w,d] of covers) colliders.push(wall(x,z,w,d, 0x33406e));
// glowing beacons
for (const [x,z] of [[-10,-10],[10,-10],[-10,10],[10,10],[0,0]]) {
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.7,6,12), new THREE.MeshStandardMaterial({ color:0xff3b5c, emissive:0xff3b5c, emissiveIntensity:1.2 }));
  b.position.set(x, 3, z);
  scene.add(b);
}

function makeHeroMesh(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.0, 6, 14), new THREE.MeshStandardMaterial({ color, roughness:0.4 }));
  body.position.y = 1.2; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 14), new THREE.MeshStandardMaterial({ color:0xffffff, roughness:0.3 }));
  head.position.y = 2.35; head.castShadow = true; g.add(head);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.16,0.2), new THREE.MeshStandardMaterial({ color:0x0b1020, emissive:color, emissiveIntensity:0.9 }));
  visor.position.set(0, 2.38, -0.3); g.add(visor);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.22,1.1), new THREE.MeshStandardMaterial({ color:0x111122 }));
  gun.position.set(0.5, 1.4, -0.6); g.add(gun);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1,10,8), new THREE.MeshStandardMaterial({ color, emissive:color, emissiveIntensity:2 }));
  tip.position.set(0.5, 1.4, -1.2); g.add(tip);
  g.userData.tip = tip;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.7,0.95,24), new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.7, side:THREE.DoubleSide }));
  ring.rotation.x = -Math.PI/2; ring.position.y = 0.03; g.add(ring);
  return g;
}

function collide(pos, r=0.8) {
  pos.x = Math.max(-ARENA+1, Math.min(ARENA-1, pos.x));
  pos.z = Math.max(-ARENA+1, Math.min(ARENA-1, pos.z));
  for (const m of colliders) {
    const dx = pos.x - m.position.x, dz = pos.z - m.position.z;
    const hw = m.geometry.parameters.width/2 + r, hd = m.geometry.parameters.depth/2 + r;
    if (Math.abs(dx) < hw && Math.abs(dz) < hd) {
      if (hw - Math.abs(dx) < hd - Math.abs(dz)) pos.x = m.position.x + Math.sign(dx||1)*hw;
      else pos.z = m.position.z + Math.sign(dz||1)*hd;
    }
  }
}

class Fighter {
  constructor(hero, isPlayer, spawn) {
    this.hero = hero; this.isPlayer = isPlayer;
    this.mesh = makeHeroMesh(hero.color);
    this.mesh.position.copy(spawn);
    scene.add(this.mesh);
    this.pos = this.mesh.position;
    this.vel = new THREE.Vector3();
    this.yaw = Math.random()*Math.PI*2; this.pitch = -0.15;
    this.hp = hero.hp; this.maxHp = hero.hp;
    this.alive = true; this.respawnT = 0;
    this.fireCd = 0; this.ult = isPlayer ? 100 : Math.random()*60;
    this.vy = 0; this.grounded = true;
    this.aiT = Math.random()*2; this.aiDir = new THREE.Vector3();
    this.name = isPlayer ? 'YOU' : hero.name;
  }
  hurt(dmg, by) {
    if (!this.alive || started===false && this.isPlayer===false) {}
    if (!this.alive) return;
    // Aegis takes reduced damage
    if (this.hero.id==='aegis') dmg *= 0.7;
    this.hp -= dmg;
    flash(this.pos, 0xff3b5c);
    if (this.hp <= 0) {
      this.hp = 0; this.alive = false; this.respawnT = 3;
      this.mesh.visible = false;
      boom(this.pos, this.hero.color);
      onKill(by, this);
    }
  }
  respawn() {
    this.hp = this.maxHp; this.alive = true; this.mesh.visible = true;
    this.pos.set((Math.random()-0.5)*40, 0, (Math.random()-0.5)*40);
    collide(this.pos);
  }
}

const player = new Fighter(HEROES[0], true, new THREE.Vector3(0,0,6));
player.yaw = 0; player.mesh.rotation.y = 0;
const bots = [
  new Fighter(HEROES[2], false, new THREE.Vector3(-12,0,-12)),
  new Fighter(HEROES[4], false, new THREE.Vector3(12,0,-12)),
  new Fighter(HEROES[5], false, new THREE.Vector3(0,0,-18)),
];
for (const b of bots) { b.yaw = Math.atan2(-(player.pos.x-b.pos.x), -(player.pos.z-b.pos.z)); b.mesh.rotation.y = b.yaw; }
const all = [player, ...bots];

const shots = [];
function shoot(f, ult=false) {
  if (!f.alive || f.fireCd > 0) return;
  f.fireCd = ult ? 0.6 : (f.hero.id==='bolt' ? 0.16 : 0.28);
  const dir = new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(f.pitch, f.yaw, 0, 'YXZ'));
  const tip = new THREE.Vector3(); f.mesh.userData.tip.getWorldPosition(tip);
  const geo = new THREE.SphereGeometry(ult?0.3:0.16, 10, 8);
  const mat = new THREE.MeshBasicMaterial({ color: f.hero.color });
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(tip);
  scene.add(m);
  shots.push({ mesh:m, vel: dir.multiplyScalar(ult?46:34), life:1.6, dmg: ult? f.hero.dmg*3 : f.hero.dmg, owner:f });
  beep(ult?160:520, 0.08, ult?0.25:0.12);
  // recoil flash
  flash(tip, f.hero.color, 0.4);
}
function flash(p, color, s=0.7) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(s,10,8), new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.8 }));
  m.position.copy(p); m.position.y += 1.4; scene.add(m);
  setTimeout(()=>scene.remove(m), 90);
}
function boom(p, color) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1.4,14,10), new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.85 }));
  m.position.copy(p); m.position.y = 1.2; scene.add(m);
  let t = 0;
  const iv = setInterval(()=>{ t+=0.08; m.scale.setScalar(1+t*2); m.material.opacity = Math.max(0, 0.85-t); if (t>0.8){ clearInterval(iv); scene.remove(m);} }, 40);
  beep(120, 0.3, 0.25);
}

// audio (procedural)
let AC = null;
function beep(freq, dur=0.1, vol=0.15) {
  try {
    AC = AC || new (window.AudioContext||window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.value = vol; o.connect(g); g.connect(AC.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime+dur); o.stop(AC.currentTime+dur);
  } catch {}
}

// input
const keys = {};
addEventListener('keydown', e=>{ keys[e.code]=true; if(e.code==='Space') e.preventDefault(); });
addEventListener('keyup', e=>{ keys[e.code]=false; });
let dragging=false, lx=0, ly=0;
canvas.addEventListener('pointerdown', e=>{ if(e.pointerType==='mouse'){ dragging=true; lx=e.clientX; ly=e.clientY; } });
addEventListener('pointermove', e=>{ if(dragging && started){ player.yaw -= (e.clientX-lx)*0.005; player.pitch = Math.max(-1, Math.min(0.6, player.pitch - (e.clientY-ly)*0.004)); lx=e.clientX; ly=e.clientY; } });
addEventListener('pointerup', ()=>dragging=false);
canvas.addEventListener('click', ()=>{ if(started && !isTouch) shoot(player); });

// touch
const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');
const joy = { x:0, y:0, id:null };
const joyZone = document.getElementById('joy-zone'), joyKnob = document.getElementById('joy-knob'), joyBase = document.getElementById('joy-base');
function joyCenter(){ const r = joyBase.getBoundingClientRect(); return { x:r.left+r.width/2, y:r.top+r.height/2 }; }
joyZone.addEventListener('touchstart', e=>{ const t=e.changedTouches[0]; joy.id=t.identifier; e.preventDefault(); }, {passive:false});
addEventListener('touchmove', e=>{
  for (const t of e.changedTouches) {
    if (t.identifier===joy.id) { const c=joyCenter(); let dx=(t.clientX-c.x)/55, dy=(t.clientY-c.y)/55; const l=Math.hypot(dx,dy)||1; if(l>1){dx/=l;dy/=l;} joy.x=dx; joy.y=dy; joyKnob.style.transform=`translate(calc(-50% + ${dx*34}px), calc(-50% + ${dy*34}px))`; }
  }
}, {passive:true});
addEventListener('touchend', e=>{ for (const t of e.changedTouches) if(t.identifier===joy.id){ joy.id=null; joy.x=joy.y=0; joyKnob.style.transform='translate(-50%,-50%)'; } });
const lookZone = document.getElementById('look-zone');
let lookId=null, lookX=0, lookY=0;
lookZone.addEventListener('touchstart', e=>{ const t=e.changedTouches[0]; lookId=t.identifier; lookX=t.clientX; lookY=t.clientY; e.preventDefault(); }, {passive:false});
addEventListener('touchmove', e=>{
  for (const t of e.changedTouches) if(t.identifier===lookId && started){ player.yaw -= (t.clientX-lookX)*0.008; player.pitch = Math.max(-1, Math.min(0.6, player.pitch-(t.clientY-lookY)*0.006)); lookX=t.clientX; lookY=t.clientY; }
}, {passive:true});
addEventListener('touchend', e=>{ for (const t of e.changedTouches) if(t.identifier===lookId) lookId=null; });
let firing=false;
document.getElementById('btn-fire').addEventListener('touchstart', e=>{ firing=true; e.preventDefault(); }, {passive:false});
document.getElementById('btn-fire').addEventListener('touchend', ()=>firing=false);
document.getElementById('btn-fire').addEventListener('mousedown', ()=>firing=true);
document.getElementById('btn-fire').addEventListener('mouseup', ()=>firing=false);
document.getElementById('btn-jump').addEventListener('touchstart', e=>{ doJump(); e.preventDefault(); }, {passive:false});
document.getElementById('btn-jump').addEventListener('click', doJump);
document.getElementById('btn-ult').addEventListener('touchstart', e=>{ doUlt(); e.preventDefault(); }, {passive:false});
document.getElementById('btn-ult').addEventListener('click', doUlt);
function doJump(){ if(player.grounded && player.alive){ player.vy = 8; player.grounded=false; } }
function doUlt(){ if(player.ult>=100 && player.alive){ player.ult=0; shoot(player,true); toast(player.hero.name+' ULT!'); } }

// UI
const heroesEl = document.getElementById('heroes');
HEROES.forEach((h,i)=>{
  const d = document.createElement('div'); d.className='hero'+(i===0?' sel':'');
  d.innerHTML = `<div class="dot" style="background:#${h.color.toString(16).padStart(6,'0')}"></div><b>${h.name}</b><small>${h.role} • ${h.hp}HP</small>`;
  d.onclick = ()=>{ heroIndex=i; document.querySelectorAll('.hero').forEach((el,j)=>el.classList.toggle('sel', j===i)); document.getElementById('hero-desc').textContent = h.name+' — '+h.desc; applyHero(); beep(660,0.07,0.12); };
  heroesEl.appendChild(d);
});
function applyHero(){
  const h = HEROES[heroIndex];
  player.hero = h; player.maxHp = h.hp; player.hp = h.hp;
  player.mesh.clear(); const fresh = makeHeroMesh(h.color);
  // copy children
  player.mesh.add(...fresh.children); player.mesh.userData.tip = fresh.userData.tip;
  document.getElementById('hero-name').textContent = h.name+' • '+h.role;
}
let started=false, youKills=0, botKills=0, timeLeft=300, over=false;
document.getElementById('btn-play').onclick = ()=>{ AC=null; beep(440,0.1,0.15); setTimeout(()=>beep(880,0.12,0.15),110); document.getElementById('menu').style.display='none'; started=true; toast('Match start — first to 10!'); };
document.getElementById('btn-again').onclick = ()=>location.reload();
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.style.display='block'; clearTimeout(t._h); t._h=setTimeout(()=>t.style.display='none',2200); }
function feed(msg){ const k=document.getElementById('killfeed'); const d=document.createElement('div'); d.textContent=msg; k.prepend(d); while(k.children.length>5) k.lastChild.remove(); setTimeout(()=>d.remove(), 5000); }
function onKill(by, victim){
  if (by.isPlayer && !victim.isPlayer){ youKills++; feed(`YOU ▸ ${victim.name} KO`); player.ult=Math.min(100,player.ult+34); }
  else if (!by.isPlayer && victim.isPlayer){ botKills++; feed(`${by.name} ▸ YOU KO`); }
  else if (!by.isPlayer && !victim.isPlayer){ feed(`${by.name} ▸ ${victim.name} KO`); botKills++; }
  else { feed(`YOU ▸ self?`); }
  if ((youKills>=10||botKills>=10) && !over) endGame(youKills>botKills);
}
function endGame(win){
  over=true; started=false;
  document.getElementById('go-title').textContent = win?'VICTORY':'DEFEAT';
  document.getElementById('go-title').style.color = win?'#22e07a':'#ff3b5c';
  document.getElementById('go-sub').textContent = `Final ${youKills} : ${botKills} — ${win?'Arena champion!':'Bots take this one.'}`;
  document.getElementById('gameover').hidden=false;
}

addEventListener('resize', ()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });

// loop
const clock = new THREE.Clock();
let fpsA=60;
function tick(){
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  fpsA = fpsA*0.95 + (1/Math.max(dt,1e-3))*0.05;
  // idle menu camera orbit
  if (!started && !over) {
    const t = performance.now()/4000;
    camera.position.set(Math.sin(t)*26, 12, Math.cos(t)*26);
    camera.lookAt(0,1,0);
    bots.forEach((b,i)=>{ b.yaw += dt*0.4; b.mesh.rotation.y=b.yaw; });
    player.mesh.rotation.y += dt*0.3;
    renderer.render(scene,camera);
    document.getElementById('fps').textContent = Math.round(fpsA)+' fps • menu';
    return;
  }
  if (started && !over) {
    timeLeft -= dt;
    if (timeLeft<=0){ timeLeft=0; endGame(youKills>=botKills); }
    const mm = String(Math.floor(timeLeft/60)).padStart(2,'0'), ss=String(Math.floor(timeLeft%60)).padStart(2,'0');
    document.getElementById('timer').textContent = `${mm}:${ss}`;
  }
  document.getElementById('score').innerHTML = `YOU ${youKills} : ${botKills} BOTS &nbsp;•&nbsp; <span id="timer">${document.getElementById('timer').textContent}</span>`;
  document.getElementById('fps').textContent = Math.round(fpsA)+' fps';

  // player move
  if (player.alive && started) {
    const sp = player.hero.speed;
    let mx=0,mz=0;
    if (keys.KeyW||keys.ArrowUp) mz-=1; if (keys.KeyS||keys.ArrowDown) mz+=1;
    if (keys.KeyA||keys.ArrowLeft) mx-=1; if (keys.KeyD||keys.ArrowRight) mx+=1;
    mx += joy.x; mz += joy.y;
    const l = Math.hypot(mx,mz); if (l>1){mx/=l;mz/=l;}
    // third-person: forward = -Z rotated by yaw
    const fx=-Math.sin(player.yaw), fz=-Math.cos(player.yaw);
    const rx=Math.cos(player.yaw), rz=-Math.sin(player.yaw);
    player.pos.x += (fx*-mz + rx*mx)*sp*dt;
    player.pos.z += (fz*-mz + rz*mx)*sp*dt;
    if ((keys.Space)) doJumpKey();
    if (keys.KeyE) doUlt();
    if (keys.KeyF || firing) shoot(player);
    // gravity
    player.vy -= 24*dt; player.pos.y += player.vy*dt;
    if (player.pos.y<=0){ player.pos.y=0; player.vy=0; player.grounded=true; }
    collide(player.pos);
    player.mesh.rotation.y = player.yaw;
    // strategist regen
    if (player.hero.role==='Strategist') player.hp = Math.min(player.maxHp, player.hp + 4*dt);
    player.fireCd -= dt;
    player.ult = Math.min(100, player.ult + 3*dt);
    if (!player.alive) {}
  }
  // bots AI
  for (const b of bots) {
    b.fireCd -= dt;
    if (!b.alive) { b.respawnT -= dt; if (b.respawnT<=0) b.respawn(); continue; }
    b.aiT -= dt;
    if (b.aiT<=0){ b.aiT = 1+Math.random()*2; const a=Math.random()*Math.PI*2; b.aiDir.set(Math.sin(a),0,Math.cos(a)); }
    // seek player-ish
    const toP = new THREE.Vector3().subVectors(player.pos, b.pos); toP.y=0;
    const dist = toP.length();
    if (player.alive && dist<26) { b.aiDir.copy(toP.normalize()).multiplyScalar(0.9); b.yaw = Math.atan2(-toP.x, -toP.z); }
    else b.yaw = Math.atan2(-b.aiDir.x, -b.aiDir.z);
    b.pos.addScaledVector(b.aiDir, b.hero.speed*0.7*dt);
    collide(b.pos);
    b.mesh.rotation.y = b.yaw;
    // shoot at player
    if (player.alive && dist<24 && started) {
      b.pitch = 0;
      if (Math.random()<dt*1.4) shoot(b);
      if (b.ult>=100 && dist<14){ b.ult=0; shoot(b,true); }
    }
    b.ult = Math.min(100, b.ult+4*dt);
  }
  if (!player.alive){ player.respawnT -= dt; if (player.respawnT<=0) { player.respawn(); toast('Respawned'); } }

  // shots
  for (let i=shots.length-1;i>=0;i--) {
    const s = shots[i];
    s.life -= dt;
    s.mesh.position.addScaledVector(s.vel, dt);
    let hit=false;
    for (const f of all) {
      if (f===s.owner || !f.alive) continue;
      const d = s.mesh.position.distanceTo(new THREE.Vector3(f.pos.x, f.pos.y+1.4, f.pos.z));
      if (d<1.1){ f.hurt(s.dmg, s.owner); hit=true; break; }
    }
    if (hit || s.life<=0 || Math.abs(s.mesh.position.x)>ARENA || Math.abs(s.mesh.position.z)>ARENA){ scene.remove(s.mesh); shots.splice(i,1); }
  }

  // camera follow with wall pull-in
  const cd = 6.5, ch = 3.0;
  let tx = player.pos.x + Math.sin(player.yaw)*cd, tz = player.pos.z + Math.cos(player.yaw)*cd;
  for (let d = cd; d > 2.0; d -= 0.5) {
    const px = player.pos.x + Math.sin(player.yaw)*d, pz = player.pos.z + Math.cos(player.yaw)*d;
    let inside = false;
    for (const m of colliders) {
      const hw = m.geometry.parameters.width/2 + 0.5, hd = m.geometry.parameters.depth/2 + 0.5;
      if (Math.abs(px-m.position.x) < hw && Math.abs(pz-m.position.z) < hd) { inside = true; break; }
    }
    if (!inside) { tx = px; tz = pz; break; }
    tx = px; tz = pz;
  }
  tx = Math.max(-ARENA+1, Math.min(ARENA-1, tx));
  tz = Math.max(-ARENA+1, Math.min(ARENA-1, tz));
  camera.position.set(tx, player.pos.y+ch - player.pitch*4, tz);
  camera.lookAt(player.pos.x, player.pos.y+1.8, player.pos.z);

  // HUD
  document.getElementById('hp-fill').style.width = (100*player.hp/player.maxHp)+'%';
  document.getElementById('hp-text').textContent = Math.ceil(player.hp)+' / '+player.maxHp;
  document.getElementById('ult-fill').style.width = player.ult+'%';
  document.getElementById('ult-text').textContent = player.ult>=100?'ULT READY':'ULT '+Math.floor(player.ult)+'%';

  renderer.render(scene, camera);
}
let jumpCd=0;
function doJumpKey(){ const now=performance.now(); if(now-jumpCd>400 && player.grounded){ jumpCd=now; player.vy=8; player.grounded=false; } }
applyHero();
tick();
