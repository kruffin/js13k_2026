const DEBUG = false; // Comment this line for ~100 bytes
const MAX_UNICORNS = 3;
const BOSS_LEVEL = 4;
class InputManager {
  constructor() {
    this.keys = {};
    this.justpressed = {};
    document.addEventListener('keydown', (e) => {
      this.justpressed[e.code] = !this.keys[e.code];
      this.keys[e.code] = true;
    });
    
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      this.justpressed[e.code] = false;
    });
  }

  update(dt) {
    this.justpressed = {};
  }
}
class GameLoop {
  constructor(properties) {
    Object.assign(this, properties);
    this.stopped = true;
    this.accumulator = 0;
    this.af = null;
    this.lastTime = null;
    this.focused = true;
    window.addEventListener('focus', () => {
      this.focused = true;
      this.af = requestAnimationFrame(this.frame.bind(this));
    });
    window.addEventListener('blur', () => {
      this.focused = false;
      cancelAnimationFrame(this.af);
      this.paused();
    });
    this.inputManager = new InputManager();
  }

  frame(ts) {
    if (this.stopped || !this.focused) {return;}

    this.dt = Math.min(ts - this.lastTime, 100); // clamp frames that take too long between.
    this.lastTime = ts;
    this.accumulator += this.dt;

    while (this.accumulator >= 1e3/60) {
      this.update(1/60);
      this.inputManager.update(1/60);
      if (this.stopped) {return;} // Prevent additional updates if the loop was stopped inside the update.

      this.accumulator -= 1e3/60;
    }
    this.render();
    this.af = requestAnimationFrame(this.frame.bind(this));
  }

  start() {
    if (this.stopped) {
      this.lastTime = 0;
      this.stopped = false;
      this.af = requestAnimationFrame(this.frame.bind(this));
      this.init();
    }
  }

  stop() {
    this.stopped = true;
    cancelAnimationFrame(this.af);
  }

  init() {}
  update(dt) {}
  render() {}
  paused() {}
}
const play_music = function(notes,center,duration,decaystart,decayduration,interval,volume,waveform,loop) {
  /**
   * Code pulled from https://xem.github.io/miniOrchestra/ and altered to work with strict mode and loops.
   */
  let audioCtx = new AudioContext;
  let gainCtx = audioCtx.createGain();
  audioCtx.suspend();
  
  const attach_oscillator = function (audioCtx, note, songLength=0) {
    // if (this?.stopTime > audioCtx.currentTime) { return audioCtx; }
    let oscil = audioCtx.createOscillator();
    let noteTime = Math.max(0, songLength - note[0]*interval - duration) + audioCtx.currentTime + note[0]*interval;
    oscil.connect(gainCtx);
    gainCtx.connect(audioCtx.destination);
    oscil.start(noteTime);
    oscil.frequency.setValueAtTime(
      center*1.06**(13-note[1]),
      noteTime
    );
    oscil.type=waveform;
    gainCtx.gain.setValueAtTime(
      volume,
      noteTime
    );
    gainCtx.gain.setTargetAtTime(
      1e-5,
      noteTime+decaystart,
      decayduration
    );
    oscil.stopTime = noteTime+duration;
    oscil.stop(oscil.stopTime);

    if (loop) {
      oscil.onended = attach_oscillator.bind(oscil, audioCtx, note, audioCtx.songLength);
    }
  };

  audioCtx.songLength = (4 + notes.reduce((accum, n) => { return (n[0] > accum) ? n[0] : accum;}, 0)) * interval;
  for(let i of notes) {
    attach_oscillator(audioCtx, i);
  }

  return audioCtx;
};
const getColorKey = function(r, g, b, noCell) {
  // Jack-ass advertisers ruining the world yet again:
  // https://www.h3xed.com/programming/javascript-canvas-getimagedata-pixel-colors-slightly-off-in-firefox
  // Since pixels are randomly jittered by a little bit, just box things in cells of 10 so 
  // the jitter is effectively ignored. Lose some resolution, but should work for the government.
  const COLOR_CELL_SIZE = noCell ? 1 : 10;
  return parseInt(Math.floor(r/COLOR_CELL_SIZE)*COLOR_CELL_SIZE).toString(16).padStart(2, '0') +
         (g != undefined ? parseInt(Math.floor(g/COLOR_CELL_SIZE)*COLOR_CELL_SIZE).toString(16).padStart(2, '0') : '') +
         (b != undefined ? parseInt(Math.floor(b/COLOR_CELL_SIZE)*COLOR_CELL_SIZE).toString(16).padStart(2, '0') : '');
};
const parseColorKey = function(key) {
  // let rgb = key.match(/([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/);
  let rgb = key.match(/([a-fA-F0-9]{2})(?:([a-fA-F0-9]{2})([a-fA-F0-9]{2}))?/);
  return [
    parseInt(rgb[1], 16),
    parseInt(rgb[2] || rgb[1], 16),
    parseInt(rgb[3] || rgb[1], 16)
  ];
};
const recolorImage = function(inimg, palette) {
  var ocanvas = new OffscreenCanvas(inimg.width, inimg.height);
  let ctx = ocanvas.getContext('2d');
  // ctx.imageSmoothingEnabled = false;
  ctx.drawImage(inimg, 0, 0);
  let pixdata = ctx.getImageData(0, 0, inimg.width, inimg.height);

  for (let pidx = 0; pidx < pixdata.data.length; pidx += 4) {
    let key = getColorKey(pixdata.data[pidx], pixdata.data[pidx+1], pixdata.data[pidx+2]);

    if (Object.keys(palette).includes(key) || 
        (pixdata.data[pidx] == pixdata.data[pidx+1] && pixdata.data[pidx] == pixdata.data[pidx+2] &&
        Object.keys(palette).includes(key.substring(0,2)))) {
      // let rgb = palette[key].match(/([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/);
      // pixdata.data[pidx    ] = parseInt(rgb[1], 16);
      // pixdata.data[pidx + 1] = parseInt(rgb[2], 16);
      // pixdata.data[pidx + 2] = parseInt(rgb[3], 16);
      let rgb = parseColorKey(palette[key] || palette[key.substring(0,2)]);
      pixdata.data[pidx    ] = rgb[0];
      pixdata.data[pidx + 1] = rgb[1];
      pixdata.data[pidx + 2] = rgb[2];
    }
  }

  ctx.putImageData(pixdata, 0, 0);

  let oimg = ocanvas.transferToImageBitmap();

  return oimg;
};
const lerp = (start, end, t) => {
    return start + (end - start) * t;
};
const wrapi = (v, min, max) => {
  const range = max - min;
  return ((v - min) % range + range) % range + min;
};
const clamp = function(v, min, max) {
  return Math.min(Math.max(v, min), max);
};
// const vlen = function(v) {
//   return Math.sqrt(v.x * v.x + v.y * v.y);
// };
// const vminus = function(a, b) {
//   return {
//     x: a.x - b.x,
//     y: a.y - b.y
//   };
// };
const deepClone = function(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (obj instanceof Object) {
    const clonedObj = {};
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};
const loadImage = function(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image failed to load: ${url}`));
    img.src = url;
  });
};
const animate = function(obj, dt) {
  if (obj.animIdx == null) return;
  let anim = obj.tileCoords[obj.animIdx];
  if (anim.length > 1) {
    obj.animAccum += dt * 1e3;
    const frameLength = anim[obj.tileIdx].frameLength;
    while (obj.animAccum >= frameLength) {
      obj.animAccum -= frameLength;
      obj.tileIdx = wrapi(obj.tileIdx + 1, 0, anim.length);
    }
  } else {
    obj.animAccum = 0;
    obj.tileIdx = 0;
  }
}
const aabb = function(r1, r2) {
  return r1.left < r2.right && 
    r1.right > r2.left && 
    r1.top < r2.bottom && 
    r1.bottom >= r2.top; // >= fixes issue with standing on obstacles
};
const avoidFall = function(obj, ignoreTiles) {
  if (!obj.onGround) { return; } // Can't do anything in the air.
  // Get the current grid cell
  let cgx = Math.floor(obj.pos.x / gameState.world.tileSize.x);
  let cgy = Math.floor(obj.pos.y / gameState.world.tileSize.y);
  let remainderx = Math.abs(obj.pos.x - cgx * gameState.world.tileSize.x);
  if (obj.dir > 0) {
    remainderx = gameState.world.tileSize.x - remainderx;
  }
  // Check the cell next to this one
  const layer = gameState.world.layers[gameState.world.groundLayerIdx];
  const startRow = layer?.startRow || 0;
  const curTileIdx = layer.tiles[cgx  + (cgy - startRow) * gameState.world.size.x];
  const nextTileIdx = layer.tiles[cgx + obj.dir + (cgy - startRow) * gameState.world.size.x];
  const nextUpTileIdx = layer.tiles[cgx + obj.dir + (cgy - 1 - startRow) * gameState.world.size.x];
  let nextCell = gameState.world.tileCoords[wrapi(nextTileIdx, 0, gameState.world.tileCoords.length)];
  let nextUpCell = gameState.world.tileCoords[wrapi(nextUpTileIdx, 0, gameState.world.tileCoords.length)];

  if (((!nextCell?.solid && !((ignoreTiles || []).includes(curTileIdx))) || nextUpCell?.solid) && remainderx < obj.collider.size.x/2) {
    obj.dir *= -1;
  }
};
const createCollider = function(obj) {
  return {
    left: obj.pos.x - obj.collider.size.x/2.0,
    right: obj.pos.x + obj.collider.size.x/2.0,
    top: obj.pos.y - obj.collider.size.y+2,///2.0,
    bottom: obj.pos.y// + obj.collider.size.y,///2.0,
  };
};
const objObjCollision = function(obj1, obj1Collider, obj2, obj2Collider, restrictCell) {
  const obj1cx = Math.floor(obj1.pos.x / gameState.world.tileSize.x);
  const obj2cx = Math.floor(obj2.pos.x / gameState.world.tileSize.x);
  const oleft = obj1Collider.right - obj2Collider.left;
  const oright = obj2Collider.right - obj1Collider.left;
  const otop = obj1Collider.bottom - obj2Collider.top;
  const obot = obj2Collider.bottom - obj1Collider.top;
  const mino = Math.min(oleft, oright, otop, obot);
  if (mino === oleft) {
    obj1.pos.x = obj2Collider.left - obj1.collider.size.x/2.0;
    obj1.pos.xv = 0;
    obj1.pos.xa = 0;
    obj1.onWall = !obj1.onGround;
  } else if (mino === oright) {
    obj1.pos.x = obj2Collider.right + obj1.collider.size.x/2.0;
    obj1.pos.xv = 0;
    obj1.pos.xa = 0;
    obj1.onWall = !obj1.onGround;
  } else if ((restrictCell && obj2cx === obj1cx && mino === otop) || (!restrictCell && mino === otop)) {
    obj1.pos.y = obj2Collider.top;// - obj.obj1Collider.size.y/2.0;
    obj1.pos.yv = 0;
    obj1.pos.ya = 0;
    // obj.grounded = true;
    obj1.onGround = true;
    obj1.onWall = false;
    obj1.onAir = false;
  } else if ((restrictCell && obj2cx === obj1cx && mino === obot) || (!restrictCell && mino === obot)) {
    obj1.pos.y = obj2Collider.bottom + obj1.collider.size.y;///2.0;
    obj1.pos.yv = 0;
    obj1.pos.ya = 0;
  }
};
const applyForces = function(obj, dt) {
  if (obj.collider?.static) {
    return;
  }
  const groundLayerIdx = gameState.world.groundLayerIdx;
  // apply gravity/friction
  obj.pos.xa = clamp(obj.pos.xa + [-1, 0, 1][Math.sign(obj.pos.xa)] * gameState.world.frictionGround * dt, 0 ,obj.pos.xa);

  // apply tile collision
  obj.onWall = false;
  let cgx = Math.floor(obj.pos.x / gameState.world.tileSize.x);
  let cgy = Math.floor(obj.pos.y / gameState.world.tileSize.y);
  
  const layer = gameState.world.layers[groundLayerIdx];
  const startRow = layer?.startRow || 0;
  obj.onGround = true == gameState.world.tileCoords[wrapi(layer.tiles[cgx + (cgy - startRow) * gameState.world.size.x], 0, gameState.world.tileCoords.length)]?.solid;

  const collider = createCollider(obj);
  for (const [gx, gy] of [
    [cgx - 1, cgy - 1], [cgx, cgy - 1], [cgx + 1, cgy - 1],
    [cgx - 1, cgy],     [cgx, cgy],     [cgx + 1, cgy],
    [cgx - 1, cgy + 1], [cgx, cgy + 1], [cgx + 1, cgy + 1],
  ]) {
    if (gx < 0 || gx >= gameState.world.size.x || gy < startRow || gy >= gameState.world.size.y) {
      continue;
    }

    let tile = gameState.world.tileCoords[wrapi(layer.tiles[gx + (gy-startRow) * gameState.world.size.x], 0, gameState.world.tileCoords.length)];
    // if (tile?.solid && cgx === gx && cgy == gy) {
    //   obj.onGround = true;
    // }
    const tbounds = {
      left: gx * gameState.world.tileSize.x,
      right: (gx + 1) * gameState.world.tileSize.x,
      top: gy * gameState.world.tileSize.y,
      bottom: (gy + 1) * gameState.world.tileSize.y,
    };
    if (tile?.solid && aabb(collider, tbounds)) {
      objObjCollision(obj, collider, {pos: {x: gx * gameState.world.tileSize.x}}, tbounds, true);
      // const oleft = collider.right - tbounds.left;
      // const oright = tbounds.right - collider.left;
      // const otop = collider.bottom - tbounds.top;
      // const obot = tbounds.bottom - collider.top;
      // const mino = Math.min(oleft, oright, otop, obot);
      // if (mino === oleft) {
      //   obj.pos.x = tbounds.left - obj.collider.size.x/2.0;
      //   obj.pos.xv = 0;
      //   obj.pos.xa = 0;
      //   obj.onWall = !obj.onGround;
      // } else if (mino === oright) {
      //   obj.pos.x = tbounds.right + obj.collider.size.x/2.0;
      //   obj.pos.xv = 0;
      //   obj.pos.xa = 0;
      //   obj.onWall = !obj.onGround;
      // } else if (gx === cgx && mino === otop) {
      //   obj.pos.y = tbounds.top;// - obj.collider.size.y/2.0;
      //   obj.pos.yv = 0;
      //   obj.pos.ya = 0;
      //   // obj.grounded = true;
      // } else if (gx === cgx && mino === obot) {
      //   obj.pos.y = tbounds.bottom + obj.collider.size.y;///2.0;
      //   obj.pos.yv = 0;
      //   obj.pos.ya = 0;
      // }
    } else if (tile.levelIdx != null && aabb(collider, tbounds)) {
      loadLevel(tile.levelIdx); // HACK: This is going to cause problems.
      return;
    } else if (tile.damage != null && aabb(collider, tbounds) && obj.itime <= 0) {
      obj.health -= tile.damage;
      obj.itime = obj.invulnTime;
      obj.hitMusic && obj.hitMusic();
    }
  }

  for (let f of gameState.world.friendly) {
    if (!f.collider?.static) {
      continue;
    }
    let fc = createCollider(f);
    if (aabb(collider, fc)) {
      objObjCollision(obj, collider, f, fc, false);
    }
  }

  obj.onAir = !obj.onGround && !obj.onWall;
  // obj.pos.xv += obj.pos.xa * dt;
  obj.pos.yv += obj.pos.ya * dt;

  obj.pos.x += obj.pos.xv * dt;
  obj.pos.y += obj.pos.yv * dt;// + obj.pos.ya * dt;

  // Reset gravity
  obj.pos.ya = obj.onGround ? 0 : gameState.world.gravity.y;
};
const flipSheet = function(coords, newSheet) {
  for (let c of coords) {
    if (c instanceof Array) {
      flipSheet(c, newSheet);
    } else if (c.sheetIdx != null) {
      c.sheetIdx = newSheet;
    }
  }
};
const createBullet = function(px, py, dirx, diry, weapon, owner) {
  return {
    flipx: dirx < 0,
    pos: {x: px, y: py, xv: 0, yv: 0, xa: 0, ya: 0},
    collider: {size: {x: 2, y: 2}},
    dir: {x: dirx, y: diry},
    owner: owner,
    speed: weapon.speed,
    damage: weapon.damage,
    dtype: weapon.dtype,
    ttl: weapon.ttl || 5,
    width: 4,
    height: 4,
    animIdx: 0,
    tileIdx: 0,
    animAccum: 0,
    tileCoords: weapon.tileCoords,
  };
};
const blarbThink = function(e, dt) {
  if (e.health <= 0) {
    let idx = gameState.world.enemies.indexOf(e);
    gameState.world.enemies.splice(idx, 1);

    if (gameState.player.health < 10 && Math.random() > 0.35) {
      gameState.world.friendly.push(createHealthPickup({x: e.pos.x, y: e.pos.y - 2}));
    }
  }
  e.pos.xv = e.onGround ? 0 : e.pos.xv;
  e.pos.yv = e.onGround ? 0 : e.pos.yv;
  e.dir = e.dir || -1;
  e.pos.x += e.dir * e.speed * Math.abs(Math.sin(gameState.world.time*Math.PI)) * dt;
  avoidFall(e);
  e.flipx = e.dir == -1;
  e.itime = Math.max(0, (e?.itime || 0) - dt);
};
const blurbThink = function(e, dt) {
  if (e.health <= 0) {
    let idx = gameState.world.enemies.indexOf(e);
    gameState.world.enemies.splice(idx, 1);

    if (gameState.player.health < 10 && Math.random() > 0.35) {
      gameState.world.friendly.push(createHealthPickup({x: e.pos.x, y: e.pos.y - 2}));
    }
  }
  e.flipx = (Math.sign(gameState.player.pos.x - e.pos.x) > 0);
  e.itime = Math.max(0, (e?.itime || 0) - dt);
  e.cd = Math.max(0, (e?.cd || 0) - dt);
  e.pos.xv = e.onGround ? 0 : e.pos.xv;
  e.pos.yv = e.onGround ? 0 : e.pos.yv;
  if (e.cd <= 0) {
    e.cd = e.weapon.cooldown;
    gameState.world.projectiles.push(
    createBullet(e.pos.x, 
              e.pos.y - e.height*1/4, 
              e.flipx ? 1 : -1,
              0, e.weapon, e)
    );
  }
  e.animIdx = (e.cd >= (e.weapon.cooldown - .5)) ? 1 : 0;
};
const blealdThink = function(e, dt) {
  if (e.health <= 0) {
    let idx = gameState.world.enemies.indexOf(e);
    gameState.world.enemies.splice(idx, 1);

    if (gameState.player.health < 10 && Math.random() > 0.35) {
      gameState.world.friendly.push(createHealthPickup({x: e.pos.x, y: e.pos.y - 2}));
    }
  }

  const pdir = (Math.sign(gameState.player.pos.x - e.pos.x) > 0 ? 1 : -1);
  e.dir = e?.hit ? pdir : (e.dir || -1);

  if (e.cd <= 0 && pdir == e.dir && Math.abs(gameState.player.pos.y - e.pos.y) <= 8) {
    // Charge
    e.cd = e.cooldown;
  }

  e.pos.xv = e.onGround ? 0 : e.pos.xv;
  e.pos.yv = e.onGround ? 0 : e.pos.yv;
  const phase1 = e.cooldown - e.chargeBuildTime;
  const phase2 = e.cooldown - e.chargeBuildTime - e.chargeTime;
  const speed = (e.cd >= phase1 ? 0 : (e.cd >= phase2 ? e.chargeSpeed : e.speed));
  e.pos.x += e.dir * speed * dt;
  if (e.cd < phase2) avoidFall(e); // Only avoid falls when not charging.
  e.flipx = e.dir == -1;
  e.itime = Math.max(0, (e?.itime || 0) - dt);
  e.cd = Math.max(0, (e?.cd || 0) - dt);
  e.damage = (e.cd <= phase1 && e.cd >= phase2) ? e.chargeDamage : e.baseDamage;
  e.animIdx = (e.cd >= phase1) ? 1 : 0;
  e.hit = false; // clear the hit for next think
};
const blergunPrimeThink = function(e, dt) {
  gameState.world.boss = e; // draw the boss health
  if (e.health <= 0) {
    let idx = gameState.world.enemies.indexOf(e);
    gameState.world.enemies.splice(idx, 1);

    for (let oe of gameState.world.enemies) { // kill all other enemies.
      // gameState.world.enemies.splice(gameState.world.enemies.indexOf(oe), 1);
      if (gameState.player.health < 10 && Math.random() > 0.35) {
        gameState.world.friendly.push(createHealthPickup({x: e.pos.x, y: e.pos.y - 2}));
      }
    }
    gameState.world.enemies = [];
    gameState.win = true;
    return;
  }
  e.dir = Math.sign(-1 * Math.sin(gameState.world.time*Math.PI/19)) > 0 ? 1 : -1;
  e.pos.x += e.dir * dt * (e.speed * 1/4 + Math.abs(Math.sin(gameState.world.time*Math.PI/9.5)) * e.speed *3/ 4);
  // avoidFall(e);
  e.flipx = -1;
  e.itime = Math.max(0, (e?.itime || 0) - dt);
  e.cd = Math.max(0, (e?.cd || 0) - dt);

  if (e.cd <= 0) {
    e.cd = e.cooldown * Math.max(.25, (gameState.player?.unicorns || []).length / MAX_UNICORNS);
    var p = [createBlarb,createBlurb,createBleald][Math.ceil(Math.random() * 3) - 1](e.pos);
    p.pos.y -= e.height - 10;
    p.pos.xv = -60;
    p.pos.yv = -70;
    gameState.world.enemies.push(p);
  }
};
const unicornThink = function(u, dt) {
  u.dir = u.dir || -1;
  u.pos.x += u.dir * u.speed * dt;
  avoidFall(u, [0,4]);
  u.flipx = u.dir == -1;

  const layer = gameState.world.layers[gameState.world.groundLayerIdx];
  const startRow = layer?.startRow || 0;
  let cgx = Math.floor(u.pos.x / gameState.world.tileSize.x);
  let cgy = Math.floor(u.pos.y / gameState.world.tileSize.y);
  const curTileIdx = layer.tiles[cgx  + (cgy - startRow) * gameState.world.size.x];
  // HACK ALERT: gameState.world.tileCoords[1].sheetIdx == 'raw' is not guaranteed anymore due to attempts to slim the level binaries.
  if ((gameState.world.tileCoords[curTileIdx]?.destroyable != 1 && gameState.world.tileCoords[1].sheetIdx == 0/*'raw'*/ && gameState.curLevelIdx != BOSS_LEVEL) ||
      (gameState.player?.unicorns?.indexOf(gameState.curLevelIdx) >= 0) ||
      (gameState.curLevelIdx == BOSS_LEVEL && gameState.player?.unicorns?.length == MAX_UNICORNS)) {
    flipSheet(gameState.world.tileCoords, 1/*'tiles'*/);
    flipSheet(u.tileCoords, 3/*'unicorn'*/);
    gameState.player.unicorns = gameState.player?.unicorns || [];
    if (gameState.curLevelIdx != BOSS_LEVEL && gameState.player.unicorns.indexOf(gameState.curLevelIdx) == -1) {
      gameState.player.unicorns.push(gameState.curLevelIdx);
    }
  }
};
const unicornSpawnerThink = function(s, dt) {
  let idx = gameState.world.friendly.indexOf(s);
  gameState.world.friendly.splice(idx, 1);

  for (let uk of (gameState.player.unicorns || [])) {
    let u = createUnicorn({x: s.pos.x + Math.random() * 32 - 16, y: s.pos.y});
    u.dir = (Math.random() > .49) ? -1 : 1;
    gameState.world.friendly.push(u);
  }
};
const cannonWeaponThink = function(w, dt) {
  w.cd = w?.cd ? w.cd - dt : 0;
  if (gameState.player.weapons.length > 1 && gameState.player.weapons[1].bt <= 0) {
    gameState.player.weaponIdx = 1;
  }
};
const missleWeaponThink = function(w, dt) {
  // Allow x shots before a global cooldown is invoked.
  // Store first shot time as bt zero. When bt >= maxBuildTime then reset allowed shots.
  w.cd = w?.cd ? w.cd - dt : 0;
  w.bt = w?.bt ? Math.max(w.bt - dt, 0) : 0;
  if (w.bt <= 0) {
    w.sc = w.maxShots;
  }
  if (w?.sc <= 0) {
    gameState.player.weaponIdx = 0; // switch back to cannon while recharging.
  }
};
const missleEntityThink = function(w, dt) {
  if (gameState.player.weapons.length > 1) {
    gameState.world.friendly.splice(gameState.world.friendly.indexOf(w), 1);
  }

  w.pos.y += Math.sin(gameState.world.time*Math.PI) * 15 * dt;
  const mcollider = createCollider(w);
  const pcollider = createCollider(gameState.player);
  if (aabb(mcollider, pcollider)) {
    w.think = missleWeaponThink;
    gameState.player.weapons.push(w);
    // Remove entity
    gameState.world.friendly.splice(gameState.world.friendly.indexOf(w), 1);
  }
};
const bootsEntityThink = function(u, dt) {
  if (gameState.player.equipment.length > 0) {
    gameState.world.friendly.splice(gameState.world.friendly.indexOf(u), 1);
  }

  u.pos.y += Math.sin(gameState.world.time*Math.PI) * 15 * dt;
  const mcollider = createCollider(u);
  const pcollider = createCollider(gameState.player);
  if (aabb(mcollider, pcollider)) {
    // Remove entity
    gameState.player.equipment.push(u);
    gameState.world.friendly.splice(gameState.world.friendly.indexOf(u), 1);
  }
};
const colorMeterThink = function(u,dt) {
  if (gameState.player.unicorns) {
    flipSheet(u.tileCoords, [0/*'raw'*/, 4/*'cmeter1'*/, 5/*'cmeter2'*/, 3/*'unicorn'*/][
      Math.min(gameState.player.unicorns.length, MAX_UNICORNS)
    ]);
    u.animIdx = (gameState.player.unicorns.length >= MAX_UNICORNS) ? 1 : 0;
  }
};
const healthPickupThink = function (h, dt) {
  h.pos.y += Math.sin(gameState.world.time*Math.PI) * 4 * dt;
  const hcollider = createCollider(h);
  const pcollider = createCollider(gameState.player);
  if (aabb(hcollider, pcollider)) {
    gameState.player.health = Math.min(gameState.player.health + 1, 10);
    // Remove entity
    gameState.world.friendly.splice(gameState.world.friendly.indexOf(h), 1);
  }
};
const createBlurbWeapon = function() {
  return {
    speed: 100,
    damage: 1,
    dtype: 0,
    cooldown: 2,
    ttl: 10,
    tileCoords: [
      [ // idle (0)
        {topleft: {x:112,y:16}, width: 4, height: 4, frameLength: 250},
        {topleft: {x:116,y:16}, width: 4, height: 4, frameLength: 250},
      ],
    ],
  };
};
const createCannonWeapon = function() {
  return {
    speed: 100,
    damage: 1,
    dtype: 0,
    cooldown: 0.5,
    ttl: 10,
    tileCoords: [
      [ // idle (0)
        {topleft: {x:112,y:16}, width: 4, height: 4, frameLength: 250},
        {topleft: {x:116,y:16}, width: 4, height: 4, frameLength: 250},
      ],
    ],
    think: cannonWeaponThink,
    music: () => {play_music([[0,13]],500,.19,.18,.005,.2,.1,'', false).resume();}
  };
};
const createMissleWeapon = function(pos) {
  return {
    flipx: false,
    pos: {x: pos?.x || 0, y: pos?.y || 0, xv: 0, yv: 0, xa: 0, ya: 0},
    collider: {size: {x: 5, y: 5}},
    width: 5,
    height: 5,
    animIdx: 1,
    tileIdx: 0,
    animAccum: 0,

    speed: 110,
    damage: 3,
    dtype: 1,
    maxBuildTime: 5,
    maxShots: 3,
    cooldown: 0.5,
    ttl: 10,
    tileCoords: [
      [ // projectile (0)
        {topleft: {x:112,y:20}, width: 7, height: 5, frameLength: 250, sheetIdx:2/*'player'*/},
        {topleft: {x:118,y:20}, width: 7, height: 5, frameLength: 250, sheetIdx:2/*'player'*/},
      ],
      [ // in-game object
        {topleft: {x:120,y:26}, width: 5, height: 5, sheetIdx:2/*'player'*/},
      ],

      [ // idle (cannon)
        {topleft: {x:42,y:16}, width: 5, height: 8, frameLength: 250, sheetIdx:2/*'player'*/},
        {topleft: {x:42,y:16}, width: 5, height: 8, frameLength: 250, sheetIdx:2/*'player'*/},
      ],
      [ // wall climb
        {topleft: {x:37,y:16}, width: 5, height: 8, sheetIdx:2/*'player'*/},
      ],
      [ // run
        {topleft: {x:32,y:40}, width: 5, height: 8, frameLength: 250, sheetIdx:2/*'player'*/},
        {topleft: {x:37,y:40}, width: 5, height: 8, frameLength: 250, sheetIdx:2/*'player'*/},
      ],
      [ // flip
        {topleft: {x:42,y:16}, width: 5, height: 8, sheetIdx:2/*'player'*/},
      ],
      [ // dance
        {topleft: {x:36,y:31}, width: 5, height: 8, frameLength: 250, sheetIdx:2/*'player'*/},
        {topleft: {x:42,y:40}, width: 5, height: 8, frameLength: 250, sheetIdx:2/*'player'*/},
      ],

      [ // idle (missle)
        {topleft: {x:32,y:16}, width: 5, height: 8, frameLength: 250, sheetIdx:2/*'player'*/},
        {topleft: {x:32,y:16}, width: 5, height: 8, frameLength: 250, sheetIdx:2/*'player'*/},
      ],
      [ // wall climb
        {topleft: {x:37,y:16}, width: 5, height: 8, sheetIdx:2/*'player'*/},
      ],
      [ // run
        {topleft: {x:32,y:40}, width: 5, height: 8, frameLength: 250, sheetIdx:2/*'player'*/},
        {topleft: {x:37,y:40}, width: 5, height: 8, frameLength: 250, sheetIdx:2/*'player'*/},
      ],
      [ // flip
        {topleft: {x:32,y:16}, width: 5, height: 8, sheetIdx:2/*'player'*/},
      ],
      [ // dance
        {topleft: {x:41,y:24}, width: 5, height: 8, frameLength: 250, sheetIdx:2/*'player'*/},
        {topleft: {x:41,y:32}, width: 5, height: 8, frameLength: 250, sheetIdx:2/*'player'*/},
      ]
    ],
    think: missleEntityThink,
    music: () => {play_music([[0,13],[0,18]],500,.19,.18,.005,.2,.1,'',false).resume();}
  };
};
const createBootsEquipment = function(pos) {
  return {
    flipx: false,
    pos: {x: pos?.x || 0, y: pos?.y || 0, xv: 0, yv: 0, xa: 0, ya: 0},
    collider: {size: {x: 5, y: 4}},
    width: 5,
    height: 5,
    animIdx: 0,
    tileIdx: 0,
    animAccum: 0,

    jspeed: 30, // additional jump speed
    tileCoords: [
      [ // icon (0)
        {topleft: {x:113,y:33}, width: 5, height: 4, sheetIdx:2/*'player'*/},
      ],
      [ // idle
        {topleft: {x:0,y:40}, width: 4, height: 8, frameLength: 250, sheetIdx:2/*'player'*/},
        {topleft: {x:0,y:40}, width: 4, height: 8, frameLength: 250, sheetIdx:2/*'player'*/},
      ],
      [ // wall climb
        {topleft: {x:5,y:40}, width: 4, height: 8, sheetIdx:2/*'player'*/},
      ],
      [ // run
        {topleft: {x:20,y:40}, width: 4, height: 8, frameLength: 250, sheetIdx:2/*'player'*/},
        {topleft: {x:25,y:40}, width: 4, height: 8, frameLength: 250, sheetIdx:2/*'player'*/},
      ],
      [ // flip
        {topleft: {x:0,y:48}, width: 4, height: 8, sheetIdx:2/*'player'*/},
      ],
      [ // dance
        {topleft: {x:10,y:40}, width: 4, height: 8, frameLength: 250, sheetIdx:2/*'player'*/},
        {topleft: {x:15,y:40}, width: 4, height: 8, frameLength: 250, sheetIdx:2/*'player'*/},
      ]
    ],
    think: bootsEntityThink,
  };
};
const createHealthPickup = function(pos) {
  return {
    flipx: false,
    pos: {x: pos?.x || 0, y: pos?.y || 0, xv: 0, yv: 0, xa: 0, ya: 0},
    collider: {size: {x: 5, y: 5}, noGravity: true},
    width: 5,
    height: 5,
    animIdx: 0,
    tileIdx: 0,
    animAccum: 0,
    tileCoords: [
      [ // icon (0)
        {topleft: {x:120,y:33}, width: 5, height: 5, sheetIdx:2/*'player'*/},
      ],
    ],
    think: healthPickupThink
  };
};
const createPlayer = function(pos) {
  return {
    flipx: false,
    pos: {x: pos.x, y: pos.y, xv: 0, yv: 0, xa: 0, ya: 0},
    collider: {size: {x: 8, y: 16}},
    width: 8,
    height: 16,
    health: 10,
    invulnTime: .5,
    speed: 75,
    aspeed: 50,
    jspeed: 60,
    // jbtime: 0,// jump coyote time
    // jbtime: 0,// jump buffer time
    // atime: 0,// how long in the air (used for rotating)
    // scale: 2,
    animIdx: 0,
    tileIdx: 0,
    animAccum: 0,
    weapons: [
      createCannonWeapon(),
      // createMissleWeapon(),
    ],
    equipment: [
      // createBootsEquipment(),
    ],
    weaponIdx: 0,
    tileCoords: [
      [ // idle (0)
        {topleft: {x:0,y:8}, width: 4, height: 8, frameLength: 500, sheetIdx: 2/*'player'*/},
        {topleft: {x:4,y:8}, width: 4, height: 8, frameLength: 500, sheetIdx: 2/*'player'*/},
      ],
      [ // wall climb (1)
        {topleft: {x:8,y:8}, width: 4, height: 8, sheetIdx: 2/*'player'*/},
      ],
      [ // run (2)
        {topleft: {x:12,y:8}, width: 4, height: 8, frameLength: 250, sheetIdx: 2/*'player'*/},
        {topleft: {x:16,y:8}, width: 4, height: 8, frameLength: 250, sheetIdx: 2/*'player'*/},
      ],
      [ // flip (3)
        {topleft: {x:20,y:8}, width: 4, height: 8, sheetIdx: 2/*'player'*/},
      ],
      [ // dance (4)
        {topleft: {x:24,y:8}, width: 4, height: 8, frameLength: 250, sheetIdx: 2/*'player'*/},
        {topleft: {x:28,y:8}, width: 4, height: 8, frameLength: 250, sheetIdx: 2/*'player'*/},
      ],
    ],
    hitMusic: () => {play_music([[0,3],[0,20],[0,23]],400,.19,.18,.005,.2,.1,'sawtooth').resume();},
    takeDamage: function(dmg) {
      if (this.itime <= 0) {
        this.health -= dmg;
        this.itime = gameState.player.invulnTime;
        this.hitMusic && this.hitMusic();
        if (this.health <= 0) {
          let lvl = gameState.curLevelIdx;
          gameState.curLevelIdx = gameState.entryLevelIdx;
          loadLevel(lvl);
          this.health = 10;
        }
      }
    }
  };
};
const createUnicorn = function(pos) {
  return {
    // name: 'unicorn',
    flipx: false,
    pos: {x: pos.x, y: pos.y, xv: 0, yv: 0, xa: 0, ya: 0},
    collider: {size: {x: 12, y: 10}},
    speed: 10,
    width: 18,
    height: 13,
    animIdx: 0,
    tileIdx: 0,
    animAccum: 0,
    tileCoords: [
      [ // idle (0)
        {topleft: {x:0,y:24}, width: 18, height: 13, frameLength: 250,  sheetIdx: 0/*'raw'*/},
        {topleft: {x:18,y:24}, width: 20, height: 13, frameLength: 250, sheetIdx: 0/*'raw'*/},
      ],
    ],
    think: unicornThink,
  };
};
const createShip = function(pos) {
  return {
    // name: 'ship',
    flipx: false,
    pos: {x: pos.x, y: pos.y, xv: 0, yv: 0, xa: 0, ya: 0},
    collider: {size: {x: 48, y: 15}, static: true},
    width: 48,
    height: 16,
    animIdx: 0,
    tileIdx: 0,
    animAccum: 0,
    tileCoords: [
      [ // idle (0)
        {topleft: {x:48,y:16}, width: 48, height: 16, sheetIdx:2/*'player'*/, frameLength: 250},
        {topleft: {x:48,y:32}, width: 48, height: 16, sheetIdx:2/*'player'*/, frameLength: 250},
      ],
    ],
  };
};
const createUnicornSpawner = function(pos) {
  return {
    flipx: false,
    pos: {x: pos.x, y: pos.y, xv: 0, yv: 0, xa: 0, ya: 0},
    width: 48,
    height: 16,
    think: unicornSpawnerThink,
  };
};
const createBlarb = function(pos) {
  return {
    // name: 'blarb',
    flipx: false,
    pos: {x: pos.x, y: pos.y, xv: 0, yv: 0, xa: 0, ya: 0},
    collider: {size: {x: 10, y: 8}},
    width: 10,
    height: 8,
    speed: 10,
    health: 3,
    damage: 1,
    invulnTime: .5,
    animIdx: 1,
    tileIdx: 0,
    animAccum: 0,
    tileCoords: [
      [ // idle (0)
        {topleft: {x:0,y:16}, width: 10, height: 8},
      ],
      [ // walk (1)
        {topleft: {x:0,y:16}, width: 10, height: 8, frameLength: 500},
        {topleft: {x:10,y:16}, width: 10, height: 8, frameLength: 500},
      ],
    ],
    think: blarbThink,
  };
};
const createBlurb = function(pos) {
  return {
    flipx: false,
    pos: {x: pos.x, y: pos.y, xv: 0, yv: 0, xa: 0, ya: 0},
    collider: {size: {x: 5, y: 7}},
    width: 5,
    height: 7,
    speed: 0,
    health: 4,
    damage: 1,
    invulnTime: .5,
    weapon: createBlurbWeapon(),
    animIdx: 0,
    tileIdx: 0,
    animAccum: 0,
    tileCoords: [
      [ // idle (0)
        {topleft: {x:0,y:57}, width: 5, height: 7, frameLength: 500},
        {topleft: {x:6,y:57}, width: 5, height: 7, frameLength: 500},
      ],
      [ // attack (1)
        {topleft: {x:0,y:65}, width: 5, height: 7, frameLength: 500},
      ],
    ],
    think: blurbThink,
  };
};
const createBleald = function(pos) {
  return {
    flipx: false,
    pos: {x: pos.x, y: pos.y, xv: 0, yv: 0, xa: 0, ya: 0},
    collider: {size: {x: 9, y: 8}, dfProtect: 1},
    width: 9,
    height: 8,
    speed: 10,
    health: 4,
    damage: 1,
    baseDamage: 1,
    chargeSpeed: 150,
    chargeDamage: 3,
    chargeTime: 1,
    chargeBuildTime: 1,
    invulnTime: .5,
    cooldown: 5,
    animIdx: 0,
    tileIdx: 0,
    animAccum: 0,
    tileCoords: [
      [ // idle (0)
        {topleft: {x:64,y:64}, width: 9, height: 8, frameLength: 500},
        {topleft: {x:74,y:64}, width: 9, height: 8, frameLength: 500},
      ],
      [ // charge build up (1)
        {topleft: {x:74,y:64}, width: 9, height: 8, frameLength: 150},
        {topleft: {x:84,y:64}, width: 9, height: 8, frameLength: 150},
      ],
    ],
    think: blealdThink,
  };
};
const createBlergunPrime = function(pos) {
  return {
    flipx: false,
    pos: {x: pos.x, y: pos.y, xv: 0, yv: 0, xa: 0, ya: 0},
    collider: {size: {x: 70, y: 170}, noGravity: true},
    width: 96,
    height: 192,
    speed: 50,
    health: 100,
    damage: 1,
    invulnTime: .5,
    cooldown: 5,
    animIdx: 0,
    tileIdx: 0,
    animAccum: 0,
    tileCoords: [
      [ // idle (0)
        {topleft: {x:0,y:80}, width: 32, height: 48, frameLength: 500},
        {topleft: {x:32,y:80}, width: 32, height: 48, frameLength: 500},
      ],
    ],
    think: blergunPrimeThink,
  };
};
const createColorMeter = function(pos) {
  return {
    // name: 'cmeter',
    flipx: false,
    pos: {x: pos.x, y: pos.y, xv: 0, yv: 0, xa: 0, ya: 0},
    collider: {size: {x: 16, y: 32}, noGravity: true},
    speed: 0,
    width: 16,
    height: 32,
    animIdx: 0,
    tileIdx: 0,
    animAccum: 0,
    tileCoords: [
      [ // idle (0)
        {topleft: {x:16,y:48}, width: 16, height: 32, sheetIdx: 0/*'raw'*/},
      ],
      [ // rotating (1)
        {topleft: {x:16,y:48}, width: 16, height: 32, sheetIdx: 0/*'raw'*/, frameLength: 200},
        {topleft: {x:32,y:48}, width: 16, height: 32, sheetIdx: 0/*'raw'*/, frameLength: 200},
        {topleft: {x:48,y:48}, width: 16, height: 32, sheetIdx: 0/*'raw'*/, frameLength: 200},
      ],
    ],
    think: colorMeterThink,
  };
};
const mergeU16 = function(high, low) {
  return (high << 8) | low;
};
const loadLevelBin = async function(file) {
  let level = {};
  const resp = await fetch(file);
  if (!resp.ok) {
    return null;
  }
  const abuf = new DataView(await resp.arrayBuffer());
  let bpos = 0;
  level.time = 0;
  level.frictionGround = abuf.getUint8(bpos++);
  level.gravity = {x: abuf.getUint8(bpos++), y: abuf.getUint8(bpos++)};
  level.size = {x: abuf.getUint8(bpos++), y: abuf.getUint8(bpos++)};
  level.tileSize = {x: abuf.getUint8(bpos++), y: abuf.getUint8(bpos++)};
  level.groundLayerIdx = abuf.getUint8(bpos++);
  
  // tile coords
  let tileCoordCount = abuf.getUint8(bpos++);
  level.tileCoords = [];
  while (tileCoordCount-- > 0) {
    let coord = {
      topleft: {x: abuf.getUint8(bpos++), y: abuf.getUint8(bpos++)},
      width: abuf.getUint8(bpos++),
      height: abuf.getUint8(bpos++),
      solid: abuf.getUint8(bpos++),// != 0 ? 1 : 0,
      // destroyable: abuf.getUint8(bpos++),
      // levelIdx: abuf.getUint8(bpos++),
      // sheetIdx: abuf.getUint8(bpos++),
      damage: abuf.getUint8(bpos++),
    };
    
    coord.destroyable = (((coord.solid & 0b01100000) >> 5) == 3) ? undefined : ((coord.solid & 0b01100000) >> 5);
    coord.levelIdx = (((coord.solid & 0b00011100) >> 2) == 7) ? undefined : ((coord.solid & 0b00011100) >> 2);
    // coord.sheetIdx = {0:'raw',1:'tiles',2:'player',3:'unicorn'}[((coord.solid & 0b00000011))];
    coord.sheetIdx = (coord.solid & 0b00000011);
    coord.solid = (coord.solid & 0b10000000) >> 7;
    coord.damage = (coord.damage > 0) ? coord.damage : undefined;
    level.tileCoords.push(coord);
  }

  // layers
  let layerCount = abuf.getUint8(bpos++);
  level.layers = [];
  while (layerCount-- > 0) {
    let l = {};
    let layerType = abuf.getUint8(bpos++);

    l.startRow = abuf.getUint8(bpos++);
    l.endRow = abuf.getUint8(bpos++);
    let expectedTiles = level.size.x * (l.endRow + 1 - l.startRow);//level.size.x * (level.size.y - l.startRow)
    if (layerType === 0) {
      l.tiles = [];  
 
      while (expectedTiles-- > 0) {
        l.tiles.push(abuf.getUint8(bpos++));
      }
    }/* else if (layerType === 1) {
      let fillTile = abuf.getUint8(bpos++);
      l.tiles = Array(expectedTiles);
      l.tiles.fill(fillTile);
      let diffCount = mergeU16(abuf.getUint8(bpos++),abuf.getUint8(bpos++));
      while (diffCount-- > 0) {
        let t = abuf.getUint8(bpos++);
        let x = abuf.getUint8(bpos++);
        let y = abuf.getUint8(bpos++);

        l.tiles[x + (y - l.startRow) * level.size.x] = t;
      }
    } else if (layerType === 2) {
      let fillTile = abuf.getUint8(bpos++);
      l.tiles = Array(expectedTiles);
      l.tiles.fill(fillTile);
      let tileCount = abuf.getUint8(bpos++);
      while (tileCount-- > 0) {
        let t = abuf.getUint8(bpos++);
        let posCount = mergeU16(abuf.getUint8(bpos++),abuf.getUint8(bpos++));
        while (posCount-- > 0) {
          let x = abuf.getUint8(bpos++);
          let y = abuf.getUint8(bpos++);
          l.tiles[x + (y - l.startRow) * level.size.x] = t;
        }
      }
    } else if (layerType === 3) {
      let fillTile = abuf.getUint8(bpos++);
      l.tiles = Array(expectedTiles);
      l.tiles.fill(fillTile);
      let tileCount = abuf.getUint8(bpos++);
      while (tileCount-- > 0) {
        let t = abuf.getUint8(bpos++);
        let ycount = abuf.getUint8(bpos++);
        while (ycount-- > 0) {
          let y = abuf.getUint8(bpos++);
          let xcount = abuf.getUint8(bpos++);
          while (xcount-- > 0) {
            let x = abuf.getUint8(bpos++);
            l.tiles[x + (y - l.startRow) * level.size.x] = t;
          }
        }
      }
    }*/
    level.layers.push(l);
  }

  // enemies
  let enemyCount = abuf.getUint8(bpos++);
  level.enemies = [];
  while(enemyCount-- > 0) {
    let etype = abuf.getUint8(bpos++);
    let pos = {x: mergeU16(abuf.getUint8(bpos++),abuf.getUint8(bpos++)), y: mergeU16(abuf.getUint8(bpos++),abuf.getUint8(bpos++))};
    let e = {
      0: createBlarb, 
      1: createBlurb, 
      2: createBleald,
      3: createBlergunPrime,
    }[etype](pos);
    level.enemies.push(e);
  }

  // friendly
  let friendlyCount = abuf.getUint8(bpos++);
  level.friendly = [];
  while(friendlyCount-- > 0) {
    let ftype = abuf.getUint8(bpos++);
    let pos = {x: mergeU16(abuf.getUint8(bpos++),abuf.getUint8(bpos++)), y: mergeU16(abuf.getUint8(bpos++),abuf.getUint8(bpos++))};
    let f = {
      0: createUnicorn, 
      1: createShip, 
      2: createMissleWeapon, 
      3: createBootsEquipment,
      4: createColorMeter,
      5: createUnicornSpawner,
    }[ftype](pos);
    level.friendly.push(f);
  }

  // player
  let playerCount = abuf.getUint8(bpos++);
  if (playerCount != 0) {
    let pos = {x: mergeU16(abuf.getUint8(bpos++),abuf.getUint8(bpos++)), y: mergeU16(abuf.getUint8(bpos++),abuf.getUint8(bpos++))};
    level.player = createPlayer(pos);
  }

  return level;
};
const createTitle = function(pos) {
  return {
    flipx: false,
    pos: {x: pos.x, y: pos.y, xv: 0, yv: 0, xa: 0, ya: 0},
    collider: {size: {x: 55, y: 11}, noGravity: true},
    width: 55,
    height: 11,
    animIdx: 0,
    tileIdx: 0,
    animAccum: 0,
    tileCoords: [
      [ // idle (0)
        {topleft: {x:64,y:48}, width: 55, height: 11, sheetIdx: 3/*'unicorn'*/},
      ],
    ],
    think: function(u, dt) {
      if (gameState.world.time > 10) {
        gameState.world.friendly.splice(gameState.world.friendly.indexOf(u), 1);
      }
    }
  };
};
const spritesheet = await loadImage('./assets/tiles.png');
const levels = [
  // await loadLevelBin('/levels/level4.bin'),
  await loadLevelBin('/levels/level0.bin'),
  await loadLevelBin('/levels/level1.bin'),
  await loadLevelBin('/levels/level2.bin'),
  await loadLevelBin('/levels/level3.bin'),
  await loadLevelBin('/levels/level4.bin'),
];
const gameState = {
  spritesheets: {
    0/*'raw'*/: spritesheet,
    1/*'tiles'*/: recolorImage(spritesheet,
      {"82":"5c4335","aa":"83ae83",
        //background
      "fa":"e8edf6","f0":"dce7f9",
        //trees
      "96":"b86ade","8c":"535040","b4":"3b7751",
      // spikes
      "14":"3b196d","3c":"6b44a0"
    }),
    2/*'player'*/: recolorImage(spritesheet,
      { // player
        "64":"5fcde4",
        // boots
        "b4":"dc4964",
        // missle cannon
        "96": "76428a",
        // spaceship
        "46":"3b3f58","50":"8a1559","6e":"ddc71d","aa":"f863ca", "be":"c44fa1",
        // health pickup
        "f0":"d4476caa","82":"d7758fdd",
    }),
    3/*'unicorn'*/: recolorImage(spritesheet,
      {
        // dark body
        "32":"969696",
        // top-mane and horn
        "50":"75ffe5",
        // eye
        "78":"fff16b",
        // body
        "3c":"cfcfcf",
        // first stripe
        "aa":"e8bb70",
        // second stripe
        "64":"6488bf",
        // third stripe
        "46":"6d3a6d",
        // border
        "00":"646464",
    }),
    4/*'cmeter1'*/: recolorImage(spritesheet,
      {
        "64":"6488bf",
    }),
    5/*'cmeter2'*/: recolorImage(spritesheet,
      {
        "64":"6488bf",
        "aa":"e8bb70",
    }),
  },
  // player: undefined,
  camera: {
    pos: {x: 0, y: 0},
    anchor: {x: .5, y: .5},
    size: {x:800, y: 450 /*800*9/16*/},
    ratio: 9/16,
    speed: 10,
    zoom: 2,
  },
  // world: undefined,
};

const canvas = document.getElementById("game");
canvas.width = gameState.camera.size.x;
canvas.height = gameState.camera.size.y;
const context = canvas.getContext('2d');
context.imageSmoothingEnabled = false;
window.addEventListener('resize', () => {
  // canvas.width = window.innerWidth;
  // canvas.height = window.innerHeight;
  context.imageSmoothingEnabled = false;
});

const loadLevel = function(levelIdx) {
  let lvlTemplate = levels[levelIdx];
  // Set the player if one doesn't exist.
  gameState.player = gameState.player || deepClone(lvlTemplate?.player);
  gameState.world = deepClone(lvlTemplate);
  gameState.player.pos = gameState.world?.player?.pos || gameState.player.pos;
  gameState.world.player = undefined;
  gameState.world.friendly = gameState.world.friendly || [];
  gameState.world.enemies = gameState.world.enemies || [];
  gameState.world.projectiles = gameState.world.projectiles || [];

  let entryTile = null;
  const wsize = gameState.world.size;
  const layer = gameState.world.layers[gameState.world.groundLayerIdx];
  for (let y = 0; y < wsize.y; y++) {
    for (let x = 0; x < wsize.x; x++) {
      let tile = layer.tiles[x + y * wsize.x];
      let coord = gameState.world.tileCoords[tile];
      if (coord.levelIdx != null && coord.levelIdx == gameState.curLevelIdx) {
        entryTile = {x: x, y: y + (layer?.startRow || 0)};
        break;
      }
    }
    if (entryTile) break;
  }

  if (entryTile) {
    // find a free cell
    for (let co of [[1,0],[-1,0],[0,1],[0,-1]]) {
      if (entryTile.x + co[0] < 0 || entryTile.x + co[0] >= gameState.world.size.x
          || entryTile.y + co[1] < 0 || entryTile.y + co[1] >= gameState.world.size.y) continue;
      let coord = gameState.world.tileCoords[layer.tiles[entryTile.x + co[0] + (entryTile.y + co[1]) * wsize.x]];
      if (!coord?.solid) {
        gameState.player.pos.x = (entryTile.x + co[0]) * gameState.world.tileSize.x + 8;
        // plus 1 since we sit on top of the tile
        gameState.player.pos.y = (entryTile.y + co[1] + 1) * gameState.world.tileSize.y;
        break;
      }
    }
  }
  gameState.entryLevelIdx = gameState.curLevelIdx;
  gameState.curLevelIdx = levelIdx;

  flipSheet(gameState.world.tileCoords, (gameState.player?.unicorns?.length >= MAX_UNICORNS) ? 1 /*'tiles'*/ : 0 /*'raw'*/);
  if (levelIdx == 0) {
    gameState.world.friendly.push(createTitle({x: 75, y: 338}));
  }
};
const drawWorldLayer = function(layer) {
  context.save();
  const fx = gameState.camera.zoom;
  const fy = gameState.camera.zoom;
  const startRow = layer?.startRow || 0;
  const endRow = layer?.endRow + 1 || gameState.world.size.y;
  // Minimize what tiles are drawn; todo - precalculate this.
  const camtx = Math.floor(gameState.camera.pos.x / gameState.world.tileSize.x);
  const camty = Math.floor(gameState.camera.pos.y / gameState.world.tileSize.y);
  const camcx = Math.floor(gameState.camera.size.x / gameState.world.tileSize.x);
  const camcy = Math.floor(gameState.camera.size.y / gameState.world.tileSize.y);
  const minx = camtx - camcx/2 + 1;
  const miny = camty - camcy/2 + 1;
  const maxx = camtx + camcx/2 + 1;
  const maxy = camty + camcy/2 + 1;
  // End minimize what tiles are drawn
  for (let y = Math.max(miny, startRow); y < Math.min(maxy, endRow); y++) {
    // context.save();
    for (let x = Math.max(minx, 0); x < Math.min(maxx, gameState.world.size.x); x++) {
      // console.log('x: ', x, 'y: ', y, 'sr: ', startRow, 'er: ', layer.endRow, 'tlen: ', layer.tiles.length);
      const coord = gameState.world.tileCoords[wrapi(layer.tiles[x + (y - startRow) * gameState.world.size.x], 0, gameState.world.tileCoords.length)];
      const coffx = -gameState.camera.pos.x;
      const coffy = -gameState.camera.pos.y;
      context.drawImage(
        gameState.spritesheets[coord?.sheetIdx || 0 /*'raw'*/],
        coord.topleft.x,
        coord.topleft.y,
        coord.width,
        coord.height,
        ((gameState.world.tileSize.x * x * fx) + Math.floor(coffx * fx)),
        ((gameState.world.tileSize.y * y * fy) + Math.floor(coffy * fy)),
        // 0,0,
        gameState.world.tileSize.x * fx,
        gameState.world.tileSize.y * fy
      );
    }
  }
  context.restore();
};

const drawPlayer = function(player) {
  context.save();
  const fx = (player.flipx ? -1 : 1) * gameState.camera.zoom;
  const fy = gameState.camera.zoom;
  context.scale((player.flipx ? -1 : 1), 1);
  // context.translate(fx*-gameState.camera.pos.x, -gameState.camera.pos.y);
  const coord = player.tileCoords[player.animIdx][player.tileIdx]; 
  const poffx = (player.pos.x - gameState.camera.pos.x) - player.width/2.;
  const poffy = (player.pos.y - gameState.camera.pos.y) - player.height;
  
  // Move the origin to the center of where you want to draw the image
  context.translate(
    Math.floor(poffx * fx) + (player.width * fx) / 2,
    Math.floor(poffy * fy) + (player.height * fy) / 2
  );

  // Rotate by your desired angle (in radians)
  context.rotate(player.atime * Math.PI * 3); // rotationAngle should be in radians

  if (player?.itime) {
    context.filter = 'invert(1)';
  }
  // Draw the image centered at the translated origin
  // Note: drawImage parameters are: image, sx, sy, sw, sh, dx, dy, dw, dh
  context.drawImage(
    gameState.spritesheets[coord.sheetIdx || 0 /*'raw'*/],
    coord.topleft.x,
    coord.topleft.y,
    coord.width,
    coord.height,
    -(player.width * fx) / 2,  // dx (negative half width)
    -(player.height * fy) / 2, // dy (negative half height)
    player.width * fx,
    player.height * fy
  );

  if (player.weapons && player.weapons.length > 1) {
    let weap = player.weapons[1];
    if (weap.tileCoords.length > 1) {
      const wcoord = weap.tileCoords[player.animIdx + (5 * player.weaponIdx) + 2][player.tileIdx];
      context.drawImage(
        gameState.spritesheets[wcoord.sheetIdx || 0 /*'raw'*/],
        wcoord.topleft.x,
        wcoord.topleft.y,
        wcoord.width,
        wcoord.height,
        -(wcoord.width * 2 * fx) / 2,  // dx (negative half width)
        -(wcoord.height * 2 * fy) / 2, // dy (negative half height)
        wcoord.width * 2 * fx,
        wcoord.height * 2 * fy
      );
    }
  }

  if (player.equipment) {
    for (let e of player.equipment) {
      const ecoord = e.tileCoords[player.animIdx + 1][player.tileIdx];
      context.drawImage(
        gameState.spritesheets[ecoord.sheetIdx || 0 /*'raw'*/],
        ecoord.topleft.x,
        ecoord.topleft.y,
        ecoord.width,
        ecoord.height,
        -(player.width * fx) / 2,  // dx (negative half width)
        -(player.height * fy) / 2, // dy (negative half height)
        player.width * fx,
        player.height * fy
      );
    }
  }
  context.restore();
};

const loop = new GameLoop({
  init: function() {
    loadLevel(0);
    // let actx = play_music([[0,18],[4,18],[20,18],[12,15],[8,15],[16,18],[24,21],[28,21]],400,.19,.18,.005,.2,.1,'triangle',true);
    let actx = play_music([[0,18],[4,18],[20,18],[12,15],[8,15],[16,18],[24,21],[28,21],[15,8],[23,8],[19,11],[27,5]],400,.19,.18,.005,.2,.1,'triangle', true);
    this.audioq = this.audioq || [];
    this.audioq.push(actx);
  },
  paused: function() {
    for (let a of this.audioq) {
      if (a.state === 'running') {
        a.suspend();
      }
    }
  },
  update: function(dt) {
    gameState.world.time += dt;
    // Update audio buffers
    for (let a of this.audioq) {
      if (a.state === 'suspended' || a.state === 'interrupted') {
        a.resume();
      } else if (a.state === 'closed') {
        this.audioq.slice(this.audioq.indexOf(a), 1);
      }
    }
    var poldpos = {x: gameState.player.pos.x, y: gameState.player.pos.y};
    // Handle input
    {
      gameState.player.pos.xv = 0;
      if (this.inputManager.keys['ArrowLeft'] || this.inputManager.keys['KeyA']) {
        gameState.player.pos.x += dt * (gameState.player.onAir ? -gameState.player.aspeed : -gameState.player.speed);
        gameState.player.flipx = true;
      }
      if (this.inputManager.keys['ArrowRight'] || this.inputManager.keys['KeyD']) {
        gameState.player.pos.x += dt * (gameState.player.onAir ? gameState.player.aspeed : gameState.player.speed);
        gameState.player.flipx = false;
      }
      const atime = gameState.player.atime - Math.min(gameState.player.jctime, 0.25);
      if (this.inputManager.keys['ArrowUp'] || this.inputManager.keys['KeyW'] || gameState.player.jbtime <= 0.25) {
        // gameState.player.pos.yv -= dt * gameState.player.speed;
        const jspeed = gameState.player.equipment.reduce(((a, e) => {return a + (e?.jspeed || 0)}), gameState.player.jspeed);
        if (gameState.player.onGround || gameState.player.onWall || gameState.player.jctime <= 0.25) {
          gameState.player.jctime += 1.0; // force coyote time greater than threshold.
          gameState.player.pos.y -= 1; // adjust off of ground
          gameState.player.pos.ya = 0;
          gameState.player.pos.yv = -jspeed * .65;

        } else if (atime <= 0.15) {
          gameState.player.pos.yv += -jspeed * .15 * dt;
          gameState.player.pos.ya = 0;
        } else if (this.inputManager.justpressed['ArrowUp'] || this.inputManager.justpressed['KeyW']) {
          gameState.player.jbtime = 0; // pressed before on ground or wall
        }
      }
      if (this.inputManager.keys['ArrowDown'] || this.inputManager.keys['KeyS']) {
        gameState.player.pos.y += dt * gameState.player.speed;
      }
      if (this.inputManager.keys['Space']) {
        let weap = gameState.player.weapons[gameState.player.weaponIdx];
        if (weap?.cd <= 0 && ((weap?.sc && weap.sc > 0) || !weap?.maxShots)) {
          weap.cd = weap.cooldown;
          weap.bt = (weap?.sc && weap.sc == weap.maxShots) ? weap.maxBuildTime : weap?.bt;
          weap.sc = (weap?.maxShots) ? weap.sc - 1 : undefined;
          gameState.world.projectiles.push(
            createBullet(gameState.player.pos.x, 
                      gameState.player.pos.y - gameState.player.height*1/4, 
                      (!gameState.player.onWall) ?
                        (gameState.player.flipx ? -1 : 1) :
                        (gameState.player.flipx ? 1 : -1),
                      0, weap, gameState.player)
            );
          weap.music && weap.music();
        }
      }
      // if (DEBUG && this.inputManager.justpressed['KeyE']) {
      //   gameState.player.weaponIdx = wrapi(gameState.player.weaponIdx + 1, 0, gameState.player.weapons.length);
      // }
      // if (this.inputManager.justpressed['Equal']){//} || inputManager.justpressed['NumpadAdd']) {
      //   gameState.camera.zoom = Math.min(gameState.camera.zoom + 0.1, 5); // Max zoom of 5
      //   console.log('zoom: ', gameState.camera.zoom);
      // }
      // if (this.inputManager.justpressed['Minus']){//} || inputManager.justpressed['NumpadSubtract']) {
      //   gameState.camera.zoom = Math.max(gameState.camera.zoom - 0.1, 0.5); // Min zoom of 0.5
      //   console.log('zoom: ', gameState.camera.zoom);
      // }

      // Debug
      {
        if (DEBUG && this.inputManager.justpressed['BracketRight']){
          let cur = gameState.world.tileCoords[1].sheetIdx;
          flipSheet(gameState.world.tileCoords, (cur == 'raw') ? 'tiles' : 'raw');
        }
        if (DEBUG && this.inputManager.justpressed['KeyM']){
          if (gameState.player.weapons.length > 1) {
            // Remove missles
            gameState.player.weapons.splice(1, 1);
            gameState.player.weaponIdx = 0;
          } else {
            gameState.player.weapons.push(createMissleWeapon());
            gameState.player.weapons[1].think = missleWeaponThink;
          }
        }
        if (DEBUG && this.inputManager.justpressed['KeyB']){
          if (gameState.player.equipment.length > 0) {
            gameState.player.equipment.splice(0, 1);
          } else {
            gameState.player.equipment.push(createBootsEquipment());
          }
        }
      }
    }

    // Update player
    {
      gameState.player.wcd = gameState.player.wcd ? gameState.player.wcd - dt : 0;
      for (let w of gameState.player.weapons) {
        w?.think(w, dt);
      }
      gameState.player.animIdx = 
        (gameState.player.onWall) ? 1 : 
        (!gameState.player.onAir && Math.abs(gameState.player.pos.x - poldpos.x) > 0) ? 2 : 
        (gameState.player.onAir) ? 3 : 
        (Math.abs(gameState.player.pos.y - poldpos.y) > 0) ? 4 : 0;

      animate(gameState.player, dt);
      applyForces(gameState.player, dt);
      if (gameState.player.onGround) {
        gameState.player.jctime = 0;
      } else {
        gameState.player.jctime += dt;
      }
      gameState.player.jbtime += dt;
      if (gameState.player.onAir) {
        gameState.player.atime += dt;
      } else {
        gameState.player.atime = 0;
      }
      gameState.player.itime = Math.max(0, (gameState.player?.itime || 0) - dt);
    }

    // Update friendly
    {
      for (let u of gameState.world.friendly) {
        if(u.think) u.think(u, dt);
        animate(u, dt);
        if (u.collider && !u?.collider?.noGravity) {
          applyForces(u, dt);
        }
      }
    }

    // Update enemies
    {
      for (let e of gameState.world.enemies) {
        if (e.think) e.think(e, dt);
        animate(e, dt);
        if (!e.collider?.noGravity) applyForces(e, dt);
        // Check for enemy touch damage
        const pbounds = createCollider(gameState.player);
        const ebounds = createCollider(e);
        if (aabb(pbounds, ebounds)) {
          gameState.player.takeDamage(e.damage);
        }
        // if (gameState.player.itime <= 0 && aabb(pbounds, ebounds)) {
        //   gameState.player.health -= e.damage;
        //   gameState.player.itime = gameState.player.invulnTime;
        //   gameState.player.hitMusic && gameState.player.hitMusic();
        //   if (gameState.player.health <= 0) {
        //     let lvl = gameState.curLevelIdx;
        //     gameState.curLevelIdx = gameState.entryLevelIdx;
        //     loadLevel(lvl);
        //   }
        // }
      }
    }

    // Update projectiles
    {
      for (let p of gameState.world.projectiles) {
        animate(p, dt);
        p.pos.x += p.dir.x * p.speed * dt;
        p.pos.y += p.dir.y * p.speed * dt;
        p.ttl -= dt;
        if (p.ttl <= 0) {
          let idx = gameState.world.projectiles.indexOf(p);
          gameState.world.projectiles.splice(idx, 1);
          continue;
        }
        // Check tile collision
        let cgx = Math.floor(p.pos.x / gameState.world.tileSize.x);
        let cgy = Math.floor(p.pos.y / gameState.world.tileSize.y);
        
        const layer = gameState.world.layers[gameState.world.groundLayerIdx];
        const startRow = layer?.startRow || 0;
        const tile = gameState.world.tileCoords[wrapi(layer.tiles[cgx + (cgy - startRow) * gameState.world.size.x], 0, gameState.world.tileCoords.length)];
        if (tile?.solid) {
          const tbounds = {
            left: cgx * gameState.world.tileSize.x,
            right: (cgx + 1) * gameState.world.tileSize.x,
            top: cgy * gameState.world.tileSize.y,
            bottom: (cgy + 1) * gameState.world.tileSize.y,
          };
          const pbounds = createCollider(p);
          if (aabb(pbounds, tbounds)) {
            let idx = gameState.world.projectiles.indexOf(p);
            gameState.world.projectiles.splice(idx, 1);

            // Check if destroy tile
            if (tile?.destroyable == p.dtype) {
              layer.tiles[cgx + (cgy - startRow) * gameState.world.size.x] = 0;
            }
            continue;
          }
        }
        // Check enemy collision
        if (p.owner == gameState.player) {
          for (let e of gameState.world.enemies) {
            const pbounds = createCollider(p);
            const ebounds = createCollider(e);
            if (aabb(pbounds, ebounds)) {
              let idx = gameState.world.projectiles.indexOf(p);
              gameState.world.projectiles.splice(idx, 1);

              if (e.itime <= 0 && p.owner == gameState.player) {
                const baseDamage = p.damage;
                const effectiveDamage = p.damage - (e.collider.dfProtect || 0);
                const headon = (e.flipx ? 1 : -1) == p.dir.x;
                const dmg = (headon && (e?.collider.dfProtect || 0) > p.dtype) ? effectiveDamage : baseDamage;  
                e.health -= dmg;
                if (dmg > 0) e.itime = e.invulnTime;
              }
              e.hit = true; // allow logic based on being hit
              break;
            }
          }
        }
        // Check friendly collision
        for (let f of gameState.world.friendly) {
          if (!f?.collider?.static) continue;
          const pbounds = createCollider(p);
          const ebounds = createCollider(f);
          if (aabb(pbounds, ebounds)) {
            let idx = gameState.world.projectiles.indexOf(p);
            gameState.world.projectiles.splice(idx, 1);
            break;
          }
        }

        // Check player collision
        if (p.owner != gameState.player) {
          const pbounds = createCollider(p);
          const plbounds = createCollider(gameState.player);
          if (aabb(pbounds, plbounds)) {
            let idx = gameState.world.projectiles.indexOf(p);
            gameState.world.projectiles.splice(idx, 1);

            gameState.player.takeDamage(p.damage);
            // if (gameState.player.itime <= 0) {
            //   gameState.player.health -= p.damage;
            //   gameState.player.itime = gameState.player.invulnTime;
            //   gameState.player.hitMusic && gameState.player.hitMusic();
            //   if (gameState.player.health <= 0) {
            //     let lvl = gameState.curLevelIdx;
            //     gameState.curLevelIdx = gameState.entryLevelIdx;
            //     loadLevel(lvl);
            //   }
            // }
            break;
          }
        }
      }
    }

    // Update camera
    {
      const mincp = -gameState.world.size.y * gameState.world.tileSize.y * gameState.camera.zoom;
      const maxcp = gameState.world.size.y * gameState.world.tileSize.y - gameState.camera.size.y/2;//(gameState.world.size.y * gameState.world.tileSize.y - gameState.camera.size.y) * gameState.camera.zoom;
      // const maxcp = -gameState.world.tileSize.y * gameState.camera.zoom;
      gameState.camera.pos.x = lerp(gameState.camera.pos.x, gameState.player.pos.x - gameState.camera.size.x * gameState.camera.anchor.x / gameState.camera.zoom, dt * gameState.camera.speed);
      gameState.camera.pos.y = lerp(gameState.camera.pos.y, clamp(gameState.player.pos.y - gameState.camera.size.y * gameState.camera.anchor.y / gameState.camera.zoom, mincp, maxcp), dt * gameState.camera.speed * gameState.camera.ratio);
    }
  },
  render: () => {
    // Clear screen
    {
      context.save();
      context.globalCompositeOperation = 'source-over';//'destination-under';
      context.fillStyle = '#FFFFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.restore();
    }

    // Draw world tiles
    {
      for (let layerIdx = 0; layerIdx < gameState.world.layers.length; layerIdx++) {
        const layer = gameState.world.layers[layerIdx];
        drawWorldLayer(layer);
        if (layerIdx == gameState.world.groundLayerIdx) { // Draw player after the first layer, but before any others.
    // Draw Friendly
          {
            for (let f of gameState.world.friendly) {
              drawPlayer(f);
            }
          }

    // Draw Enemies
          {
            for (let e of gameState.world.enemies) {
              drawPlayer(e);
            }
          }

    // Draw Projectiles
          {
            for (let p of gameState.world.projectiles) {
              drawPlayer(p);
            }
          }

    // Draw Player
          {
            drawPlayer(gameState.player);
          }
        }
      }
    }

    // Draw Health
    {
      context.save();

      let bars = [{
        // s: {topleft: {x: 112, y: 38}/*, width: 2, height: 3*/},
        // m: {width: 2, height: 3},
        // e: {topleft: {x: 118, y: 38}/*, width: 2, height: 3*/},
        v: gameState.player.health,
        z: 10,
        x: 0,
        f: '#FF000077',
        w: 40
      }];
      if (gameState.world.boss) {
        bars.push({
          // s: {topleft: {x: 112, y: 38}},
          // e: {topleft: {x: 118, y: 38}},
          v: gameState.world.boss.health,
          z: 100,
          x: 100,
          f: '#000000FF',
          w: 200
        })
      }
      bars.forEach( (el) => {
        let s = {topleft: {x: 112, y: 38}};
        let e = {topleft: {x: 118, y: 38}}
        const offsetx = el.x + canvas.width / 2 - 24/*(el.s.width + el.e.width + el.m.width * 4) * 2*/
        const offsety = 15;
        context.drawImage(
          gameState.spritesheets[0/*'raw'*/],
          s.topleft.x,
          s.topleft.y,
          2,// el.s.width,
          3,// el.s.height,
          offsetx,// canvas.width / 2,
          offsety,
          8,//2/*el.s.width*/ * 4,
          12//3/*el.s.height*/ * 4
        );
        context.drawImage(
          gameState.spritesheets[0/*'raw'*/],
          e.topleft.x,
          e.topleft.y,
          2,//el.e.width,
          3,//el.e.height,
          offsetx + el.w,//(2/*el.s.width*/ + 2/*el.m.width*/ * 4) * 4,
          offsety,
          8,//2/*el.e.width*/ * 4,
          12//3/*el.e.height*/ * 4
        );
        context.fillStyle = el.f;
        context.fillRect(
          offsetx + 4,//2/*el.s.width*/ * 2, 
          offsety + 3,/*el.m.height*/
          /*2/*el.m.width * 20*/ el.w * (el.v / el.z),//gameState.player.health / 10),
          6,//3/*el.m.height*/ * 2
        );
        return true;
      });
      context.restore();
      // const scoord = {topleft: {x: 112, y: 38}, width: 2, height: 3};
      // const mcoord = {width: 2, height: 3};//topleft: {x: 115, y: 38},
      // const ecoord = {topleft: {x: 118, y: 38}, width: 2, height: 3};
      // const offsetx = canvas.width / 2 - (scoord.width + ecoord.width + mcoord.width * 4) * 2
      // const offsety = 15;
      // context.drawImage(
      //   gameState.spritesheets[scoord.sheetIdx || 0/*'raw'*/],
      //   scoord.topleft.x,
      //   scoord.topleft.y,
      //   scoord.width,
      //   scoord.height,
      //   offsetx,// canvas.width / 2,
      //   offsety,
      //   scoord.width * 4,
      //   scoord.height * 4
      // );
      
      // context.drawImage(
      //   gameState.spritesheets[ecoord.sheetIdx || 0/*'raw'*/],
      //   ecoord.topleft.x,
      //   ecoord.topleft.y,
      //   ecoord.width,
      //   ecoord.height,
      //   offsetx + (scoord.width + mcoord.width * 4) * 4,
      //   offsety,
      //   ecoord.width * 4,
      //   ecoord.height * 4
      // );
      
      // context.fillStyle = '#FF000077';
      // context.fillRect(
      //   offsetx + scoord.width * 2, 
      //   offsety + mcoord.height,
      //   mcoord.width * 20 * (gameState.player.health / 10),
      //   mcoord.height * 2
      // );
      // context.restore();
    }

    if (gameState.win) {
      context.save();
      // context.fillStyle = '#44a35455';
      // context.fillRect(0,0,canvas.width, canvas.height);
      context.fillStyle = '#000000';
      context.font = '16px serif';
      context.fillText('You Win', canvas.width / 2 - 30, canvas.height/2);
      context.restore();
    }
  },
});

loop.start();