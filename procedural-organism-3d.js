/* PLANET Procedural Organism 3D Engine
 * Deterministic low-poly meshes driven by the simulator's digital phenotype.
 * Scientific guardrail: morphology is an illustrative phenotype proxy, not a genome-to-anatomy decoder.
 * Exports self-contained glTF 2.0 binary (.glb), no third-party runtime dependency.
 */
(function (root) {
  'use strict';
  const VERSION = '1.0.0';
  const TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(Number(v)) ? Number(v) : lo));
  const vec = (a,b) => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const norm = a => { const l=Math.hypot(a[0],a[1],a[2])||1; return [a[0]/l,a[1]/l,a[2]/l]; };
  function hash(text) { let h=2166136261; for(let i=0;i<String(text).length;i++){h^=String(text).charCodeAt(i);h=Math.imul(h,16777619);} return h>>>0; }
  function rngFor(text) { let s=hash(text)||1; return () => { s=(Math.imul(1664525,s)+1013904223)>>>0; return s/4294967296; }; }
  function hsl(h,s,l) {
    h=((h%360)+360)%360/360; s=clamp(s,0,1); l=clamp(l,0,1);
    if(!s)return [l,l,l];
    const hue=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};
    const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;
    return [hue(p,q,h+1/3),hue(p,q,h),hue(p,q,h-1/3)];
  }
  function sequenceSignal(dna, offset, span) {
    const seq=String(dna||'').toUpperCase().replace(/[^ACGT]/g,'');
    if(!seq.length)return 0.5;
    const n=Math.min(span,seq.length),start=((offset%seq.length)+seq.length)%seq.length;
    let value=0,weight=0;
    for(let i=0;i<n;i++){
      const b=seq[(start+i)%seq.length];
      const v=b==='A'?0.12:b==='C'?0.39:b==='G'?0.67:0.91;
      const w=1+((i%7)*.07);
      value+=v*w;weight+=w;
    }
    return weight?value/weight:.5;
  }
  function resolvePhenotype(specimen) {
    specimen=specimen||{};
    const dna=String(specimen.dna||specimen.lineageDNA||'').toUpperCase().replace(/[^ACGT]/g,'');
    let decoded=null;
    if(root.PlanetEvolutionModel&&dna.length===root.PlanetEvolutionModel.genomeLength){
      try{decoded=root.PlanetEvolutionModel.phenotypeFromDNA(dna,{ageMa:Number(specimen.ageMa)||0});}catch(_){}
    }
    const supplied=specimen.phenotype||specimen.traits||{};
    const appearance=supplied.appearance||decoded&&decoded.appearance||specimen.appearance||{};
    const signal=(i)=>sequenceSignal(dna,i* Math.max(1,Math.floor(dna.length/8)),Math.max(1,Math.floor(dna.length/8)));
    const v=Array.from({length:8},(_,i)=>signal(i));
    const env=specimen.environment||specimen.conditions||{};
    const temperature=clamp(env.temperatureC===undefined?(env.temperature===undefined?22:env.temperature):env.temperatureC,-80,100);
    const moisture=clamp(env.moisture===undefined?(env.waterAvailability===undefined?.5:env.waterAvailability):env.moisture,0,1);
    const oxygen=clamp(env.oxygen===undefined?.21:env.oxygen,0,1);
    const aquatic=/water|ocean|river|lake|aquatic|marine/i.test(String(specimen.habitat||''));
    const photosynthetic=!!(decoded&&decoded.photosynthetic||supplied.photosynthetic);
    const rnd=rngFor(dna+'|'+(specimen.id||specimen.nameEn||specimen.nameFa||'organism'));
    const trait=(key,fallback,lo,hi)=>clamp(appearance[key]===undefined?fallback:appearance[key],lo,hi);
    const form=String(specimen.form||decoded&&decoded.form||'digital-organism');
    const bodyLength=trait('bodyLength',.72+.95*v[1],.45,2.2);
    const bodyWidth=trait('bodyWidth',.38+.95*v[3],.25,1.6);
    const bodyHeight=trait('bodyHeight',.32+1.0*v[4],.2,1.65);
    const headSize=trait('headSize',.25+1.15*v[2],.12,1.5);
    const limbCount=Math.round(trait('limbCount',v[1]<.18?0:1+Math.floor(v[1]*6),0,6));
    const limbLength=trait('limbLength',.18+1.5*v[1],.08,1.8);
    const limbThickness=trait('limbThickness',.08+.65*v[3],.04,.9);
    const tailLength=trait('tailLength',.04+1.65*v[5],0,2.0);
    const neckLength=trait('neckLength',.04+1.35*v[2],0,1.8);
    const appendageSpan=trait('wingSpan',.05+1.4*v[6],0,1.8);
    const surfaceRoughness=trait('surfaceRoughness',v[7],0,1);
    const hue=trait('hue',Math.round(360*v[0]),0,359);
    return {
      id:specimen.id==null?null:specimen.id,
      name:String(specimen.nameFa||specimen.nameEn||specimen.name||'Planet organism'),
      form,dna,generation:Number(specimen.generation)||0,habitat:String(specimen.habitat||'unknown'),
      population:Math.max(0,Number(specimen.population)||0),ageMa:Number(specimen.ageMa)||0,
      environment:{temperatureC:temperature,moisture,oxygen,aquatic},
      digitalSignals:v,
      appearance:{
        bodyLength,bodyWidth,bodyHeight,headSize,limbCount,limbLength,limbThickness,
        tailLength,neckLength,wingSpan:appendageSpan,finSize:.1+1.3*v[6],
        armorCoverage:v[3]*v[7],crestHeight:v[7]*.9,eyeSize:.12+.8*v[2],
        hue,pattern:Math.floor(v[7]*6),symmetry:.5+.5*v[6],
        surfaceRoughness,photosynthetic,developmentalActivity:.15+.85*v[4],
        aquaticAdaptation:aquatic?.2+.8*v[6]:.15+.65*v[1],
        oxygenTolerance:.1+.85*v[0],temperatureTolerance:.1+.85*v[5]
      },
      referenceGenome:specimen.referenceGenome||null,
      scientificEvidence:specimen.scientificEvidence||null,
      caveat:'Developmental-field hypothesis driven by digital sequence signals and supplied environment. The 168-base Planet genome is a toy model, not a validated biological genome-to-anatomy predictor.',
      confidence:'hypothesis-only'
    };
  }
  function buildMesh(input) {
    const s=resolvePhenotype(input),a=s.appearance;
    const dna=s.dna||'';
    const L=clamp(a.bodyLength,.45,2.2)*.78;
    const W=clamp(a.bodyWidth,.25,1.6)*.46;
    const H=clamp(a.bodyHeight,.2,1.65)*.50;
    const head=clamp(a.headSize,.12,1.5);
    const limbCount=Math.round(clamp(a.limbCount,0,6));
    const limb=clamp(a.limbLength,.08,1.8);
    const thick=clamp(a.limbThickness,.04,.9);
    const tail=clamp(a.tailLength,0,2);
    const neck=clamp(a.neckLength,0,1.8);
    const span=clamp(a.wingSpan,0,1.8);
    const rough=clamp(a.surfaceRoughness,0,1);
    const moisture=s.environment.moisture, aquatic=s.environment.aquatic;
    const activity=clamp(a.developmentalActivity,.15,1);
    const rnd=rngFor(dna+'|development-field-v2');
    const bodyColor=hsl(a.hue,.38,.43),accent=hsl(a.hue+31,.47,.59),dark=hsl(a.hue+196,.30,.24);
    const materials=[
      {name:'derived-surface',color:bodyColor,metallic:0,roughness:.9},
      {name:'growth-ridges',color:accent,metallic:0,roughness:.78},
      {name:'ventral-surface',color:dark,metallic:0,roughness:.94}
    ];
    const groups=materials.map((_,materialIndex)=>({materialIndex,positions:[],normals:[],indices:[]}));
    const primitives=[];
    function addPrimitive(cx,cy,cz,rx,ry,rz,weight,kind,phase) {
      primitives.push({c:[cx,cy,cz],r:[Math.max(.025,rx),Math.max(.025,ry),Math.max(.025,rz)],w:weight,kind:kind||0,phase:phase||0});
    }
    // One shared developmental grammar for all organisms: sequence-derived fields
    // alter a continuous tissue-density field; no taxon-specific mesh templates.
    addPrimitive(0,.52*H+H,0,W,H,L,1,0,rnd()*TAU);
    const anterior=.18*L+.22*neck;
    addPrimitive(0,H*1.78,anterior,W*(.12+.16*head),H*(.13+.14*head),L*(.10+.10*head),.92,1,rnd()*TAU);
    if(tail>.06){
      const segments=3+Math.floor(sequenceSignal(dna,17,Math.max(1,Math.floor(dna.length/10)))*5);
      for(let i=0;i<segments;i++){
        const t=(i+1)/segments,z=-L*(.32+tail*.62*t);
        addPrimitive(0,H*(1.45-.23*t),z,W*(.22*(1-t)+.025),H*(.20*(1-t)+.025),L*(.17*(1-t)+.025),.76,2,t);
      }
    }
    if(neck>.12){
      const count=2+Math.floor(neck*2);
      for(let i=0;i<count;i++){
        const t=(i+1)/count;
        addPrimitive(0,H*(1.58+.38*t),L*(.12+.2*t),W*(.17*(1-t)+.035),H*(.17*(1-t)+.035),L*(.12*(1-t)+.025),.78,1,t);
      }
    }
    // Appendage number and placement are derived from sequence signals, not species labels.
    for(let i=0;i<limbCount;i++){
      const side=i%2===0?-1:1, row=Math.floor(i/2), z=L*(.22-row*.27);
      const rootX=side*W*.66, rootY=H*(1.08-row*.10);
      const spread=(.55+.9*sequenceSignal(dna,11+i*7,Math.max(1,Math.floor(dna.length/12))))*limb;
      const endX=rootX+side*W*(.55+spread*.35);
      const endY=Math.max(.07,rootY-H*(.45+.35*sequenceSignal(dna,29+i*5,Math.max(1,Math.floor(dna.length/14)))));
      const endZ=z+L*(sequenceSignal(dna,37+i*3,Math.max(1,Math.floor(dna.length/16)))-.5)*.35;
      const midX=(rootX+endX)*.5,midY=(rootY+endY)*.5,midZ=(z+endZ)*.5;
      addPrimitive(midX,midY,midZ,Math.max(.035,Math.abs(endX-rootX)*.54),Math.max(.035,Math.abs(rootY-endY)*.55),Math.max(.045,L*.075),.62,3,i);
      addPrimitive(endX,endY,endZ,W*(.10+thick*.14),H*(.06+thick*.08),L*(.07+thick*.07),.58,3,i+.3);
      if(aquatic||s.environment.aquaticAdaptation>.68){
        addPrimitive(side*(W*.90+span*.16),H*(1.04-row*.1),z,W*(.12+span*.22),H*(.035+span*.045),L*(.10+span*.15),.38,4,i);
      }
    }
    // Growth ridges are a thresholded developmental response, not fixed ornaments.
    const ridgeSignal=sequenceSignal(dna,Math.floor(dna.length*.71),Math.max(1,Math.floor(dna.length*.18)));
    const ridgeCount=Math.floor(2+ridgeSignal*7);
    if(ridgeSignal>.56){
      for(let i=0;i<ridgeCount;i++){
        const t=(i+.5)/ridgeCount,z=L*(.40-t*.78);
        addPrimitive(0,H*(1.82+rough*.25),z,W*(.035+rough*.045),H*(.06+rough*.12),L*.035,.34,1,i);
      }
    }
    // Sessile/photosynthetic expression produces upward branching fields via the same grammar.
    if(a.photosynthetic||(!limbCount&&moisture>.45&&s.environment.oxygen>.12)){
      const stemH=H*(.75+activity*.7);
      addPrimitive(0,H+stemH*.48,0,W*.13,stemH*.56,W*.13,.8,5,0);
      const branchCount=2+Math.floor(sequenceSignal(dna,Math.floor(dna.length*.42),Math.max(1,Math.floor(dna.length*.14)))*7);
      for(let i=0;i<branchCount;i++){
        const t=(i+1)/(branchCount+1),angle=TAU*sequenceSignal(dna,i*11,Math.max(1,Math.floor(dna.length/16)))+i*2.399;
        const radius=W*(.25+.75*t),y=H+stemH*t;
        addPrimitive(Math.cos(angle)*radius,y,Math.sin(angle)*radius,W*(.09+.08*activity),H*(.05+.07*activity),W*(.12+.09*activity),.48,5,i);
      }
    }
    // Environment modifies growth envelope; it does not magically identify a species.
    const thermalStress=Math.abs(s.environment.temperatureC-22)/80;
    const envScale=clamp(1-.12*thermalStress+.10*moisture-.08*(1-s.environment.oxygen),.72,1.12);
    for(const p of primitives){p.r[0]*=envScale;p.r[1]*=envScale;p.r[2]*=envScale;}
    function field(x,y,z){
      let value=-1e6;
      for(const p of primitives){
        const dx=(x-p.c[0])/p.r[0],dy=(y-p.c[1])/p.r[1],dz=(z-p.c[2])/p.r[2];
        let d=(1-Math.sqrt(dx*dx+dy*dy+dz*dz))*p.w;
        const wave=Math.sin((x*13+p.phase)*(.6+rough))*Math.sin((y*11-p.phase)*(.6+rough))*Math.sin((z*12+p.phase)*(.6+rough));
        d+=wave*rough*.045;
        const k=.12;
        if(value<-1e5)value=d;
        else {const h=clamp(.5+.5*(d-value)/k,0,1);value=value*(1-h)+d*h+k*h*(1-h);}
      }
      return value-.19;
    }
    const bounds={min:[-W*(2.2+span*.25),0,-L*(1.15+tail*.65)],max:[W*(2.2+span*.25),H*(3.4+activity*.7),L*(1.05+neck*.4)]};
    const nx=25,ny=28,nz=33;
    const dx=(bounds.max[0]-bounds.min[0])/nx,dy=(bounds.max[1]-bounds.min[1])/ny,dz=(bounds.max[2]-bounds.min[2])/nz;
    const index=(i,j,k)=>(i*(ny+1)+j)*(nz+1)+k;
    const values=new Float32Array((nx+1)*(ny+1)*(nz+1));
    for(let i=0;i<=nx;i++)for(let j=0;j<=ny;j++)for(let k=0;k<=nz;k++){
      values[index(i,j,k)]=field(bounds.min[0]+i*dx,bounds.min[1]+j*dy,bounds.min[2]+k*dz);
    }
    const tetrahedra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
    const cubeOffsets=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
    const edges=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
    function gradient(p){
      const e=.004;
      return norm([field(p[0]+e,p[1],p[2])-field(p[0]-e,p[1],p[2]),field(p[0],p[1]+e,p[2])-field(p[0],p[1]-e,p[2]),field(p[0],p[1],p[2]+e)-field(p[0],p[1],p[2]-e)]);
    }
    function emit(p0,p1,p2){
      const center=[(p0[0]+p1[0]+p2[0])/3,(p0[1]+p1[1]+p2[1])/3,(p0[2]+p1[2]+p2[2])/3];
      const n=gradient(center),u=vec(p1,p0),v=vec(p2,p0),cr=cross(u,v);
      if(dot(cr,n)<0){const t=p1;p1=p2;p2=t;}
      const mat=center[1]<H*.8?2:(center[1]>H*1.65&&ridgeSignal>.56?1:0),g=groups[mat],base=g.positions.length/3;
      for(const p of [p0,p1,p2]){
        const normal=gradient(p);
        g.positions.push(p[0],p[1],p[2]);g.normals.push(normal[0],normal[1],normal[2]);
      }
      g.indices.push(base,base+1,base+2);
    }
    function polygoniseTet(points,vals){
      const inside=[],outside=[];
      for(let i=0;i<4;i++)(vals[i]>=0?inside:outside).push(i);
      if(!inside.length||!outside.length)return;
      const crossings=[];
      for(const [a,b] of edges)if((vals[a]>=0)!==(vals[b]>=0)){
        const t=vals[a]/(vals[a]-vals[b]),p=points[a],q=points[b];
        crossings.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t,p[2]+(q[2]-p[2])*t]);
      }
      if(crossings.length===3)emit(crossings[0],crossings[1],crossings[2]);
      else if(crossings.length===4){emit(crossings[0],crossings[1],crossings[2]);emit(crossings[0],crossings[2],crossings[3]);}
    }
    for(let i=0;i<nx;i++)for(let j=0;j<ny;j++)for(let k=0;k<nz;k++){
      const cp=cubeOffsets.map(([oi,oj,ok])=>[bounds.min[0]+(i+oi)*dx,bounds.min[1]+(j+oj)*dy,bounds.min[2]+(k+ok)*dz]);
      const cv=cubeOffsets.map(([oi,oj,ok])=>values[index(i+oi,j+oj,k+ok)]);
      for(const tet of tetrahedra)polygoniseTet(tet.map(n=>cp[n]),tet.map(n=>cv[n]));
    }
    const active=groups.filter(g=>g.positions.length);
    if(!active.length)throw new Error('Developmental field produced no surface. Check the digital genome and environment.');
    const all=active.flatMap(g=>g.positions),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<all.length;i+=3)for(let axis=0;axis<3;axis++){min[axis]=Math.min(min[axis],all[i+axis]);max[axis]=Math.max(max[axis],all[i+axis]);}
    const triangles=active.reduce((sum,g)=>sum+g.indices.length/3,0);
    return {version:VERSION,specimen:s,materials,groups:active,bounds:{min,max},vertices:active.reduce((sum,g)=>sum+g.positions.length/3,0),triangles,provenance:{
      category:'sequence-and-environment-driven developmental field',
      sourceAccession:s.referenceGenome&&s.referenceGenome.accession||null,
      confidence:'hypothesis-only / unvalidated',
      claim:'Surface is generated by a continuous developmental field driven by sequence-derived digital traits and environment. This is not a validated prediction of anatomy from a natural genome.',
      realGenomeDecodedAsPhenotype:false,digitalSequenceUsedAsSimulationInput:true,
      method:'implicit tissue field + marching tetrahedra; no taxon-specific mesh template selected'
    }};
  }
  function toGLB(model) {
    if(!model||!Array.isArray(model.groups)||!model.groups.length)throw new Error('Build a 3D mesh before exporting.');
    const chunks=[],views=[],accessors=[],primitives=[];let offset=0;
    const addChunk=(typed,target)=>{const bytes=new Uint8Array(typed.buffer,typed.byteOffset,typed.byteLength);const pad=(4-offset%4)%4;if(pad){chunks.push(new Uint8Array(pad));offset+=pad;}const start=offset;chunks.push(bytes.slice());offset+=bytes.byteLength;const view={buffer:0,byteOffset:start,byteLength:bytes.byteLength};if(target)view.target=target;views.push(view);return views.length-1;};
    model.groups.forEach((g)=>{
      const positions=new Float32Array(g.positions),normals=new Float32Array(g.normals),indices=new Uint16Array(g.indices);
      const pView=addChunk(positions,34962),nView=addChunk(normals,34962),iView=addChunk(indices,34963);
      const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
      for(let i=0;i<g.positions.length;i+=3)for(let c=0;c<3;c++){min[c]=Math.min(min[c],g.positions[i+c]);max[c]=Math.max(max[c],g.positions[i+c]);}
      const count=positions.length/3;
      const pAcc=accessors.length;accessors.push({bufferView:pView,componentType:5126,count,type:'VEC3',min,max});
      const nAcc=accessors.length;accessors.push({bufferView:nView,componentType:5126,count,type:'VEC3'});
      const iAcc=accessors.length;accessors.push({bufferView:iView,componentType:5123,count:indices.length,type:'SCALAR',min:[0],max:[Math.max(0,count-1)]});
      const materialIndex=g.materialIndex;
      primitives.push({attributes:{POSITION:pAcc,NORMAL:nAcc},indices:iAcc,material:materialIndex,mode:4});
    });
    const binary=packBytes(chunks);
    const gltf={
      asset:{version:'2.0',generator:'PLANET Procedural Organism Engine '+VERSION,extras:{scientificCaveat:model.provenance.claim,provenance:model.provenance}},
      scene:0,scenes:[{nodes:[0]}],nodes:[{name:model.specimen.name,mesh:0}],
      meshes:[{name:'Procedural organism — '+model.specimen.form,primitives}],
      materials:model.materials.map(m=>({name:m.name,pbrMetallicRoughness:{baseColorFactor:[m.color[0],m.color[1],m.color[2],1],metallicFactor:m.metallic,roughnessFactor:m.roughness},doubleSided:true})),
      buffers:[{byteLength:binary.byteLength}],bufferViews:views,accessors
    };
    const jsonBytes=new TextEncoder().encode(JSON.stringify(gltf)),jsonPad=(4-jsonBytes.length%4)%4,binPad=(4-binary.length%4)%4;
    const total=12+8+jsonBytes.length+jsonPad+8+binary.length+binPad;
    const out=new ArrayBuffer(total),dv=new DataView(out);dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,total,true);
    let pos=12;dv.setUint32(pos,jsonBytes.length+jsonPad,true);dv.setUint32(pos+4,0x4e4f534a,true);pos+=8;new Uint8Array(out,pos,jsonBytes.length).set(jsonBytes);new Uint8Array(out,pos+jsonBytes.length,jsonPad).fill(0x20);pos+=jsonBytes.length+jsonPad;
    dv.setUint32(pos,binary.length+binPad,true);dv.setUint32(pos+4,0x004e4942,true);pos+=8;new Uint8Array(out,pos,binary.length).set(binary);
    return out;
  }
  function preview(canvas,model,options) {
    if(!canvas||!model)throw new Error('A preview canvas and generated model are required.');
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas 2D is unavailable.');
    let yaw=(options&&options.yaw)||.55,pitch=(options&&options.pitch)||.10,drag=null;
    const dpr=Math.min(root.devicePixelRatio||1,2);
    const resize=()=>{const r=canvas.getBoundingClientRect();canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));draw();};
    const project=p=>{
      const x=p[0],y=p[1]-.48,z=p[2],cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
      const rx=x*cy+z*sy,rz=-x*sy+z*cy,ry=y*cp-rz*sp,depth=y*sp+rz*cp,scale=Math.min(canvas.width,canvas.height)*.70/(3.5-depth);
      return {x:canvas.width*.5+rx*scale,y:canvas.height*.57-ry*scale,z:depth,scale};
    };
    function draw(){
      const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
      const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#0d2135');bg.addColorStop(1,'#030913');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
      ctx.strokeStyle='#6b92b91b';ctx.lineWidth=1*dpr;
      for(let i=-5;i<=5;i++){const x=w/2+i*w/11;ctx.beginPath();ctx.moveTo(x,h*.12);ctx.lineTo(x,h*.92);ctx.stroke();}
      for(let i=0;i<9;i++){const y=h*.42+i*i*h*.007;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
      const faces=[],rotPoint=p=>{const x=p[0],y=p[1]-.48,z=p[2],cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);const rx=x*cy+z*sy,rz=-x*sy+z*cy;return [rx,y*cp-rz*sp,y*sp+rz*cp];};
      const mats=model.materials;
      for(let mi=0;mi<model.groups.length;mi++){
        const g=model.groups[mi],col=mats[model.materials.findIndex(m=>m.name===['body','accent','dark','detail','plant'][mi])]||mats[0];
        for(let i=0;i<g.positions.length;i+=9){
          const p0=[g.positions[i],g.positions[i+1],g.positions[i+2]],p1=[g.positions[i+3],g.positions[i+4],g.positions[i+5]],p2=[g.positions[i+6],g.positions[i+7],g.positions[i+8]];
          const q=[project(p0),project(p1),project(p2)];const depth=(q[0].z+q[1].z+q[2].z)/3;
          const n=norm(cross(vec(rotPoint(p1),rotPoint(p0)),vec(rotPoint(p2),rotPoint(p0))));
          const light=Math.max(.22,Math.abs(dot(n,norm([-.45,.75,1]))));
          faces.push({q,depth,color:col.color.map(c=>Math.round(clamp(c*light,0,1)*255))});
        }
      }
      faces.sort((a,b)=>a.depth-b.depth);
      for(const f of faces){ctx.beginPath();ctx.moveTo(f.q[0].x,f.q[0].y);ctx.lineTo(f.q[1].x,f.q[1].y);ctx.lineTo(f.q[2].x,f.q[2].y);ctx.closePath();ctx.fillStyle='rgb('+f.color.join(',')+')';ctx.fill();}
    }
    const down=e=>{drag={x:e.clientX,y:e.clientY,yaw,pitch};canvas.setPointerCapture&&canvas.setPointerCapture(e.pointerId);};
    const move=e=>{if(!drag)return;yaw=drag.yaw+(e.clientX-drag.x)*.012;pitch=clamp(drag.pitch+(e.clientY-drag.y)*.008,-1.1,1.1);draw();};
    const up=()=>{drag=null;};
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
    if(root.ResizeObserver){const ro=new root.ResizeObserver(resize);ro.observe(canvas);}else root.addEventListener('resize',resize);
    resize();
    return {redraw:draw,dispose:function(){canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);}};
  }
  function selfTest(){
    const a=buildMesh({id:1,nameEn:'test theropod',form:'theropod',dna:'ACGT'.repeat(42),habitat:'land'});
    const b=buildMesh({id:2,nameEn:'test fish',form:'fish',dna:'TGCA'.repeat(42),habitat:'ocean'});
    const glb=toGLB(a),dv=new DataView(glb),jsonLen=dv.getUint32(12,true),json=JSON.parse(new TextDecoder().decode(new Uint8Array(glb,20,jsonLen)).trim());
    const checks=[
      ['binary glTF magic',dv.getUint32(0,true)===0x46546c67],
      ['binary glTF version 2',dv.getUint32(4,true)===2],
      ['binary container length',dv.getUint32(8,true)===glb.byteLength],
      ['embedded glTF metadata',json.asset.version==='2.0'&&json.extras===undefined&&!!json.asset.extras.scientificCaveat],
      ['nonempty indexed triangles',json.meshes[0].primitives.length>0&&a.triangles>100],
      ['different body plans',a.triangles!==b.triangles||a.groups.length!==b.groups.length],
      ['bounded coordinates',a.bounds.min.every(Number.isFinite)&&a.bounds.max.every(Number.isFinite)]
    ];
    return {ok:checks.every(x=>x[1]),version:VERSION,checks:checks.map(x=>({name:x[0],passed:x[1]})),example:{vertices:a.vertices,triangles:a.triangles,glbBytes:glb.byteLength}};
  }
  root.PlanetProcedural3D={version:VERSION,resolvePhenotype,buildMesh,toGLB,preview,selfTest};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.PlanetProcedural3D;
  if(root.document&&!root.__PLANET_PROCEDURAL_3D_UI__) {
    root.__PLANET_PROCEDURAL_3D_UI__=true;
    const css=`
#planet-proc3d-launch{position:fixed;z-index:8;right:18px;top:66px;border:1px solid #5bd6c288;border-radius:12px;background:linear-gradient(135deg,#174b48,#10283f);color:#e1fff6;padding:10px 13px;font:600 12px/1.4 system-ui,sans-serif;box-shadow:0 8px 25px #0005;cursor:pointer}
#planet-proc3d-overlay{position:fixed;z-index:10000;inset:0;display:none;align-items:center;justify-content:center;background:#020812e8;backdrop-filter:blur(10px);padding:14px;font-family:Tahoma,system-ui,sans-serif;color:#e6f4ff;direction:rtl}
#planet-proc3d-overlay.open{display:flex}#planet-proc3d-card{width:min(820px,100%);max-height:94dvh;overflow:auto;background:#0a1728;border:1px solid #4ec9b544;border-radius:18px;padding:16px;box-shadow:0 25px 100px #0009}
#planet-proc3d-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}#planet-proc3d-head h2{font-size:16px;margin:0}#planet-proc3d-close{border:1px solid #45657c;background:#13283c;border-radius:9px;color:#d6eeff;padding:7px 10px}
#planet-proc3d-preview{display:block;width:100%;height:min(42vh,360px);min-height:230px;background:#071522;border:1px solid #3a647555;border-radius:12px;touch-action:none}
#planet-proc3d-controls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-top:10px}#planet-proc3d-select{min-width:0;width:100%;background:#0d2437;border:1px solid #35596c;border-radius:9px;color:#e6f4ff;padding:9px;font:12px Tahoma,system-ui}
#planet-proc3d-controls button,#planet-proc3d-download{background:#164a49;border:1px solid #4bc7b177;border-radius:9px;color:#e7fff7;padding:9px 12px;font-size:11px;cursor:pointer}
#planet-proc3d-status{font-size:11px;line-height:1.8;color:#9fb8ce;white-space:pre-wrap;margin:9px 0}
#planet-proc3d-evidence{border:1px solid #e2ba6d36;background:#3328194c;border-radius:10px;padding:10px;font-size:10px;line-height:1.9;color:#e8cb95}
#planet-proc3d-meta{display:flex;gap:12px;flex-wrap:wrap;font-size:10px;color:#9fc9c5;margin-bottom:8px}#planet-proc3d-meta b{color:#dcfff5}
@media(max-width:520px){#planet-proc3d-launch{right:10px;top:58px;padding:8px 10px;font-size:11px}#planet-proc3d-card{padding:11px}#planet-proc3d-preview{min-height:215px}#planet-proc3d-controls{grid-template-columns:1fr}#planet-proc3d-controls button{min-height:39px}}
`;
    const style=root.document.createElement('style');style.textContent=css;root.document.head.appendChild(style);
    const button=root.document.createElement('button');button.id='planet-proc3d-launch';button.type='button';button.textContent='◈ ساخت مدل ۳بعدی';button.setAttribute('aria-label','ساخت و خروجی مدل سه‌بعدی موجود زنده');root.document.body.appendChild(button);
    const overlay=root.document.createElement('div');overlay.id='planet-proc3d-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','مولد هندسه سه‌بعدی موجودات');
    overlay.innerHTML='<section id="planet-proc3d-card"><header id="planet-proc3d-head"><h2>مولد سه‌بعدی موجودات · PLANET</h2><button id="planet-proc3d-close" type="button">بستن ×</button></header><p style="font-size:11px;line-height:1.8;color:#9cb8cf;margin:5px 0 10px">هندسهٔ سه‌بعدی در همین دستگاه و از پارامترهای فنوتیپی مدل ساخته می‌شود. برای چرخاندن، روی مدل بکش.</p><canvas id="planet-proc3d-preview" aria-label="پیش‌نمایش چرخان مدل سه‌بعدی"></canvas><div id="planet-proc3d-controls"><select id="planet-proc3d-select" aria-label="انتخاب گونه"><option value="">در حال یافتن گونه‌ها…</option></select><button id="planet-proc3d-build" type="button">تولید / به‌روزرسانی</button></div><div id="planet-proc3d-meta"></div><div id="planet-proc3d-status" aria-live="polite">ابتدا یک گونه از بایگانی زیست‌کره انتخاب کن؛ اگر بایگانی خالی باشد، تکامل را آغاز کن یا از آزمایشگاه ژنوم مدل دیجیتال بساز.</div><div id="planet-proc3d-evidence">محدودیت علمی: این خروجی یک مدل دیداری رویه‌ای است، نه پیش‌بینی تأییدشدهٔ شکل بدن از توالی خام DNA. اگر ژنوم مرجع به پروکسی دیجیتال تبدیل شده باشد، آن پروکسی با ژنوم واقعی و فنوتیپ اندازه‌گیری‌شده یکسان نیست.</div><button id="planet-proc3d-download" type="button" disabled>ذخیره مدل سه‌بعدی (.glb)</button></section>';
    root.document.body.appendChild(overlay);
    const $=id=>root.document.getElementById(id), select=$('planet-proc3d-select'),status=$('planet-proc3d-status'),meta=$('planet-proc3d-meta'),previewCanvas=$('planet-proc3d-preview');
    let current=null,viewer=null;
    function localized(fa,en){return (root.document.documentElement.lang||'fa').toLowerCase().startsWith('en')?en:fa;}
    function getList(){try{return root.PlanetLifeAPI&&typeof root.PlanetLifeAPI.getSpeciesSnapshot==='function'?root.PlanetLifeAPI.getSpeciesSnapshot():[];}catch(_){return [];}}
    function refresh(){
      const old=select.value,items=getList();select.replaceChildren();
      if(!items.length){const option=root.document.createElement('option');option.value='';option.textContent=localized('هنوز گونه‌ای در بایگانی نیست','No species in the catalog yet');select.appendChild(option);status.textContent=localized('از پنل «تکامل قابل مشاهدهٔ حیات» تکامل را آغاز کن؛ سپس از بایگانی گونه‌ها یک موجود انتخاب کن.','Start evolution in the visible-life panel, then select an organism from the catalog.');return;}
      items.forEach(item=>{const o=root.document.createElement('option');o.value=String(item.id);o.textContent=(item.extinct?'† ':'')+(item.name||('Species '+item.id))+' · '+item.form;select.appendChild(o);});
      if(items.some(x=>String(x.id)===old))select.value=old;
    }
    function selected(){const items=getList();return items.find(x=>String(x.id)===select.value)||null;}
    function build(){
      const specimen=selected();
      if(!specimen){status.textContent=localized('گونه‌ای انتخاب نشده است. ابتدا تکامل را اجرا یا از آزمایشگاه ژنوم یک مدل بساز.','No organism selected. Run evolution or create a digital model in the genome lab first.');current=null;$('planet-proc3d-download').disabled=true;return;}
      try{
        if(viewer&&viewer.dispose)viewer.dispose();
        current=buildMesh(specimen);viewer=preview(previewCanvas,current);
        const bytes=toGLB(current);
        meta.replaceChildren();
        [['رأس‌ها / Vertices',current.vertices.toLocaleString()],['مثلث‌ها / Triangles',current.triangles.toLocaleString()],['حجم خروجی / GLB',Math.round(bytes.byteLength/1024)+' KB'],['فرم / Form',specimen.form]].forEach(pair=>{const s=root.document.createElement('span');s.innerHTML='<b>'+pair[0]+':</b> '+pair[1];meta.appendChild(s);});
        status.textContent=localized('مدل ساخته شد. هندسه در زمان اجرا ساخته شده و فایل GLB مستقل از تصاویر آماده است.','Mesh generated at runtime. This GLB contains procedural geometry, not a pre-made species image.')+'\n'+localized('شناسه ژنوم دیجیتال: ','Digital genome id: ')+(specimen.id==null?'—':specimen.id)+' · '+localized('نسل: ','Generation: ')+(specimen.generation||0)+' · '+localized('زیستگاه: ','Habitat: ')+(specimen.habitat||'—');
        $('planet-proc3d-download').disabled=false;
        $('planet-proc3d-download').onclick=()=>{
          try{const blob=new Blob([toGLB(current)],{type:'model/gltf-binary'}),url=URL.createObjectURL(blob),a=root.document.createElement('a');a.href=url;a.download='planet-organism-'+String(specimen.id||'model')+'.glb';root.document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);status.textContent+=localized('\nفایل GLB آمادهٔ ذخیره شد.','\nGLB file prepared for saving.');}
          catch(e){status.textContent=localized('خطا در ساخت خروجی: ','Export error: ')+String(e.message||e);}
        };
      }catch(e){current=null;$('planet-proc3d-download').disabled=true;status.textContent=localized('ساخت مدل ناموفق بود: ','Model generation failed: ')+String(e.message||e);}
    }
    button.addEventListener('click',()=>{overlay.classList.add('open');refresh();if(!current&&select.options.length>0&&select.value)build();});
    $('planet-proc3d-close').addEventListener('click',()=>overlay.classList.remove('open'));
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.classList.remove('open');});
    $('planet-proc3d-build').addEventListener('click',build);
    select.addEventListener('change',build);
    const langButton=$('languageToggle');if(langButton)langButton.addEventListener('click',()=>{button.textContent=localized('◈ ساخت مدل ۳بعدی','◈ Build 3D model');$('planet-proc3d-head').firstElementChild.textContent=localized('مولد سه‌بعدی موجودات · PLANET','Procedural Organism 3D · PLANET');refresh();});
    let habitatViewer=null;
    const habitatButton=root.document.getElementById('habitatShow3D');
    const habitatCanvas=root.document.getElementById('habitat3DCanvas');
    const habitatWrap=root.document.getElementById('habitat3DWrap');
    const habitatStatus=root.document.getElementById('habitat3DStatus');
    if(habitatButton&&habitatCanvas&&habitatWrap){
      habitatButton.addEventListener('click',()=>{
        try{
          const habitatOverlay=root.document.getElementById('habitatOverlay');
          const targetId=habitatOverlay&&habitatOverlay.dataset?habitatOverlay.dataset.speciesId:'';
          const item=getList().find(x=>String(x.id)===String(targetId));
          if(!item)throw new Error(localized('شناسهٔ گونهٔ زیستگاه پیدا نشد. زیستگاه را ببند و دوباره باز کن.','Could not find the habitat species. Close and reopen its habitat.'));
          habitatWrap.style.display='block';
          if(habitatViewer&&habitatViewer.dispose)habitatViewer.dispose();
          const habitatModel=buildMesh(item);
          habitatViewer=preview(habitatCanvas,habitatModel,{yaw:.62,pitch:.08});
          const title=root.document.getElementById('habitat3DTitle');
          if(title)title.textContent=localized('مدل سه‌بعدی روی سطح زیستگاه: ','3D model on the habitat ground: ')+item.name;
          if(habitatStatus)habitatStatus.textContent=localized('مدل ساخته شد: ','Generated mesh: ')+habitatModel.vertices.toLocaleString()+' '+localized('رأس، ','vertices, ')+habitatModel.triangles.toLocaleString()+' '+localized('مثلث. برای چرخش بکش.','triangles. Drag to rotate.');
          habitatCanvas.scrollIntoView({behavior:'smooth',block:'nearest'});
        }catch(e){if(habitatStatus)habitatStatus.textContent=localized('خطا در تولید مدل: ','Model generation error: ')+String(e.message||e);}
      });
      const closeHabitat=root.document.getElementById('closeHabitat');
      if(closeHabitat)closeHabitat.addEventListener('click',()=>{if(habitatViewer&&habitatViewer.dispose){habitatViewer.dispose();habitatViewer=null;}});
    }
    const api={refresh:refresh,build:build};
    root.PlanetProcedural3DUI=api;
    if(root.MutationObserver){const mo=new root.MutationObserver(()=>{if(overlay.classList.contains('open'))refresh();});mo.observe(root.document.documentElement,{attributes:true,attributeFilter:['lang']});}
  }
})(typeof window!=='undefined'?window:globalThis);
