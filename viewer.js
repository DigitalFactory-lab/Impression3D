let models;
export async function getModels(){if(!models){const r=await fetch('models/models.json');if(!r.ok)throw Error('Modèles indisponibles');models=await r.json();}return models;}
export function createViewer(canvas,mesh,options={}){
 const ctx=canvas.getContext('2d');if(!ctx)return {dispose(){},setProgress(){},rotate(){},zoom(){}};
 let angle=-.48,tilt=.83,zoom=1,progress=options.progress??1,drag=null,disposed=false;
 const maxZ=Math.max(...mesh.vertices.map(v=>v[2]));
 function draw(){
  if(disposed)return;const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height,d=Math.min(devicePixelRatio||1,2);if(!w||!h)return;
  canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,w,h);
  const s=Math.min(w/75,h/50)*zoom;
  function project(v){let [x,y,z]=v;const xx=x*Math.cos(angle)-y*Math.sin(angle),yy=x*Math.sin(angle)+y*Math.cos(angle);return [w/2+xx*s,h/2+(yy*Math.sin(tilt)-z*Math.cos(tilt))*s,yy*Math.cos(tilt)+z*Math.sin(tilt)];}
  function path(points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();}
  const plate=[[-31,-18,-.5],[31,-18,-.5],[31,18,-.5],[-31,18,-.5]].map(project);path(plate);ctx.fillStyle='#d7dbd0';ctx.fill();ctx.strokeStyle='#bbc3b4';ctx.lineWidth=1;ctx.stroke();
  const projected=mesh.vertices.map(v=>project([v[0],v[1],Math.min(v[2],Math.max(.06,maxZ*progress))]));
  const faces=mesh.faces.map(f=>({f,depth:f.reduce((a,i)=>a+projected[i][2],0)/3})).sort((a,b)=>a.depth-b.depth);
  for(const {f} of faces){const ps=f.map(i=>projected[i]);const ar=(ps[1][0]-ps[0][0])*(ps[2][1]-ps[0][1])-(ps[1][1]-ps[0][1])*(ps[2][0]-ps[0][0]);if(ar<=0)continue;
   const vs=f.map(i=>mesh.vertices[i]),u=vs[1].map((a,i)=>a-vs[0][i]),v=vs[2].map((a,i)=>a-vs[0][i]);const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n)||1;
   const lum=47+(n[2]/l)*12+(n[0]*Math.cos(angle)-n[1]*Math.sin(angle))/l*10;
   path(ps);ctx.fillStyle=`hsl(14 98% ${lum}%)`;ctx.fill();ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=.6;ctx.stroke();
  }
  if(options.layers){for(let z=.2;z<maxZ*progress;z+=.2){for(let i=0;i<mesh.outline.length;i++){const a=mesh.outline[i],b=mesh.outline[(i+1)%mesh.outline.length],dx=b[0]-a[0],dy=b[1]-a[1];if(dy*Math.sin(angle)-dx*Math.cos(angle)<=0)continue;const pa=project([...a,z]),pb=project([...b,z]);ctx.beginPath();ctx.moveTo(pa[0],pa[1]);ctx.lineTo(pb[0],pb[1]);ctx.strokeStyle='#74291555';ctx.lineWidth=.65;ctx.stroke();}}}
  ctx.font='12px Arial';ctx.fillStyle='#5c6655';ctx.fillText(options.layers?'COUCHES · VUE PÉDAGOGIQUE':'MODÈLE 3D · DIMENSIONS EN MM',18,27);
 }
 function down(e){drag=[e.clientX,e.clientY,angle];canvas.setPointerCapture(e.pointerId);}
 function move(e){if(!drag)return;angle=drag[2]+(e.clientX-drag[0])*.013;draw();}
 function up(){drag=null;}
 function key(e){if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();angle+=e.key==='ArrowLeft'?-.2:.2;draw();}}
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('keydown',key);
 const ro=new ResizeObserver(draw);ro.observe(canvas);draw();
 return {setProgress(p){progress=p;draw();},rotate(n=.3){angle+=n;draw();},zoom(n){zoom=Math.max(.7,Math.min(1.6,zoom+n));draw();},dispose(){disposed=true;ro.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('keydown',key);}};
}
