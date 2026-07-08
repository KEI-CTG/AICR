# KEI · AI 융복합 연구단 웹사이트

기후·환경 정책 의사결정을 AI로 지원하는 KEI AI 융복합 연구단 소개 웹사이트.
빌드 과정이 없는 **정적 HTML/CSS/JS** 사이트이며, 한국어·영어 이중언어와 PWA를
지원합니다.

## 폴더 구조

```
.
├── docs/     ← 🚀 배포 대상. GitHub Pages가 이 폴더를 서비스합니다.
│   ├── .nojekyll         # Jekyll 처리 비활성화 (필수)
│   ├── index.html        # 영문 랜딩
│   ├── index.ko.html     # 한국어 랜딩
│   ├── briefs.html / papers.html / presentations.html
│   ├── manifest.json     # PWA 매니페스트
│   ├── assets/           # 이미지·SVG·폰트·JS·영상
│   ├── briefs_files/     # 연구 브리프 상세 페이지
│   └── presentation_files/  # 발표 상세 페이지
└── source/   ← 🛠 배포 대상 아님. 필러 아이콘 SVG 재생성 파이프라인.
    ├── scripts/          # 파이썬 스크립트 (docs/assets 를 대상으로 동작)
    └── svg_original/     # 아이콘 SVG 원본
```

## GitHub Pages 배포

1. 이 저장소를 GitHub에 올립니다 (`git push`).
2. 저장소 **Settings → Pages** 로 이동.
3. **Source: Deploy from a branch** 선택.
4. **Branch: `main`**, **Folder: `/docs`** 로 지정하고 저장.
5. 잠시 후 `https://<사용자명>.github.io/<저장소명>/` 에서 사이트가 열립니다.

> `docs/.nojekyll` 파일이 있어야 GitHub Pages가 파일을 그대로 서빙합니다.
> 모든 경로가 상대경로라 프로젝트 하위 경로(`/<저장소명>/`)에서도 정상 동작합니다.

## 로컬에서 미리 보기

정적 사이트라 아무 HTTP 서버나 쓸 수 있습니다 (`file://` 직접 열기는 불가 —
ES 모듈·비디오 때문).

```bash
cd docs
python -m http.server 8765
# http://localhost:8765/index.html  (영문)
# http://localhost:8765/index.ko.html  (한국어)
```

## 아이콘 SVG 재생성 (선택)

`docs/assets/` 의 필러 아이콘(`grid_v2.svg`, `kgraph_v2.svg`, `monitor_v2.svg`)을
다시 만들려면:

```bash
pip install svgpathtools cairosvg pillow
python source/scripts/crop_svgs_pixel.py   # 등 필요한 스크립트 실행
```

스크립트의 `BASE` 경로는 자기 위치 기준으로 `../../docs/assets` 를 가리킵니다.
자세한 내용은 `source/README.md` 참조.

## 알려진 이슈

- 상단 내비게이션의 **`research.html`** 링크는 아직 대상 페이지가 없습니다
  (`index.html`, `index.ko.html`). 배포 전 메뉴에서 제거하거나 페이지를
  추가해야 합니다.
