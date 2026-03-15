-- Fix security linter warnings: Add SET search_path = public to all functions
-- This addresses the 12 function search path warnings

-- Fix all existing functions to have proper search_path
CREATE OR REPLACE FUNCTION public.get_organization_model_usage(p_organization_id uuid)
 RETURNS TABLE(provider text, model text, section_name text, usage_count integer, last_used timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mut.provider,
    mut.model,
    mut.section_name,
    mut.usage_count,
    mut.last_used
  FROM public.model_usage_tracking mut
  WHERE mut.organization_id = p_organization_id
  ORDER BY mut.usage_count DESC, mut.last_used DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_organization_invitation(invitation_token text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
DECLARE
    invitation_record RECORD;
    result JSON;
BEGIN
    SELECT * INTO invitation_record
    FROM public.organization_invitations
    WHERE token = invitation_token
      AND expires_at > NOW()
      AND accepted_by IS NULL;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;

    UPDATE public.organization_invitations
    SET 
        accepted_by = auth.uid(),
        accepted_at = NOW()
    WHERE id = invitation_record.id;

    INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES (auth.uid(), invitation_record.organization_id, invitation_record.role);

    RETURN json_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_organization(p_organization_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
      AND organization_id = p_organization_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_organizations()
 RETURNS TABLE(organization_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $$
  SELECT ur.organization_id 
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_notification_count(p_user_id uuid)
 RETURNS TABLE(total integer, unread integer, urgent integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total,
        COUNT(*) FILTER (WHERE is_read = FALSE)::INTEGER as unread,
        COUNT(*) FILTER (WHERE is_read = FALSE AND priority = 'urgent')::INTEGER as urgent
    FROM public.notifications n
    WHERE n.user_id = p_user_id
        AND n.is_archived = FALSE
        AND (n.expires_at IS NULL OR n.expires_at > NOW());
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
BEGIN
    UPDATE public.notifications 
    SET is_read = TRUE, read_at = NOW()
    WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_model_usage(p_user_id uuid, p_organization_id uuid, p_provider text, p_model text, p_section_name text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
BEGIN
    INSERT INTO public.model_usage_tracking (
        user_id, organization_id, provider, model, section_name, usage_count, last_used
    )
    VALUES (
        p_user_id, p_organization_id, p_provider, p_model, p_section_name, 1, NOW()
    )
    ON CONFLICT (user_id, organization_id, provider, model, p_section_name)
    DO UPDATE SET
        usage_count = public.model_usage_tracking.usage_count + 1,
        last_used = NOW(),
        updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_model_usage_stats()
 RETURNS TABLE(provider text, total_models integer, active_models integer, deprecated_models integer, most_used_model text, total_usage_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mut.provider,
        COUNT(DISTINCT mut.model)::INTEGER as total_models,
        COUNT(DISTINCT mut.model)::INTEGER as active_models,
        0::INTEGER as deprecated_models,
        (SELECT model FROM public.model_usage_tracking 
         WHERE provider = mut.provider 
         ORDER BY usage_count DESC, last_used DESC 
         LIMIT 1) as most_used_model,
        COALESCE(SUM(mut.usage_count), 0)::BIGINT as total_usage_count
    FROM public.model_usage_tracking mut
    GROUP BY mut.provider
    ORDER BY total_usage_count DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_organization_id uuid, p_type text, p_title text, p_message text, p_data jsonb DEFAULT '{}'::jsonb, p_priority text DEFAULT 'medium'::text, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        user_id, organization_id, type, title, message, data, priority, expires_at
    )
    VALUES (
        p_user_id, p_organization_id, p_type, p_title, p_message, p_data, p_priority, p_expires_at
    )
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_notifications(p_user_id uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_unread_only boolean DEFAULT false)
 RETURNS TABLE(id uuid, type text, title text, message text, data jsonb, is_read boolean, priority text, created_at timestamp with time zone, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.type,
        n.title,
        n.message,
        n.data,
        n.is_read,
        n.priority,
        n.created_at,
        n.expires_at
    FROM public.notifications n
    WHERE n.user_id = p_user_id
        AND n.is_archived = FALSE
        AND (NOT p_unread_only OR n.is_read = FALSE)
        AND (n.expires_at IS NULL OR n.expires_at > NOW())
    ORDER BY 
        CASE n.priority 
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
        END,
        n.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
BEGIN
    UPDATE public.notifications 
    SET is_read = TRUE, read_at = NOW()
    WHERE user_id = p_user_id AND is_read = FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_notification(p_notification_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
BEGIN
    UPDATE public.notifications 
    SET is_archived = TRUE, archived_at = NOW()
    WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.track_knowledge_usage(p_knowledge_base_id uuid, p_user_id uuid, p_organization_id uuid, p_ai_function text, p_section_name text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
BEGIN
    UPDATE public.knowledge_base 
    SET 
        usage_count = COALESCE(usage_count, 0) + 1,
        last_used = NOW(),
        ai_sections_used = CASE 
            WHEN p_section_name IS NOT NULL AND NOT (COALESCE(ai_sections_used, '{}') @> ARRAY[p_section_name])
            THEN COALESCE(ai_sections_used, '{}') || ARRAY[p_section_name]
            ELSE COALESCE(ai_sections_used, '{}')
        END
    WHERE id = p_knowledge_base_id;
    
    INSERT INTO public.knowledge_usage_tracking (
        knowledge_base_id, user_id, organization_id, ai_function, section_name, usage_count, last_used
    )
    VALUES (
        p_knowledge_base_id, p_user_id, p_organization_id, p_ai_function, p_section_name, 1, NOW()
    )
    ON CONFLICT (knowledge_base_id, user_id, organization_id, ai_function, p_section_name)
    DO UPDATE SET
        usage_count = public.knowledge_usage_tracking.usage_count + 1,
        last_used = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_organization_knowledge_for_ai(p_organization_id uuid, p_ai_function text DEFAULT 'grant_writer'::text, p_section_name text DEFAULT NULL::text, p_limit integer DEFAULT 5)
 RETURNS TABLE(id uuid, title text, content text, document_type text, tags text[], usage_count integer, relevance_score double precision)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kb.id,
        kb.title,
        kb.content,
        kb.document_type,
        kb.tags,
        COALESCE(kb.usage_count, 0) as usage_count,
        CASE 
            WHEN p_section_name IS NOT NULL AND COALESCE(kb.ai_sections_used, '{}') @> ARRAY[p_section_name] THEN 1.0
            WHEN COALESCE(kb.usage_count, 0) > 0 THEN 0.8
            ELSE 0.5
        END as relevance_score
    FROM public.knowledge_base kb
    WHERE kb.organization_id = p_organization_id
        AND kb.is_active = TRUE
    ORDER BY 
        relevance_score DESC,
        COALESCE(kb.usage_count, 0) DESC,
        kb.created_at DESC
    LIMIT p_limit;
END;
$$;