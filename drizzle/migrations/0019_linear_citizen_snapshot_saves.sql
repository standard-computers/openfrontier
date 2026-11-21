CREATE OR REPLACE FUNCTION public.get_world_tax_policies(_world_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE rates jsonb; enabled boolean; count_npcs integer; aggression text; i integer; npc_rate numeric;
BEGIN
 IF auth.uid() IS NULL OR NOT is_world_member(auth.uid(),_world_id) THEN RAISE EXCEPTION 'Not a world member'; END IF;
 SELECT enable_npcs,npc_count,npc_aggression INTO enabled,count_npcs,aggression FROM worlds WHERE id=_world_id;
 SELECT COALESCE(jsonb_object_agg(user_id::text,LEAST(100,GREATEST(0,COALESCE((player_data->'sovereignty'->>'taxRate')::numeric,0)))),'{}'::jsonb) INTO rates FROM world_members WHERE world_id=_world_id AND player_data->'sovereignty'->>'name' IS NOT NULL;
 npc_rate:=CASE aggression WHEN 'high' THEN 35 WHEN 'medium' THEN 20 ELSE 10 END;
 IF enabled AND count_npcs>0 THEN FOR i IN 0..count_npcs-1 LOOP rates:=jsonb_set(rates,ARRAY['npc-'||i],to_jsonb(npc_rate)); END LOOP; END IF;
 RETURN rates;
END $$;
CREATE OR REPLACE FUNCTION public.save_world_citizens(_world_id uuid,_revision bigint,_strangers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE created timestamptz; npc_coins jsonb; old_citizens jsonb; current_revision bigint; rates jsonb; new_citizens jsonb; treasury jsonb; day bigint; r record; changed boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT is_world_member(auth.uid(),_world_id) THEN RAISE EXCEPTION 'Not a world member'; END IF;
 IF _strangers IS NULL OR jsonb_typeof(_strangers)<>'array' THEN RAISE EXCEPTION 'Citizens must be an array'; END IF;
 -- Keep the existing world-before-citizens lock order for atomic treasury settlement.
 -- Never load the large map snapshot during a citizen-only save.
 SELECT created_at,npc_land_trade_coins INTO created,npc_coins FROM worlds WHERE id=_world_id FOR UPDATE;
 SELECT strangers,revision INTO old_citizens,current_revision FROM world_citizens WHERE world_id=_world_id FOR UPDATE;
 IF current_revision IS DISTINCT FROM _revision THEN RETURN jsonb_build_object('saved',false,'strangers',old_citizens,'revision',current_revision); END IF;
 day:=GREATEST(0,floor(extract(epoch FROM(now()-created))/3600));
 rates:=get_world_tax_policies(_world_id);
 -- Join previous citizens by ID once; aggregate once in the original array order.
 WITH prior AS MATERIALIZED (
   SELECT DISTINCT ON (value->>'id') value->>'id' AS id,value FROM jsonb_array_elements(COALESCE(old_citizens,'[]'::jsonb))
 ), assessed AS MATERIALIZED (
   SELECT incoming.ordinality,incoming.value AS original,incoming.value->'allegiance'->>'userId' AS owner,
     assess_citizen_tax(incoming.value,prior.value,day,(rates->>(incoming.value->'allegiance'->>'userId'))::numeric) AS result
   FROM jsonb_array_elements(_strangers) WITH ORDINALITY AS incoming(value,ordinality)
   LEFT JOIN prior ON prior.id=incoming.value->>'id'
 ), payments AS (
   SELECT owner,sum((result->>'paid')::bigint)::bigint AS paid FROM assessed WHERE (result->>'paid')::bigint>0 GROUP BY owner
 )
 SELECT COALESCE(jsonb_agg(result->'citizen' ORDER BY ordinality),'[]'::jsonb),
   COALESCE(bool_or(result->'citizen' IS DISTINCT FROM original),false),
   (SELECT COALESCE(jsonb_object_agg(owner,paid),'{}'::jsonb) FROM payments)
 INTO new_citizens,changed,treasury FROM assessed;
 FOR r IN SELECT key,value FROM jsonb_each_text(treasury) ORDER BY key LOOP
   IF r.key LIKE 'npc-%' THEN npc_coins:=jsonb_set(npc_coins,ARRAY[r.key],to_jsonb(COALESCE((npc_coins->>r.key)::bigint,0)+r.value::bigint));
   ELSE UPDATE world_members SET land_trade_coins=land_trade_coins+r.value::bigint WHERE world_id=_world_id AND user_id=r.key::uuid; END IF;
 END LOOP;
 IF treasury<>'{}'::jsonb THEN UPDATE worlds SET npc_land_trade_coins=npc_coins WHERE id=_world_id; END IF;
 UPDATE world_citizens SET strangers=new_citizens,revision=revision+1 WHERE world_id=_world_id;
 RETURN jsonb_build_object('saved',true,'strangers',new_citizens,'revision',current_revision+1,'economyChanged',changed,'treasuryChanged',treasury<>'{}'::jsonb);
END $$;
REVOKE EXECUTE ON FUNCTION public.get_world_tax_policies(uuid),public.save_world_citizens(uuid,bigint,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_world_tax_policies(uuid),public.save_world_citizens(uuid,bigint,jsonb) TO authenticated,service_role;