<script>
    import { fade, fly } from 'svelte/transition';
    import Pele from './Pele.svelte'
    
    let i = 0;
    let direc = 1;
    let width = window.outerWidth;
    export let name;
    export let page='';

  const dataList = [
    { imgUrl: "oval.png", title: "Oval" },
    { imgUrl: "triangulo.png", title: "Triangulo" },
    { imgUrl: "retangulo.png", title: "Retangulo" },
    { imgUrl: "triangulo_invertido.png", title: "Triangulo Invertido" },
    { imgUrl: "ampulheta.png", title: "Ampulheta" }
  ];

  const colors = [
    "#93614A",
    "#30150E",
    "#653618",
    "#56220D",
    "#38160A",
    "#3D1307",
    "#582812",
    "#672614",
    "#FFC190",
    "#EF9F7E",
    "#E6A680",
    "#F4A481",
    "#E9B995",
    "#DFB175",
    "#FFCCA4",
    "#DFBAA8"
  ];

    const move = (to, fromId) => {
        direc = fromId > i ? 1 : -1;
        i = fromId;
        page = to;
    }

/*
  const bodyChoose = document.querySelector("#bodyChoose");
  const skinChoose = document.querySelector("#skinChoose");
  const answer = document.querySelector("#answer");
  const bodyText = document.querySelector("#bodyText");
  const skinText = document.querySelector("#skinText");
  const reset = document.querySelector("#reset");

  const areaCard = document.querySelector("#areaCard");
  let areaColor = document.querySelector("#areaColor");

  const bodySelect = function(e, value) {
    e.preventDefault();
    bodyText.innerText = value;
    bodyChoose.style.display = "none";
    skinChoose.style.display = "block";
    answer.style.display = "none";
  };
  const colorSelect = function(e, value) {
    e.preventDefault();
    skinText.innerText = value;
    bodyChoose.style.display = "none";
    skinChoose.style.display = "none";
    answer.style.display = "block";
  };

  const resetSelect = function(e) {
    e.preventDefault();
    skinText.innerText = "";
    bodyText.innerText = "";
    bodyChoose.style.display = "block";
    skinChoose.style.display = "none";
    answer.style.display = "none";
  };

  reset.addEventListener("click", resetSelect);

  for (data of dataList) {
    console.log(data);
    let el = document.createElement("div");
    el.className = "item ";
    el.innerHTML = template(data.imgUrl, data.title);
    let value = data.title;
    el.querySelector(".mdc-card__media").addEventListener("click", event => {
      bodySelect(event, value);
    });
    el.querySelector(".mdc-button").addEventListener("click", event => {
      bodySelect(event, value);
    });
    areaCard.appendChild(el);
  }

  for (color of colors) {
    let el = document.createElement("div");
    el.className = "color";
    el.style.backgroundColor = color;
    //el.innerHTML=color;
    el.innerHTML = "<div class='area'></div>";
    let value = color;
    el.addEventListener("click", event => {
      colorSelect(event, value);
    });
    areaColor.appendChild(el);
  }
 */ 
</script>

<style>

.x {position:relative;}
.x1 {display:flex;flex-direction: row}
.x div {
    border: solid 1px #000; 
    top:0px; width: 100%; 
    position: absolute; 
}

/*
  h1 {
    color: purple;
  }

  .demo-card {
    margin: 0 auto;
  }
  .w100 {
    width: 100%;
  }
  #xCard {
    position: relative;
    margin: 0 auto;
    width: 400px;
    height: 500px;
  }

  .slide {
    width: 350px;
    margin: 0px auto;
    height: 480px;
    font-size: 0;
    scroll-snap-type: mandatory;
  }

  .slide--horizontal {
    overflow-y: hidden;
    overflow-x: scroll;
    scroll-snap-points-x: repeat(100%);
    white-space: nowrap;
  }

  .item {
    position: relative;
    display: inline-block;
    width: 100%;
    height: 100%;
  }

  #aareaColor {
    width: 400px;
  }
  .color {
    width: 100px;
    height: 100px;
    float: left;
    cursor: pointer;
  }
  .color .area {
    width: 100px;
    height: 100px;
  }
  .color .area:hover {
    background: rgba(255, 255, 255, 0.2);
    box-shadow: inset 0 0 1px 8px #6200ee;
  }
  .tc {
    text-align: center;
  }

  @media (max-width: 400px) {
    .slide,
    #xCard {
      width: 95%;
    }
  }
  */
</style>

<!--<div style="display:none">
Escolher o tom da pele
Escolher o formato do rosto (tem que pôr as explicações)
Escolher a cor dos olhos, (também não tem uma paleta igual ao tom de pele, achei bacana aquilo lá) podemos colocar sim...
Escolher a cor do cabelo, (vixi é cor demais =) pode até ficar um pouco estranho dependendo da configuração de cor do telefone da pessoa)
Escolher o formato do corpo, (também precisa pôr o texto)
E ainda terá um questionário (são passos que precisam estar bem feitos se não fica estranho)
</div>
<div> [ {i} {direc} ] </div>
-->


<button on:click="{()=>move('pele', 1)}">pele</button>
<button on:click="{()=>move('rosto', 2)}">rosto</button>
<button on:click="{()=>move('olhos', 3)}">olhos</button>
<button on:click="{()=>move('cabelo', 4)}">cabelo</button>
<button on:click="{()=>move('corpo', 5)}">corpo</button>
<button on:click="{()=>move('questao', 6)}">questao</button>

<div class="x">
{#if page === 'pele'}
    <div 
        in:fly="{{ x: width*direc, duration: 1000 }}" 
        out:fly={{x:-width*direc, duration:1000}}>
        <Pele />
        </div>
{:else if page === 'rosto'}
    <div 
        in:fly="{{ x: width*direc, duration: 1000 }}" 
        out:fly={{x:-width*direc, duration:1000}}>
        rosto
        </div>
{:else if page === 'olhos'}
    <div 
        in:fly="{{ x: width*direc, duration: 1000 }}" 
        out:fly={{x:-width*direc, duration:1000}}>
        olhos
        </div>
{:else if page === 'cabelo'}
    <div 
        in:fly="{{ x: width*direc, duration: 1000 }}" 
        out:fly={{x:-width*direc, duration:1000}}>
        cabelo
        </div>
{:else if page === 'corpo'}
    <div 
        in:fly="{{ x: width*direc, duration: 1000 }}" 
        out:fly={{x:-width*direc, duration:1000}}>
        corpo
        </div>
{:else}
    <div 
        in:fly="{{ x: width*direc, duration: 1000 }}" 
        out:fly={{x:-width*direc, duration:1000}}>
        INICIANDO
        </div>
{/if}
</div>

<!--
<div style="display:none">
<h1>Hello {name}!</h1>
<h1 class="mdc-typography mdc-typography--headline2 tc">Beta Demo</h1>
<div id="xCard">
  <div id="bodyChoose">
    <h1 class="mdc-typography mdc-typography--headline4 tc">
      Selecione o formato do corpo
    </h1>
    <div id="areaCard" class="slide slide--horizontal" />
  </div>
  <div id="skinChoose" style="display: none">
    <h1 class="mdc-typography mdc-typography--headline4 tc">
      Selecione a cor da pele
    </h1>
    <div id="areaColor" />
  </div>
  <div id="answer" style="display: none">
    <div>
      <h1 id="bodyText" class="mdc-typography mdc-typography--headline4 tc">
        A
      </h1>
      <h2 id="skinText" class="mdc-typography mdc-typography--headline3 tc">
        B
      </h2>
      <div id="reset" class="mdc-card__action-buttons w100">
        <button
          class="mdc-button mdc-button--raised w100 mdc-card__action
          mdc-card__action--button">
          Reset
        </button>
      </div>
    </div>
  </div>
</div>
</div>
-->