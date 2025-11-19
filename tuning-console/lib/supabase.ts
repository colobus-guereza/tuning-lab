import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 환경 변수가 설정되지 않았을 때 더미 클라이언트 생성
// 실제 사용 시 에러가 발생하도록 처리
const isDevelopment = !supabaseUrl || supabaseUrl === 'your-project-url';

export const supabase = isDevelopment
  ? createClient('https://placeholder.supabase.co', 'placeholder-key')
  : createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for hit point data
export interface HitPointData {
  id?: string;
  tonic: number;
  octave: number;
  fifth: number;
  coordinate_x: number;
  coordinate_y: number;
  strength: number;
  location: 'internal' | 'external';
  intent: string;
  created_at?: string;
}
