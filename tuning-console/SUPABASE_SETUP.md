# Supabase 설정 가이드

이 가이드는 타점 데이터를 Supabase에 저장하기 위한 설정 방법을 설명합니다.

## 1. Supabase 프로젝트 생성

1. [Supabase](https://app.supabase.com) 에 접속하여 로그인합니다
2. "New Project" 버튼을 클릭합니다
3. 프로젝트 정보를 입력합니다:
   - **Project name**: `tuning-lab` (또는 원하는 이름)
   - **Database Password**: 강력한 비밀번호 설정
   - **Region**: `Northeast Asia (Seoul)` 선택 (가장 가까운 리전)
4. "Create new project" 버튼을 클릭합니다 (1-2분 소요)

## 2. 환경 변수 설정

1. Supabase 프로젝트 대시보드에서 **Settings** → **API** 메뉴로 이동합니다

2. 다음 두 값을 복사합니다:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public**: `eyJhbGc...` (긴 토큰 문자열)

3. `/tuning-console/.env.local` 파일을 열고 다음과 같이 수정합니다:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

> ⚠️ **중요**: `.env.local` 파일은 절대 Git에 커밋하지 마세요!

## 3. 데이터베이스 테이블 생성

1. Supabase 대시보드에서 **SQL Editor** 메뉴로 이동합니다

2. "New query" 버튼을 클릭합니다

3. `/tuning-console/supabase/schema.sql` 파일의 내용을 전체 복사하여 붙여넣습니다

4. **Run** 버튼을 클릭하여 실행합니다

5. 성공 메시지가 표시되면 완료입니다

## 4. 테이블 확인

1. **Table Editor** 메뉴로 이동합니다

2. `hit_points` 테이블이 생성되었는지 확인합니다

3. 테이블 구조:
   - `id`: UUID (자동 생성)
   - `tonic`: 토닉 오차 (Hz)
   - `octave`: 옥타브 오차 (Hz)
   - `fifth`: 5도 오차 (Hz)
   - `coordinate_x`: 톤필드 X 좌표
   - `coordinate_y`: 톤필드 Y 좌표
   - `strength`: 강도
   - `location`: 위치 (internal/external)
   - `intent`: 의도 (텍스트)
   - `created_at`: 생성 시간 (자동 기록)

## 5. 개발 서버 재시작

환경 변수를 변경했으므로 Next.js 개발 서버를 재시작해야 합니다:

```bash
cd tuning-console
npm run dev
```

## 6. 테스트

1. 브라우저에서 `http://localhost:3000` 접속
2. 조율 오차 값 입력 (또는 R 버튼으로 랜덤 생성)
3. 톤필드를 클릭하여 좌표 선택
4. 위치, 강도, 의도 입력
5. "타점 데이터 저장" 버튼 클릭
6. 성공 메시지가 표시되면 저장 완료!

## 7. 데이터 확인

Supabase 대시보드의 **Table Editor**에서 `hit_points` 테이블을 열어 저장된 데이터를 확인할 수 있습니다.

## 문제 해결

### "Invalid API key" 오류
- `.env.local` 파일의 키 값이 정확한지 확인
- 개발 서버 재시작

### "relation does not exist" 오류
- SQL 스크립트가 제대로 실행되었는지 확인
- Table Editor에서 `hit_points` 테이블이 있는지 확인

### 저장은 되지만 데이터가 보이지 않음
- RLS (Row Level Security) 정책 확인
- SQL Editor에서 `SELECT * FROM hit_points;` 실행하여 확인
