(() => {
  // Remove the decorative flights: from here on every aircraft is playable.
  document.querySelectorAll('.plane').forEach(el => el.closest('.leaflet-marker-icon')?.remove());

  const style=document.createElement('style');
  style.textContent=`.gameplay{left:16px;bottom:20px;padding:12px;min-width:234px}.gameplay .k{font-size:9px;letter-spacing:1.2px;color:#6edfff}.gameplay strong{display:block;margin-top:4px;font-size:13px}.gameplay p{margin:4px 0 10px;color:#98afbe;font-size:10px}.gameplay button{border:1px solid #57d9ff;border-radius:6px;background:#123148;color:#dff7ff;font-weight:800;font-size:10px;padding:8px 10px;cursor:pointer}.gameplay button:disabled{opacity:.45}.route-line{filter:drop-shadow(0 0 3px #1ab5db)}@media(max-width:650px){.gameplay{left:10px;bottom:10px;min-width:190px}.gameplay p{max-width:180px}}`;
  document.head.append(style);
  document.querySelector('.live')?.remove();
  const panel=document.createElement('section');panel.className='panel gameplay';
  panel.innerHTML='<div class="k">MODO ENTRENAMIENTO</div><strong id="gameStatus">Listo para operar</strong><p id="gameHint">Elegí un vuelo y marcá un punto en el mapa.</p><button id="startGame">INICIAR TURNO</button>';
  document.querySelector('.radar').append(panel);
  const status=document.querySelector('#gameStatus'),hint=document.querySelector('#gameHint'),button=document.querySelector('#startGame');
  let selected=null,score=0,active=false,flightNumber=0,gameOver=false;
  const flights=[];
  const templates=[
    ['LA454',-34.5440,-58.4190,'LATAM · A320','orange',135,0],
    ['AR1641',-34.5502,-58.4272,'AEROLÍNEAS · B737','',78,1],
    ['G37632',-34.5650,-58.3960,'GOL · B737','green',310,0],
    ['JA3301',-34.5714,-58.4050,'JETSMART · A320','',325,1],
    ['AV218',-34.5400,-58.3950,'AVIANCA · A320','orange',205,0]
  ];
  function distance(a,b){return Math.hypot(a.lat-b.lat,a.lng-b.lng)}
  function gameIcon(t,m,c,h){return L.divIcon({className:'',iconSize:[60,66],iconAnchor:[30,31],html:`<div class="plane ${c||''}"><div class="tag">${t}</div><div class="ring"><svg viewBox="0 0 60 60" style="transform:rotate(${h}deg)"><path d="M30 7 L35 25 L51 31 L51 35 L34 33 L34 49 L39 54 L39 56 L30 52 L21 56 L21 54 L26 49 L26 33 L9 35 L9 31 L25 25 Z"/></svg></div><div class="meta">${m}</div></div>`})}
  function setScore(){document.querySelector('.header-data').innerHTML=`<span>OPERACIONES<b>${String(score/10).padStart(2,'0')}</b></span><span>PUNTOS<b>${score}</b></span>`}
  function spawn(){
    if(!active)return;
    const d=templates[flightNumber++%templates.length];
    const marker=L.marker([d[1],d[2]],{icon:gameIcon(d[0],d[3],d[4],d[5]),interactive:true}).addTo(map);
    const flight={marker,target:d[6],busy:false,call:d[0]};flights.push(flight);
    marker.on('click',ev=>{L.DomEvent.stopPropagation(ev);if(flight.busy)return;selected=flight;status.textContent=d[0]+' seleccionado';hint.textContent='Marcá su próximo punto o la cabecera '+runwayName(flight.target)+'.';});
    status.textContent='Vuelo '+d[0]+' en pantalla';hint.textContent='Seleccionalo para darle una instrucción.';
  }
  function runwayName(n){return n===0?'13':'31'}
  function fly(f,to,land){
    f.busy=true;const from=f.marker.getLatLng();const line=L.polyline([from,to],{color:land?'#f5a65b':'#57d9ff',weight:2,opacity:.9,dashArray:'7 7',className:'route-line'}).addTo(map);const started=performance.now(),duration=1500;
    function frame(now){const k=Math.min(1,(now-started)/duration);f.marker.setLatLng([from.lat+(to.lat-from.lat)*k,from.lng+(to.lng-from.lng)*k]);if(checkSeparation(f)){line.remove();return}if(k<1){requestAnimationFrame(frame);return}line.remove();if(land){f.marker.remove();flights.splice(flights.indexOf(f),1);score+=10;setScore();status.textContent='Aterrizaje '+f.call+' confirmado';hint.textContent='+10 puntos. Preparando el próximo vuelo.';setTimeout(spawn,900)}else{f.busy=false;status.textContent='Punto alcanzado';hint.textContent='Podés seleccionar el vuelo para darle otra instrucción.'}}
    requestAnimationFrame(frame);
  }
  function checkSeparation(f){
    if(gameOver)return true;
    const here=f.marker.getLatLng();
    const conflict=flights.find(other=>other!==f&&other.marker&&distance(here,other.marker.getLatLng())<.00115);
    if(!conflict)return false;
    gameOver=true;active=false;selected=null;
    status.textContent='⚠ PÉRDIDA DE SEPARACIÓN';
    hint.textContent=`${f.call} y ${conflict.call} se acercaron demasiado. Turno finalizado.`;
    button.disabled=false;button.textContent='REINTENTAR TURNO';
    return true;
  }
  map.on('click',ev=>{if(!active||!selected||selected.busy)return;const r=runway[selected.target],land=distance(ev.latlng,{lat:r[0],lng:r[1]})<.00065;const to=land?L.latLng(r[0],r[1]):ev.latlng;const f=selected;selected=null;status.textContent=land?'Aterrizaje autorizado':'Rumbo autorizado';hint.textContent=land?'Siguiendo la aproximación final.':'El vuelo sigue tu punto marcado.';fly(f,to,land)});
  button.onclick=()=>{if(active)return;flights.splice(0).forEach(f=>f.marker.remove());active=true;gameOver=false;score=0;flightNumber=0;setScore();button.disabled=true;button.textContent='TURNO EN CURSO';status.textContent='Torre operativa';hint.textContent='Seleccioná el vuelo entrante y marcá su ruta.';spawn();setTimeout(spawn,1800);setTimeout(spawn,3600)};
  setScore();
})();
