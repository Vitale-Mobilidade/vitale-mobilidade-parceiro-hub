import {hash,type Job} from './contract';
export type InstagramSchedule={id:string;job_id:string;revision:number;fingerprint:string;due_at:string;state:'pending'|'running'|'cancelled'|'published'|'blocked'|'uncertain';actor_id:string;lease_token?:string|null;error_code?:string|null};
export { saoPauloInstant } from "../../../supabase/functions/_shared/instagram-schedule-clock";
export async function approvedFingerprint(job:Job){
 if(job.approved_revision!==job.revision||!job.approved_by||!job.script||!['approved','publishing','published'].includes(job.state)||job.assets.length!==job.script.slides.length+1)throw Error('instagram_approval_required');
 return hash(JSON.stringify({revision:job.revision,script:job.script,assets:job.assets,approvedBy:job.approved_by}));
}
export function scheduledDecision(schedule:InstagramSchedule,job:Job,now:number,fingerprint:string){
 if(schedule.state!=='running'||Date.parse(schedule.due_at)>now)return 'wait';
 if(job.state==='published')return 'published';
 if(job.publish_attempted)return 'uncertain';
 if(now-Date.parse(schedule.due_at)>30*60*1000)return 'late';
 if(schedule.revision!==job.revision||job.approved_revision!==job.revision||!job.approved_by||fingerprint!==schedule.fingerprint)return 'changed';
 return 'send';
}