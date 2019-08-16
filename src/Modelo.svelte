
<script>
let title = "oi";
let imgUrl = "ok";
</script>

<div class="mdc-card demo-card" data-title="{title}">
    <div class="mdc-card__primary-action demo-card__primary-action" tabindex="0">
      <div class="mdc-card__media mdc-card__media--16-9 demo-card__media" style="background-image: url('{imgUrl}');height:400px"></div>
      <!--<div class="demo-card__primary">
        <h2 class="demo-card__title mdc-typography mdc-typography--headline6">${title}</h2>>
      </div>-->
    </div>
    <div class="mdc-card__actions">
      <div class="mdc-card__action-buttons w100">
        <button class="mdc-button mdc-button--raised w100 mdc-card__action mdc-card__action--button">${title}</button>
      </div>
      <!--<div class="mdc-card__action-icons">
        <button class="mdc-button mdc-card__action mdc-card__action--button">SIM</button>
      </div>-->
    </div>
  </div>