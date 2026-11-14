/** Offline deterministic composition, actual Storage original is supplied by the authorized read. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {composeInstagramPostCover} from '../supabase/functions/_shared/cover-renderer/index';
import {hash} from '../src/lib/instagram/contract';
const root='/tmp/instagram-single-post/review';await mkdir(root,{recursive:true});
const title='Nova Caloi Mobylette: o lançamento justificava a oportunidade de compra?';
const result=await composeInstagramPostCover({bytes:new Uint8Array(await readFile('/tmp/instagram-single-post/original.png')),mime:'image/png'},title);
await writeFile(`${root}/01.jpg`,result.bytes);await writeFile(`${root}/manifest.json`,JSON.stringify({articleId:'b3ab69be-7eb1-4f94-9ac6-4619fb6942d4',title,sha256:await hash(result.bytes),width:1080,height:1350,lines:result.lines}));console.log('Private preview composed',result.lines);