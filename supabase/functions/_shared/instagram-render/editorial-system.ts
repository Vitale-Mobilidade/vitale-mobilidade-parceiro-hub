/** Runtime-neutral fixed masters. Art v4 = Vitale Editorial System 1.0. */
export const EDITORIAL_SYSTEM={version:4,width:1080,height:1350,margin:64,safeY:80,cardRadius:24,cardPadding:32,border:2,
 colors:{petroleum:[17,45,42],deep:[8,43,41],mint:[55,230,163],action:[11,121,81],white:[255,255,255]},
 type:{cover:76,title:64,support:42,cardTitle:36,cardBody:42,label:28,footer:27},
 weights:{title:800,emphasis:'italic',support:400,cardTitle:700,cardBody:500,label:500,footer:600},
 actions:['Curta','Comente','Salve','Compartilhe'],
 masters:{A:'Capa editorial',B:'Contexto e introdução',C:'Descoberta técnica',D:'Comparativo',E:'Uso cotidiano',F:'Veredito e engajamento'}
} as const;
export type Master=keyof typeof EDITORIAL_SYSTEM.masters;
export type EditorialCard={title:string;text:string;icon:'sun'|'battery'|'weight'|'route'|'check'|'triangle-alert'|'arrow-right';kind:'information'|'positive'|'attention'};
