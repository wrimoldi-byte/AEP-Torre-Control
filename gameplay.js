(() => {
  decorativeFlights.forEach(marker => marker.remove());
  document.querySelector('.live')?.remove();
  const style = document.createElement('style');
  style.textContent = `.gameplay{left:16px;bottom:20px;padding:12px;min-width:250px}.gameplay .k{font-size:9px;letter-spacing:1.2px;color:#6edfff}.gameplay strong{display:block;margin-top:4px;font-size:13px}.gameplay p{margin:4px 0 10px;color:#98afbe;font-size:10px;max-width:260px}.gameplay button{border:1px solid #57d9ff;border-radius:6px;background:#123148;color:#dff7ff;font-weight:800;font-size:10px;padding:8px 10px;cursor:pointer}.gameplay button:disabled{opacity:.45}.selected .flight-label{outline:2px solid #fff}.waypoint{filter:drop-shadow(0 0 4px #57d9ff)}@media(max-width:650px){.gameplay{left:10px;bottom:10px;min-width:205px}.gameplay p{max-width:200px}}`;
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
    ['LA454',-34.5450,-58.4400,'LATAM · A320','orange',125,0],
    ['AR1641',-34.5730,-58.3920,'AEROLÍNEAS · B737','',305,1],
    ['G37632',-34.5380,-58.4140,'GOL · B737','green',150,0],
    ['JA3301',-34.5760,-58.4250,'JETSMART · A320','',35,1],
    ['AV218',-34.5480,-58.3880,'AVIANCA · A320','orange',245,0]
  ];
  function distance(a,b){return Math.hypot(a.lat-b.lat,(a.lng-b.lng)*.82)}
  function runwayName(index){return index===0?'13':'31'}
  function setScore(){document.querySelector('.header-data').innerHTML=`<span>OPERACIONES<b>${String(score/10).padStart(2,'0')}</b></span><span>PUNTOS<b>${score}</b></span>`}
  function icon(f,isSelected=false){return L.divIcon({className:'',iconSize:[18,18],iconAnchor:[9,9],html:`<div class="plane ${f.color} ${isSelected?'selected':''}" style="--h:${f.heading}deg"><div class="flight-label">${f.call}<span>${f.model}</span></div></div>`})}
  function spawn(index){
    if(!active||gameOver)return;
    const d=templates[index%templates.length];
    const f={call:d[0],model:d[3],color:d[4],heading:d[5],runway:d[6],target:null,landing:false,speed:.000105,marker:null,waypoint:null};
    f.marker=L.marker([d[1],d[2]],{icon:icon(f),interactive:true,keyboard:false}).addTo(map);
    f.marker.on('click',event=>{L.DomEvent.stopPropagation(event);if(!active)return;if(selected)selected.marker.setIcon(icon(selected));selected=f;f.marker.setIcon(icon(f,true));status.textContent=`${f.call} seleccionado`;hint.textContent=`Marcá un rumbo o tocá cerca de la cabecera ${runwayName(f.runway)} para aterrizar.`});
    flights.push(f);
  }
  function finishTurn(a,b){gameOver=true;active=false;selected=null;status.textContent='⚠ PÉRDIDA DE SEPARACIÓN';hint.textContent=`${a.call} y ${b.call} se acercaron demasiado. Turno finalizado.`;button.disabled=false;button.textContent='REINTENTAR TURNO'}
  function checkSeparation(){for(let i=0;i<flights.length;i++)for(let j=i+1;j<flights.length;j++){if(distance(flights[i].marker.getLatLng(),flights[j].marker.getLatLng())<.00105){finishTurn(flights[i],flights[j]);return}}}
  function updateFlight(f,dt){
    const pos=f.marker.getLatLng();let direction;
    if(f.target){const dLat=f.target.lat-pos.lat,dLng=f.target.lng-pos.lng,remaining=Math.hypot(dLat,dLng);if(remaining<.00016){if(f.landing){f.marker.remove();f.waypoint?.remove();flights.splice(flights.indexOf(f),1);score+=10;setScore();status.textContent=`Aterrizaje ${f.call} confirmado`;hint.textContent='+10 puntos. El resto del tráfico sigue moviéndose.';setTimeout(()=>spawn(Math.floor(Math.random()*templates.length)),1200);return}f.target=null;f.waypoint?.remove();f.waypoint=null}else{direction={lat:dLat/remaining,lng:dLng/remaining};f.heading=Math.atan2(direction.lng*.82,direction.lat)*180/Math.PI}}
    if(!direction){const rad=f.heading*Math.PI/180;direction={lat:Math.cos(rad),lng:Math.sin(rad)/.82}}
    f.marker.setLatLng([pos.lat+direction.lat*f.speed*dt,pos.lng+direction.lng*f.speed*dt]);f.marker.setIcon(icon(f,selected===f));
  }
  function animate(now){const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;if(active&&!gameOver){[...flights].forEach(f=>updateFlight(f,dt));checkSeparation()}requestAnimationFrame(animate)}
  map.on('click',event=>{if(!active||!selected)return;const end=runway[selected.runway],landing=distance(event.latlng,{lat:end[0],lng:end[1]})<.00115;selected.target=landing?L.latLng(end[0],end[1]):event.latlng;selected.landing=landing;selected.waypoint?.remove();selected.waypoint=L.circleMarker(selected.target,{radius:5,color:landing?'#f5a65b':'#57d9ff',weight:2,fillOpacity:.15,className:'waypoint'}).addTo(map);status.textContent=landing?`Aterrizaje ${runwayName(selected.runway)} autorizado`:'Nuevo rumbo autorizado';hint.textContent=landing?'El avión continúa hasta el umbral.':'El avión viró hacia el punto marcado.';selected.marker.setIcon(icon(selected));selected=null});
  button.onclick=()=>{if(active)return;flights.splice(0).forEach(f=>{f.marker.remove();f.waypoint?.remove()});active=true;gameOver=false;score=0;setScore();button.disabled=true;button.textContent='TURNO EN CURSO';status.textContent='Torre operativa';hint.textContent='Los aviones ya están volando. Seleccioná uno y marcá su rumbo.';spawn(0);spawn(1);spawn(2)};
  setScore();requestAnimationFrame(animate);
})();
