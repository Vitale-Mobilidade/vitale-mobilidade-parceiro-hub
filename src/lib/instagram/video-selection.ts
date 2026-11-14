export const VIDEO_BATCH_LIMIT=40;
export const videoIdPattern=/^[A-Za-z0-9_-]{11}$/;
export const jobIdPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export type VideoEligibility={videoId:string;articleId:string;jobId:string|null;revision:number|null;state:string|null};
export type VideoEligibilityBatch={generationEnabled:boolean;sources:VideoEligibility[]};
export function selectedJobId(value:unknown){return typeof value==='string'&&jobIdPattern.test(value)?value:undefined;}