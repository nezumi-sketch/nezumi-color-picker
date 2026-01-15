
---

# nezumi-color-picker README

## 概要

`nezumi-color-picker` は、シンプルで軽量な **カラーピッカー UI** をブラウザ上で表示するモジュールです。
ダイアログ形式で表示され、HEX、RGBA、HSLA の色情報を取得・変更できます。
<img width="872" height="1057" alt="image" src="https://github.com/user-attachments/assets/0b5fe959-e54c-46e9-b5e0-42056bb8bb5d" />

---

## ファイル構成

```
src/
├─ nezumi-color-picker.js        # カラーピッカー本体
├─ nezumi-color-pickerDialog.js  # ダイアログ表示用ラッパー
index.html                        # テストページ
```

---

## 使い方

### HTML 側

```html
<input type="button" id="colorBtn" value="#ff0000">
<script type="module">
  import { showColorPickerDialog } from './src/nezumi-color-pickerDialog.js';

  document.getElementById('colorBtn').addEventListener('click', () => {
    showColorPickerDialog({
      color: document.getElementById('colorBtn').value,
      alpha: 1.0,
      onChange: ({h, s, l, a, hex, rgba}) => {
        console.log('HSLA:', h, s, l, a);
        console.log('RGBA:', rgba);
        console.log('HEX:', hex);
        document.getElementById('colorBtn').value = hex;
      },
      onClose: (ok) => {
        console.log('Color picker closed', ok ? 'with OK' : 'cancelled');
      }
    });
  });
</script>
```

### パラメータ

| パラメータ      | 説明                     |
| ---------- | ---------------------- |
| `color`    | 初期色（HEX形式）             |
| `alpha`    | 初期透明度（0〜1）             |
| `onChange` | 色が変更されるたび呼ばれる関数        |
| `onClose`  | ダイアログが閉じられたときに呼ばれる関数   |
| `onOk`     | OKボタンで選択を確定したときに呼ばれる関数 |

---

## 特徴

* ダイナミックにダイアログを生成
* HEX、RGBA、HSLA に対応
* PC / モバイル両対応（マウス / タッチ）
* ボタンや他の UI に簡単に組み込み可能
* 軽量で依存なし（自作 ColorPicker クラスのみ）

---

## ライセンス

Apache License 2.0

This project uses nezumi-color-picker, Copyright (c) 2026 mouse0329.
Licensed under the Apache License, Version 2.0.
See https://www.apache.org/licenses/LICENSE-2.0 for details.


---
