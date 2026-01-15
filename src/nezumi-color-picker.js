class ColorPicker {
  constructor(canvas, infoElem) {
    this.canvas = canvas;
    // willReadFrequently で読み書き負荷を軽減
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    this.infoElem = infoElem;

    this.width = canvas.width;
    this.height = canvas.height;
    this.centerX = this.width/2 - 25; // 少し右寄せ
    this.centerY = this.height/2;
    this.radius = 150;
    this.ringThickness = 20;
    this.holeRadius = 30;

    this.hue = 0;
    this.sat = 50;
    this.light = 50;
    this.alpha = 1.0;

    this.draggingHue = false;
    this.draggingSL = false;
    this.draggingAlpha = false;

    this.squareSize = 200;
    this.squareStartX = this.centerX - this.squareSize/2;
    this.squareStartY = this.centerY - this.squareSize/2;

    this.alphaWidth = 20;
    this.alphaHeight = this.squareSize;
    this.alphaX = this.squareStartX + this.squareSize + 70;
    this.alphaY = this.squareStartY;

    // 高負荷な再描画をまとめるためのバッファ
    this.pendingMove = null;
    this.rafScheduled = false;

    // 背景用キャンバス
    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = this.width;
    this.bgCanvas.height = this.height;
    this.bgCtx = this.bgCanvas.getContext('2d', { willReadFrequently: true });

    this.bgSLCanvas = document.createElement('canvas');
    this.bgSLCanvas.width = this.squareSize;
    this.bgSLCanvas.height = this.squareSize;
    this.bgSLCtx = this.bgSLCanvas.getContext('2d', { willReadFrequently: true });

    this.drawBackground();
    this.drawSLBackground();
    this.drawIndicators();
    this.addEvents();
  }

  // 色相リング描画
  drawBackground() {
    for(let angle=0; angle<360; angle+=1) {
      const rad = angle * Math.PI / 180;
      const outerX = this.centerX + Math.cos(rad) * (this.radius + this.ringThickness/2);
      const outerY = this.centerY + Math.sin(rad) * (this.radius + this.ringThickness/2);
      this.bgCtx.strokeStyle = `hsl(${angle},100%,50%)`;
      this.bgCtx.lineWidth = this.ringThickness;
      this.bgCtx.beginPath();
      this.bgCtx.moveTo(this.centerX + Math.cos(rad) * (this.radius - this.ringThickness/2),
                        this.centerY + Math.sin(rad) * (this.radius - this.ringThickness/2));
      this.bgCtx.lineTo(outerX, outerY);
      this.bgCtx.stroke();
    }
    this.bgCtx.clearRect(this.centerX-this.holeRadius, this.centerY-this.holeRadius,
                         this.holeRadius*2, this.holeRadius*2);
  }

  // S/L四角背景描画
  drawSLBackground() {
    const imgData = this.bgSLCtx.createImageData(this.squareSize, this.squareSize);
    for(let y=0; y<this.squareSize; y++){
      for(let x=0; x<this.squareSize; x++){
        const s = x / this.squareSize * 100;
        const l = 100 - y / this.squareSize * 100;
        this.bgSLCtx.fillStyle = `hsla(${this.hue},${s}%,${l}%,1)`;
        this.bgSLCtx.fillRect(x, y, 1, 1);
      }
    }
  }

  // 丸印とアルファ描画
  drawIndicators() {
    this.ctx.clearRect(0,0,this.width,this.height);
    this.ctx.drawImage(this.bgCanvas,0,0);
    this.ctx.drawImage(this.bgSLCanvas, this.squareStartX, this.squareStartY);

    // 円周丸印
    const rad = this.hue * Math.PI / 180;
    const hueX = this.centerX + Math.cos(rad) * this.radius;
    const hueY = this.centerY + Math.sin(rad) * this.radius;
    this.ctx.beginPath();
    this.ctx.arc(hueX, hueY, 10, 0, Math.PI*2);
    this.ctx.strokeStyle = "#000";
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    // S/L丸印
    const slX = this.squareStartX + this.sat/100 * this.squareSize;
    const slY = this.squareStartY + (100-this.light)/100 * this.squareSize;
    this.ctx.beginPath();
    this.ctx.arc(slX, slY, 8, 0, Math.PI*2);
    this.ctx.strokeStyle = "#000";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Alphaスライダー
    const alphaTop = this.alphaY + (1-this.alpha) * this.alphaHeight;
    this.ctx.fillStyle = `rgba(0,0,0,0.2)`;
    this.ctx.fillRect(this.alphaX, this.alphaY, this.alphaWidth, this.alphaHeight);
    this.ctx.fillStyle = `rgba(0,0,0,1)`;
    this.ctx.fillRect(this.alphaX, alphaTop-4, this.alphaWidth, 8); // 丸印代わり

    if(this.infoElem){
      this.infoElem.textContent = `H: ${Math.round(this.hue)}°, S: ${Math.round(this.sat)}%, L: ${Math.round(this.light)}%, A: ${this.alpha.toFixed(2)}`;
    }
  }

  // マウス・タッチイベント登録
  addEvents() {
    const start = (e) => this.onPointerDown(e);
    const move  = (e) => this.onPointerMove(e);
    const end   = () => this.onPointerUp();

    this.canvas.addEventListener('mousedown', start);
    this.canvas.addEventListener('mousemove', move);
    this.canvas.addEventListener('mouseup', end);
    this.canvas.addEventListener('mouseleave', end);

    this.canvas.addEventListener('touchstart', start, {passive:false});
    this.canvas.addEventListener('touchmove', move, {passive:false});
    this.canvas.addEventListener('touchend', end);
    this.canvas.addEventListener('touchcancel', end);
  }

  onPointerDown(e){
    e.preventDefault();
    const {x, y} = this.getPointerPos(e);
    this.checkDragStart(x, y);
  }

  onPointerMove(e){
    if(!this.draggingHue && !this.draggingSL && !this.draggingAlpha) return;
    e.preventDefault();
    const {x, y} = this.getPointerPos(e);
    // 頻繁なマウス移動を requestAnimationFrame でまとめる
    this.pendingMove = {x, y};
    if(!this.rafScheduled){
      this.rafScheduled = true;
      requestAnimationFrame(() => this.flushMove());
    }
  }

  flushMove(){
    if(!this.pendingMove){
      this.rafScheduled = false;
      return;
    }
    const {x, y} = this.pendingMove;
    this.pendingMove = null;

    if(this.draggingHue) this.updateHue(x, y);
    if(this.draggingSL) this.updateSL(x, y);
    if(this.draggingAlpha) this.updateAlpha(y);

    this.rafScheduled = false;
    // 連続入力が続く場合に備え、再度キューを処理
    if(this.pendingMove){
      this.rafScheduled = true;
      requestAnimationFrame(() => this.flushMove());
    }
  }

  onPointerUp(){
    this.draggingHue = false;
    this.draggingSL = false;
    this.draggingAlpha = false;
  }

  getPointerPos(e){
    let clientX, clientY;
    if(e.touches && e.touches.length){
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const rect = this.canvas.getBoundingClientRect();
    return {x: clientX - rect.left, y: clientY - rect.top};
  }

  checkDragStart(x, y){
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if(dist >= this.radius - this.ringThickness/2 && dist <= this.radius + this.ringThickness/2){
      this.draggingHue = true;
      this.updateHue(x, y);
      return;
    }
    if(x >= this.squareStartX && x <= this.squareStartX+this.squareSize &&
       y >= this.squareStartY && y <= this.squareStartY+this.squareSize){
      this.draggingSL = true;
      this.updateSL(x, y);
      return;
    }
    if(x >= this.alphaX && x <= this.alphaX+this.alphaWidth &&
       y >= this.alphaY && y <= this.alphaY+this.alphaHeight){
      this.draggingAlpha = true;
      this.updateAlpha(y);
    }
  }

  updateHue(x, y){
    this.hue = Math.atan2(y-this.centerY, x-this.centerX) * 180 / Math.PI;
    if(this.hue < 0) this.hue += 360;
    this.drawIndicators();
    this.drawSLBackground(); // 色相変化でSL背景更新
  }

  updateSL(x, y){
    this.sat = Math.min(100, Math.max(0, (x - this.squareStartX)/this.squareSize*100));
    this.light = Math.min(100, Math.max(0, 100 - (y - this.squareStartY)/this.squareSize*100));
    this.drawIndicators();
  }

  updateAlpha(y){
    this.alpha = Math.min(1, Math.max(0, 1 - (y - this.alphaY)/this.alphaHeight));
    this.drawIndicators();
  }

  getColorHSLA(){
    return `hsla(${this.hue}, ${this.sat}%, ${this.light}%, ${this.alpha})`;
  }

  getColorRGBA(){
    const h = this.hue/360;
    const s = this.sat/100;
    const l = this.light/100;
    let r,g,b;
    if(s===0){
      r=g=b=l;
    } else {
      const q = l<0.5 ? l*(1+s) : l+s-l*s;
      const p = 2*l-q;
      const hue2rgb=(p,q,t)=>{
        if(t<0) t+=1;
        if(t>1) t-=1;
        if(t<1/6) return p+(q-p)*6*t;
        if(t<1/2) return q;
        if(t<2/3) return p+(q-p)*(2/3-t)*6;
        return p;
      };
      r=hue2rgb(p,q,h+1/3);
      g=hue2rgb(p,q,h);
      b=hue2rgb(p,q,h-1/3);
    }
    r=Math.round(r*255);
    g=Math.round(g*255);
    b=Math.round(b*255);
    return [r,g,b,this.alpha];
  }

  getColorRGBAString(){
    const [r,g,b,a] = this.getColorRGBA();
    return `rgba(${r},${g},${b},${a})`;
  }
}

export default ColorPicker;
