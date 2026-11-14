// Versioned, opt-in opening: existing saves keep their original ten-bunny quest.
export const FIELD_LESSONS = [
 {title:'Read the leap',need:{bunny:2},hint:'Thornbunnies crouch before leaping. Dodge, then strike.',x:14,z:10},
 {title:'Break the shell',need:{beetle:1},hint:'Field Beetles guard their front. Use a heavy attack or flank.',x:22,z:0},
 {title:'Choose your opening',need:{bunny:1,beetle:1},hint:'Draw the bunny away from the beetle. Fight on your terms.',x:14,z:-16}
];
export function fieldLesson(state){return FIELD_LESSONS[state?.stage||0]||null;}
export function advanceFieldLesson(state,key){
 const stage=state?.stage||0,lesson=FIELD_LESSONS[stage],counts={...state?.counts};
 if(!lesson||!lesson.need[key])return {stage,counts};
 counts[key]=Math.min(lesson.need[key],(counts[key]||0)+1);
 return Object.entries(lesson.need).every(([k,n])=>(counts[k]||0)>=n)?{stage:stage+1,counts:{}}:{stage,counts};
}
// Earliest intersection of a charge segment with a marked stone's collision circle.
export function chargeImpact(start,end,stones,radius=2.2){
 const dx=end.x-start.x,dz=end.z-start.z,a=dx*dx+dz*dz;if(!a)return null;
 let first=null;
 for(const stone of stones){const ox=start.x-stone.x,oz=start.z-stone.z,b=2*(ox*dx+oz*dz),c=ox*ox+oz*oz-radius*radius,disc=b*b-4*a*c;
  if(disc<0)continue;const t=c<=0?0:(-b-Math.sqrt(disc))/(2*a);
  if(t>=0&&t<=1&&(!first||t<first.t))first={t,x:start.x+dx*t,z:start.z+dz*t};
 }return first;
}

export function isFieldPrologue(save, dungeon = false) {
 return !dungeon && save?.ch === 0 && !save.cleared?.[0] && save.q?.[0]?.s === 0
  && ['meet','walk','abduction'].includes(save.fields?.prologue);
}
export function fieldsAreRestored(save) {return !!save?.cleared?.[0];}
