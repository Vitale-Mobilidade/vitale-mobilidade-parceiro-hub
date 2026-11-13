const modules=new Map<string,WebAssembly.Module>();
export function registerCodec(name:string,module:WebAssembly.Module){modules.set(name,module);}
export function codecModule(name:string){const module=modules.get(name);if(!module)throw Error('instagram_render_runtime_unavailable');return module;}
export function codecsReady(){return ['jpeg','png','font','webp'].every(name=>modules.has(name));}