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
  tuning_target: 'tonic' | 'octave' | 'fifth';
  primary_target: 'tonic' | 'octave' | 'fifth';  // 주 타겟 (가중치 1등)
  auxiliary_target: 'tonic' | 'octave' | 'fifth' | null;  // 보조 타겟 (벡터 협력자)
  is_compound: boolean;  // 복합 타점 여부
  target_display: string;  // UI 표시용 (예: "토닉 (+5도)")
  coordinate_x: number;
  coordinate_y: number;
  strength: number;
  hit_count: number;
  location: 'internal' | 'external';
  intent: string;
  hammering_type?: 'SNAP' | 'PULL' | 'PRESS' | null;  // 해머링 타법 (튕겨치기/당겨치기/눌러치기)
  created_at?: string;
}
