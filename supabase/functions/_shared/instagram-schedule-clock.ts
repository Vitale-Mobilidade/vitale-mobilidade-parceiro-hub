export function saoPauloInstant(local:string,now=Date.now()){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))throw Error('instagram_schedule_date_invalid');
 const utc=Date.parse(`${local}:00-03:00`);
 if(!Number.isFinite(utc)||new Date(utc-3*3600000).toISOString().slice(0,16)!==local)throw Error('instagram_schedule_date_invalid');
 if(utc<=now)throw Error('instagram_schedule_future_required');
 return new Date(utc).toISOString();
}
