/** Browser-safe Portuguese messages for stable Instagram workflow codes. Never shows raw JSON. */
const messages:Record<string,string>={
 instagram_script_rejected:'Roteiro recebido, mas reprovado na validação. Nenhuma arte foi gerada; use Retomar para pedir um novo roteiro.',
 instagram_script_uncertain_no_replay:'O resultado do roteiro ficou incerto (rede ou gravação). Para evitar cobrança duplicada, não será repetido automaticamente; requer conferência manual.',
 instagram_script_retry_unsafe:'Já existe arte, cenário ou envio neste rascunho; um novo roteiro não é permitido.',
 instagram_scene_uncertain_continue_without_scene:'A ambientação ficou incerta e não será repetida. Use Concluir sem cenário.',
 instagram_edge_unreachable:'Sem confirmação do serviço de geração. O passo não será repetido automaticamente.',
 instagram_render_unreachable:'Sem resposta do compositor. Use Retomar para continuar as artes.',
 instagram_generation_failed:'Não foi possível concluir a geração.',
};
const CODE=/^[a-z0-9_]{3,80}$/;
export function safeErrorCode(value:unknown){return typeof value==='string'&&CODE.test(value)?value:'instagram_generation_failed';}
export function instagramErrorMessage(code:string|null|undefined,message?:string|null){
 if(code&&messages[code])return messages[code];
 if(message&&!/^\s*[[{]/.test(message)&&message.length<=300)return message;
 return code&&CODE.test(code)?`Falha: ${code}`:messages.instagram_generation_failed;
}
