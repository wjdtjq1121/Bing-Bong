# 행성 선택 및 취소 로직 구현 가이드

## 개요
게임에서 행성을 선택하고 배치할 때, 사용자가 직관적으로 선택을 취소할 수 있도록 하는 기능입니다.

## 구현된 기능

### 1. 행성 선택 토글 (같은 행성 재클릭)
선택된 행성을 다시 클릭하면 선택이 해제됩니다.

```javascript
// 행성 선택
function setupPlanetSelector() {
    const planetItems = document.querySelectorAll('.planet-item');
    planetItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // 회전 버튼 클릭 시 행성 선택되지 않도록
            if (e.target.classList.contains('rotate-btn')) {
                return;
            }

            // ✨ 이미 선택된 행성을 다시 클릭하면 선택 해제
            if (item.classList.contains('selected')) {
                item.classList.remove('selected');
                gameState.selectedPlanet = null;
                return;
            }

            // 다른 행성 선택
            planetItems.forEach(p => p.classList.remove('selected'));
            item.classList.add('selected');
            gameState.selectedPlanet = item.dataset.planet;
        });
    });

    // ... 나머지 코드
}
```

### 2. 행성 패널 바깥 영역 클릭 시 선택 해제
게임 보드가 아닌 다른 영역을 클릭하면 선택이 해제됩니다.

```javascript
// 행성 패널 바깥 영역 클릭 시 선택 해제
document.addEventListener('click', (e) => {
    const planetPanel = document.querySelector('.planet-panel');
    const gameBoard = e.target.closest('.game-board');
    const cell = e.target.closest('.cell');
    const boardWrapper = e.target.closest('.board-wrapper');
    const boardLabel = e.target.closest('.board-label');

    // ✨ 행성 패널 내부를 클릭한 경우 또는 게임 보드 관련 요소를 클릭한 경우 무시
    if (planetPanel && !planetPanel.contains(e.target) && !gameBoard && !cell && !boardWrapper && !boardLabel) {
        // 선택된 행성 해제
        planetItems.forEach(p => p.classList.remove('selected'));
        gameState.selectedPlanet = null;
    }
});
```

### 3. 배치된 행성 제거 개선
행성의 원점뿐만 아니라 행성이 차지하는 모든 셀을 클릭해도 제거할 수 있습니다.

**Before (기존 코드):**
```javascript
const existingPlanet = gameState.explorerBoard[row][col];
if (existingPlanet && existingPlanet.isOrigin) {  // ❌ 원점만 체크
    // 제거 로직
}
```

**After (개선된 코드):**
```javascript
const existingPlanet = gameState.explorerBoard[row][col];
if (existingPlanet) {  // ✅ 행성이 있으면 무조건 제거 가능
    // 행성의 어느 부분을 클릭해도 제거 가능
    const planetNames = {
        'small-red': '첫 만남 행성',
        'small-orange': '대부도 불꽃놀이 별',
        'small-blue': '하동 녹차밭 별',
        'medium-earth': '333일 기념 별',
        'medium-jupiter': '제주도 여행 별',
        'large-saturn': '크리스마스 별'
    };
    const confirmed = confirm(`${planetNames[existingPlanet.type]} 행성을 제거하시겠습니까?`);
    if (confirmed) {
        removePlanetFromBoard(gameState.explorerBoard, existingPlanet.type);
        renderBoard('explorerBoard');
    }
    return;
}
```

## 주의사항

### 1. 게임 보드 클릭 시 선택 유지
게임 보드 관련 요소를 클릭할 때는 행성 선택이 해제되면 안 됩니다.

**체크해야 할 요소들:**
- `.game-board` - 게임 보드 자체
- `.cell` - 개별 셀
- `.board-wrapper` - 보드 래퍼
- `.board-label` - 보드 라벨 (1-11, A-G 등)

### 2. 이벤트 전파 방지
회전 버튼이나 다른 버튼 클릭 시 부모 요소의 클릭 이벤트가 전파되지 않도록 주의해야 합니다.

```javascript
btn.addEventListener('click', (e) => {
    e.stopPropagation(); // ✅ 이벤트 전파 방지
    // 버튼 로직
});
```

### 3. 적용 위치
이 로직은 두 곳에서 모두 적용되어야 합니다:
- `placePlanet(row, col)` - 질문자 보드에서 행성 배치
- `markExploration(row, col)` - 탐험가 보드에서 행성 배치

## 테스트 시나리오

### 시나리오 1: 행성 선택 및 취소
1. 행성을 클릭하여 선택 (파란색 테두리 표시)
2. 같은 행성을 다시 클릭
3. ✅ 선택이 해제되고 테두리가 사라져야 함

### 시나리오 2: 보드 바깥 클릭
1. 행성을 선택
2. 헤더나 빈 공간을 클릭
3. ✅ 선택이 해제되어야 함

### 시나리오 3: 보드 클릭 시 유지
1. 행성을 선택
2. 게임 보드의 셀을 클릭
3. ✅ 선택이 유지되어야 함 (배치 가능)

### 시나리오 4: 행성 제거
1. 행성을 배치
2. 행성 선택을 해제 (다른 곳 클릭)
3. 배치된 행성의 아무 부분이나 클릭
4. ✅ 제거 확인 창이 떠야 함
5. 확인 클릭
6. ✅ 행성이 제거되어야 함

## 버전 히스토리

### v2.2.0 (2024-12-24)
- 행성 선택 토글 기능 추가
- 행성 패널 바깥 영역 클릭 시 선택 해제 기능 추가

### v2.2.1 (2024-12-24)
- 게임 보드 클릭 시 행성 선택이 해제되는 버그 수정
- 게임 보드 관련 요소 클릭 시 선택 유지되도록 개선

### v2.2.2 (2024-12-24)
- 행성의 원점이 아닌 부분을 클릭해도 제거 가능하도록 개선
- `isOrigin` 체크 제거하여 모든 셀에서 제거 가능

## 코드 위치

**파일:** `script.js`
**함수:**
- `setupPlanetSelector()` - 행성 선택 및 취소 로직 (약 2238번째 줄)
- `placePlanet(row, col)` - 질문자 보드 행성 배치 및 제거 (약 334번째 줄)
- `markExploration(row, col)` - 탐험가 보드 행성 배치 및 제거 (약 380번째 줄)

## 추가 개선 사항 제안

1. **키보드 ESC 키로 선택 해제**
```javascript
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && gameState.selectedPlanet) {
        planetItems.forEach(p => p.classList.remove('selected'));
        gameState.selectedPlanet = null;
    }
});
```

2. **선택 상태 시각적 피드백 강화**
- 선택된 행성에 애니메이션 효과 추가
- 커서 스타일 변경 (pointer → crosshair)

3. **더블클릭으로 빠른 배치**
- 현재는 클릭 → 다시 클릭으로 배치
- 더블클릭 한 번으로 즉시 배치 가능하도록 개선
