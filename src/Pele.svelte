
<script>

import analyze from 'rgbaster'
import nearestColor from 'nearest-color'
import resizer from 'image-resizer-js';

var colors = {
  claro: '#efddca',
  claro_frio: '#f1dedc',
  claro_quente: '#faedb8',
  claro_olivia: '#efe6c8',
  medio: '#b18a61',
  medio_frio: '#997875',
  medio_quente: 'cba14d',
  medio_olivia: '#a98b46',
  escuro: '#532a1c',
  escuro_frio: '#3e221d',
  escuro_quente: '795304',
  escuro_olivia: '#4a4813'
};


let processingImg = false;

let colorFound1 = null;
let colorFound2 = null;


let urlObject = null;

  const handleCam = async (e) => {
    colorFound1 = null;
    colorFound2 = null;

    processingImg = true;
    var file = e.target.files[0];
    // Do something with the image file.
    let _urlObject = URL.createObjectURL(file);
    
    let t = await fetch(_urlObject)
    console.log(1,t);
    t = await t.arrayBuffer()
    console.log(2,t);
    t = await resizer(t, 300, 50);
    console.log(3,t);
    
        const blob = new Blob([t]);
        const image = new Image();
    
        urlObject = URL.createObjectURL(blob);
    
    const result = await analyze(urlObject); // also supports base64 encoded image strings

    colorFound1 = nearestColor.from(colors)(result[0].color);
    colorFound2 = nearestColor.from(colors)(result[1].color);
    //let y = nearestColor(result[0].color);

    console.log(`The dominant color is ${result[0].color} with ${result[0].count} occurrence(s)`)
    console.log(`The secondary color is ${result[1].color} with ${result[1].count} occurrence(s)`)
    
    processingImg = false;
  };
</script>




<div>

<div class="img">
{#if urlObject}<img id="frame"  alt=ok src={urlObject}/>{/if}
</div>

<div class="photoButton">
<h1>ENVIE OU TIRE UMA FOTO DO SEU ROSTO</h1>
<input type="file" accept="image/*" capture="camera" on:change={handleCam} />
</div>
{#if processingImg}
..processando imagem...
{:else}
  {#if colorFound1}
  <div style="background: {colorFound1.value}">{colorFound1.name} - {colorFound1.value}</div>
  {/if}
  {#if colorFound2}
  <div style="background: {colorFound2.value}">{colorFound2.name} - {colorFound2.value}</div>
  {/if}
{/if}

</div>

<style>

.img {display:flex; justify-content:center; background:#444;padding:10px}
.img img {border: solid 8px #eee;border-radius:4px;box-shadow:0 1px 3px #000}

.photoButton {background: #0c9;position:relative;height:60px;text-align: center}
.photoButton input {position:absolute;height:100%;width:100%;opacity:0;left:0;top:0}
</style>