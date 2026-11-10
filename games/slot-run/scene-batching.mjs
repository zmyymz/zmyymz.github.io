// Experimental 32m spatial batching. Used only by the opt-in diagnostics until
// measurements demonstrate a gain; production batching remains unchanged.
export function splitStaticScenery(THREE,group,cellSize=32){
 const batches=new Map(),old=[],geometries=new Set(),point=new THREE.Vector3(),normal=new THREE.Vector3(),center=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
 for(const mesh of [...group.children]){
  if(!mesh.isMesh||mesh.isInstancedMesh||Array.isArray(mesh.material)||mesh.material.map||mesh.material.transparent||mesh.material.isShaderMaterial)continue;
  const geo=mesh.geometry;if(mesh.material.vertexColors||Object.keys(geo.attributes).some(key=>!['position','normal','uv'].includes(key)))continue;
  if(!geo.attributes.position||!geo.attributes.normal)continue;
  mesh.updateMatrix();normalMatrix.getNormalMatrix(mesh.matrix);
  const count=geo.index?.count??geo.attributes.position.count;
  for(let i=0;i<count;i+=3){const ids=[0,1,2].map(j=>geo.index?geo.index.getX(i+j):i+j);center.set(0,0,0);for(const id of ids)center.add(point.fromBufferAttribute(geo.attributes.position,id).applyMatrix4(mesh.matrix));center.multiplyScalar(1/3);
   const key=[mesh.material.uuid,mesh.castShadow,mesh.receiveShadow,!!geo.attributes.uv,Math.floor(center.x/cellSize),Math.floor(center.z/cellSize)].join(':');
   if(!batches.has(key))batches.set(key,{material:mesh.material,castShadow:mesh.castShadow,receiveShadow:mesh.receiveShadow,position:[],normal:[],uv:geo.attributes.uv?[]:null});const batch=batches.get(key);
   for(const id of ids){point.fromBufferAttribute(geo.attributes.position,id).applyMatrix4(mesh.matrix);normal.fromBufferAttribute(geo.attributes.normal,id).applyNormalMatrix(normalMatrix);batch.position.push(point.x,point.y,point.z);batch.normal.push(normal.x,normal.y,normal.z);if(batch.uv)batch.uv.push(geo.attributes.uv.getX(id),geo.attributes.uv.getY(id))}
  }
  old.push(mesh);geometries.add(geo);
 }
 for(const mesh of old)group.remove(mesh);
 for(const geo of geometries)geo.dispose();
 for(const batch of batches.values()){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(batch.position,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(batch.normal,3));if(batch.uv)geo.setAttribute('uv',new THREE.Float32BufferAttribute(batch.uv,2));geo.computeBoundingBox();geo.computeBoundingSphere();const mesh=new THREE.Mesh(geo,batch.material);mesh.castShadow=batch.castShadow;mesh.receiveShadow=batch.receiveShadow;group.add(mesh)}
 group.updateWorldMatrix(true,true);group.traverse(o=>{if(o.isMesh||o.isLine){o.matrixAutoUpdate=false;o.matrixWorldAutoUpdate=false}});
 return {sourceMeshes:old.length,chunks:batches.size};
}
