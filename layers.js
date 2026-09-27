// Enlarged side view of one wall, not a reconstruction of the reference part.
export const LAYER_COUNT=24;
export function layerMarkup(percent=0){
 const p=Math.max(0,Math.min(100,Number(percent)||0))/100;
 const amount=p*LAYER_COUNT,completed=Math.floor(amount+1e-8),fraction=amount-completed;
 const left=88,right=478,bed=314,pitch=8;
 let paths='';
 for(let i=0;i<completed;i++){
  const y=bed-(i+.5)*pitch;
  paths+=`<path data-layer="${i+1}" d="M${left} ${y}H${right}" stroke="${i%2?'#f87843':'#e75629'}" stroke-width="7" stroke-linecap="round"/>`;
 }
 const active=Math.min(completed,LAYER_COUNT-1),y=bed-(active+.5)*pitch;
 const reverse=active%2===1,start=reverse?right:left;
 const x=p===1?right+44:(reverse?right-(right-left)*fraction:left+(right-left)*fraction);
 if(completed<LAYER_COUNT&&fraction>0)paths+=`<path data-active-layer="${active+1}" d="M${start} ${y}H${x}" stroke="#ffac70" stroke-width="7" stroke-linecap="round"/>`;
 const tip=p===1?y-28:y-4;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" role="img" aria-label="Vue de côté d’une paroi : ${completed} couches déposées sur ${LAYER_COUNT}. La buse dépose chaque ligne de matière au-dessus de la précédente." data-completed="${completed}">
 <rect width="600" height="360" fill="#e9ece6"/>
 <path d="M64 317H532" stroke="#58635b" stroke-width="6" stroke-linecap="round"/>
 <text x="64" y="345" font-family="Arial,sans-serif" font-size="16" fill="#475449">Plateau</text>
 <g>${paths}</g>
 <path d="M${x} 48V${tip-63}" stroke="#ff5b2d" stroke-width="7"/>
 <rect x="${x-24}" y="${tip-63}" width="48" height="39" rx="5" fill="#202823"/>
 <path d="M${x-13} ${tip-24}H${x+13}L${x+3} ${tip}H${x-3}Z" fill="#8a958a" stroke="#455148" stroke-width="1.5"/>
 <text x="28" y="29" font-family="Arial,sans-serif" font-size="15" font-weight="700" fill="#475449">VUE DE CÔTÉ</text>
 </svg>`;
}
