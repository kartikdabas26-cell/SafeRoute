import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yajzxortbnkfeptqilla.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5DdhIXutymwmCZJI-S6Xxg_DECjMDr3';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);