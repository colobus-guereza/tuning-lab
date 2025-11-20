# Vercel 배포 가이드

이 가이드는 조율 실험실 콘솔을 Vercel에 배포하는 방법을 설명합니다.

## 전제 조건

- GitHub 계정 (이미 설정됨: colobus-guereza/tuning-lab)
- Supabase 프로젝트 (이미 생성됨)
- Vercel 계정 (https://vercel.com)

## 1. Vercel 계정 생성 및 로그인

1. https://vercel.com 접속
2. "Sign Up" 또는 "Continue with GitHub" 클릭
3. GitHub 계정으로 로그인

## 2. 새 프로젝트 Import

### 방법 A: Vercel 웹사이트에서

1. Vercel 대시보드에서 "Add New..." → "Project" 클릭
2. "Import Git Repository" 선택
3. GitHub 연동 후 `colobus-guereza/tuning-lab` 선택
4. "Import" 클릭

### 방법 B: Vercel CLI 사용 (권장)

```bash
# Vercel CLI 설치
npm install -g vercel

# 프로젝트 디렉토리에서 배포
cd /Users/equus/Desktop/tlab/tuning-console
vercel
```

## 3. 환경 변수 설정

Vercel 프로젝트 설정에서 다음 환경 변수를 추가해야 합니다:

### Settings → Environment Variables

**필수 변수:**

| 변수 이름 | 값 | 환경 |
|-----------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://vrtcrllfpzialixakhrl.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` 파일에서 복사 | Production, Preview, Development |

### 환경 변수 추가 방법:

1. Vercel 프로젝트 대시보드 → **Settings** 탭
2. 왼쪽 메뉴에서 **Environment Variables** 선택
3. **Add New** 버튼 클릭
4. 각 변수 추가:
   - **Name**: 변수 이름 입력
   - **Value**: 값 입력
   - **Environment**: Production, Preview, Development 모두 선택
   - **Save** 클릭

## 4. 프로젝트 설정

### Framework Preset
- **자동 감지**: Next.js (Vercel이 자동으로 감지)

### Build & Output Settings
- **Build Command**: `npm run build` (기본값)
- **Output Directory**: `.next` (기본값)
- **Install Command**: `npm install` (기본값)

### Root Directory
- **Root Directory**: `tuning-console` (monorepo인 경우)
- 단일 프로젝트라면 기본값 유지

## 5. 배포

### 자동 배포 (권장)

Git push만 하면 자동으로 배포됩니다:

```bash
git add .
git commit -m "feat: 새 기능 추가"
git push
```

- `main` 브랜치 푸시 → Production 배포
- 다른 브랜치 푸시 → Preview 배포

### 수동 배포

```bash
# Vercel CLI로 배포
vercel --prod
```

## 6. 배포 확인

1. Vercel 대시보드에서 배포 상태 확인
2. 배포 완료 후 제공되는 URL 확인 (예: `tuning-lab.vercel.app`)
3. 브라우저에서 URL 접속하여 동작 확인

## 7. 도메인 설정 (선택사항)

### 커스텀 도메인 연결

1. Vercel 프로젝트 → **Settings** → **Domains**
2. **Add Domain** 버튼 클릭
3. 도메인 이름 입력 (예: `tuning-lab.com`)
4. DNS 설정 안내에 따라 도메인 제공업체에서 설정

## 8. Supabase RLS 정책 확인

Vercel 배포 후 Supabase에서 RLS 정책이 제대로 작동하는지 확인:

- ✅ SELECT 정책 활성화
- ✅ INSERT 정책 활성화
- ✅ DELETE 정책 활성화

## 9. 문제 해결

### 빌드 실패

**환경 변수 확인:**
```bash
# Vercel 대시보드 → Settings → Environment Variables에서 확인
```

**빌드 로그 확인:**
- Vercel 대시보드 → Deployments → 실패한 배포 클릭 → Logs 확인

### Supabase 연결 실패

**CORS 설정 확인:**
- Supabase 대시보드 → Settings → API → CORS
- Vercel 도메인 추가 (예: `https://tuning-lab.vercel.app`)

### 환경 변수가 반영되지 않음

- 환경 변수 변경 후 **재배포 필요**
- Vercel 대시보드 → Deployments → 최신 배포 → "Redeploy" 클릭

## 10. 성능 최적화 (선택사항)

### Edge Functions 활성화

next.config.ts에서:
```typescript
const nextConfig = {
  // Edge Runtime 활성화
  experimental: {
    runtime: 'edge',
  },
}
```

### Image Optimization

Vercel이 자동으로 Next.js Image 컴포넌트 최적화를 제공합니다.

## 11. 모니터링

### Vercel Analytics

1. Vercel 프로젝트 → **Analytics** 탭
2. 트래픽, 성능 지표 확인

### Vercel Logs

1. Vercel 프로젝트 → **Logs** 탭
2. 실시간 로그 및 오류 확인

## 참고 자료

- [Vercel 공식 문서](https://vercel.com/docs)
- [Next.js 배포 가이드](https://nextjs.org/docs/deployment)
- [Supabase with Vercel](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)

## 요약

```bash
# 1. Vercel CLI 설치
npm install -g vercel

# 2. 배포
cd /Users/equus/Desktop/tlab/tuning-console
vercel

# 3. 환경 변수 설정 (Vercel 대시보드에서)
# 4. Production 배포
vercel --prod

# 5. 자동 배포 (main 브랜치)
git push
```

배포 후 URL: `https://tuning-lab.vercel.app` (또는 자동 생성된 URL)
