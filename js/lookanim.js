// ---- animated looks (the Stylist's preview): a look turns through the client's 8 directions and plays stand, walk, sit or attack, from
// every frame of its sprites (data/looks/, tools/export_look_frames.py). Each piece (body, hair style, headgear, garment) is a file
// loaded the first time a look shows it; bodies and hair are palette indices, coloured with the clothes or hair colour like the still
// looks, headgear and garments are in their own colours ----
const LOOKS={},LOOK_CB={},LOOK_HAS={};
(typeof LOOK_FILES!=="undefined"?Object.entries(LOOK_FILES):[]).forEach(([k,ks])=>ks.forEach(x=>LOOK_HAS[k+"/"+x]=1));
// a piece's file calls this as it loads; it's ready once its sheet has
function LOOKS_ADD(key,p){const im=new Image();im.onload=()=>{p.im=im;LOOKS[key]=p;(LOOK_CB[key]||[]).splice(0).forEach(f=>f())};im.src=p.sheet}
// a piece once it's ready, else null: asks for its file (once), and calls cb when it's in
function lookPiece(key,cb){if(LOOKS[key])return LOOKS[key];if(!LOOK_HAS[key])return null;
  if(!LOOK_CB[key]){LOOK_CB[key]=[];const s=document.createElement("script");s.src=`data/looks/${key}.js`;document.head.append(s)}
  if(cb&&!LOOK_CB[key].includes(cb))LOOK_CB[key].push(cb);return null}
// a palette piece's sheet coloured with pal (index -> "rrggbb", ewPal), kept for the next frames (the last few colourings)
const LOOK_TINT=new Map();
function lookTinted(key,p,palKey,pal){const k=key+"|"+palKey;if(LOOK_TINT.has(k))return LOOK_TINT.get(k);
  const c=document.createElement("canvas");c.width=p.im.naturalWidth;c.height=p.im.naturalHeight;const g=c.getContext("2d",{willReadFrequently:true});
  g.drawImage(p.im,0,0);const d=g.getImageData(0,0,c.width,c.height),x=d.data;
  for(let i=0;i<x.length;i+=4){const rgb=x[i+3]&&pal[x[i]];if(rgb){x[i]=parseInt(rgb.slice(0,2),16);x[i+1]=parseInt(rgb.slice(2,4),16);x[i+2]=parseInt(rgb.slice(4),16);x[i+3]=255}else x[i+3]=0}
  g.putImageData(d,0,0);if(LOOK_TINT.size>40)LOOK_TINT.delete(LOOK_TINT.keys().next().value);LOOK_TINT.set(k,c);return c}
// the directions as the client numbers them (0 facing you, then clockwise as seen from above), and the actions the preview plays
const LOOK_DIRS=["S","SW","W","NW","N","NE","E","SE"];
const LOOK_ACTS=[["stand","Stand"],["walk","Walk"],["sit","Sit"],["attack","Attack"]];
// one frame's layers [image, x, y, mirror, scale x, scale y] drawn with the sprite's origin at (ox, oy), as the client does: each image
// centred on its x, y, flipped when mirrored
function lookLayers(g,src,p,fr,ox,oy){for(const [i,x,y,m,sx,sy] of fr[0]){const [X,Y,w,h]=p.img[i],W=Math.max(1,Math.round(w*Math.abs(sx))),H=Math.max(1,Math.round(h*Math.abs(sy)));
  const l=ox+x-Math.floor(W/2),t=oy+y-Math.floor(H/2);
  if(m){g.save();g.translate(l+W,t);g.scale(-1,1);g.drawImage(src,X,Y,w,h,0,0,W,H);g.restore()}else g.drawImage(src,X,Y,w,h,l,t,W,H)}}
// the look o ({job, trans, sex, hair, color, dye, worn: wornOf's}) doing act facing dir, t ms into the action, drawn on the canvas g with
// the feet at (fx, fy). The body's frame follows the time; on standing and sitting the head and what's on it look straight ahead (frame 0,
// the client turns them with the head), else they follow the body's frame. Each attaches by its anchor to the body's; a garment goes
// behind the body, over it when you see the back (NW, N, NE) or for the garments the client always draws on top. Returns false while a
// piece the look needs is still loading (onload is called when it's in)
function lookAnimDraw(g,o,act,dir,t,fx,fy,onload){const S=JOB_SPRITES,tj=o.trans&&EW_TRANS[o.job]&&S.trans&&S.trans[o.job],bj=tj||S.body[o.job]||S.body.Novice;
  const sex=bj[o.sex]?o.sex:Object.keys(bj)[0],bodyKey=`body/${tj?o.job+"+":S.body[o.job]?o.job:"Novice"}-${sex}`;
  const body=lookPiece(bodyKey,onload),hairN=(S.head[sex]||{})[o.hair]?o.hair:1,hair=lookPiece(`hair/${hairN}-${sex}`,onload);
  if(!body||!hair)return false;
  const pk=tj?"transPal":"bodyPal",pj=tj||S.body[o.job]?o.job:"Novice",bp=((S[pk]||{})[pj]||{})[sex],dye=bp&&o.dye<bp.c.length?o.dye:0;
  const hpal=S.hairPal[sex][hairN],color=o.color<hpal.c.length?o.color:0;
  const bd=body.act[act][dir],n=bd.f.length;if(!n)return true;
  const still=act==="stand"||act==="sit",fi=still?0:Math.floor(t/(Math.max(1,bd.d)*25))%n,bf=bd.f[fi],ba=bf[1]||[0,0];
  const at=(p,a)=>{const d=p.act[a][dir],k=d.f.length;return k?d.f[still?0:fi%k]:null};
  const attach=(p,fr)=>{const a=fr[1]||ba;return [fx+ba[0]-a[0],fy+ba[1]-a[1]]};
  const CL=typeof COSTUME_LOOKS!=="undefined"&&COSTUME_LOOKS,rv=o.worn.robe,rkey=rv&&`robe/${rv}-${tj?o.job+"+":S.body[o.job]?o.job:"Novice"}-${sex}`;
  const robe=rkey&&lookPiece(rkey,onload),rf=robe&&at(robe,act),top=rv&&(CL.robe.top.includes(rv)||dir>=3&&dir<=5);
  const heads=o.worn.head.map(v=>lookPiece(`head/${v}-${sex}`,onload));
  const drawRobe=()=>{if(rf)lookLayers(g,robe.im,robe,rf,...attach(robe,rf))};
  g.imageSmoothingEnabled=false;
  if(!top)drawRobe();
  lookLayers(g,lookTinted(bodyKey,body,`${pk},${pj},${sex},${dye}`,ewPal(bp,dye)),body,bf,fx,fy);
  if(top)drawRobe();
  const hf=at(hair,act);if(hf)lookLayers(g,lookTinted(`hair/${hairN}-${sex}`,hair,`${color}`,ewPal(hpal,color)),hair,hf,...attach(hair,hf));
  heads.forEach(h=>{const f=h&&at(h,act);if(f)lookLayers(g,h.im,h,f,...attach(h,f))});
  return true}
