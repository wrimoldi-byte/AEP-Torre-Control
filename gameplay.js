(() => {
  decorativeFlights.forEach(marker => marker.remove());
  document.querySelector('.live')?.remove();
  const style = document.createElement('style');
  style.textContent = `.gameplay{left:16px;bottom:20px;padding:12px;min-width:250px}.gameplay .k{font-size:9px;letter-spacing:1.2px;color:#6edfff}.gameplay strong{display:block;margin-top:4px;font-size:13px}.gameplay p{margin:4px 0 10px;color:#98afbe;font-size:10px;max-width:260px}.gameplay button{border:1px solid #57d9ff;border-radius:6px;background:#123148;color:#dff7ff;font-weight:800;font-size:10px;padding:8px 10px;cursor:pointer}.gameplay button:disabled{opacity:.45}.aircraft-hit{position:relative;width:140px;height:50px;cursor:pointer;color:#57d9ff}.aircraft-hit.orange{color:#f5a65b}.aircraft-hit.green{color:#51da99}.aircraft-svg{position:absolute;left:9px;top:9px;width:32px;height:32px;fill:currentColor;filter:drop-shadow(0 0 5px currentColor);transform-origin:50% 50%;transition:transform .12s linear}.aircraft-hit .flight-label{top:5px;left:45px;pointer-events:auto}.aircraft-hit.selected .flight-label{outline:2px solid #fff;background:#163247}.aircraft-hit.selected .aircraft-svg{filter:drop-shadow(0 0 8px #fff)}.waypoint{filter:drop-shadow(0 0 4px #57d9ff)}@media(max-width:650px){.gameplay{left:10px;bottom:10px;min-width:205px}.gameplay p{max-width:200px}}`;
  document.head.append(style);
  const panel = document.createElement('section');
  panel.className = 'panel gameplay';
  panel.innerHTML = '<div class="k">MODO ENTRENAMIENTO</div><strong id="gameStatus">Listo para operar</strong><p id="gameHint">Los aviones vuelan continuamente. Seleccioná uno y marcá su rumbo.</p><button id="startGame">INICIAR TURNO</button>';
  document.querySelector('.radar').append(panel);
  const status = document.querySelector('#gameStatus');
  const hint = document.querySelector('#gameHint');
  const button = document.querySelector('#startGame');
  const flights = [];
  let selected = null, score = 0, active = false, gameOver = false, lastFrame = performance.now();
  const templates = [
    ['LA454',-34.5500,-58.4290,'LATAM · A320','orange',125,0],
    ['AR1641',-34.5680,-58.4020,'AEROLÍNEAS · B737','',305,1],
    ['G37632',-34.5470,-58.4100,'GOL · B737','green',165,0],
    ['JA3301',-34.5700,-58.4250,'JETSMART · A320','',35,1],
    ['AV218',-34.5500,-58.3960,'AVIANCA · A320','orange',245,0]
  ];
  function distance(a,b){return Math.hypot(a.lat-b.lat,(a.lng-b.lng)*.82)}
  function runwayName(index){return index===0?'13':'31'}
  function setScore(){const clock=document.querySelector('#clock')?.textContent||'--:--';document.querySelector('.header-data').innerHTML=`<span>OPERACIONES<b>${String(score/10).padStart(2,'0')}</b></span><span>PUNTOS<b>${score}</b></span><span>HORA LOCAL<b id="clock">${clock}</b></span>`}
  function icon(f){return L.divIcon({className:'',iconSize:[140,50],iconAnchor:[25,25],html:`<div class="aircraft-hit ${f.color}" role="button" aria-label="Seleccionar ${f.call}"><svg class="aircraft-svg" viewBox="0 0 60 60" style="transform:rotate(${f.heading}deg)" aria-hidden="true"><path d="M30 3 36 23 54 30 54 35 35 33 35 49 41 55 41 58 30 53 19 58 19 55 25 49 25 33 6 35 6 30 24 23Z"/></svg><div class="flight-label">${f.call}<span>${f.model}</span></div></div>`})}
  function setSelected(f,on){f?.marker.getElement()?.querySelector('.aircraft-hit')?.classList.toggle('selected',on)}
  function spawn(index){
    if(!active||gameOver)return;
    const d=templates[index%templates.length];
    const f={call:d[0],model:d[3],color:d[4],heading:d[5],runway:d[6],target:null,landing:false,speed:.00028,marker:null,waypoint:null};
    f.marker=L.marker([d[1],d[2]],{icon:icon(f),interactive:true,keyboard:false,bubblingMouseEvents:false}).addTo(map);
    const markerElement=f.marker.getElement();L.DomEvent.disableClickPropagation(markerElement);markerElement.addEventListener('click',event=>{event.stopPropagation();if(!active)return;setSelected(selected,false);selected=f;setSelected(f,true);status.textContent=`${f.call} seleccionado`;hint.textContent=`Marcá un rumbo o tocá cerca de la cabecera ${runwayName(f.runway)} para aterrizar.`});
    flights.push(f);
  }
  function finishTurn(a,b){gameOver=true;active=false;selected=null;status.textContent='⚠ PÉRDIDA DE SEPARACIÓN';hint.textContent=`${a.call} y ${b.call} se acercaron demasiado. Turno finalizado.`;button.disabled=false;button.textContent='REINTENTAR TURNO'}
  function checkSeparation(){for(let i=0;i<flights.length;i++)for(let j=i+1;j<flights.length;j++){if(distance(flights[i].marker.getLatLng(),flights[j].marker.getLatLng())<.00105){finishTurn(flights[i],flights[j]);return}}}
  function updateFlight(f,dt){
    const pos=f.marker.getLatLng();let direction;
    if(f.target){const dLat=f.target.lat-pos.lat,dLng=f.target.lng-pos.lng,remaining=Math.hypot(dLat,dLng);if(remaining<.00016){if(f.landing){f.marker.remove();f.waypoint?.remove();flights.splice(flights.indexOf(f),1);score+=10;setScore();status.textContent=`Aterrizaje ${f.call} confirmado`;hint.textContent='+10 puntos. El resto del tráfico sigue moviéndose.';setTimeout(()=>spawn(Math.floor(Math.random()*templates.length)),1200);return}f.target=null;f.waypoint?.remove();f.waypoint=null}else{direction={lat:dLat/remaining,lng:dLng/remaining};f.heading=Math.atan2(direction.lng*.82,direction.lat)*180/Math.PI}}
    if(!direction){const rad=f.heading*Math.PI/180;direction={lat:Math.cos(rad),lng:Math.sin(rad)/.82}}
    f.marker.setLatLng([pos.lat+direction.lat*f.speed*dt,pos.lng+direction.lng*f.speed*dt]);const svg=f.marker.getElement()?.querySelector('.aircraft-svg');if(svg)svg.style.transform=`rotate(${f.heading}deg)`;
  }
  function animate(now){const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;if(active&&!gameOver){[...flights].forEach(f=>updateFlight(f,dt));checkSeparation()}requestAnimationFrame(animate)}
  map.on('click',event=>{if(!active||!selected)return;const end=runway[selected.runway],landing=distance(event.latlng,{lat:end[0],lng:end[1]})<.00115;selected.target=landing?L.latLng(end[0],end[1]):event.latlng;selected.landing=landing;selected.waypoint?.remove();selected.waypoint=L.circleMarker(selected.target,{radius:5,color:landing?'#f5a65b':'#57d9ff',weight:2,fillOpacity:.15,className:'waypoint'}).addTo(map);status.textContent=landing?`Aterrizaje ${runwayName(selected.runway)} autorizado`:'Nuevo rumbo autorizado';hint.textContent=landing?'El avión continúa hasta el umbral.':'El avión viró hacia el punto marcado.';setSelected(selected,false);selected=null});
  button.onclick=()=>{if(active)return;flights.splice(0).forEach(f=>{f.marker.remove();f.waypoint?.remove()});active=true;gameOver=false;score=0;setScore();button.disabled=true;button.textContent='TURNO EN CURSO';status.textContent='Torre operativa';hint.textContent='Los aviones ya están volando. Seleccioná uno y marcá su rumbo.';spawn(0);spawn(1);spawn(2)};
  setScore();requestAnimationFrame(animate);
})();
