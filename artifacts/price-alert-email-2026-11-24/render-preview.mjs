import { writeFileSync } from 'node:fs';
import { priceAlertEmailMessage } from '../../src/lib/price-alert-email.ts';
const message=priceAlertEmailMessage({id:'10000000-0000-4000-8000-000000000001',lease_token:'10000000-0000-4000-8000-000000000002',kind:'price_update',delivery_from:'vitale@example.test',delivery_to:'pessoa@example.test',reply_to:'reply@example.test',payload:{name:'Pessoa Exemplo',bikeId:'v9_max',bikeName:'V9 Max',currentPrice:6174,referencePrice:6250,targetPrice:5900,image:null,link:'https://meli.la/24CEhyq',observedAt:'2026-11-24T12:55:00Z'}});
writeFileSync(new URL('./v9-max-email-preview.html',import.meta.url),message.html);
writeFileSync(new URL('./v9-max-email-preview.txt',import.meta.url),message.subject+'\n\n'+message.text);
