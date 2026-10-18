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
  function resolvePhenotype(specimen) {
    specimen=specimen||{};
    const dna=String(specimen.dna||specimen.lineageDNA||'');
    let phenotype=specimen.phenotype||specimen.traits||{};
    if(root.PlanetEvolutionModel&&dna.length===root.PlanetEvolutionModel.genomeLength){
      try { phenotype=root.PlanetEvolutionModel.phenotypeFromDNA(dna,{ageMa:Number(specimen.ageMa)||0}); } catch(_) {}
    }
    const appearance=phenotype.appearance||specimen.appearance||{};
    const rnd=rngFor(dna+'|'+(specimen.id||specimen.nameEn||specimen.nameFa||'organism'));
    const trait=(key, fallback, lo, hi)=>clamp(appearance[key]===undefined?fallback:appearance[key],lo,hi);
    const forms=new Set(['microbe','bacterium','aquatic','fish','amphibian','reptile','plant','tree','fungus','dinosaur','sauropod','theropod','armoredDino','mammal','dog','cat','horse','elephant','bird','insect','humanoid','human']);
    let form=String(specimen.form||phenotype.form||'');
    if(!forms.has(form)){
      const inferred=phenotype.form||'microbe'; form=forms.has(String(inferred))?String(inferred):'microbe';
    }
    const hue=trait('hue',Math.round(rnd()*359),0,359);
    return {
      id:specimen.id==null?null:specimen.id,
      name:String(specimen.nameFa||specimen.nameEn||specimen.name||'Planet organism'),
      form, dna,
      generation:Number(specimen.generation)||0,
      habitat:String(specimen.habitat||'unknown'),
      population:Math.max(0,Number(specimen.population)||0),
      ageMa:Number(specimen.ageMa)||0,
      appearance:{
        bodyLength:trait('bodyLength',.9+rnd()*.5,.55,1.8),
        bodyWidth:trait('bodyWidth',.7+rnd()*.45,.4,1.45),
        bodyHeight:trait('bodyHeight',.68+rnd()*.45,.4,1.5),
        headSize:trait('headSize',.65+rnd()*.5,.3,1.4),
        limbLength:trait('limbLength',.65+rnd()*.5,.2,1.6),
        limbThickness:trait('limbThickness',.45+rnd()*.5,.18,1.35),
        tailLength:trait('tailLength',.65+rnd()*.8,.05,1.9),
        neckLength:trait('neckLength',.45+rnd()*.6,.08,1.8),
        wingSpan:trait('wingSpan',.45+rnd()*.7,.05,1.7),
        finSize:trait('finSize',.6+rnd()*.6,.1,1.5),
        armorCoverage:trait('armorCoverage',rnd()*.6,0,1),
        crestHeight:trait('crestHeight',rnd()*.5,0,1.4),
        eyeSize:trait('eyeSize',.55+rnd()*.4,.2,1.2),
        hue, pattern:trait('pattern',1+rnd()*4,0,5),
        symmetry:trait('symmetry',.8+rnd()*.2,.2,1)
      },
      referenceGenome:specimen.referenceGenome||null,
      scientificEvidence:specimen.scientificEvidence||null,
      caveat:'Procedural visual hypothesis. It is not a validated prediction of anatomy from a natural genome.',
      confidence:'illustrative'
    };
  }
  function buildMesh(input) {
    const s=resolvePhenotype(input), a=s.appearance, f=s.form;
    const L=clamp(a.bodyLength, .55,1.8)*1.55, W=clamp(a.bodyWidth,.4,1.45)*.82, H=clamp(a.bodyHeight,.4,1.5)*1.15;
    const head=clamp(a.headSize,.3,1.4), limb=clamp(a.limbLength,.2,1.6), thick=clamp(a.limbThickness,.18,1.35);
    const tail=clamp(a.tailLength,.05,1.9), neck=clamp(a.neckLength,.08,1.8), wing=clamp(a.wingSpan,.05,1.7), fin=clamp(a.finSize,.1,1.5);
    const bodyColor=hsl(a.hue,.52,.45), accent=hsl(a.hue+27,.60,.61), dark=hsl(a.hue+205,.36,.23), pale=hsl(a.hue+38,.40,.77), green=hsl(112+a.hue*.12,.48,.37);
    const materials=[
      {name:'body',color:bodyColor,metallic:0,roughness:.82},
      {name:'accent',color:accent,metallic:0,roughness:.72},
      {name:'dark',color:dark,metallic:0,roughness:.9},
      {name:'detail',color:pale,metallic:0,roughness:.58},
      {name:'plant',color:green,metallic:0,roughness:.9}
    ];
    const groups=materials.map((_,materialIndex)=>({materialIndex,positions:[],normals:[],indices:[]}));
    function tri(p0,p1,p2,mat,outward) {
      let n=cross(vec(p1,p0),vec(p2,p0)), len=Math.hypot(...n); if(len<1e-8)return;
      n=n.map(x=>x/len);
      if(outward&&dot(n,outward)<0){const tmp=p1;p1=p2;p2=tmp;n=n.map(x=>-x);}
      const g=groups[mat], base=g.positions.length/3;
      for(const p of [p0,p1,p2]){g.positions.push(p[0],p[1],p[2]);g.normals.push(n[0],n[1],n[2]);}
      g.indices.push(base,base+1,base+2);
    }
    function ellipsoid(c,r,mat,rotY=0,rotZ=0,detail=12) {
      const latN=Math.max(7,Math.floor(detail*.68)), lonN=detail;
      const transform=p=>{let x=p[0],y=p[1],z=p[2];let x2=x*Math.cos(rotY)+z*Math.sin(rotY),z2=-x*Math.sin(rotY)+z*Math.cos(rotY);let x3=x2*Math.cos(rotZ)-y*Math.sin(rotZ),y3=x2*Math.sin(rotZ)+y*Math.cos(rotZ);return [x3+c[0],y3+c[1],z2+c[2]];};
      const at=(i,j)=>{const v=-Math.PI/2+Math.PI*i/latN,u=TAU*j/lonN;return transform([r[0]*Math.cos(v)*Math.cos(u),r[1]*Math.sin(v),r[2]*Math.cos(v)*Math.sin(u)]);};
      for(let i=0;i<latN;i++)for(let j=0;j<lonN;j++){
        const p00=at(i,j),p01=at(i,j+1),p10=at(i+1,j),p11=at(i+1,j+1);
        const center=[(p00[0]+p01[0]+p10[0])/3-c[0],(p00[1]+p01[1]+p10[1])/3-c[1],(p00[2]+p01[2]+p10[2])/3-c[2]];
        tri(p00,p10,p01,mat,center);tri(p01,p10,p11,mat,[((p01[0]+p10[0]+p11[0])/3)-c[0],((p01[1]+p10[1]+p11[1])/3)-c[1],((p01[2]+p10[2]+p11[2])/3)-c[2]]);
      }
    }
    function tube(p0,p1,r0,r1,mat,segments=9) {
      const axis=norm(vec(p1,p0)), helper=Math.abs(axis[1])<.88?[0,1,0]:[1,0,0], u=norm(cross(axis,helper)), v=norm(cross(axis,u));
      const ring=(p,r,i)=>{const an=TAU*i/segments;return [p[0]+r*(u[0]*Math.cos(an)+v[0]*Math.sin(an)),p[1]+r*(u[1]*Math.cos(an)+v[1]*Math.sin(an)),p[2]+r*(u[2]*Math.cos(an)+v[2]*Math.sin(an))];};
      const c0=[p0[0]-(p0[0]+p1[0])/2,p0[1]-(p0[1]+p1[1])/2,p0[2]-(p0[2]+p1[2])/2];
      for(let i=0;i<segments;i++){
        const a0=ring(p0,r0,i),a1=ring(p0,r0,i+1),b0=ring(p1,r1,i),b1=ring(p1,r1,i+1);
        const mid=[(a0[0]+a1[0]+b0[0]+b1[0])/4-(p0[0]+p1[0])/2,(a0[1]+a1[1]+b0[1]+b1[1])/4-(p0[1]+p1[1])/2,(a0[2]+a1[2]+b0[2]+b1[2])/4-(p0[2]+p1[2])/2];
        tri(a0,b0,a1,mat,mid);tri(a1,b0,b1,mat,mid);
      }
      for(let i=0;i<segments;i++){tri(p0,ring(p0,r0,i+1),ring(p0,r0,i),mat,[-axis[0],-axis[1],-axis[2]]);tri(p1,ring(p1,r1,i),ring(p1,r1,i+1),mat,axis);}
    }
    function polygon(points,mat) { if(points.length<3)return;for(let i=1;i<points.length-1;i++)tri(points[0],points[i],points[i+1],mat); }
    const E=(c,r,m,ry,rz,d)=>ellipsoid(c,r,m,ry||0,rz||0,d||13);
    const T=(p0,p1,r0,r1,m)=>tube(p0,p1,r0,r1,m,9);
    const eye=(x,y,z,side=1)=>{E([x,y,z],[.065,.065,.045],3,side*.2,0,10);E([x+side*.012,y,z+side*.031],[.026,.031,.018],2,0,0,8);};
    // Plant, tree and fungal morphology are generated as volumetric parts rather than 2-D sprites.
    if(f==='plant'||f==='tree'){
      const trunk=f==='tree'?.12:.055, height=f==='tree'?1.45:clamp(limb,.2,1.6)*.7;
      T([0,.04,0],[0,height,0],trunk,trunk*.68,2);
      const leafCount=f==='tree'?9:5;
      for(let i=0;i<leafCount;i++){
        const angle=TAU*i/leafCount, y=height*(.35+(i%4)*.14), radius=f==='tree'?.30:.19;
        E([Math.cos(angle)*radius*.56,y,Math.sin(angle)*radius*.56],[radius,.10,radius*.26],4,angle,angle*.18,12);
      }
      E([0,height+.04,0],[.12,.12,.12],1,0,0,10);
    } else if(f==='fungus'){
      T([0,.035,0],[0,.60,0],.12,.09,3);
      E([0,.65,0],[.49,.23,.45],1,0,0,18);
      E([0,.53,0],[.39,.07,.37],0,0,0,16);
      for(let i=0;i<5;i++){const ang=TAU*i/5;E([Math.cos(ang)*.20,.70,Math.sin(ang)*.20],[.035,.025,.035],3,0,0,8);}
    } else if(f==='microbe'||f==='bacterium'||f==='aquatic'){
      E([0,.40,0],[W*.76,.24,L*.66],0,.16,0,18);
      for(let i=0;i<4;i++){const ang=TAU*i/4;T([Math.cos(ang)*W*.70,.40,Math.sin(ang)*L*.50],[Math.cos(ang)*W*.96,.42+Math.sin(i)*.08,Math.sin(ang)*L*.74],.025,.012,1);}
      E([W*.22,.48,L*.22],[.07,.07,.07],3);
    } else if(f==='fish'){
      E([0,.48,0],[W*.56,H*.28,L*.43],0,0,0,18);
      polygon([[0,.48,-L*.36],[-W*.55,.50,-L*.70],[0,.50,-L*.60]],1);
      polygon([[0,.48,-L*.36],[W*.55,.50,-L*.70],[0,.50,-L*.60]],1);
      polygon([[-W*.10,.70,0],[-W*.25,.95,L*.05],[W*.15,.83,L*.1]],1);
      polygon([[W*.30,.47,L*.05],[W*.72,.30,L*.22],[W*.48,.45,L*.34]],1);
      for(const side of [-1,1]){eye(side*W*.35,.57,L*.26,side);E([side*W*.43,.39,L*.03],[.18,.025,.22],2,side*.25,0,10);}
      for(let i=0;i<3;i++)T([-W*.18+i*.10,.40,L*.16],[-W*.18+i*.10,.58,L*.16],.012,.012,3);
    } else if(f==='insect'){
      E([0,.52,L*.25],[W*.28,H*.20,L*.20],1,0,0,13);
      E([0,.48,0],[W*.30,H*.20,L*.24],0,0,0,13);
      E([0,.46,-L*.28],[W*.34,H*.20,L*.31],2,0,0,13);
      for(const side of [-1,1]){
        T([side*W*.14,.47,L*.12],[side*W*.50,.26,L*.30],.033,.018,2);
        for(let i=0;i<3;i++){
          const z=L*(.22-i*.20);
          T([side*W*.18,.43,z],[side*W*(.48+.04*(i%2)),.26,z+L*.05],.025,.015,3);
          T([side*W*(.48+.04*(i%2)),.26,z+L*.05],[side*W*.62,.06,z+L*.10],.015,.010,2);
        }
        T([side*.05,.66,L*.43],[side*.10,.93,L*.54],.013,.006,3);
      }
      E([0,.72,L*.43],[W*.21,H*.16,L*.17],0);
      for(const side of [-1,1])polygon([[side*W*.1,.60,L*.04],[side*W*.72,.82,-L*.04],[side*W*.42,.61,-L*.22]],3);
    } else {
      const isSauro=f==='sauropod', isBiped=['theropod','dinosaur','armoredDino','bird','humanoid','human'].includes(f)||f==='amphibian';
      const isBird=f==='bird', isFish=false, isHumanoid=f==='humanoid'||f==='human';
      const isDino=['sauropod','theropod','dinosaur','armoredDino','reptile'].includes(f);
      E([0,H*.47,0],[W*.52,H*.25,L*.35],0,0,0,18);
      // Long necks are tapered tube chains; ordinary vertebrates use a short neck.
      if(isSauro){T([0,H*.57,L*.22],[0,H*.78,L*.39],W*.18,W*.12,0);T([0,H*.78,L*.39],[0,H*.98,L*.48],W*.12,W*.07,1);}
      else T([0,H*.57,L*.23],[0,H*.65,L*.31],W*.15,W*.12,0);
      const headZ=isSauro?L*.50:L*.39, headY=isSauro?H*.98:H*.67;
      E([0,headY,headZ],[W*.22*head,H*.17*head,L*.18*head],1,0,0,15);
      if(isBird||f==='dog'||f==='cat')T([0,headY-.03,headZ+L*.10],[0,headY-.08,headZ+L*.23],W*.075,W*.035,3);
      if(f==='elephant')T([0,headY-.07,headZ+L*.09],[0,headY-.34,headZ+L*.22],W*.08,W*.045,3);
      for(const side of [-1,1])eye(side*W*.17,headY+.035,headZ+L*.10,side);
      if(f==='elephant')for(const side of [-1,1])E([side*W*.20,headY-.03,headZ-.025],[W*.12,H*.15,L*.06],1,0,0,12);
      if(isBiped){
        for(const side of [-1,1]){
          const hip=[side*W*.20,H*.36,L*.02],knee=[side*W*.22,H*.20,L*.06],ankle=[side*W*.23,.09,L*.11];
          T(hip,knee,W*.105*thick,W*.077*thick,0);T(knee,ankle,W*.065*thick,W*.045*thick,2);E([ankle[0],.07,ankle[2]+L*.04],[W*.11,.055,L*.10],2);
          const shoulder=[side*W*.36,H*.56,L*.18],elbow=[side*W*.45,H*.44,L*.25],hand=[side*W*.47,H*.40,L*.32];
          T(shoulder,elbow,W*.065*thick,W*.045*thick,0);T(elbow,hand,W*.04,W*.028,1);
        }
      } else {
        for(const side of [-1,1])for(const z of [-L*.20,L*.21]){
          const hip=[side*W*.36,H*.35,z],knee=[side*W*.39,H*.20,z+L*.015],ankle=[side*W*.39,.08,z+L*.035];
          T(hip,knee,W*.11*thick,W*.075*thick,0);T(knee,ankle,W*.06*thick,W*.04*thick,2);E([ankle[0],.06,ankle[2]+L*.035],[W*.10,.05,L*.08],2);
        }
      }
      // A continuous chain of tapered sections makes inherited tail proportions visible in 3-D.
      if(!isHumanoid&&tail>.08){
        const z0=-L*.27, z1=-L*(.34+tail*.36), z2=-L*(.40+tail*.62);
        T([0,H*.43,z0],[0,H*.39,z1],W*.18,W*.10,0);
        T([0,H*.39,z1],[0,H*.34,z2],W*.10,W*.015,1);
      }
      if(isBird){
        for(const side of [-1,1]){
          polygon([[side*W*.2,H*.61,-L*.03],[side*W*(.4+wing*.45),H*.65,-L*.10],[side*W*(.46+wing*.43),H*.43,L*.14],[side*W*.22,H*.47,L*.15]],1);
          T([side*W*.09,.20,L*.02],[side*W*.09,.06,L*.06],.03,.022,2);
        }
        polygon([[-W*.04,H*.66,headZ+L*.14],[W*.04,H*.66,headZ+L*.14],[0,H*.61,headZ+L*.28]],3);
      } else if(isDino&&a.armorCoverage>.36){
        for(let i=0;i<6;i++){
          const z=-L*.25+i*L*.10, y=H*.47+H*.21;
          polygon([[-W*.12,y,z],[0,y+H*(.10+a.armorCoverage*.18),z],[W*.12,y,z]],2);
        }
      }
      if(isHumanoid){
        E([0,H*.83,L*.39],[W*.10,H*.045,L*.025],3);
        E([0,H*.39,L*.02],[W*.31,H*.12,L*.15],1);
      }
      if(f==='amphibian'){
        for(const side of [-1,1]){E([side*W*.50,.11,L*.25],[W*.20,.07,L*.12],3);E([side*W*.50,.11,-L*.18],[W*.20,.07,L*.12],3);}
      }
    }
    // A compact ground-contact marker makes an accidental floating origin easier to spot in preview.
    const all=groups.flatMap(g=>g.positions);
    if(!all.length)throw new Error('Procedural mesher produced no triangles.');
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<all.length;i+=3)for(let aI=0;aI<3;aI++){min[aI]=Math.min(min[aI],all[i+aI]);max[aI]=Math.max(max[aI],all[i+aI]);}
    const triCount=groups.reduce((sum,g)=>sum+g.indices.length/3,0);
    return {version:VERSION,specimen:s,materials,groups:groups.filter(g=>g.positions.length),bounds:{min,max},vertices:groups.reduce((sum,g)=>sum+g.positions.length/3,0),triangles:triCount,provenance:{
      category:s.referenceGenome?'reference-genome-derived digital proxy':'digital simulation genome',
      sourceAccession:s.referenceGenome&&s.referenceGenome.accession||null,
      confidence:'illustrative / unvalidated',
      claim:'Geometry is procedurally generated from simulator phenotype parameters. It is not a scientifically validated prediction of the organism’s anatomy from raw DNA.',
      realGenomeDecodedAsPhenotype:false,digitalSequenceUsedAsSimulationInput:!s.referenceGenome
    }};
  }
  function packBytes(chunks) {
    let size=0; for(const c of chunks)size=(size+3)&~3,size+=c.byteLength;
    const out=new Uint8Array(size); let offset=0;
    for(const c of chunks){offset=(offset+3)&~3;out.set(new Uint8Array(c.buffer,c.byteOffset,c.byteLength),offset);offset+=c.byteLength;}
    return out;
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
    const api={refresh:refresh,build:build};
    root.PlanetProcedural3DUI=api;
    if(root.MutationObserver){const mo=new root.MutationObserver(()=>{if(overlay.classList.contains('open'))refresh();});mo.observe(root.document.documentElement,{attributes:true,attributeFilter:['lang']});}
  }
})(typeof window!=='undefined'?window:globalThis);
