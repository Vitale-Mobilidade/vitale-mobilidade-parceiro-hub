import {useState} from 'react';
import {CalendarIcon,Clock, X} from 'lucide-react';
import {ptBR} from 'date-fns/locale';
import {format} from 'date-fns';
import {Button} from '@/components/ui/button';
import {Calendar} from '@/components/ui/calendar';
import {Popover,PopoverTrigger,PopoverContent} from '@/components/ui/popover';
import {Input} from '@/components/ui/input';
import type {Job} from '@/lib/instagram/contract';
import type {InstagramSchedule as Schedule} from '@/lib/instagram/schedule';
export function InstagramSchedule({job,schedule,enabled,busy,act}:{job:Job;schedule?:Schedule;enabled:boolean;busy:boolean;act:(action:string,extra?:Record<string,unknown>)=>void}){
 const [date,setDate]=useState<Date>(),[time,setTime]=useState('');
 const pending=schedule?.state==='pending',editable=job.state==='approved'&&!job.publish_attempted&&(!schedule||['pending','cancelled','blocked'].includes(schedule.state));
 return <section className="space-y-3 border-t border-border pt-4"><h3 className="font-semibold">Agendamento · São Paulo</h3>
 {schedule&&<p role="status" className="text-sm text-muted-foreground">{schedule.state} · revisão {schedule.revision} · {new Date(schedule.due_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}{schedule.error_code?` · ${schedule.error_code}`:''}</p>}
 {editable&&<div className="flex flex-wrap items-center gap-3"><Popover><PopoverTrigger asChild><Button variant="outline" disabled={busy||!enabled}><CalendarIcon/>{date?format(date,'dd/MM/yyyy'):'Data'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} locale={ptBR} className="pointer-events-auto"/></PopoverContent></Popover><label className="flex items-center gap-2 text-sm"><Clock className="size-4"/><Input type="time" aria-label="Horário de São Paulo" value={time} onChange={e=>setTime(e.target.value)} disabled={busy||!enabled} className="w-32"/></label><Button disabled={busy||!enabled||!date||!time} onClick={()=>{if(date&&window.confirm(`Agendar a revisão ${job.revision} para ${format(date,'dd/MM/yyyy')} às ${time} em São Paulo?`))act('schedule',{localTime:`${format(date,'yyyy-MM-dd')}T${time}`});}}><CalendarIcon/>{pending?'Reagendar':'Agendar'}</Button></div>}
 {pending&&<Button variant="outline" disabled={busy} onClick={()=>{if(window.confirm('Cancelar antes do envio?'))act('cancel-schedule');}}><X/>Cancelar agendamento</Button>}
 {!enabled&&<p className="text-sm text-muted-foreground">Agendamento desligado.</p>}
 </section>;
}