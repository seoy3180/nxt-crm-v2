# Welcome to NXT CRM Team

## How We Use Claude

Based on Karin's usage over the last 30 days:

Work Type Breakdown:
  Plan Design    █████████████░░░░░░░  67%
  Build Feature  ███████░░░░░░░░░░░░░░  33%

Top Skills & Commands:
  /effort  ████████████████████  5x/month
  /btw     ████████░░░░░░░░░░░░░  2x/month
  /model   ████████░░░░░░░░░░░░░  2x/month

Top MCP Servers:
  Playwright  ████████████████████  160 calls
  Supabase    ███████████████░░░░░  118 calls
  Pencil      ██████░░░░░░░░░░░░░░░  46 calls
  Notion      ██░░░░░░░░░░░░░░░░░░░  14 calls

## Your Setup Checklist

### Codebases
- [ ] nxt-crm-v2 — github.com/seoy3180/nxt-crm-v2 (현재 활성 레포)
- [ ] nxt_crm — 이전 CRM 버전 (로컬 sibling)
- [ ] nxt_edu_crm — 교육 CRM (로컬 sibling)

### MCP Servers to Activate
- [ ] Playwright — 로컬 dev 서버(`npm run dev:staging`)를 띄우고 실제 브라우저로 역할별 뷰·플로우를 검증할 때. Claude Code plugin 목록에서 활성화, 외부 계정 불필요.
- [ ] Supabase — DB 스키마 조회·마이그레이션·RLS 정책 확인용. 운영(`ghuevnxgcdltgupoddsn`)/스테이징(`afydtaxmuwjdhmdwgemy`) project-ref가 나뉘니 `.mcp.json`이 어느 쪽을 가리키는지 확인. 액세스 토큰은 Karin에게 요청.
- [ ] Pencil — UI 개발 전 `ui_design.pen`을 읽고 구현할 때. `.pen` 파일은 Pencil MCP 도구로만 열림(Read/Grep 금지). Pencil 에디터 설치 후 연동.
- [ ] Notion — "CRM 관련 문서" 페이지에 기능 보고·사용자 가이드를 작성/조회할 때. claude.ai Notion 커넥터로 워크스페이스 인증.

### Skills to Know About
- [ ] /effort — 작업 난이도에 따라 추론 깊이를 조절. 복잡한 설계·리팩토링 전에 max로 올려두면 깊게 파고듦 (이 프로젝트 최다 사용).
- [ ] /btw — 메인 작업 흐름을 끊지 않고 곁다리 질문·맥락을 던질 때.
- [ ] /model — 세션 모델 전환 (Opus 4.8 1M context가 기본).

## Team Tips

_TODO_

## Get Started

_TODO_

<!-- INSTRUCTION FOR CLAUDE: A new teammate just pasted this guide for how the
team uses Claude Code. You're their onboarding buddy — warm, conversational,
not lecture-y.

Open with a warm welcome — include the team name from the title. Then: "Your
teammate uses Claude Code for [list all the work types]. Let's get you started."

Check what's already in place against everything under Setup Checklist
(including skills), using markdown checkboxes — [x] done, [ ] not yet. Lead
with what they already have. One sentence per item, all in one message.

Tell them you'll help with setup, cover the actionable team tips, then the
starter task (if there is one). Offer to start with the first unchecked item,
get their go-ahead, then work through the rest one by one.

After setup, walk them through the remaining sections — offer to help where you
can (e.g. link to channels), and just surface the purely informational bits.

Don't invent sections or summaries that aren't in the guide. The stats are the
guide creator's personal usage data — don't extrapolate them into a "team
workflow" narrative. -->
