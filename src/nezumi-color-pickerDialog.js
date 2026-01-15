// ColorPickerDialog.js
// ColorPicker.js を呼び出してカラーピッカーUIを表示するダイアログを作成

// 使い方: showColorPickerDialog({
//   color: '#ff0000',
//   alpha: 1.0,
//   onChange: ({h, s, l, a, hex, rgba}) => {...},
//   onClose: () => {...}
// })

async function showColorPickerDialog({color = '#ff0000', alpha = 1.0, onChange, onClose, onOk} = {}) {
    if (document.getElementById('color-picker-dialog')) return;
    const dlg = document.createElement('div');
    dlg.id = 'color-picker-dialog';
    dlg.style.position = 'fixed';
    dlg.style.left = '0';
    dlg.style.top = '0';
    dlg.style.width = '100vw';
    dlg.style.height = '100vh';
    dlg.style.background = 'rgba(0,0,0,0.25)';
    dlg.style.display = 'flex';
    dlg.style.alignItems = 'center';
    dlg.style.justifyContent = 'center';
    dlg.style.zIndex = '999999';

        dlg.innerHTML = `
            <div style="background:var(--surface);padding:18px 24px;border-radius:10px;min-width:350px;text-align:center;box-shadow:0 2px 16px #0003;">
                <h3 style="margin:0 0 8px 0;">色を選択</h3>
                <canvas id="colorPickerCanvas" width="360" height="320" style="display:block;margin:0 auto 8px auto;border-radius:8px;"></canvas>
                <div id="colorPickerInfo" style="margin-bottom:8px;font-size:14px;"></div>
                <input id="colorPickerHex" type="text" maxlength="9" style="width:110px;margin-bottom:8px;" placeholder="#RRGGBB">
                <div style="display:flex;gap:8px;justify-content:center;margin-top:8px;">
                    <button id="colorPickerOkBtn">OK</button>
                    <button id="colorPickerCancelBtn">キャンセル</button>
                </div>
            </div>
        `;
    document.body.appendChild(dlg);

    // ColorPicker.js クラスを使う
    const canvas = dlg.querySelector('#colorPickerCanvas');
    const info = dlg.querySelector('#colorPickerInfo');
    // Ensure ColorPicker is available (module import)
    const { default: ColorPicker } = await import('./nezumi-color-picker.js');
    const picker = new ColorPicker(canvas, info);
    // 初期値セット
    if (color && /^#([0-9a-f]{6})$/i.test(color)) {
        // HEX→HSL変換
        const r = parseInt(color.substr(1,2),16);
        const g = parseInt(color.substr(3,2),16);
        const b = parseInt(color.substr(5,2),16);
        const hsl = rgbToHsl(r,g,b);
        picker.hue = hsl[0];
        picker.sat = hsl[1];
        picker.light = hsl[2];
        picker.alpha = alpha;
        picker.drawIndicators();
    }
    const hexInput = dlg.querySelector('#colorPickerHex');
    function updateInfo() {
        const hsla = picker.getColorHSLA();
        const rgba = picker.getColorRGBA();
        const hex = rgbToHex(rgba[0],rgba[1],rgba[2]);
        info.innerHTML = `HEX: <b>${hex}</b>　RGBA: <b>rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3].toFixed(2)})</b>`;
        hexInput.value = hex;
        if (onChange) onChange({h:picker.hue, s:picker.sat, l:picker.light, a:picker.alpha, hex, rgba});
    }
    canvas.addEventListener('mouseup', updateInfo);
    canvas.addEventListener('touchend', updateInfo);
    hexInput.addEventListener('change', function() {
        const val = hexInput.value.trim();
        if (/^#([0-9a-fA-F]{6})$/.test(val)) {
            const r = parseInt(val.substr(1,2),16);
            const g = parseInt(val.substr(3,2),16);
            const b = parseInt(val.substr(5,2),16);
            const hsl = rgbToHsl(r,g,b);
            picker.hue = hsl[0];
            picker.sat = hsl[1];
            picker.light = hsl[2];
            picker.drawIndicators();
            updateInfo();
        }
    });
    updateInfo();
    dlg.querySelector('#colorPickerOkBtn').onclick = () => {
        // 現在の色情報を取得
        const hsla = picker.getColorHSLA();
        const rgba = picker.getColorRGBA();
        const hex = rgbToHex(rgba[0],rgba[1],rgba[2]);
        if (onOk) onOk({h:picker.hue, s:picker.sat, l:picker.light, a:picker.alpha, hex, rgba});
        updateInfo();
        dlg.remove();
        if (onClose) onClose(true);
    };
    dlg.querySelector('#colorPickerCancelBtn').onclick = () => {
        dlg.remove();
        if (onClose) onClose(false);
    };
    dlg.addEventListener('click', (ev) => { if (ev.target === dlg) { dlg.remove(); if (onClose) onClose(false); } });
}

// RGB→HSL
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h *= 60;
    }
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}
// RGB→HEX
function rgbToHex(r,g,b) {
    return '#' + [r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}

export { showColorPickerDialog };

