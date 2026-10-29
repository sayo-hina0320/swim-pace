function calculateTargets(base){return [0,1,2].flatMap(level=>[3,2,1,0].map(offset=>(Math.round((Number(base)+offset+level)*100)/100).toFixed(1)))}
// Public source intentionally contains no athlete data.
const defaultRows=[];
