// Synthetic dashboard response only. Real boundary/count logic is exercised in SQL.
export function periodMetricsFixture(p={period:'last30'},overrides={}){
 const ranges={today:['2026-11-06','2026-11-06','2026-11-05','2026-11-05'],yesterday:['2026-11-05','2026-11-05','2026-11-04','2026-11-04'],week:['2026-11-02','2026-11-06','2026-10-26','2026-10-30'],month:['2026-11-01','2026-11-06','2026-10-01','2026-10-06'],last7:['2026-10-31','2026-11-06','2026-10-24','2026-10-30'],last30:['2026-10-08','2026-11-06','2026-09-08','2026-10-07'],last90:['2026-08-09','2026-11-06','2026-05-11','2026-08-08']};
 const [start,end,previousStart,previousEnd]=p.period==='custom'?[p.start,p.end,'2026-10-29','2026-10-30']:ranges[p.period];
 const current={members:4,listings:2,channelListings:1,publications:1,payments:2,grossCents:30000,reversedPayments:0};
 return {generatedAt:'2026-11-06T15:00:00Z',period:p.period,trackingSince:'2026-09-01',excludedOrders:2,start,end,previousStart,previousEnd,effectiveStart:start,comparable:true,current,previous:{...current,members:2,grossCents:15000},activeNow:1,daily:[{...current,day:end}],...overrides};
}
