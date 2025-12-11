-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.app_emails (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  email text,
  CONSTRAINT app_emails_pkey PRIMARY KEY (id)
);
CREATE TABLE public.app_groups (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  group text NOT NULL UNIQUE,
  CONSTRAINT app_groups_pkey PRIMARY KEY (id)
);
CREATE TABLE public.app_modules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  is_active boolean DEFAULT true,
  CONSTRAINT app_modules_pkey PRIMARY KEY (id)
);
CREATE TABLE public.inventory_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  name text NOT NULL,
  icon text,
  user_id uuid DEFAULT auth.uid(),
  CONSTRAINT inventory_categories_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.inventory_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  name text NOT NULL,
  model text,
  serial_number text,
  purchase_date date,
  warranty_end_date date,
  price numeric,
  category_id uuid,
  location_id uuid,
  user_id uuid DEFAULT auth.uid(),
  photo_path text,
  receipt_path text,
  external_links jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT inventory_items_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.inventory_categories(id),
  CONSTRAINT inventory_items_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.inventory_locations(id),
  CONSTRAINT inventory_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.inventory_loans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  item_id uuid NOT NULL,
  borrower_name text NOT NULL,
  loan_date date NOT NULL DEFAULT now(),
  return_date date,
  notes text,
  CONSTRAINT inventory_loans_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_loans_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id)
);
CREATE TABLE public.inventory_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  name text NOT NULL,
  description text,
  user_id uuid DEFAULT auth.uid(),
  parent_id uuid,
  CONSTRAINT inventory_locations_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_locations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT inventory_locations_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.inventory_locations(id)
);
CREATE TABLE public.inventory_maintenance_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  description text NOT NULL,
  periodicity_days integer,
  last_maintenance_date date,
  responsible_user_id uuid,
  CONSTRAINT inventory_maintenance_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_maintenance_tasks_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id),
  CONSTRAINT inventory_maintenance_tasks_responsible_user_id_fkey FOREIGN KEY (responsible_user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  updated_at timestamp with time zone,
  full_name text,
  avatar_url text,
  role text DEFAULT 'user'::text,
  bio text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles_email (
  id_user uuid NOT NULL,
  id_email bigint NOT NULL,
  CONSTRAINT profiles_email_pkey PRIMARY KEY (id_user, id_email),
  CONSTRAINT profiles_email_id_email_fkey FOREIGN KEY (id_email) REFERENCES public.app_emails(id),
  CONSTRAINT profiles_email_id_user_fkey FOREIGN KEY (id_user) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles_groups (
  id_user uuid NOT NULL,
  id_group bigint NOT NULL,
  CONSTRAINT profiles_groups_pkey PRIMARY KEY (id_user, id_group),
  CONSTRAINT profiles_groups_id_user_fkey FOREIGN KEY (id_user) REFERENCES public.profiles(id),
  CONSTRAINT profiles_groups_id_group_fkey FOREIGN KEY (id_group) REFERENCES public.app_groups(id)
);
CREATE TABLE public.timeline_event_people (
  event_id uuid NOT NULL,
  person_id uuid NOT NULL,
  CONSTRAINT timeline_event_people_pkey PRIMARY KEY (event_id, person_id),
  CONSTRAINT timeline_event_people_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.timeline_events(id),
  CONSTRAINT timeline_event_people_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.timeline_people(id)
);
CREATE TABLE public.timeline_event_tags (
  event_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  CONSTRAINT timeline_event_tags_pkey PRIMARY KEY (event_id, tag_id),
  CONSTRAINT timeline_event_tags_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.timeline_events(id),
  CONSTRAINT timeline_event_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.timeline_tags(id)
);
CREATE TABLE public.timeline_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  title text NOT NULL,
  description text,
  location text,
  media_url text,
  external_links jsonb,
  visibility text DEFAULT 'family'::text,
  user_id text,
  CONSTRAINT timeline_events_pkey PRIMARY KEY (id),
  CONSTRAINT timeline_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.timeline_people (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  birth_date date,
  avatar_url text,
  user_id uuid,
  CONSTRAINT timeline_people_pkey PRIMARY KEY (id),
  CONSTRAINT timeline_people_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.timeline_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text DEFAULT '#4f46e5'::text,
  CONSTRAINT timeline_tags_pkey PRIMARY KEY (id)
);
CREATE TABLE public.travel_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_mileage boolean DEFAULT false,
  current_rate numeric,
  user_id uuid DEFAULT auth.uid(),
  icon_key text,
  CONSTRAINT travel_categories_pkey PRIMARY KEY (id),
  CONSTRAINT travel_categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.travel_employers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  name text NOT NULL,
  user_id uuid DEFAULT auth.uid(),
  CONSTRAINT travel_employers_pkey PRIMARY KEY (id),
  CONSTRAINT travel_employers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.travel_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  trip_id uuid NOT NULL,
  report_id uuid,
  category_id uuid,
  concept text,
  amount numeric NOT NULL DEFAULT 0,
  mileage_distance numeric,
  mileage_rate_snapshot numeric,
  is_reimbursable boolean DEFAULT true,
  receipt_url text,
  user_id uuid DEFAULT auth.uid(),
  receipt_waived boolean DEFAULT false,
  personal_accounting_checked boolean DEFAULT false,
  CONSTRAINT travel_expenses_pkey PRIMARY KEY (id),
  CONSTRAINT travel_expenses_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.travel_trips(id),
  CONSTRAINT travel_expenses_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.travel_reports(id),
  CONSTRAINT travel_expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.travel_categories(id),
  CONSTRAINT travel_expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.travel_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  name text NOT NULL,
  employer_id uuid NOT NULL,
  period_start date,
  period_end date,
  status text DEFAULT 'draft'::text,
  user_id uuid DEFAULT auth.uid(),
  pdf_url text,
  CONSTRAINT travel_reports_pkey PRIMARY KEY (id),
  CONSTRAINT travel_reports_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.travel_employers(id),
  CONSTRAINT travel_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.travel_trips (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  name text NOT NULL,
  employer_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'planned'::text,
  user_id uuid DEFAULT auth.uid(),
  report_id uuid,
  CONSTRAINT travel_trips_pkey PRIMARY KEY (id),
  CONSTRAINT travel_trips_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.travel_employers(id),
  CONSTRAINT travel_trips_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT travel_trips_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.travel_reports(id)
);