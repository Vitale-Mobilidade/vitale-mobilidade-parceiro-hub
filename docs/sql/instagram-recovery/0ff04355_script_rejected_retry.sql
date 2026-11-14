-- REVISÃO APENAS — NÃO EXECUTADO. Recuperação pontual do rascunho Mobylette.
-- Prova: a captura do dono mostra a resposta Gemini recebida e reprovada pelo schema
-- (evidências como objetos, scene ausente, módulos fora do enum, emphasis > 45) ANTES
-- do clique seguinte em Retomar, que só sobrescreveu o código por instagram_script_uncertain_no_replay.
-- Logo não há resultado pago utilizável nem incerto; a nova tentativa é explícita (Retomar).
-- Pré-requisito: Hub publicado com o commit desta correção.
begin;
create temporary table _ig_backup on commit drop as
 select id,revision,state,script_attempted,error_code,error_message from public.instagram_carousel_jobs
 where id='0ff04355-fa9c-43b3-9b8a-14c1aaedff63';
select * from _ig_backup; -- copie a linha para o registro antes do commit
update public.instagram_carousel_jobs
   set script_attempted=false,
       error_code='instagram_script_rejected',
       error_message='Roteiro recebido e reprovado na validação (formato). Use Retomar para pedir um novo roteiro.'
 where id='0ff04355-fa9c-43b3-9b8a-14c1aaedff63' and revision=1 and state='blocked'
   and error_code='instagram_script_uncertain_no_replay' and script is null
   and jsonb_array_length(coalesce(assets,'[]'::jsonb))=0 and scene_path is null
   and scene_attempted=false and publish_attempted=false and lease_token is null
   and coalesce(jsonb_array_length(to_jsonb(children)),0)=0 and album_id is null;
-- Deve afetar exatamente 1 linha; caso contrário: rollback;
commit;
-- ROLLBACK (só se Retomar ainda não foi clicado):
-- update public.instagram_carousel_jobs set script_attempted=true,
--   error_code='instagram_script_uncertain_no_replay', error_message=<valor do backup>
-- where id='0ff04355-fa9c-43b3-9b8a-14c1aaedff63' and revision=1 and state='blocked'
--   and error_code='instagram_script_rejected' and script is null and script_attempted=false;
