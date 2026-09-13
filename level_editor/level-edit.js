
class GameLoop {
  constructor(properties) {
    Object.assign(this, properties);
    this.stopped = true;
    this.fps = 60;
    this.accumulator = 0;
    this.delta = 1e3 / this.fps;
    this.step = 1 / this.fps;
    this.rAF = null;
    this.lastTime = null;
    this.focused = true;
    window.addEventListener('focus', () => {
      this.focused = true;
    });
    window.addEventListener('blur', () => {
      this.focused = false;
    });
    // this.inputManager = new InputManager();
  }

  frame() {
    if (this.stopped) {return;}
    if (!this.focused) {
      this.rAF = requestAnimationFrame(this.frame.bind(this));
      return;
    }

    let now = performance.now();
    this.dt = now - this.lastTime;
    this.lastTime = now;
    if (this.dt > 1e3) {
      this.rAF = requestAnimationFrame(this.frame.bind(this));
      return;
    }
    this.accumulator += this.dt;
    while (this.accumulator >= this.delta) {
      // emit('tick');
      this.update(this.step);
      // this.inputManager.update(this.step);
      if (this.stopped) { break;} // Prevent additional updates if the loop was stopped inside the update.

      this.accumulator -= this.delta;
    }
    this.render();
    this.rAF = requestAnimationFrame(this.frame.bind(this));
  }

  start() {
    if (this.stopped) {
      this.lastTime = performance.now();
      this.stopped = false;
      this.rAF = requestAnimationFrame(this.frame.bind(this));
      this.init();
    }
  }

  stop() {
    this.stopped = true;
    cancelAnimationFrame(this.rAF);
  }

  init() {}
  update(dt) {}
  render() {}
}

const wrapi = (v, min, max) => {
  const range = max - min;
  return ((v - min) % range + range) % range + min;
};
const loadImage = function(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image failed to load: ${url}`));
    img.src = url;
  });
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

const spritesheet = await loadImage('../assets/tiles.png');

export class Editor {
  constructor(properties) {
    Object.assign(this, properties);
    this.addLayerBtn.addEventListener('click', (function (){
      if (this.level) {
        this.level.layers.push({
          startRow: this.level.size.y,
          tiles: []
        });
        this.addLayerDiv(this.level.layers[this.level.layers.length - 1]);
      }
    }).bind(this));

    let canvas = this.canvas;
    let context = this.canvas.getContext('2d');

    this.canvas.addEventListener('mousedown', this.mouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.mouseUp.bind(this));
    this.canvas.addEventListener('mousemove', this.mouseMove.bind(this));

    this.context = context;
    this.camera = {
      pos: {x: 0, y: 0},
      anchor: {x: .5, y: .5},
      size: {x:800, y: 800*9/16},
      ratio: 9/16,
      speed: 10,
      zoom: 1,
    };
    
    this.entityMap = {
      'blarb': {
        type: 'enemy',
        width: 10,
        height: 8,
        tileCoords: {topleft: {x:0,y:16}, width: 10, height: 8},
      },
      'blurb': {
        type: 'enemy',
        width: 5,
        height: 7,
        tileCoords: {topleft: {x:0,y:57}, width: 5, height: 7},
      },
      'bleald': {
        type: 'enemy',
        width: 9,
        height: 8,
        tileCoords: {topleft: {x:64,y:64}, width: 9, height: 8}
      },
      'bprime': {
        type: 'enemy',
        width: 32,
        height: 48,
        tileCoords: {topleft: {x:0,y:80}, width: 32, height: 48}
      },
      'unicorn': {
        type: 'friendly',
        width: 18,
        height: 13,
        tileCoords: {topleft: {x:0,y:24}, width: 18, height: 13, sheetIdx: 'unicorn'},
      },
      'ship': {
        type: 'friendly',
        width: 48,
        height: 16,
        tileCoords: {topleft: {x:48,y:16}, width: 48, height: 16, sheetIdx:'player'},
      },
      'player': {
        type: 'player',
        width: 8,
        height: 16,
        tileCoords: {topleft: {x:0,y:8}, width: 4, height: 8, sheetIdx: 'player'},
      },
      'missle': {
        type: 'friendly',
        width: 5,
        height: 5,
        tileCoords: {topleft: {x:120,y:26}, width: 5, height: 5, sheetIdx:'player'},
      },
      'boot': {
        type: 'friendly',
        width: 5,
        height: 4,
        tileCoords: {topleft: {x:113,y:33}, width: 5, height: 4, sheetIdx:'player'},
      },
      'cmeter': {
        type: 'friendly',
        width: 16,
        height: 32,
        tileCoords: {topleft: {x:16,y:48}, width: 16, height: 32, sheetIdx: 'raw'},
      },
      'unicornSpawner': {
        type: 'friendly',
        width: 16,
        height: 16,
        tileCoords: {topleft: {x:0,y:24}, width: 18, height: 13, sheetIdx: 'unicorn'}
      }
    }
    this.spritesheets = {
      'raw': spritesheet,
      'tiles': recolorImage(spritesheet,
        {"82":"5c4335","aa":"83ae83",
          //background
        "fa":"e8edf6","f0":"dce7f9",
          //trees
        "96":"b86ade","8c":"535040","b4":"3b7751",
      }),
      'player': recolorImage(spritesheet,
        { // player
          "64":"5fcde4", "b4":"dc4964", "96": "76428a",
          // spaceship
          "46":"3b3f58","50":"8a1559","6e":"ddc71d","aa":"f863ca", "be":"c44fa1",
      }),
      'unicorn': recolorImage(spritesheet,
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
    };
    this.loop = new GameLoop({
      parent: this,
      init: function() {
        this.parent.runTime = 0;
        canvas.width = this.parent.camera.size.x;
        canvas.height = this.parent.camera.size.y;
      },
      update: function(dt) {
        this.parent.runTime += dt;
      },
      drawHoverTile: function(htile) {
        context.save();
        const fx = this.parent.camera.zoom;
        const fy = this.parent.camera.zoom;
        // const startRow = layer?.startRow || 0;
        const coord = (htile.coord) ? 
          this.parent.level.tileCoords[htile.coord] :
          this.parent.entityMap[htile.entity].tileCoords;
        const drawDimenson = {
          x: (htile.coord) ? this.parent.level.tileSize.x : this.parent.entityMap[htile.entity].width,
          y: (htile.coord) ? this.parent.level.tileSize.y : this.parent.entityMap[htile.entity].height,
        };
        const coffx = -this.parent.camera.pos.x;
        const coffy = -this.parent.camera.pos.y;
        let x = htile.x;
        let y = htile.y;
        context.drawImage(
          this.parent.spritesheets[coord?.sheetIdx || 'raw'],
          coord.topleft.x,
          coord.topleft.y,
          coord.width,
          coord.height,
          ((this.parent.level.tileSize.x * x * fx) + Math.floor(coffx * fx)),
          ((this.parent.level.tileSize.y * y * fy) + Math.floor(coffy * fy)),
          // 0,0,
          drawDimenson.x * fx,
          drawDimenson.y * fy
        );
        context.strokeStyle = '#008800';
        context.strokeRect(
          ((this.parent.level.tileSize.x * x * fx) + Math.floor(coffx * fx)),
          ((this.parent.level.tileSize.y * y * fy) + Math.floor(coffy * fy)),
          this.parent.level.tileSize.x * fx,
          this.parent.level.tileSize.y * fy
        );
        context.restore();
      },
      render: function() {
        // Clear screen
        {
          context.save();
          context.globalCompositeOperation = 'source-over';//'destination-under';
          context.fillStyle = '#00FFFFFF';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.restore();
        }

        if (this.parent.level) {
          {
            for (let layerIdx = 0; layerIdx < this.parent.level.layers.length; layerIdx++) {
              if (!this.parent.showLayer[layerIdx].checked) continue;
              const layer = this.parent.level.layers[layerIdx];
              this.drawWorldLayer(layer);
              if (this.parent.hoverTile && this.parent.hoverTile.coord && this.parent.hoverTile.layer == layerIdx) {
                this.drawHoverTile(this.parent.hoverTile);
                // context.save();
                // const fx = this.parent.camera.zoom;
                // const fy = this.parent.camera.zoom;
                // const startRow = layer?.startRow || 0;
                // const coord = this.parent.level.tileCoords[this.parent.hoverTile.coord];
                // const coffx = -this.parent.camera.pos.x;
                // const coffy = -this.parent.camera.pos.y;
                // let x = this.parent.hoverTile.x;
                // let y = this.parent.hoverTile.y;
                // context.drawImage(
                //   this.parent.spritesheets[coord?.sheetIdx || 'raw'],
                //   coord.topleft.x,
                //   coord.topleft.y,
                //   coord.width,
                //   coord.height,
                //   ((this.parent.level.tileSize.x * x * fx) + Math.floor(coffx * fx)),
                //   ((this.parent.level.tileSize.y * y * fy) + Math.floor(coffy * fy)),
                //   // 0,0,
                //   this.parent.level.tileSize.x * fx,
                //   this.parent.level.tileSize.y * fy
                // );
                // context.strokeStyle = '#008800';
                // context.strokeRect(
                //   ((this.parent.level.tileSize.x * x * fx) + Math.floor(coffx * fx)),
                //   ((this.parent.level.tileSize.y * y * fy) + Math.floor(coffy * fy)),
                //   this.parent.level.tileSize.x * fx,
                //   this.parent.level.tileSize.y * fy
                // );
                // context.restore();
              }
            }
          }
          for (let e of (this.parent.level?.enemies || [])) {
            this.drawEntity(e);
          }
          for (let f of (this.parent.level?.friendly || [])) {
            this.drawEntity(f);
          }
          if (this.parent.level?.player) {
            this.drawEntity({ type: 'player', x: this.parent.level.player.x, y: this.parent.level.player.y});
          }
          if (this.parent.hoverTile && this.parent.hoverTile.entity) {
            this.drawHoverTile(this.parent.hoverTile);
          }
        }
      },
      drawEntity: function(obj) {
        context.save();
        const dmap = this.parent.entityMap[obj.type];
        const fx = this.parent.camera.zoom;
        const fy = this.parent.camera.zoom;
        const poffx = (obj.x - this.parent.camera.pos.x) - dmap.width/2.;
        const poffy = (obj.y - this.parent.camera.pos.y) - dmap.height;
        
        // Move the origin to the center of where you want to draw the image
        context.translate(
          Math.floor(poffx * fx) + (dmap.width * fx) / 2,
          Math.floor(poffy * fy) + (dmap.height * fy) / 2
        );

        context.drawImage(
          this.parent.spritesheets[dmap.tileCoords?.sheetIdx || 'raw'],
          dmap.tileCoords.topleft.x,
          dmap.tileCoords.topleft.y,
          dmap.tileCoords.width,
          dmap.tileCoords.height,
          -(dmap.width * fx) / 2,  // dx (negative half width)
          -(dmap.height * fy) / 2, // dy (negative half height)
          dmap.width * fx,
          dmap.height * fy
        );
        context.restore();
      },
      drawWorldLayer: function(layer) {
        context.save();
        const fx = this.parent.camera.zoom;
        const fy = this.parent.camera.zoom;
        const startRow = layer?.startRow || 0;
        // Minimize what tiles are drawn; todo - precalculate this.
        const camtx = Math.floor(this.parent.camera.pos.x / this.parent.level.tileSize.x);
        const camty = Math.floor(this.parent.camera.pos.y / this.parent.level.tileSize.y);
        const camcx = Math.floor(this.parent.camera.size.x / this.parent.level.tileSize.x);
        const camcy = Math.floor(this.parent.camera.size.y / this.parent.level.tileSize.y);
        // const minx = camtx - camcx/2 + 1;
        // const miny = camty - camcy/2 + 1;
        const minx = 0;
        const miny = 0;
        const maxx = this.parent.level.size.x;
        const maxy = this.parent.level.size.y;
        // const maxx = camtx + camcx/2 + 1;
        // const maxy = camty + camcy/2 + 1;
        // End minimize what tiles are drawn
        for (let y = Math.max(miny, startRow); y < Math.min(maxy, this.parent.level.size.y); y++) {
          // context.save();
          for (let x = Math.max(minx, 0); x < Math.min(maxx, this.parent.level.size.x); x++) {
            const coord = this.parent.level.tileCoords[wrapi(layer.tiles[x + (y - startRow) * this.parent.level.size.x], 0, this.parent.level.tileCoords.length)];
            const coffx = -this.parent.camera.pos.x;
            const coffy = -this.parent.camera.pos.y;
            context.drawImage(
              this.parent.spritesheets[coord?.sheetIdx || 'raw'],
              coord.topleft.x,
              coord.topleft.y,
              coord.width,
              coord.height,
              ((this.parent.level.tileSize.x * x * fx) + Math.floor(coffx * fx)),
              ((this.parent.level.tileSize.y * y * fy) + Math.floor(coffy * fy)),
              // 0,0,
              this.parent.level.tileSize.x * fx,
              this.parent.level.tileSize.y * fy
            );
          }
        }
        context.restore();
      },
    });
  }
  _getMouseWorldCell(evt) {
    const rect = this.canvas.getBoundingClientRect();
    let ratiox = this.canvas.width / rect.width;
    let ratioy = this.canvas.height / rect.height;
    let mlocalx = (evt.clientX - rect.left) * ratiox;
    let mlocaly = (evt.clientY - rect.top ) * ratioy;

    let worldx = mlocalx + this.camera.pos.x;
    let worldy = mlocaly + this.camera.pos.y;

    let cell = {
      x: Math.floor(worldx / this.level.tileSize.x),
      y: Math.floor(worldy / this.level.tileSize.y),
    };
    // console.log(evt.clientX, evt.clientY, cell, mlocalx, mlocaly, worldx, worldy);
    return cell;
  }
  mouseDown(evt) {
    this.isMouseDrag = true;
    this.lastMousePos = {x: evt.offsetX, y: evt.offsetY};
    this.mouseDownTime = this.runTime;
  }
  mouseUp(evt) {
    this.isMouseDrag = false;
    if (this.level && (this.runTime - this.mouseDownTime) < 0.25) {
      if (this.selectedLayerIdx != null && this.selectedCoordIdx != null) {
        let cell = this._getMouseWorldCell(evt);
        let layer = this.level.layers[this.selectedLayerIdx];
        if (cell.y < (layer?.startRow || 0)) {
          // Add cells to this new row.
          let missingRowCount = layer.startRow - cell.y;
          while(missingRowCount-- > 0) {
            let missingColumnCount = this.level.size.x;
            while(missingColumnCount-- > 0) {
              layer.tiles.unshift(0);
            }
          }
          layer.startRow = cell.y;
        }
        layer.tiles[cell.x + (cell.y - (layer?.startRow || 0)) * this.level.size.x] = this.selectedCoordIdx;
      } else if (this.selectedEntityIdx != null) {
        let cell = this._getMouseWorldCell(evt);
        let dmap = this.entityMap[this.selectedEntityIdx];
        let obj = {
          type: this.selectedEntityIdx,
          x: cell.x * this.level.tileSize.x + 8,
          y: (cell.y + 1) * this.level.tileSize.y,
        };
        if (dmap.type == 'enemy') {
          this.level.enemies = this.level?.enemies || [];
          this.level.enemies.push(obj);
        } else if (dmap.type == 'friendly') {
          this.level.friendly = this.level?.friendly || [];
          this.level.friendly.push(obj);
        } else if (dmap.type == 'player') {
          this.level.player = obj;
        }
      }
    }
  }
  mouseMove(evt) {
    if (this.isMouseDrag) {
      // var dirx = evt.offsetX/this.camera.zoom - this.camera.pos.x;
      // var diry = evt.offsetY/this.camera.zoom - this.camera.pos.y;

      this.camera.pos.x += (this.lastMousePos.x - evt.offsetX) / this.camera.zoom;
      this.camera.pos.y += (this.lastMousePos.y - evt.offsetY) / this.camera.zoom;

      this.lastMousePos = {x: evt.offsetX, y: evt.offsetY};
    }

    if (this.selectedLayerIdx != null && (this.selectedCoordIdx != null || this.selectedEntityIdx != null)) {
      let cell = this._getMouseWorldCell(evt);
      this.hoverTile = {
        x: cell.x,
        y: cell.y,
        layer: this.selectedLayerIdx,
        coord: this.selectedCoordIdx,
        entity: this.selectedEntityIdx,
      };
    } else {
      this.hoverTile = null;
    }
  }

  clearTileCoordSelection() {
    if (this.coordDiv) {
      this.selectedCoordIdx = null;
      let allTcs = this.coordDiv.querySelectorAll('a');
      for (let a of allTcs) {
        a.className = 'unselected';
      }
    }
  }
  clearEntitySelection() {
    if (this.entityDiv) {
      this.selectedEntityIdx = null;
      let alles = this.entityDiv.querySelectorAll('div');
      for (let e of alles) {
        e.className = 'unselected';
      }
    }
  }
  addLayerDiv(layer) {
    let lidx = 0;
    for (let i = 0; i < this.level.layers.length; i++) {
      if (this.level.layers[i] == layer) {
        lidx = i;
        break;
      }
    }

    let cbid = 'layer-cb-' + lidx;

    let groundcb = document.createElement('input');
    groundcb.type = 'checkbox';
    groundcb.checked = (lidx == this.level.groundLayerIdx);
    groundcb.name = 'g?';
    groundcb.addEventListener('change', (function(evt) {
      if (evt.target.checked) {
        this.level.groundLayerIdx = lidx;
        let checkboxes = this.layerDiv.querySelectorAll('input[name="g?"]');
        for (let cb of checkboxes) {
          if (cb == evt.target) continue;
          cb.checked = false;
        }
      } else {
        // Ensure some ground layer is checked.
        let checkboxes = this.layerDiv.querySelectorAll('input[name="g?"]');
        let found = false;
        for (let cb of checkboxes) {
          if (cb == evt.target) continue;
          if (cb.checked) {
            // something is checked as the ground layer
            found = true;
          }
        }
        if (!found) {
          evt.target.checked = true;
        }
      }
    }).bind(this));
    let glabel = document.createElement('label');
    glabel.appendChild(document.createTextNode('g?'));
    glabel.appendChild(groundcb);

    let cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.name = cbid;
    this.showLayer[lidx] = cb;
    let label = document.createElement('label');
    label.appendChild(document.createTextNode(cbid));
    label.appendChild(cb);

    let selector = document.createElement('div');
    selector.className = 'layer-selector';
    selector.addEventListener('click', (function (idx){
      for (let c of this.layerDiv.querySelectorAll('div.layer-selected, div.layer-unselected')) {
        c.className = 'layer-unselected';
      }
      ld.className = 'layer-selected';
      this.selectedLayerIdx = idx;
    }).bind(this, lidx));

    let ld = document.createElement('div');

    let upBtn = document.createElement('input');
    upBtn.type = 'button';
    upBtn.name = '^';
    upBtn.value = '^';
    upBtn.addEventListener('click', (function(elem){
      const idx = Array.from(editor.layerDiv.children).indexOf(elem);
      if (idx != 0) {
        let tmp = this.level.layers[idx];
        this.level.layers[idx] = this.level.layers[idx-1];
        this.level.layers[idx-1] = tmp;
        tmp = this.showLayer[idx]; 
        this.showLayer[idx] = this.showLayer[idx-1];
        this.showLayer[idx-1] = tmp;

        let children = Array.from(this.layerDiv.children);
        tmp = children[idx];
        children[idx] = children[idx-1];
        children[idx-1] = tmp;
        this.layerDiv.innerHTML = '';
        children.forEach(c => this.layerDiv.appendChild(c));
        if (this.selectedLayerIdx == idx) {
          this.selectedLayerIdx = idx - 1;
        } else if (this.selectedLayerIdx == idx - 1) {
          this.selectedLayerIdx = idx;
        }
      }
    }).bind(this, ld));

    
    ld.className = 'layer-unselected';
    // ld.name = "layer";
    ld.appendChild(glabel);
    ld.appendChild(label);
    ld.appendChild(upBtn);
    ld.appendChild(selector);
    // ld.appendChild(cb);
    // ld.innerHTML = 'layer';
    this.layerDiv.appendChild(ld);
  }
  setLevel(lvljson) {
    this.loop.stop();
    this.level = lvljson;

    // Setup Layer manipulation
    {
      if (this.layerDiv && this.level) {
        this.layerDiv.innerHTML = '';

        this.selectedLayerIdx = null;
        this.showLayer = [];
        // let lidx = 0;
        for (let layer of this.level.layers) {
          this.addLayerDiv(layer);
          // lidx++;
        }
      }
    }

    // Setup Tile Coords
    {
      if (this.coordDiv && this.level) {
        this.coordDiv.innerHTML = '';
        this.selectedCoordIdx = null;

        let tcIdx = 0;
        for (let tc of this.level.tileCoords) {
          const TILE_SCALE = 4;
          let tileCanvas = document.createElement('canvas');
          tileCanvas.className = 'tile-canvas';
          tileCanvas.width = this.level.tileSize.x * TILE_SCALE;
          tileCanvas.height = this.level.tileSize.y * TILE_SCALE;

          let tcdiv = document.createElement('div');
          tcdiv.appendChild(tileCanvas);
          let tcspan = document.createElement('span');
          tcspan.appendChild(document.createTextNode(JSON.stringify(tc)));
          tcdiv.appendChild(tcspan);

          let tclink = document.createElement('a');
          tclink.className = 'unselected';
          tclink.appendChild(tcdiv);
          tclink.addEventListener('click', (function(idx) {
            this.clearEntitySelection();
            this.clearTileCoordSelection();
            this.selectedCoordIdx = idx;
            tclink.className = 'selected';
          }).bind(this, tcIdx));
          
          this.coordDiv.appendChild(tclink);
          let tileContext = tileCanvas.getContext('2d');
          tileContext.imageSmoothingEnabled = false;

          tileContext.save();
          tileContext.globalCompositeOperation = 'source-over';//'destination-under';
          tileContext.fillStyle = '#000000FF';
          tileContext.fillRect(0, 0, tileCanvas.width, tileCanvas.height);
          tileContext.restore();
          tileContext.drawImage(
            this.spritesheets[tc?.sheetIdx || 'raw'],
            tc.topleft.x,
            tc.topleft.y,
            tc.width,
            tc.height,
            // (this.level.tileSize.x * x * this.camera.zoom),
            // (this.level.tileSize.y * y * this.camera.zoom),
            0,0,
            this.level.tileSize.x * TILE_SCALE,
            this.level.tileSize.y * TILE_SCALE
          );

          tcIdx++;
        }
      }
    }

    // Setup Entities
    {
      if (this.entityDiv && this.level) {
        this.entityDiv.innerHTML = '';
        this.selectedEntityIdx = null;
        for (let ename in this.entityMap) {
          let entityObj = this.entityMap[ename];
          const TILE_SCALE = 4;
          let entityCanvas = document.createElement('canvas');
          entityCanvas.className = 'tile-canvas';
          entityCanvas.width = entityObj.width * TILE_SCALE;
          entityCanvas.height = entityObj.height * TILE_SCALE;

          let ediv = document.createElement('div');
          ediv.className = 'unselected';
          ediv.appendChild(entityCanvas);
          let espan = document.createElement('span');
          espan.appendChild(document.createTextNode(ename));
          ediv.appendChild(espan);
          ediv.addEventListener('click', (function (idx) {
            this.clearTileCoordSelection();
            this.clearEntitySelection();
            this.selectedEntityIdx = idx;
            ediv.className = 'selected';
          }).bind(this, ename));

          this.entityDiv.appendChild(ediv);

          let entityContext = entityCanvas.getContext('2d');
          entityContext.imageSmoothingEnabled = false;

          entityContext.save();
          entityContext.globalCompositeOperation = 'source-over';//'destination-under';
          entityContext.fillStyle = '#000000FF';
          entityContext.fillRect(0, 0, entityCanvas.width, entityCanvas.height);
          entityContext.restore();
          entityContext.drawImage(
            this.spritesheets[entityObj.tileCoords?.sheetIdx || 'raw'],
            entityObj.tileCoords.topleft.x,
            entityObj.tileCoords.topleft.y,
            entityObj.tileCoords.width,
            entityObj.tileCoords.height,
            // (this.level.tileSize.x * x * this.camera.zoom),
            // (this.level.tileSize.y * y * this.camera.zoom),
            0,0,
            entityObj.width * TILE_SCALE,
            entityObj.height * TILE_SCALE
          );
        }
      }
    }

    this.loop.start();
  }
  getU16(num) {
    return [
      (num >> 8) & 0xFF,
      (num & 0xFF),
    ];
  }
  updateLayerBounds(json) {
    for (let l of json.layers) {
      let startRow = l?.startRow || 0;
      let endRow = -1;
      let startCol = -1;
      let endCol = -1;
      for (let idx = 0; idx < l.tiles.length; idx++) {
        let y = startRow + Math.floor(idx / json.size.x);
        let x = idx - (y - startRow) * json.size.x;
        let t = l.tiles[idx];
        if (t !== 0 && (startCol === -1 || x < startCol)) {
          startCol = x;
        }
        if (t !== 0 && (endCol === -1 || x > endCol)) {
          endCol = x;
        }
        if (t!== 0 && (endRow === -1 || y > endRow)) {
          endRow = y;
        }
      }

      l.endRow = (endRow !== -1) ? endRow : json.size.y;
      l.startCol = (startCol !== -1) ? startCol : 0;
      l.endCol = (endCol !== -1) ? endCol : json.size.x;
    }
  }
  consolidateTilemap(json) {
    let usedCoords = {};
    for (let l of json.layers) {
      for (let t of l.tiles) {
        usedCoords[t] = json.tileCoords[t];
      }
    }

    json.tileCoords = Object.values(usedCoords);
    let indexMap = {};
    for (let k of Object.keys(usedCoords)) {
      let v = usedCoords[k];
      indexMap[k] = json.tileCoords.indexOf(v);
    }

    for (let l of json.layers) {
      l.tiles = l.tiles.map( (t) => {
        return indexMap[t];
      });
    }

    console.log('Used coord count: ', json.tileCoords.length);
  }
  getLayerType0Size(layer, width, height) {
    let startRow = layer?.startRow || 0;
    let endRow = layer?.endRow || (height - 1);
    return [2 + (endRow + 1 - startRow) * width];
    // return Infinity;
  }
  getLayerType1Size(layer, width) {
    // First histogram the layer tiles to see which is used the most.
    let histogram = {};
    for (let t of layer.tiles) {
      histogram[t] = (histogram[t]) ? histogram[t] + 1 : 1;
    }
    let mostUsedTile = -1;
    let mostUsedCount = -1;
    for (let k of Object.keys(histogram)) {
      if (histogram[k] > mostUsedCount) {
        mostUsedTile = k;
        mostUsedCount = histogram[k];
      }
    }
    // Now count all tiles other than the most used.
    let otherTileCount = Object.keys(histogram).reduce( (accum, k) => {
      return (k === mostUsedTile) ? accum : accum + histogram[k];
    }, 0);

    // start/end row + fill tile + count of difference tiles
    // 3 bytes of data per difference
    return [5 + (3 * otherTileCount), mostUsedTile, otherTileCount, histogram];
  }
  getLayerType2Size(layer, width) {
    // First histogram the layer tiles to see which is used the most.
    let histogram = {};
    for (let t of layer.tiles) {
      histogram[t] = (histogram[t]) ? histogram[t] + 1 : 1;
    }
    let mostUsedTile = -1;
    let mostUsedCount = -1;
    for (let k of Object.keys(histogram)) {
      if (histogram[k] > mostUsedCount) {
        mostUsedTile = k;
        mostUsedCount = histogram[k];
      }
    }

    // Now count all tiles other than the most used.
    let otherTileCount = Object.keys(histogram).reduce( (accum, k) => {
      return (k === mostUsedTile) ? accum : accum + histogram[k];
    }, 0);

    // start/end row + fill tile + count of other tiles
    // tile index + count of positions
    // 2 bytes per position
    return [4 + 3 * (Object.keys(histogram) - 1) + otherTileCount * 2, mostUsedTile, otherTileCount, histogram];
  }
  getLayerType3Size(layer, width) {
    // First histogram the layer tiles to see which is used the most.
    let histogram = {};
    let ycounts = {};
    let idx = 0;
    let startRow = layer?.startRow || 0;
    for (let t of layer.tiles) {
      histogram[t] = (histogram[t]) ? histogram[t] + 1 : 1;
      let y = startRow + Math.floor(idx / width);
      let x = idx - (y - startRow) * width;
      idx++;
      ycounts[t] = (ycounts[t]) ? ycounts[t] : {};
      ycounts[t][y] = (ycounts[t][y]) ? ycounts[t][y] : [];// + 1 : 1;
      ycounts[t][y].push(x);
    }
    let mostUsedTile = -1;
    let mostUsedCount = -1;
    for (let k of Object.keys(histogram)) {
      if (histogram[k] > mostUsedCount) {
        mostUsedTile = k;
        mostUsedCount = histogram[k];
      }
    }

    delete ycounts[mostUsedTile]; // exclude it from the counts

    // start/end row + fill tile + count of other tiles
    // tile index + count of y positions
    // y position + count of x positions
    // x position
    let tilebytes = Object.keys(ycounts).reduce( (accum, t) => {
      let ybytes = Object.keys(ycounts[t]).reduce( (accum, y) => {
        return accum + 1 + 1 + ycounts[t][y].length;
      }, 0);
      return accum + 1 + 1 + ybytes;
    }, 0);
    

    return [4 + tilebytes, mostUsedTile, ycounts, histogram];
  }
  determineLayerType(layer, width, height) {
    // calculate the size of a packed layer with the different layer types
    // and pick the smallest one.
    let type0Data = this.getLayerType0Size(layer, width, height);
    let type1Data = this.getLayerType1Size(layer, width);
    let type2Data = this.getLayerType2Size(layer, width);
    let type3Data = this.getLayerType3Size(layer, width);
    
    type1Data[0] = Infinity;
    type2Data[0] = Infinity;
    type3Data[0] = Infinity;
    // let type0Size = type0Data[0];
    // let type1Size = type1Data[0];
    // let type2Size = type2Data[0];
    // let type3Size = type3Data[0];

    return [
      [1, ...type1Data], [2, ...type2Data], [3, ...type3Data]
    ].reduce( (accum, td) => {
      return (accum[1] < td[1]) ? accum : td
    }, [0, ...type0Data]);

    // return (type0Size < type1Size) ? (
    //     (type0Size < type2Size) ? [0] : [2, ...type2Data]
    //   ) : (type1Size < type2Size) ? [1, ...type1Data] : [2, ...type2Data];
  }
  packBin(json) {
    json = deepClone(json); // don't mess up the json to be saved.
    this.updateLayerBounds(json);
    this.consolidateTilemap(json);
    let data = [];
    // frictionGround: 1 signed byte
    // gravity: x,y - 2 bytes
    // size: x,y - 2 bytes
    // tileSize: x,y - 2 bytes
    // groundLayerIdx: 1 byte
    data.push(json.frictionGround);
    data.push(json.gravity.x);
    data.push(json.gravity.y);
    data.push(json.size.x);
    data.push(json.size.y);
    data.push(json.tileSize.x);
    data.push(json.tileSize.y);
    data.push(json.groundLayerIdx);

    // tileCoords count - 1 byte
    // tileCoord: x, y, width, height, solid?, destroyable, level index, sheet index
    // solid: 0 = false, 1 = true
    // destroyable: 255 = undefined
    // level index: 255 = undefined
    // sheet index: 'raw' = 0, 'tiles' = 1, 'player' = 2, 'unicorn' = 3
    // damage - 1 byte
    // total bytes per tileCoord: 9
    data.push(json.tileCoords.length || 0);
    const sheetIndexMap = {
      'raw': 0,
      'tiles': 1,
      'player': 2,
      'unicorn': 3,
    };
    for (let c of json.tileCoords) {
      data.push(c.topleft.x);
      data.push(c.topleft.y);
      data.push(c.width);
      data.push(c.height);
      let packedData = c?.solid ? 1 : 0;
      // data.push(c?.solid ? 1 : 0);
      packedData = (packedData << 2) | ((c?.destroyable == undefined) ? 3 : c.destroyable);
      // data.push((c?.destroyable == undefined) ? 255 : c.destroyable);
      packedData = (packedData << 3) | ((c?.levelIdx == undefined) ? 7 : c.levelIdx);
      // data.push((c?.levelIdx == undefined) ? 255 : c.levelIdx);
      packedData = (packedData << 2) | (sheetIndexMap[c?.sheetIdx] || 0);
      // data.push(sheetIndexMap[c?.sheetIdx] || 0);
      data.push(packedData);
      data.push((c?.damage == undefined) ? 0 : c.damage);
    }

    // layers count: 1 byte
    // layer: startRow, endRow, startCol, endCol, tiles
    // layer startRow: 1 byte
    // layer endRow: 1 byte
    // layer startCol: 1 byte DEPRECATED
    // layer endCol: 1 byte DEPRECATED
    // layer tiles: 1 byte * size.x * (endRow - startRow)
    data.push(json.layers.length);
    for (let l of json.layers) {
      let layerData = this.determineLayerType(l, json.size.x, json.size.y);
      let layerType = layerData[0];
      console.log('selected layer type: ', layerType);
      data.push(layerType);
      if (layerType === 0) {
        let startRow = l?.startRow || 0;
        let endRow = l?.endRow || (json.size.y - 1);
        // let startCol = l?.startCol || 0;
        // let endCol = l?.endCol || (json.size.x - 1);
        data.push(startRow);
        data.push(endRow);
        // data.push(startCol);
        // data.push(endCol);
        let debugTileCount = 0;
        for (let idx = 0; idx < l.tiles.length; idx++) {
          let y = startRow + Math.floor(idx / json.size.x);
          // let x = idx - (y - startRow) * json.size.x;
          if (y > endRow) {continue;}
          // if (x < startCol || x > endCol || y > endRow) {continue;}
          let t = l.tiles[idx];
          data.push(t);
          debugTileCount++;
        }
        console.log('layer tile count: ', debugTileCount, 
          'startR: ', startRow,
          'endR: ', endRow,
          // 'startC: ', startCol,
          // 'endC: ', endCol
          );
      } else if (layerType === 1) {
        let fillTile = layerData[2];
        let diffCount = layerData[3];
        let histogram = layerData[4];

        let startRow = l?.startRow || 0;
        let endRow = l?.endRow || (json.size.y - 1);
        data.push(startRow);
        data.push(endRow);
        data.push(fillTile);
        data.push(...this.getU16(diffCount));

        let differences = [];
        for (let idx = 0; idx < l.tiles.length; idx++) {
          let y = startRow + Math.floor(idx / json.size.x);
          let x = idx - (y - startRow) * json.size.x;
          let t = l.tiles[idx];
          if (t != fillTile) {
            differences.push({tile: t, x: x, y: y});
            // data.push(t);
            // data.push(x);
            // data.push(y);
          }
        }

        // sorts differences for hopefully better compressability
        differences.sort( (a,b) => {
          return (a.x !== b.x) ? a.x - b.x : a.y - b.y;
        });

        for (let d of differences) {
          data.push(d.tile);
          data.push(d.x);
          data.push(d.y);
        }
      } else if (layerType === 2) {
        let fillTile = layerData[2];
        //let diffCount = layerData[3];
        let histogram = layerData[4];

        let startRow = l?.startRow || 0;
        let endRow = l?.endRow || (json.size.y - 1);
        data.push(startRow);
        data.push(endRow);
        data.push(fillTile);

        let tileDiffs = {};
        for (let idx = 0; idx < l.tiles.length; idx++) {
          let y = startRow + Math.floor(idx / json.size.x);
          let x = idx - (y - startRow) * json.size.x;
          let t = l.tiles[idx];
          if (t != fillTile) {
            tileDiffs[t] = (tileDiffs[t]) ? tileDiffs[t] : [];
            tileDiffs[t].push({x: x, y: y});
            // data.push(t);
            // data.push(x);
            // data.push(y);
          }
        }
        data.push(Object.keys(tileDiffs).length);
        for (let k of Object.keys(tileDiffs)) {
          tileDiffs[k].sort( (a,b) => {
            return (a.x !== b.x) ? a.x - b.x : a.y - b.y;
          });
          data.push(k);
          data.push(...this.getU16(tileDiffs[k].length));
          for (let p of tileDiffs[k]) {
            data.push(p.x);
            data.push(p.y);
          }
        }
      } else if (layerType === 3) {
        let fillTile = layerData[2];
        let ycounts = layerData[3];

        let startRow = l?.startRow || 0;
        let endRow = l?.endRow || (json.size.y - 1);
        data.push(startRow);
        data.push(endRow);
        data.push(fillTile);

        data.push(Object.keys(ycounts).length);
        for (let tk of Object.keys(ycounts)) {
          let ypos = ycounts[tk];
          data.push(tk);
          data.push(Object.keys(ypos).length);
          for (let yk of Object.keys(ypos)) {
            let xarr = ypos[yk];
            data.push(yk);
            data.push(xarr.length);
            for (let x of xarr) {
              data.push(x);
            }
          }
        }
      }
    }

    // enemies count: 1 byte
    // enemy: type, x, y - 2 bytes each
    // enemy type: 'blarb' = 0
    // total bytes per enemy: 5
    const enemyTypeMap = {
      'blarb': 0,
      'blurb': 1,
      'bleald': 2,
      'bprime': 3,
    };
    data.push(json?.enemies?.length || 0);
    let elist = json?.enemies || [];
    for (let e of elist) {
      data.push(enemyTypeMap[e.type] || 0);
      data.push(...this.getU16(e.x));
      data.push(...this.getU16(e.y));
    }

    // friendly count: 1 byte
    // friendly: type, x, y - 2 bytes each
    // friendly type: 'unicorn' = 0, 'ship' = 1
    // total bytes per friendly: 5
    const friendlyTypeMap = {
      'unicorn': 0,
      'ship': 1,
      'missle': 2,
      'boot': 3,
      'cmeter': 4,
      'unicornSpawner': 5,
    };
    data.push(json?.friendly?.length || 0);
    let flist = json?.friendly || [];
    for (let f of flist) {
      data.push(friendlyTypeMap[f.type] || 0);
      data.push(...this.getU16(f.x));
      data.push(...this.getU16(f.y));
    }

    // player count: 1 byte
    // player: x, y - 2 bytes each
    data.push(json?.player ? 1 : 0);
    if (json?.player) {
      data.push(...this.getU16(json.player.x));
      data.push(...this.getU16(json.player.y));
    }

    return new Uint8Array(data);
  }
}