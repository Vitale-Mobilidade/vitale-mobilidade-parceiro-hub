/** Unit-square subject bounds must enclose every bike; never guess them at dispatch. */
export type FrameEvidence = { focus: { x:number;y:number }; subjects: Array<{left:number;top:number;right:number;bottom:number}> };
export const SINGLE_IMAGE_FORMATS = { article:[1280,720], podcast:[1400,1400], instagram:[1080,1350] } as const;
export function fullBleedFrame(width:number,height:number,targetWidth:number,targetHeight:number,evidence:FrameEvidence) {
 if(!evidence.subjects.length||[width,height,targetWidth,targetHeight].some(v=>!Number.isFinite(v)||v<=0))throw Error('single_image_framing_evidence_required');
 const values=[evidence.focus.x,evidence.focus.y,...evidence.subjects.flatMap(s=>[s.left,s.top,s.right,s.bottom])];
 if(values.some(v=>!Number.isFinite(v)||v<0||v>1)||evidence.subjects.some(s=>s.left>=s.right||s.top>=s.bottom))throw Error('single_image_framing_invalid');
 const scale=Math.max(targetWidth/width,targetHeight/height),cw=targetWidth/scale,ch=targetHeight/scale;
 const x=Math.max(0,Math.min(width-cw,evidence.focus.x*width-cw/2)),y=Math.max(0,Math.min(height-ch,evidence.focus.y*height-ch/2));
 if(evidence.subjects.some(s=>s.left*width<x||s.right*width>x+cw||s.top*height<y||s.bottom*height>y+ch))throw Error('single_image_scene_expansion_required');
 return {x,y,width:cw,height:ch,scale};
}