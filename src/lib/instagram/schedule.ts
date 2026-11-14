import {hash,type Job} from './contract';
export type InstagramSchedule={id:string;job_id:string;revision:number;fingerprint:string;due_at:string;state:'pending'|'running'|'cancelled'|'published'|'blocked'|'uncertain';actor_id:string;lease_token?:string|null;error_code?:string|null};
export function saoPauloInstant(local:string,now=Date.now()){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))throw Error('instagram_schedule_date_invalid');
 const utc=Date.parse(`${local}:00-03:00`);
 if(!Number.isFinite(utc)||new Date(utc-3*3600000).toISOString().slice(0,16)!==local)throw Error('instagram_schedule_date_invalid');
 if(utc<=now)throw Error('instagram_schedule_future_required');
 return new Date(utc).toISOString();
}
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