// 버전 정보
const GAME_VERSION = "2.0.0";

// 게임 상태 관리
const gameState = {
    phase: 'waiting', // waiting, setup, playing, finished
    mode: 'singlePlay',
    selectedPlanet: null,
    selectedPosition: null, // 선택된 위치
    planetRotations: {
        'medium-jupiter': 0,
        'large-saturn': 0
    }, // 각 행성별 회전 상태
    pendingPlacement: null, // 대기 중인 배치 정보
    laserCount: 0,
    explorerBoard: Array(7).fill(null).map(() => Array(11).fill(null)),
    questionerBoard: Array(7).fill(null).map(() => Array(11).fill(null)),
    laserHistory: [],
    questionerBoardHidden: false // 싱글 플레이 모드에서 정답 보드 숨김 여부
};

// 현재 화면 크기에 따른 셀 크기 계산
function getCellSize() {
    const width = window.innerWidth;
    if (width <= 360) return 24; // 아주 작은 화면
    if (width <= 480) return 28; // 모바일
    if (width <= 768) return 45; // 태블릿
    return 60; // 데스크톱
}

// 현재 화면 크기에 따른 gap 크기 계산
function getGapSize() {
    const width = window.innerWidth;
    if (width <= 480) return 1; // 모바일
    if (width <= 768) return 1; // 태블릿
    return 2; // 데스크톱
}

// 행성 정의
const PLANETS = {
    'small-red': {
        size: 'small',
        color: '#e74c3c',
        shape: 'circle',
        reflective: true, // 180도 반사
        width: 1,
        height: 1
    },
    'small-orange': {
        size: 'small',
        color: '#e74c3c',
        shape: 'diamond',
        reflective: true, // 90도 반사 (마름모)
        width: 2,
        height: 2
    },
    'small-blue': {
        size: 'small',
        color: '#3498db',
        shape: 'diamond',
        reflective: true, // 90도 반사 (마름모)
        width: 2,
        height: 2
    },
    'medium-earth': {
        size: 'medium',
        color: '#f1c40f',
        shape: 'octagon',
        reflective: true, // 동서남북 180도, 대각선 90도
        width: 3,
        height: 3
    },
    'medium-jupiter': {
        size: 'medium',
        color: '#ecf0f1',
        shape: 'trapezoid',
        reflective: true, // 사다리꼴 - 위치에 따라 90도/180도
        width: 4,
        height: 2
    },
    'large-saturn': {
        size: 'large',
        color: '#ecf0f1',
        shape: 'ring',
        reflective: true, // 링 - 위치에 따라 90도/180도
        width: 4,
        height: 2,
        hasRing: true
    }
};

// 색상 조합 테이블 (알파벳 순서로 정렬된 키만 사용)
// mixColorsArray 함수가 중복 제거 및 정렬을 자동으로 수행함
const COLOR_MIXING = {
    // 2색 혼합 (알파벳 순서)
    'blue+red': 'purple',           // 빨강 + 파랑
    'blue+yellow': 'green',         // 노랑 + 파랑
    'red+yellow': 'orange',         // 빨강 + 노랑
    'red+white': 'pink',            // 빨강 + 흰색
    'blue+white': 'skyblue',        // 파랑 + 흰색
    'white+yellow': 'lemon',        // 노랑 + 흰색
    // 3색 혼합 (알파벳 순서)
    'blue+red+yellow': 'black',     // 빨강 + 노랑 + 파랑
    'blue+red+white': 'lightpurple',// 빨강 + 파랑 + 흰색
    'red+white+yellow': 'lightorange',// 빨강 + 노랑 + 흰색
    'blue+white+yellow': 'lightgreen',// 노랑 + 파랑 + 흰색
    // 4색 혼합
    'blue+red+white+yellow': 'gray',// 빨강 + 노랑 + 파랑 + 흰색
    // 특수 혼합
    'black+white': 'gray'           // 검정 + 흰색
};

// 보드 초기화
function initializeBoards() {
    createBoard('explorerBoard', false);
    createBoard('questionerBoard', true);
}

// 위치 ID를 방향, 행, 열로 변환
function parsePositionId(positionId) {
    // 1-11: 위쪽 (top) - 보드 밖에서 시작
    if (positionId >= 1 && positionId <= 11) {
        return { direction: 'top', row: -1, col: positionId - 1 };
    }
    // 12-18: 오른쪽 (right) - 보드 밖에서 시작
    if (positionId >= 12 && positionId <= 18) {
        return { direction: 'right', row: positionId - 12, col: 11 };
    }

    const charCode = typeof positionId === 'string' ? positionId.charCodeAt(0) : null;
    // A-G (65-71): 왼쪽 (left) - 보드 밖에서 시작
    if (charCode >= 65 && charCode <= 71) { // A-G
        return { direction: 'left', row: charCode - 65, col: -1 };
    }
    // H-R (72-82): 아래쪽 (bottom) - 보드 밖에서 시작
    if (charCode >= 72 && charCode <= 82) { // H-R
        return { direction: 'bottom', row: 7, col: charCode - 72 };
    }

    return null;
}

// 방향, 행, 열을 위치 ID로 변환
function getPositionLabel(direction, row, col) {
    if (direction === 'top' && row === 0 && col >= 0 && col <= 10) {
        return (col + 1).toString(); // 1-11
    }
    if (direction === 'right' && col === 10 && row >= 0 && row <= 6) {
        return (row + 12).toString(); // 12-18
    }
    if (direction === 'left' && col === 0 && row >= 0 && row <= 6) {
        return String.fromCharCode(65 + row); // A-G
    }
    if (direction === 'bottom' && row === 6 && col >= 0 && col <= 10) {
        return String.fromCharCode(72 + col); // H-R
    }
    return null;
}

// 보드 생성
function createBoard(boardId, isQuestionerBoard) {
    const boardContainer = document.getElementById(boardId);
    const parentElement = boardContainer.parentElement;

    // 기존 wrapper가 있으면 제거
    const existingWrapper = parentElement.querySelector('.board-wrapper');
    if (existingWrapper) {
        existingWrapper.remove();
    }

    // wrapper 생성
    const wrapper = document.createElement('div');
    wrapper.className = 'board-wrapper';

    // 위쪽 라벨 (1-11)
    const labelsTop = document.createElement('div');
    labelsTop.className = 'labels-top';
    for (let i = 1; i <= 11; i++) {
        const label = document.createElement('div');
        label.className = 'board-label top';
        label.textContent = i;
        label.dataset.position = i;
        label.addEventListener('click', () => selectPosition(i));
        labelsTop.appendChild(label);
    }

    // 왼쪽 라벨 (A-G)
    const labelsLeft = document.createElement('div');
    labelsLeft.className = 'labels-left';
    for (let i = 0; i < 7; i++) {
        const label = document.createElement('div');
        label.className = 'board-label left';
        const letter = String.fromCharCode(65 + i); // A-G
        label.textContent = letter;
        label.dataset.position = letter;
        label.addEventListener('click', () => selectPosition(letter));
        labelsLeft.appendChild(label);
    }

    // 아래쪽 라벨 (H-R)
    const labelsBottom = document.createElement('div');
    labelsBottom.className = 'labels-bottom';
    for (let i = 0; i < 11; i++) {
        const label = document.createElement('div');
        label.className = 'board-label bottom';
        const letter = String.fromCharCode(72 + i); // H-R
        label.textContent = letter;
        label.dataset.position = letter;
        label.addEventListener('click', () => selectPosition(letter));
        labelsBottom.appendChild(label);
    }

    // 오른쪽 라벨 (12-18)
    const labelsRight = document.createElement('div');
    labelsRight.className = 'labels-right';
    for (let i = 12; i <= 18; i++) {
        const label = document.createElement('div');
        label.className = 'board-label right';
        label.textContent = i;
        label.dataset.position = i;
        label.addEventListener('click', () => selectPosition(i));
        labelsRight.appendChild(label);
    }

    // 보드 생성
    const board = document.createElement('div');
    board.className = 'game-board';
    board.id = boardId;

    for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 11; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.dataset.board = boardId;

            if (isQuestionerBoard) {
                cell.addEventListener('click', () => placePlanet(row, col));
                // hover 시 배치 가능 여부 표시
                cell.addEventListener('mouseenter', () => previewPlanetPlacement(row, col, boardId));
                cell.addEventListener('mouseleave', () => clearPlacementPreview(boardId));
            } else {
                cell.addEventListener('click', () => markExploration(row, col));
            }

            board.appendChild(cell);
        }
    }

    // wrapper에 모든 요소 추가
    wrapper.appendChild(labelsTop);
    wrapper.appendChild(labelsLeft);
    wrapper.appendChild(board);
    wrapper.appendChild(labelsRight);
    wrapper.appendChild(labelsBottom);

    // 기존 보드 컨테이너를 wrapper로 교체
    boardContainer.replaceWith(wrapper);
}

// 배치 미리보기
function previewPlanetPlacement(row, col, boardId) {
    if (gameState.phase !== 'setup' || !gameState.selectedPlanet) return;

    clearPlacementPreview(boardId);

    const planet = PLANETS[gameState.selectedPlanet];
    const rotation = gameState.planetRotations[gameState.selectedPlanet] || 0;
    const canPlace = canPlacePlanet(gameState.questionerBoard, row, col, planet.width, planet.height, gameState.selectedPlanet, rotation);

    // 회전에 따라 너비/높이 결정
    let actualWidth = planet.width;
    let actualHeight = planet.height;
    if (rotation === 90 || rotation === 270) {
        actualWidth = planet.height;
        actualHeight = planet.width;
    }

    const board = document.getElementById(boardId);
    for (let r = row; r < row + actualHeight; r++) {
        for (let c = col; c < col + actualWidth; c++) {
            if (r >= 0 && r < 7 && c >= 0 && c < 11) {
                const cell = board.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
                if (cell) {
                    if (canPlace) {
                        cell.classList.add('placement-preview-valid');
                    } else {
                        cell.classList.add('placement-preview-invalid');
                    }
                }
            }
        }
    }
}

// 배치 미리보기 제거
function clearPlacementPreview(boardId) {
    const board = document.getElementById(boardId);
    if (board) {
        board.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('placement-preview-valid', 'placement-preview-invalid');
        });
    }
}

// 특정 행성이 이미 배치되었는지 확인
function isPlanetAlreadyPlaced(planetType, board = null) {
    const targetBoard = board || gameState.questionerBoard;
    for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 11; col++) {
            const cell = targetBoard[row][col];
            if (cell && cell.isOrigin && cell.type === planetType) {
                return true;
            }
        }
    }
    return false;
}

// 보드에서 특정 행성 제거
function removePlanetFromBoard(board, planetType) {
    for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 11; col++) {
            const cell = board[row][col];
            if (cell && cell.type === planetType) {
                board[row][col] = null;
            }
        }
    }
}

// 행성 배치
function placePlanet(row, col) {
    if (gameState.phase !== 'setup') return;

    // 클릭한 위치에 이미 행성이 있는지 확인
    const existingPlanet = gameState.questionerBoard[row][col];
    if (existingPlanet && existingPlanet.isOrigin) {
        // 원점을 클릭한 경우 - 행성 제거 확인
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
            removePlanetFromBoard(gameState.questionerBoard, existingPlanet.type);
            renderBoard('questionerBoard');
        }
        return;
    }

    if (!gameState.selectedPlanet) {
        alert('먼저 행성을 선택하세요!');
        return;
    }

    // 이미 배치된 행성인지 확인
    if (isPlanetAlreadyPlaced(gameState.selectedPlanet)) {
        alert('이 행성은 이미 배치되었습니다!\n각 행성은 1개씩만 배치할 수 있습니다.');
        return;
    }

    const planet = PLANETS[gameState.selectedPlanet];
    const rotation = gameState.planetRotations[gameState.selectedPlanet] || 0;

    if (!canPlacePlanet(gameState.questionerBoard, row, col, planet.width, planet.height, gameState.selectedPlanet, rotation)) {
        alert('이 위치에는 행성을 배치할 수 없습니다!\n(큰 흰색 행성은 밑변이 반드시 보드 끝에 닿아있어야 합니다)');
        return;
    }

    placePlanetOnBoard(gameState.questionerBoard, row, col, gameState.selectedPlanet, planet, rotation);
    renderBoard('questionerBoard');
}

// 탐험 마크
function markExploration(row, col) {
    // 배치 완료 확인
    if (gameState.phase !== 'playing') {
        alert('질문자 보드에서 배치 완료를 먼저 해주세요!');
        return;
    }

    // 클릭한 위치에 이미 행성이 있는지 확인
    const existingPlanet = gameState.explorerBoard[row][col];
    if (existingPlanet && existingPlanet.isOrigin) {
        // 원점을 클릭한 경우 - 행성 제거 확인
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

    // 행성이 선택되어 있는지 확인
    if (!gameState.selectedPlanet) {
        alert('먼저 행성을 선택하세요!');
        return;
    }

    // 이미 배치된 행성인지 확인 (탐험가 보드에서)
    if (isPlanetAlreadyPlaced(gameState.selectedPlanet, gameState.explorerBoard)) {
        alert('이 행성은 이미 배치되었습니다!\n각 행성은 1개씩만 배치할 수 있습니다.');
        return;
    }

    const planet = PLANETS[gameState.selectedPlanet];
    const rotation = gameState.planetRotations[gameState.selectedPlanet] || 0;

    // 배치 가능한지 확인
    const canPlace = canPlacePlanet(gameState.explorerBoard, row, col, planet.width, planet.height, gameState.selectedPlanet, rotation);

    // 미리보기 표시 (배치 가능 여부와 상관없이 표시)
    showExplorerPreview(row, col, gameState.selectedPlanet, planet, rotation, canPlace);

    // 배치 불가능하면 미리보기만 보여주고 종료
    if (!canPlace) {
        // 1초 후 미리보기 자동 제거
        setTimeout(() => {
            clearExplorerPreview();
        }, 1000);
        return;
    }

    // 배치 가능하면 더블클릭으로 확정 (또는 다른 위치 클릭시 미리보기 사라짐)
    // 이미 미리보기가 표시된 상태에서 같은 위치 다시 클릭하면 확정
    const cellKey = `${row},${col}`;
    if (gameState.pendingPlacement && gameState.pendingPlacement.cellKey === cellKey) {
        // 두 번째 클릭 - 확정 배치
        placePlanetOnBoard(gameState.explorerBoard, row, col, gameState.selectedPlanet, planet, rotation);
        clearExplorerPreview();
        gameState.pendingPlacement = null;
        renderBoard('explorerBoard');
    } else {
        // 첫 번째 클릭 - 미리보기 표시하고 대기
        gameState.pendingPlacement = {
            row, col, planetType: gameState.selectedPlanet, planet, rotation, cellKey
        };
        // 힌트 메시지를 화면에 표시 (alert 대신)
        showHintMessage('같은 위치를 다시 클릭하면 배치됩니다. 다른 곳을 클릭하면 취소됩니다.');
    }
}

// 탐험가 보드 미리보기 표시
function showExplorerPreview(row, col, planetType, planet, rotation, canPlace) {
    clearExplorerPreview();

    // 회전에 따라 너비/높이 결정
    let actualWidth = planet.width;
    let actualHeight = planet.height;
    if (rotation === 90 || rotation === 270) {
        actualWidth = planet.height;
        actualHeight = planet.width;
    }

    const board = document.getElementById('explorerBoard');
    if (!board) return;

    // 원점 셀을 찾아서 실제 행성 모양 렌더링
    const originCell = board.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (originCell && row >= 0 && row < 7 && col >= 0 && col < 11) {
        renderPreviewPlanet(originCell, planet, planetType, rotation, canPlace, actualWidth, actualHeight);
    }

    // 모든 셀에 테두리 표시
    for (let r = row; r < row + actualHeight; r++) {
        for (let c = col; c < col + actualWidth; c++) {
            if (r >= 0 && r < 7 && c >= 0 && c < 11) {
                const cell = board.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
                if (cell) {
                    // 배치 가능하면 초록색, 불가능하면 빨간색
                    if (canPlace) {
                        cell.classList.add('explorer-preview');
                    } else {
                        cell.classList.add('explorer-preview-invalid');
                    }
                }
            }
        }
    }
}

// 미리보기 행성 렌더링
function renderPreviewPlanet(cell, planet, planetType, rotation, canPlace, actualWidth, actualHeight) {
    const cellSize = getCellSize(); // 현재 화면 크기에 따른 cell 크기
    const gap = getGapSize(); // 현재 화면 크기에 따른 gap 크기
    const width = actualWidth * cellSize + (actualWidth - 1) * gap;
    const height = actualHeight * cellSize + (actualHeight - 1) * gap;

    cell.style.position = 'relative';

    // 미리보기 컨테이너 생성
    const previewContainer = document.createElement('div');
    previewContainer.className = 'preview-planet-container';
    previewContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: ${width}px;
        height: ${height}px;
        opacity: ${canPlace ? 0.4 : 0.3};
        pointer-events: none;
        z-index: 10;
    `;

    // 큰 링 흰색은 특별한 구조 사용
    if (planet.hasRing) {
        const saturnContainer = document.createElement('div');
        saturnContainer.className = 'saturn-container';

        const originalWidth = planet.width * cellSize + (planet.width - 1) * gap;
        const originalHeight = planet.height * cellSize + (planet.height - 1) * gap;

        saturnContainer.style.width = `${originalWidth}px`;
        saturnContainer.style.height = `${originalHeight}px`;
        saturnContainer.style.position = 'absolute';
        saturnContainer.style.display = 'flex';
        saturnContainer.style.flexDirection = 'row';

        // 회전 적용
        if (rotation === 90 || rotation === 270) {
            saturnContainer.style.transform = `rotate(${rotation}deg)`;
            saturnContainer.style.transformOrigin = 'center center';
            const offset = (originalWidth - originalHeight) / 2;
            saturnContainer.style.top = `${offset}px`;
            saturnContainer.style.left = `${-offset}px`;
        } else {
            saturnContainer.style.top = '0';
            saturnContainer.style.left = '0';
        }

        // 왼쪽 가로선
        const leftLine = document.createElement('div');
        leftLine.style.cssText = `width: ${cellSize}px; height: ${originalHeight}px; position: relative;`;
        const leftBar = document.createElement('div');
        leftBar.style.cssText = `width: 100%; height: 5px; background: ${planet.color}; position: absolute; top: 50%; transform: translateY(-50%);`;
        leftLine.appendChild(leftBar);

        // 중간 마름모
        const diamond = document.createElement('div');
        const diamondSize = 2 * cellSize + gap;
        diamond.style.cssText = `width: ${diamondSize}px; height: ${originalHeight}px; background: ${planet.color}; clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);`;

        // 오른쪽 가로선
        const rightLine = document.createElement('div');
        rightLine.style.cssText = `width: ${cellSize}px; height: ${originalHeight}px; position: relative;`;
        const rightBar = document.createElement('div');
        rightBar.style.cssText = `width: 100%; height: 5px; background: ${planet.color}; position: absolute; top: 50%; transform: translateY(-50%);`;
        rightLine.appendChild(rightBar);

        saturnContainer.appendChild(leftLine);
        saturnContainer.appendChild(diamond);
        saturnContainer.appendChild(rightLine);

        previewContainer.appendChild(saturnContainer);
    } else {
        // 일반 행성
        const planetEl = document.createElement('div');
        planetEl.className = `planet ${planet.size}`;

        if (planetType) {
            planetEl.classList.add(planetType);
        }

        if (planet.shape) {
            planetEl.classList.add(`shape-${planet.shape}`);
        }

        planetEl.style.background = planet.color;

        const originalWidth = planet.width * cellSize + (planet.width - 1) * gap;
        const originalHeight = planet.height * cellSize + (planet.height - 1) * gap;

        planetEl.style.width = `${originalWidth}px`;
        planetEl.style.height = `${originalHeight}px`;
        planetEl.style.position = 'absolute';

        // 사다리꼴 회전 적용
        if (planet.shape === 'trapezoid') {
            planetEl.style.clipPath = 'polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%)';

            if (rotation !== 0) {
                if (rotation === 90 || rotation === 270) {
                    planetEl.style.transform = `rotate(${rotation}deg) scaleY(-1)`;
                } else {
                    planetEl.style.transform = `rotate(${rotation}deg)`;
                }
                planetEl.style.transformOrigin = 'center center';

                if (rotation === 90 || rotation === 270) {
                    const offset = (originalWidth - originalHeight) / 2;
                    planetEl.style.top = `${offset}px`;
                    planetEl.style.left = `${-offset}px`;
                } else {
                    planetEl.style.top = '0';
                    planetEl.style.left = '0';
                }
            } else {
                planetEl.style.top = '0';
                planetEl.style.left = '0';
            }
        } else {
            planetEl.style.top = '0';
            planetEl.style.left = '0';
        }

        previewContainer.appendChild(planetEl);
    }

    cell.appendChild(previewContainer);
}

// 탐험가 보드 미리보기 제거
function clearExplorerPreview() {
    const board = document.getElementById('explorerBoard');
    if (board) {
        // 클래스 제거
        board.querySelectorAll('.explorer-preview, .explorer-preview-invalid').forEach(cell => {
            cell.classList.remove('explorer-preview', 'explorer-preview-invalid');
        });

        // 미리보기 행성 컨테이너 제거
        board.querySelectorAll('.preview-planet-container').forEach(container => {
            container.remove();
        });
    }
}

// 힌트 메시지 표시
function showHintMessage(message) {
    // 기존 힌트 메시지 제거
    const existingHint = document.querySelector('.hint-message');
    if (existingHint) {
        existingHint.remove();
    }

    // 새 힌트 메시지 생성
    const hintDiv = document.createElement('div');
    hintDiv.className = 'hint-message';
    hintDiv.textContent = message;
    hintDiv.style.cssText = `
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(46, 204, 113, 0.95);
        color: white;
        padding: 15px 30px;
        border-radius: 10px;
        font-size: 1.1em;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        animation: fadeInOut 3s ease-in-out;
    `;

    document.body.appendChild(hintDiv);

    // 3초 후 자동 제거
    setTimeout(() => {
        if (hintDiv && hintDiv.parentNode) {
            hintDiv.remove();
        }
    }, 3000);
}

// 보드 렌더링
function renderBoard(boardId) {
    const isQuestioner = boardId === 'questionerBoard';
    const boardData = isQuestioner ? gameState.questionerBoard : gameState.explorerBoard;

    // wrapper 안의 실제 보드 찾기
    const board = document.getElementById(boardId);
    if (!board) {
        console.error(`Board ${boardId} not found`);
        return;
    }

    for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 11; col++) {
            const cell = board.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            if (!cell) continue;

            cell.innerHTML = '';
            cell.classList.remove('has-planet');

            const planetData = boardData[row][col];

            // 싱글 플레이 모드에서 질문자 보드를 물음표로 가리기
            if (isQuestioner && gameState.mode === 'singlePlay' && gameState.questionerBoardHidden) {
                const hiddenMarker = document.createElement('div');
                hiddenMarker.style.cssText = `
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: ${getCellSize() * 0.6}px;
                    color: rgba(255, 255, 255, 0.3);
                    user-select: none;
                `;
                hiddenMarker.textContent = '?';
                cell.appendChild(hiddenMarker);
                continue;
            }

            if (planetData) {
                cell.classList.add('has-planet');

                // 원점에서만 행성 시각 요소 렌더링
                if (planetData.isOrigin) {
                    const cellSize = getCellSize(); // 현재 화면 크기에 따른 cell 크기
                    const gap = getGapSize(); // 현재 화면 크기에 따른 gap 크기
                    const width = planetData.width * cellSize + (planetData.width - 1) * gap;
                    const height = planetData.height * cellSize + (planetData.height - 1) * gap;

                    cell.style.position = 'relative';

                    // 큰 링 흰색은 특별한 구조 사용
                    if (planetData.hasRing) {
                        const rotation = planetData.rotation || 0;

                        // 항상 가로 구조로 생성 (왼쪽선 - 마름모 - 오른쪽선)
                        const saturnContainer = document.createElement('div');
                        saturnContainer.className = 'saturn-container';

                        // 원본 크기 (가로 구조 기준)
                        const originalWidth = planetData.width * cellSize + (planetData.width - 1) * gap;
                        const originalHeight = planetData.height * cellSize + (planetData.height - 1) * gap;

                        saturnContainer.style.width = `${originalWidth}px`;
                        saturnContainer.style.height = `${originalHeight}px`;
                        saturnContainer.style.position = 'absolute';
                        saturnContainer.style.display = 'flex';
                        saturnContainer.style.flexDirection = 'row';

                        // 회전 적용
                        if (rotation === 90 || rotation === 270) {
                            saturnContainer.style.transform = `rotate(${rotation}deg)`;
                            saturnContainer.style.transformOrigin = 'center center';
                            // 회전 시 위치 조정
                            const offset = (originalWidth - originalHeight) / 2;
                            saturnContainer.style.top = `${offset}px`;
                            saturnContainer.style.left = `${-offset}px`;
                        } else {
                            saturnContainer.style.top = '0';
                            saturnContainer.style.left = '0';
                        }

                        // 왼쪽 가로선
                        const leftLine = document.createElement('div');
                        leftLine.className = 'saturn-line';
                        leftLine.style.width = `${cellSize}px`;
                        leftLine.style.height = `${originalHeight}px`;
                        leftLine.style.position = 'relative';

                        const leftBar = document.createElement('div');
                        leftBar.style.width = '100%';
                        leftBar.style.height = '5px';
                        leftBar.style.background = planetData.color;
                        leftBar.style.position = 'absolute';
                        leftBar.style.top = '50%';
                        leftBar.style.transform = 'translateY(-50%)';
                        leftBar.style.boxShadow = '0 0 5px rgba(255, 255, 255, 0.5)';
                        leftLine.appendChild(leftBar);

                        // 중간 마름모
                        const diamond = document.createElement('div');
                        diamond.className = 'saturn-diamond';
                        const diamondSize = 2 * cellSize + gap;
                        diamond.style.width = `${diamondSize}px`;
                        diamond.style.height = `${originalHeight}px`;
                        diamond.style.background = planetData.color;
                        diamond.style.clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';

                        // 오른쪽 가로선
                        const rightLine = document.createElement('div');
                        rightLine.className = 'saturn-line';
                        rightLine.style.width = `${cellSize}px`;
                        rightLine.style.height = `${originalHeight}px`;
                        rightLine.style.position = 'relative';

                        const rightBar = document.createElement('div');
                        rightBar.style.width = '100%';
                        rightBar.style.height = '5px';
                        rightBar.style.background = planetData.color;
                        rightBar.style.position = 'absolute';
                        rightBar.style.top = '50%';
                        rightBar.style.transform = 'translateY(-50%)';
                        rightBar.style.boxShadow = '0 0 5px rgba(255, 255, 255, 0.5)';
                        rightLine.appendChild(rightBar);

                        saturnContainer.appendChild(leftLine);
                        saturnContainer.appendChild(diamond);
                        saturnContainer.appendChild(rightLine);

                        cell.appendChild(saturnContainer);
                    } else {
                        // 일반 행성
                        const planetEl = document.createElement('div');
                        planetEl.className = `planet ${planetData.size}`;

                        // type 클래스 추가 (행성 종류별 스타일링)
                        if (planetData.type) {
                            planetEl.classList.add(planetData.type);
                        }

                        // shape 클래스 추가
                        if (planetData.shape) {
                            planetEl.classList.add(`shape-${planetData.shape}`);
                        }

                        if (planetData.color.includes('gradient')) {
                            planetEl.style.background = planetData.color;
                        } else {
                            planetEl.style.background = planetData.color;
                        }

                        // 원본 크기 (회전 전)
                        const originalWidth = planetData.width * cellSize + (planetData.width - 1) * gap;
                        const originalHeight = planetData.height * cellSize + (planetData.height - 1) * gap;

                        planetEl.style.width = `${originalWidth}px`;
                        planetEl.style.height = `${originalHeight}px`;
                        planetEl.style.position = 'absolute';

                        // rotation 적용 (사다리꼴) - 큰 링 흰색처럼 회전 + 90/270도는 뒤집기
                        const rotation = planetData.rotation || 0;
                        if (planetData.shape === 'trapezoid') {
                            // 기본 clip-path (밑변 아래)
                            planetEl.style.clipPath = 'polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%)';

                            // CSS transform으로 회전 (90/270도는 scaleY 뒤집기 추가)
                            if (rotation !== 0) {
                                if (rotation === 90 || rotation === 270) {
                                    // 좌우 배치 시 상하 반전
                                    planetEl.style.transform = `rotate(${rotation}deg) scaleY(-1)`;
                                } else {
                                    planetEl.style.transform = `rotate(${rotation}deg)`;
                                }
                                planetEl.style.transformOrigin = 'center center';

                                // 90도나 270도 회전 시 위치 조정
                                if (rotation === 90 || rotation === 270) {
                                    const offset = (originalWidth - originalHeight) / 2;
                                    planetEl.style.top = `${offset}px`;
                                    planetEl.style.left = `${-offset}px`;
                                } else {
                                    planetEl.style.top = '0';
                                    planetEl.style.left = '0';
                                }
                            } else {
                                planetEl.style.top = '0';
                                planetEl.style.left = '0';
                            }
                        } else {
                            planetEl.style.top = '0';
                            planetEl.style.left = '0';
                        }

                        cell.appendChild(planetEl);
                    }
                }
            }
        }
    }
}

// 위치 선택
function selectPosition(positionId) {
    gameState.selectedPosition = positionId;

    // 모든 위치 버튼과 라벨의 선택 상태 제거
    document.querySelectorAll('.position-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.querySelectorAll('.board-label').forEach(label => {
        label.classList.remove('selected');
    });

    // 클릭한 요소를 선택 상태로 설정
    event.target.classList.add('selected');
}

// 레이저 발사
function fireLaserFromButton() {
    if (gameState.phase !== 'playing') {
        alert('먼저 배치를 완료하세요!');
        return;
    }

    if (!gameState.selectedPosition) {
        alert('발사 위치를 선택하세요!');
        return;
    }

    const position = parsePositionId(gameState.selectedPosition);

    if (!position) {
        alert('유효하지 않은 위치입니다!');
        return;
    }

    // 레이저는 투명(무색)으로 시작해서 행성과 부딪히면서 색상을 얻습니다
    const result = calculateLaserPath(position.direction, position.row, position.col, 'none');
    displayLaserResult(result, gameState.selectedPosition);

    gameState.laserCount++;
    document.getElementById('laserCount').textContent = gameState.laserCount;

    addToHistory(gameState.selectedPosition, result);
}

// 레이저 발사 (구버전 - UI 호환성 유지)
function fireLaser() {
    if (gameState.phase !== 'playing') {
        alert('먼저 배치를 완료하세요!');
        return;
    }

    const direction = document.getElementById('laserDirection').value;
    const position = parseInt(document.getElementById('laserPosition').value);
    const color = document.getElementById('laserColor').value;

    const result = calculateLaserPathOld(direction, position, color);
    displayLaserResult(result);

    gameState.laserCount++;
    document.getElementById('laserCount').textContent = gameState.laserCount;

    addToHistory(direction + '-' + position, color, result);
}

// 레이저 경로 계산
function calculateLaserPath(direction, startRow, startCol, color) {
    let currentRow = startRow;
    let currentCol = startCol;
    let dirRow, dirCol;

    // 방향 설정
    switch(direction) {
        case 'top':
            dirRow = 1;
            dirCol = 0;
            break;
        case 'bottom':
            dirRow = -1;
            dirCol = 0;
            break;
        case 'left':
            dirRow = 0;
            dirCol = 1;
            break;
        case 'right':
            dirRow = 0;
            dirCol = -1;
            break;
    }

    let collectedColors = []; // 수집된 색상 배열
    let path = [];
    let maxSteps = 100; // 무한 루프 방지
    let steps = 0;
    let lastHitCell = null; // 마지막으로 충돌한 셀 위치 추적 (row,col)

    path.push({ row: currentRow, col: currentCol, color: 'none', type: 'entry' });

    while (steps < maxSteps) {
        // 다음 위치 계산
        currentRow += dirRow;
        currentCol += dirCol;

        // 보드 밖으로 나감
        if (currentRow < 0 || currentRow > 6 || currentCol < 0 || currentCol > 10) {
            // 실제 출구 방향 계산
            let actualExitDirection;
            if (currentRow < 0) actualExitDirection = 'top';
            else if (currentRow > 6) actualExitDirection = 'bottom';
            else if (currentCol < 0) actualExitDirection = 'left';
            else if (currentCol > 10) actualExitDirection = 'right';

            const finalColor = mixColorsArray(collectedColors);
            path.push({
                row: currentRow - dirRow,
                col: currentCol - dirCol,
                color: finalColor,
                type: 'exit',
                exitDirection: actualExitDirection
            });
            break;
        }

        // 행성과 충돌 체크
        const planet = gameState.questionerBoard[currentRow][currentCol];
        if (planet) {
            // 링 행성의 실선 부분 통과 처리
            if (planet.hasRing) {
                const rotation = planet.rotation || 0;
                const relRow = currentRow - planet.originRow;
                const relCol = currentCol - planet.originCol;

                let shouldPass = false;

                if (rotation === 0 || rotation === 180) {
                    // 가로 배치: 실선 부분에 가로로 진입하면 통과
                    const isLine = (relCol === 0 || relCol === 3);
                    const isHorizontal = (dirRow === 0 && dirCol !== 0);
                    if (isLine && isHorizontal) {
                        shouldPass = true;
                    }
                } else if (rotation === 90 || rotation === 270) {
                    // 세로 배치: 실선 부분에 세로로 진입하면 통과
                    const isLine = (relRow === 0 || relRow === 3);
                    const isVertical = (dirRow !== 0 && dirCol === 0);
                    if (isLine && isVertical) {
                        shouldPass = true;
                    }
                }

                if (shouldPass) {
                    // 실선 부분 통과 - 색상 수집하고 계속 진행
                    const planetColor = getPlanetBaseColor(planet.color);
                    if (planetColor !== 'none') {
                        collectedColors.push(planetColor);
                    }
                    const currentMixedColor = mixColorsArray(collectedColors);
                    path.push({ row: currentRow, col: currentCol, color: currentMixedColor, type: 'pass' });
                    steps++;
                    continue;
                }
            }

            // 같은 셀과 연속으로 충돌하지 않도록 체크 (개별 셀 위치 기준)
            const currentCellKey = `${currentRow},${currentCol}`;
            if (currentCellKey === lastHitCell) {
                // 같은 셀 내부를 통과 중 - 경로만 추가하고 다음 스텝으로
                const currentMixedColor = mixColorsArray(collectedColors);
                path.push({ row: currentRow, col: currentCol, color: currentMixedColor, type: 'pass' });
                steps++;
                continue;
            }

            // 행성 색상 수집 (다른 셀이면 같은 행성이라도 색상 수집)
            const planetColor = getPlanetBaseColor(planet.color);
            if (planetColor !== 'none') {
                collectedColors.push(planetColor);
            }

            const currentMixedColor = mixColorsArray(collectedColors);
            path.push({ row: currentRow, col: currentCol, color: currentMixedColor, type: 'hit', planet: planet });

            if (planet.reflective) {
                // 반사 처리
                const reflection = calculateReflection(dirRow, dirCol, planet.shape, currentRow, currentCol, planet.originRow, planet.originCol, planet.width, planet.height, planet.rotation || 0);
                dirRow = reflection.dirRow;
                dirCol = reflection.dirCol;

                // 이 셀을 마지막 충돌 셀로 기록
                lastHitCell = currentCellKey;
            } else {
                // 비반사 행성 - 레이저 차단
                const finalColor = mixColorsArray(collectedColors);
                path.push({ row: currentRow, col: currentCol, color: finalColor, type: 'blocked' });
                return {
                    path: path,
                    exitColor: null,
                    exitPosition: null,
                    exitDirection: null,
                    status: 'blocked'
                };
            }
        } else {
            // 행성이 없으면 경로에 추가
            const currentMixedColor = mixColorsArray(collectedColors);
            path.push({ row: currentRow, col: currentCol, color: currentMixedColor, type: 'pass' });

            // 마지막 충돌 기록 초기화
            lastHitCell = null;
        }

        steps++;
    }

    const exitPoint = path[path.length - 1];
    const finalColor = mixColorsArray(collectedColors);
    return {
        path: path,
        exitColor: finalColor,
        exitPosition: exitPoint.type === 'exit' ? { row: exitPoint.row, col: exitPoint.col } : null,
        exitDirection: exitPoint.exitDirection || null,
        status: 'exit'
    };
}

// 반사 계산
function calculateReflection(dirRow, dirCol, shape, currentRow, currentCol, originRow, originCol, planetWidth, planetHeight, rotation) {
    const relRow = currentRow - originRow;
    const relCol = currentCol - originCol;

    if (shape === 'diamond') {
        // 마름모 (2x2) - 90도 반사
        // 수평 이동 중 (왼쪽↔오른쪽)
        if (dirRow === 0 && dirCol !== 0) {
            if (relRow === 0) {
                // 위쪽 셀에 맞음 → 위로 반사
                return { dirRow: -1, dirCol: 0 };
            } else {
                // 아래쪽 셀에 맞음 → 아래로 반사
                return { dirRow: 1, dirCol: 0 };
            }
        }
        // 수직 이동 중 (위↔아래)
        else if (dirRow !== 0 && dirCol === 0) {
            if (relCol === 0) {
                // 왼쪽 셀에 맞음 → 왼쪽으로 반사
                return { dirRow: 0, dirCol: -1 };
            } else {
                // 오른쪽 셀에 맞음 → 오른쪽으로 반사
                return { dirRow: 0, dirCol: 1 };
            }
        }
        // 대각선 이동 (예외 처리)
        return { dirRow: -dirRow, dirCol: -dirCol };
    }
    else if (shape === 'octagon') {
        // 팔각형 (3x3) - 중심에서는 180도, 모서리에서는 90도
        // 중심 위치 확인 (1,1)
        const isCenterRow = relRow === 1;
        const isCenterCol = relCol === 1;

        // 수평 이동 (왼쪽↔오른쪽)
        if (dirRow === 0 && dirCol !== 0) {
            // 중심 행이면 180도 반사
            if (isCenterRow) {
                return { dirRow: -dirRow, dirCol: -dirCol };
            }
            // 위/아래 행이면 90도 반사 (상하로)
            else {
                return { dirRow: relRow === 0 ? -1 : 1, dirCol: 0 };
            }
        }
        // 수직 이동 (위↔아래)
        else if (dirRow !== 0 && dirCol === 0) {
            // 중심 열이면 180도 반사
            if (isCenterCol) {
                return { dirRow: -dirRow, dirCol: -dirCol };
            }
            // 좌/우 열이면 90도 반사 (좌우로)
            else {
                return { dirRow: 0, dirCol: relCol === 0 ? -1 : 1 };
            }
        }

        // 기본: 180도 반사
        return { dirRow: -dirRow, dirCol: -dirCol };
    }
    else if (shape === 'trapezoid') {
        // 사다리꼴 - rotation에 따라 다른 처리
        rotation = rotation || 0;

        if (rotation === 0) {
            // 가로 배치 (4x2): 밑변이 아래
            // relRow=0: 윗변, relRow=1: 밑변

            // 위에서 진입
            if (dirRow > 0 && dirCol === 0) {
                if (relCol === 0 || relCol === 3) {
                    // 양 끝 → 90도 반사 (좌우로)
                    return { dirRow: 0, dirCol: relCol === 0 ? -1 : 1 };
                } else {
                    // 중간 → 180도 반사
                    return { dirRow: -dirRow, dirCol: -dirCol };
                }
            }
            // 아래에서 진입
            else if (dirRow < 0 && dirCol === 0) {
                if (relRow === 1) {
                    // 밑변 → 180도 반사
                    return { dirRow: -dirRow, dirCol: -dirCol };
                } else {
                    // 윗변 (relRow=0)
                    if (relCol === 1 || relCol === 2) {
                        // 중간 → 180도 반사
                        return { dirRow: -dirRow, dirCol: -dirCol };
                    } else {
                        // 양 끝 → 90도 반사
                        return { dirRow: 0, dirCol: relCol === 0 ? -1 : 1 };
                    }
                }
            }
            // 왼쪽에서 진입
            else if (dirCol > 0 && dirRow === 0) {
                if (relRow === 0) {
                    // 위쪽 행 → 90도 반사 (위로)
                    return { dirRow: -1, dirCol: 0 };
                } else {
                    // 아래쪽 행 → 180도 반사
                    return { dirRow: -dirRow, dirCol: -dirCol };
                }
            }
            // 오른쪽에서 진입
            else if (dirCol < 0 && dirRow === 0) {
                if (relRow === 0) {
                    // 위쪽 행 → 90도 반사 (위로)
                    return { dirRow: -1, dirCol: 0 };
                } else {
                    // 아래쪽 행 → 180도 반사
                    return { dirRow: -dirRow, dirCol: -dirCol };
                }
            }
        }
        else if (rotation === 90) {
            // 세로 배치 (2x4): 밑변이 오른쪽
            // 왼쪽에서 진입
            if (dirCol > 0 && dirRow === 0) {
                if (relRow === 0 || relRow === 3) {
                    // 양 끝 → 90도 반사 (상하로)
                    return { dirRow: relRow === 0 ? -1 : 1, dirCol: 0 };
                } else {
                    // 중간 → 180도 반사
                    return { dirRow: -dirRow, dirCol: -dirCol };
                }
            }
            // 오른쪽에서 진입 (밑변)
            else if (dirCol < 0 && dirRow === 0) {
                // 모두 180도 반사
                return { dirRow: -dirRow, dirCol: -dirCol };
            }
            // 위에서 진입
            else if (dirRow > 0 && dirCol === 0) {
                if (relCol === 0) {
                    // 왼쪽 열 → 90도 반사 (왼쪽으로)
                    return { dirRow: 0, dirCol: -1 };
                } else {
                    // 오른쪽 열 (밑변) → 180도 반사
                    return { dirRow: -dirRow, dirCol: -dirCol };
                }
            }
            // 아래에서 진입
            else if (dirRow < 0 && dirCol === 0) {
                if (relCol === 0) {
                    // 왼쪽 열 → 90도 반사 (왼쪽으로)
                    return { dirRow: 0, dirCol: -1 };
                } else {
                    // 오른쪽 열 (밑변) → 180도 반사
                    return { dirRow: -dirRow, dirCol: -dirCol };
                }
            }
        }
        else if (rotation === 180) {
            // 가로 배치 역방향 (4x2): 밑변이 위
            // 위에서 진입 (밑변)
            if (dirRow > 0 && dirCol === 0) {
                // 모두 180도 반사
                return { dirRow: -dirRow, dirCol: -dirCol };
            }
            // 아래에서 진입
            else if (dirRow < 0 && dirCol === 0) {
                if (relCol === 0 || relCol === 3) {
                    // 양 끝 → 90도 반사 (좌우로)
                    return { dirRow: 0, dirCol: relCol === 0 ? -1 : 1 };
                } else {
                    // 중간 → 180도 반사
                    return { dirRow: -dirRow, dirCol: -dirCol };
                }
            }
            // 좌우 진입은 rotation=0과 동일
            else if (dirRow === 0 && dirCol !== 0) {
                if (relRow === 1) {
                    // 아래쪽 행 → 90도 반사 (아래로)
                    return { dirRow: 1, dirCol: 0 };
                } else {
                    // 위쪽 행 → 180도 반사
                    return { dirRow: -dirRow, dirCol: -dirCol };
                }
            }
        }
        else if (rotation === 270) {
            // 세로 배치 역방향 (2x4): 밑변이 왼쪽
            // 왼쪽에서 진입 (밑변)
            if (dirCol > 0 && dirRow === 0) {
                // 모두 180도 반사
                return { dirRow: -dirRow, dirCol: -dirCol };
            }
            // 오른쪽에서 진입
            else if (dirCol < 0 && dirRow === 0) {
                if (relRow === 0 || relRow === 3) {
                    // 양 끝 → 90도 반사 (상하로)
                    return { dirRow: relRow === 0 ? -1 : 1, dirCol: 0 };
                } else {
                    // 중간 → 180도 반사
                    return { dirRow: -dirRow, dirCol: -dirCol };
                }
            }
            // 상하 진입은 rotation=90과 유사하지만 반대
            else if (dirCol === 0 && dirRow !== 0) {
                if (relCol === 1) {
                    // 오른쪽 열 → 90도 반사 (오른쪽으로)
                    return { dirRow: 0, dirCol: 1 };
                } else {
                    // 왼쪽 열 → 180도 반사
                    return { dirRow: -dirRow, dirCol: -dirCol };
                }
            }
        }

        // 기본: 180도 반사
        return { dirRow: -dirRow, dirCol: -dirCol };
    }
    else if (shape === 'ring') {
        // 링 (4x2 또는 2x4) - rotation에 따라 다른 처리
        rotation = rotation || 0;

        if (rotation === 0 || rotation === 180) {
            // 가로 배치 (4x2): [실선 | 마름모 | 마름모 | 실선]
            // relCol: 0=왼쪽실선, 1,2=마름모, 3=오른쪽실선

            const isLeftLine = (relCol === 0);
            const isRightLine = (relCol === 3);
            const isDiamond = (relCol === 1 || relCol === 2);

            // 세로로 레이저 진입 (위↔아래)
            if (dirRow !== 0 && dirCol === 0) {
                if (isLeftLine || isRightLine) {
                    // 양 끝 실선: 세로 → 180도 반사
                    return { dirRow: -dirRow, dirCol: -dirCol };
                } else {
                    // 마름모: 90도 반사 (좌우로)
                    return { dirRow: 0, dirCol: relCol === 1 ? -1 : 1 };
                }
            }
            // 가로로 레이저 진입 (왼쪽↔오른쪽)
            else if (dirRow === 0 && dirCol !== 0) {
                if (isDiamond) {
                    // 마름모: 90도 반사 (상하로)
                    return { dirRow: relRow === 0 ? -1 : 1, dirCol: 0 };
                }
                // 실선: 가로 → 통과 (반사 없음, 다음 셀로 이동)
                // 하지만 이 함수는 반사만 처리하므로, 실선 부분은 별도 처리 필요
                // 일단 180도 반사 반환 (실제로는 통과해야 함)
            }
        }
        else if (rotation === 90 || rotation === 270) {
            // 세로 배치 (2x4): [실선 / 마름모 / 마름모 / 실선]
            // relRow: 0=위실선, 1,2=마름모, 3=아래실선

            const isTopLine = (relRow === 0);
            const isBottomLine = (relRow === 3);
            const isDiamond = (relRow === 1 || relRow === 2);

            // 가로로 레이저 진입 (왼쪽↔오른쪽)
            if (dirRow === 0 && dirCol !== 0) {
                if (isTopLine || isBottomLine) {
                    // 양 끝 실선: 가로 → 180도 반사
                    return { dirRow: -dirRow, dirCol: -dirCol };
                } else {
                    // 마름모: 90도 반사 (상하로)
                    return { dirRow: relRow === 1 ? -1 : 1, dirCol: 0 };
                }
            }
            // 세로로 레이저 진입 (위↔아래)
            else if (dirRow !== 0 && dirCol === 0) {
                if (isDiamond) {
                    // 마름모: 90도 반사 (좌우로)
                    return { dirRow: 0, dirCol: relCol === 0 ? -1 : 1 };
                }
                // 실선: 세로 → 통과
            }
        }

        // 기본: 180도 반사 (통과 케이스는 별도 처리)
        return { dirRow: -dirRow, dirCol: -dirCol };
    }

    // 기본: circle - 180도 반사 (반대 방향)
    return { dirRow: -dirRow, dirCol: -dirCol };
}

// 구버전 레이저 경로 계산 (UI 호환성)
function calculateLaserPathOld(direction, position, color) {
    let currentRow, currentCol;

    // 시작 위치 설정
    switch(direction) {
        case 'top':
            currentRow = 0;
            currentCol = position;
            break;
        case 'bottom':
            currentRow = 6;
            currentCol = position;
            break;
        case 'left':
            currentRow = position;
            currentCol = 0;
            break;
        case 'right':
            currentRow = position;
            currentCol = 10;
            break;
    }

    return calculateLaserPath(direction, currentRow, currentCol, color);
}

// 색상 배열을 혼합
function mixColorsArray(colorArray) {
    if (colorArray.length === 0) return 'none';

    // 중복 제거 및 정렬 (알파벳 순서)
    const uniqueColors = [...new Set(colorArray)].sort();

    if (uniqueColors.length === 1) return uniqueColors[0];

    // 색상 조합 키 생성 (정렬되어 있으므로 항상 일관된 키)
    const key = uniqueColors.join('+');

    // COLOR_MIXING 테이블에서 찾기
    // 찾지 못하면 마지막 색상 반환 (폴백)
    return COLOR_MIXING[key] || uniqueColors[uniqueColors.length - 1];
}

// 색상 혼합 (이전 버전 호환성)
function mixColors(color1, color2) {
    // 레이저가 무색('none')이면 행성의 색상을 그대로 가져옴
    if (color1 === 'none') return color2;
    if (color2 === 'none') return color1;

    const colors = [color1, color2].sort().join('+');
    return COLOR_MIXING[colors] || color1;
}

// 행성의 기본 색상 추출
function getPlanetBaseColor(colorStyle) {
    if (colorStyle.includes('#e74c3c')) return 'red';
    if (colorStyle.includes('#3498db')) return 'blue';
    if (colorStyle.includes('#f1c40f')) return 'yellow';
    if (colorStyle.includes('#ecf0f1')) return 'white';
    return 'none';
}

// 색상 이름을 한글로 변환
function getColorNameKorean(colorName) {
    const colorMap = {
        'red': '빨강',
        'blue': '파랑',
        'yellow': '노랑',
        'white': '흰색',
        'purple': '보라',
        'orange': '주황',
        'green': '초록',
        'pink': '분홍',
        'skyblue': '하늘색',
        'lemon': '레몬',
        'black': '검정',
        'gray': '회색',
        'lightpurple': '연보라',
        'lightorange': '연주황',
        'lightgreen': '연초록',
        'none': '무색'
    };
    return colorMap[colorName] || colorName;
}

// 레이저 결과 표시
function displayLaserResult(result, inputPosition) {
    const resultDiv = document.getElementById('laserResult');

    if (result.status === 'blocked') {
        resultDiv.innerHTML = `
            <strong>레이저 차단!</strong><br>
            레이저가 행성에 막혔습니다.
        `;
    } else {
        // 출구 위치 계산
        const exitPoint = result.path[result.path.length - 1];
        const exitLabel = getPositionLabel(result.exitDirection, exitPoint.row, exitPoint.col);
        const exitColorKorean = getColorNameKorean(result.exitColor);

        resultDiv.innerHTML = `
            <strong>${inputPosition}번 입력값 → ${exitLabel}번 ${exitColorKorean} 출력값</strong>
        `;
    }

    // 시각적 경로 표시 (간단히)
    visualizeLaserPath(result.path);
}

// 색상 이름을 hex로 변환
function getColorHex(colorName) {
    const colorMap = {
        'red': '#e74c3c',
        'blue': '#3498db',
        'yellow': '#f1c40f',
        'white': '#ecf0f1',
        'purple': '#9b59b6',
        'orange': '#e67e22',
        'green': '#2ecc71',
        'pink': '#ff69b4',
        'skyblue': '#87ceeb',
        'lemon': '#fff44f',
        'black': '#000000',
        'gray': '#808080',
        'lightpurple': '#dda0dd',
        'lightorange': '#ffb347',
        'lightgreen': '#90ee90',
        'none': '#ffffff'
    };
    return colorMap[colorName] || '#fff';
}

// 레이저 경로 시각화 (애니메이션) - 임시 주석처리
function visualizeLaserPath(path) {
    console.log('Laser path:', path);
    // 애니메이션 임시 비활성화
    /*
    // 기존 레이저 효과 제거
    document.querySelectorAll('.cell, .board-label').forEach(elem => {
        elem.classList.remove('laser-entry', 'laser-exit', 'laser-path', 'laser-hit', 'laser-reflect', 'laser-blocked');
        elem.style.removeProperty('--laser-color');
    });

    if (path.length === 0) return;

    // 질문자 보드의 wrapper 찾기 - board-section에서 직접 찾기
    const boardSection = document.querySelector('.board-section:nth-child(2)'); // 질문자 보드는 두 번째
    if (!boardSection) {
        console.error('Board section not found');
        return;
    }

    const boardWrapper = boardSection.querySelector('.board-wrapper');
    if (!boardWrapper) {
        console.error('Board wrapper not found');
        return;
    }

    const board = boardWrapper.querySelector('.game-board');
    if (!board) {
        console.error('Game board not found');
        return;
    }

    // 애니메이션 속도 (밀리초)
    const animationSpeed = 400;

    console.log('Visualizing laser path with', path.length, 'points');

    // 경로를 순차적으로 애니메이션
    path.forEach((point, index) => {
        setTimeout(() => {
            console.log(`Step ${index}: row=${point.row}, col=${point.col}, type=${point.type}`);

            const cell = board.querySelector(`.cell[data-row="${point.row}"][data-col="${point.col}"]`);
            if (!cell) {
                console.warn(`Cell not found at row ${point.row}, col ${point.col}`);
                return;
            }

            // 색상 설정
            const laserColor = getColorHex(point.color);
            cell.style.setProperty('--laser-color', laserColor);

            // 타입별 클래스 추가
            if (point.type === 'entry') {
                cell.classList.add('laser-entry', 'laser-path');
                // 입구 라벨도 강조
                highlightEntryLabel(point, laserColor);
            } else if (point.type === 'exit') {
                cell.classList.add('laser-exit', 'laser-path');
                // 출구 라벨도 강조
                highlightExitLabel(point, laserColor);
            } else if (point.type === 'hit') {
                cell.classList.add('laser-hit', 'laser-path');
                // 반사 효과
                if (point.planet && point.planet.reflective) {
                    setTimeout(() => {
                        cell.classList.add('laser-reflect');
                    }, animationSpeed / 3);
                }
            } else if (point.type === 'blocked') {
                cell.classList.add('laser-blocked', 'laser-path');
            } else if (point.type === 'pass') {
                // 통과하는 경로
                cell.classList.add('laser-path');
            } else {
                cell.classList.add('laser-path');
            }
        }, index * animationSpeed);
    });

    // 애니메이션이 끝나도 경로는 계속 표시 (수동으로 제거할 때까지)
    // 사용자가 다음 레이저를 발사하면 자동으로 제거됨
    */
}

// 입구 라벨 강조
function highlightEntryLabel(point, color) {
    const boardSection = document.querySelector('.board-section:nth-child(2)');
    if (!boardSection) return;

    const boardWrapper = boardSection.querySelector('.board-wrapper');
    if (!boardWrapper) return;

    // 입구 방향에 따라 라벨 찾기
    let label = null;
    if (point.row === 0) {
        // 위쪽 (1-11)
        label = boardWrapper.querySelector(`.labels-top .board-label[data-position="${point.col + 1}"]`);
    } else if (point.row === 6) {
        // 아래쪽 (H-R)
        const letter = String.fromCharCode(72 + point.col);
        label = boardWrapper.querySelector(`.labels-bottom .board-label[data-position="${letter}"]`);
    } else if (point.col === 0) {
        // 왼쪽 (A-G)
        const letter = String.fromCharCode(65 + point.row);
        label = boardWrapper.querySelector(`.labels-left .board-label[data-position="${letter}"]`);
    } else if (point.col === 10) {
        // 오른쪽 (12-18)
        label = boardWrapper.querySelector(`.labels-right .board-label[data-position="${point.row + 12}"]`);
    }

    if (label) {
        label.style.setProperty('--laser-color', color);
        label.classList.add('laser-entry');
    }
}

// 출구 라벨 강조
function highlightExitLabel(point, color) {
    const boardSection = document.querySelector('.board-section:nth-child(2)');
    if (!boardSection) return;

    const boardWrapper = boardSection.querySelector('.board-wrapper');
    if (!boardWrapper) return;

    // 출구 방향에 따라 라벨 찾기
    let label = null;
    if (point.row === 0) {
        // 위쪽 (1-11)
        label = boardWrapper.querySelector(`.labels-top .board-label[data-position="${point.col + 1}"]`);
    } else if (point.row === 6) {
        // 아래쪽 (H-R)
        const letter = String.fromCharCode(72 + point.col);
        label = boardWrapper.querySelector(`.labels-bottom .board-label[data-position="${letter}"]`);
    } else if (point.col === 0) {
        // 왼쪽 (A-G)
        const letter = String.fromCharCode(65 + point.row);
        label = boardWrapper.querySelector(`.labels-left .board-label[data-position="${letter}"]`);
    } else if (point.col === 10) {
        // 오른쪽 (12-18)
        label = boardWrapper.querySelector(`.labels-right .board-label[data-position="${point.row + 12}"]`);
    }

    if (label) {
        label.style.setProperty('--laser-color', color);
        label.classList.add('laser-exit');
    }
}

// 히스토리에 추가
function addToHistory(positionId, result) {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';

    let statusText;
    if (result.status === 'blocked') {
        statusText = '차단됨';
    } else {
        const exitPoint = result.path[result.path.length - 1];
        const exitLabel = getPositionLabel(result.exitDirection, exitPoint.row, exitPoint.col);
        const exitColorKorean = getColorNameKorean(result.exitColor);
        statusText = `${exitLabel}번 ${exitColorKorean}`;
    }

    historyItem.innerHTML = `
        #${gameState.laserCount}: ${positionId}번 → ${statusText}
    `;

    const historyList = document.getElementById('laserHistory');
    historyList.insertBefore(historyItem, historyList.firstChild);
}

// 행성 배치 가능 여부 확인
function canPlacePlanet(board, row, col, width, height, planetType = null, rotation = 0) {
    // 회전에 따라 너비/높이 교환
    let actualWidth = width;
    let actualHeight = height;
    if (rotation === 90 || rotation === 270) {
        actualWidth = height;
        actualHeight = width;
    }

    // 보드 범위 체크
    if (row + actualHeight > 7 || col + actualWidth > 11) {
        return false;
    }

    // 사다리꼴(trapezoid)은 반드시 밑변이 grid 끝에 닿아있어야 함
    if (planetType === 'medium-jupiter') {
        let validPlacement = false;

        if (rotation === 0 || rotation === undefined) {
            // 밑변이 아래쪽
            validPlacement = (row + actualHeight === 7);
        } else if (rotation === 90) {
            // 밑변이 오른쪽
            validPlacement = (col + actualWidth === 11);
        } else if (rotation === 180) {
            // 밑변이 위쪽
            validPlacement = (row === 0);
        } else if (rotation === 270) {
            // 밑변이 왼쪽
            validPlacement = (col === 0);
        }

        if (!validPlacement) {
            return false;
        }
    }

    // 겹침 체크
    for (let r = row; r < row + actualHeight; r++) {
        for (let c = col; c < col + actualWidth; c++) {
            if (board[r][c]) {
                return false;
            }
        }
    }

    return true;
}

// 행성을 보드에 배치
function placePlanetOnBoard(board, row, col, planetType, planetData, rotation = 0) {
    let { width, height } = planetData;

    // 회전에 따라 너비/높이 교환
    let actualWidth = width;
    let actualHeight = height;
    if (rotation === 90 || rotation === 270) {
        actualWidth = height;
        actualHeight = width;
    }

    for (let r = row; r < row + actualHeight; r++) {
        for (let c = col; c < col + actualWidth; c++) {
            board[r][c] = {
                type: planetType,
                ...planetData,
                isOrigin: r === row && c === col,  // 원점 표시
                originRow: row,
                originCol: col,
                rotation: rotation  // 회전 정보 저장
            };
        }
    }
}

// 랜덤 배치
function randomPlacement() {
    // 기존 배치 초기화
    gameState.questionerBoard = Array(7).fill(null).map(() => Array(11).fill(null));

    // 6개의 행성 타입을 각각 1개씩만 배치
    const planetTypes = Object.keys(PLANETS); // 정확히 6개의 행성

    // 행성 배치 순서를 랜덤하게 섞기
    const shuffledPlanetTypes = planetTypes.sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffledPlanetTypes.length; i++) {
        let placed = false;
        const planetType = shuffledPlanetTypes[i];
        const planet = PLANETS[planetType];

        // 큰 흰색, 큰 링 흰색은 rotation별로 시도
        if (planetType === 'medium-jupiter' || planetType === 'large-saturn') {
            const rotations = [0, 90, 180, 270];
            // rotation 순서 랜덤화
            const shuffledRotations = rotations.sort(() => Math.random() - 0.5);

            for (let rotIndex = 0; rotIndex < shuffledRotations.length && !placed; rotIndex++) {
                const rotation = shuffledRotations[rotIndex];
                let attempts = 0;

                while (!placed && attempts < 200) {
                    const row = Math.floor(Math.random() * 7);
                    const col = Math.floor(Math.random() * 11);

                    if (canPlacePlanet(gameState.questionerBoard, row, col, planet.width, planet.height, planetType, rotation)) {
                        placePlanetOnBoard(gameState.questionerBoard, row, col, planetType, planet, rotation);
                        placed = true;
                    }

                    attempts++;
                }
            }
        } else {
            // 일반 행성
            let attempts = 0;
            while (!placed && attempts < 200) {
                const row = Math.floor(Math.random() * 7);
                const col = Math.floor(Math.random() * 11);

                if (canPlacePlanet(gameState.questionerBoard, row, col, planet.width, planet.height, planetType, 0)) {
                    placePlanetOnBoard(gameState.questionerBoard, row, col, planetType, planet, 0);
                    placed = true;
                }

                attempts++;
            }
        }

        if (!placed) {
            console.warn(`Failed to place planet ${planetType} - trying again with relaxed constraints`);
        }
    }

    renderBoard('questionerBoard');

    // 랜덤 배치 후 디버그 정보도 업데이트
    if (gameState.phase === 'setup') {
        displayPlanetDebugInfo();
    }
}

// 보드 초기화
function clearBoard() {
    gameState.questionerBoard = Array(7).fill(null).map(() => Array(11).fill(null));

    // 회전 상태 초기화
    gameState.planetRotations = {
        'medium-jupiter': 0,
        'large-saturn': 0
    };

    // 미리보기 업데이트
    updatePlanetPreview('medium-jupiter');
    updatePlanetPreview('large-saturn');

    renderBoard('questionerBoard');

    // 디버그 정보 초기화
    const debugElement = document.getElementById('planetDebugInfo');
    debugElement.textContent = '배치 완료를 클릭하면 행성 배치 정보가 여기에 표시됩니다.';
}

// 배치된 행성 검증
function validatePlanetPlacement() {
    const planetCounts = {};
    const allPlanetTypes = Object.keys(PLANETS);

    // 모든 행성 타입의 카운트 초기화
    allPlanetTypes.forEach(type => {
        planetCounts[type] = 0;
    });

    // 보드를 순회하며 배치된 행성 개수 세기
    for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 11; col++) {
            const cell = gameState.questionerBoard[row][col];
            if (cell && cell.isOrigin) {
                // 원점인 경우만 카운트 (같은 행성을 여러 번 세지 않도록)
                planetCounts[cell.type]++;
            }
        }
    }

    // 검증: 6개의 행성이 각각 정확히 1개씩 배치되었는지 확인
    const placedPlanets = Object.entries(planetCounts).filter(([_, count]) => count > 0);
    const invalidPlanets = Object.entries(planetCounts).filter(([_, count]) => count > 1);

    if (placedPlanets.length !== 6) {
        return {
            valid: false,
            message: `6개의 서로 다른 행성을 각각 1개씩 배치해야 합니다.\n현재 배치된 행성: ${placedPlanets.length}개`
        };
    }

    if (invalidPlanets.length > 0) {
        const duplicates = invalidPlanets.map(([type, count]) => `${type} (${count}개)`).join(', ');
        return {
            valid: false,
            message: `각 행성은 1개씩만 배치해야 합니다.\n중복 배치된 행성: ${duplicates}`
        };
    }

    // 모든 행성이 정확히 1개씩 배치되었는지 확인
    const allPlacedOnce = allPlanetTypes.every(type => planetCounts[type] === 1);
    if (!allPlacedOnce) {
        const missing = allPlanetTypes.filter(type => planetCounts[type] === 0);
        return {
            valid: false,
            message: `6개의 서로 다른 행성을 각각 1개씩 배치해야 합니다.\n배치되지 않은 행성: ${missing.join(', ')}`
        };
    }

    return { valid: true };
}

// 행성 배치 정보 표시
function displayPlanetDebugInfo() {
    const planets = [];

    // 배치된 행성 정보 수집
    for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 11; col++) {
            const cell = gameState.questionerBoard[row][col];
            if (cell && cell.isOrigin) {
                planets.push({
                    type: cell.type,
                    position: `(${row}, ${col})`,
                    size: `${cell.width}x${cell.height}`,
                    color: cell.color,
                    reflective: cell.reflective,
                    shape: cell.shape
                });
            }
        }
    }

    // JSON 형태로 표시
    const debugInfo = {
        timestamp: new Date().toLocaleString('ko-KR'),
        totalPlanets: planets.length,
        planets: planets,
        board: gameState.questionerBoard
    };

    const debugElement = document.getElementById('planetDebugInfo');
    debugElement.textContent = JSON.stringify(debugInfo, null, 2);

    console.log('=== 행성 배치 정보 ===');
    console.log(debugInfo);
}

// 전체 레이저 테스트 표시 (36가지)
function displayAllLaserTests() {
    const testsContainer = document.getElementById('allLaserTests');
    testsContainer.innerHTML = ''; // 초기화

    const allTests = [];

    // A-R (18개 테스트)
    for (let i = 0; i < 18; i++) {
        const position = String.fromCharCode(65 + i); // A-R
        const posData = parsePositionId(position);
        if (posData) {
            const result = calculateLaserPath(posData.direction, posData.row, posData.col, 'none');
            allTests.push({ position, result });
        }
    }

    // 1-18 (18개 테스트)
    for (let i = 1; i <= 18; i++) {
        const position = i;
        const posData = parsePositionId(position);
        if (posData) {
            const result = calculateLaserPath(posData.direction, posData.row, posData.col, 'none');
            allTests.push({ position, result });
        }
    }

    // 각 테스트 결과를 HTML로 렌더링
    allTests.forEach(({ position, result }) => {
        const testItem = document.createElement('div');
        testItem.className = 'laser-test-item';

        if (result.status === 'blocked') {
            testItem.classList.add('blocked');
        }

        const header = document.createElement('div');
        header.className = 'laser-test-header';
        header.textContent = `${position}번 입력`;

        const output = document.createElement('div');
        output.className = 'laser-test-output';

        if (result.status === 'blocked') {
            output.textContent = '→ 차단됨';
            output.style.color = '#e74c3c';
        } else {
            const exitPoint = result.path[result.path.length - 1];
            const exitLabel = getPositionLabel(result.exitDirection, exitPoint.row, exitPoint.col);
            const exitColorKorean = getColorNameKorean(result.exitColor);
            output.textContent = `→ ${exitLabel}번 ${exitColorKorean}`;
        }

        const description = document.createElement('div');
        description.className = 'laser-test-description';

        if (result.status === 'blocked') {
            description.textContent = '레이저가 행성에 막혔습니다.';
        } else {
            // 경로 설명 생성
            const pathDescription = [];
            const planetsHit = [];

            for (let i = 0; i < result.path.length; i++) {
                const step = result.path[i];

                if (step.type === 'hit' && step.planet) {
                    const planetColor = getPlanetBaseColor(step.planet.color);
                    const planetShape = step.planet.shape;
                    const planetColorKorean = getColorNameKorean(planetColor);

                    // 같은 행성을 연속으로 기록하지 않도록
                    const planetKey = `${step.planet.originRow},${step.planet.originCol}`;
                    if (!planetsHit.includes(planetKey)) {
                        planetsHit.push(planetKey);

                        const shapeKorean = {
                            'circle': '원형',
                            'diamond': '마름모',
                            'octagon': '팔각형',
                            'trapezoid': '사다리꼴',
                            'ring': '링'
                        }[planetShape] || planetShape;

                        const reflectionType = step.planet.reflective ?
                            (planetShape === 'circle' ? '180도 반사' :
                             planetShape === 'diamond' ? '90도 반사' :
                             planetShape === 'octagon' ? '반사' :
                             planetShape === 'trapezoid' ? '반사' :
                             planetShape === 'ring' ? '반사' : '반사') : '차단';

                        pathDescription.push(
                            `(${step.row},${step.col})에서 ${planetColorKorean} ${shapeKorean} 행성 만남 → ${reflectionType}`
                        );
                    }
                }
            }

            description.textContent = pathDescription.length > 0 ?
                pathDescription.join(' → ') :
                '행성과 충돌하지 않고 통과';
        }

        testItem.appendChild(header);
        testItem.appendChild(output);
        testItem.appendChild(description);
        testsContainer.appendChild(testItem);
    });

    console.log('=== 전체 레이저 테스트 완료 ===');
    console.log(`총 ${allTests.length}개 테스트 실행`);
}

// 디버그 정보 복사
function copyDebugInfo() {
    const debugElement = document.getElementById('planetDebugInfo');
    const text = debugElement.textContent;

    navigator.clipboard.writeText(text).then(() => {
        alert('디버그 정보가 클립보드에 복사되었습니다!');
    }).catch(err => {
        console.error('복사 실패:', err);
        alert('복사 실패. 콘솔을 확인하세요.');
    });
}

// 배치 완료
function confirmSetup() {
    // 배치 검증
    const validation = validatePlanetPlacement();

    if (!validation.valid) {
        alert(validation.message);
        return;
    }

    gameState.phase = 'playing';
    document.getElementById('currentPhase').textContent = '게임 진행 중';

    // 디버그 정보 표시
    displayPlanetDebugInfo();

    // 전체 레이저 테스트 표시
    displayAllLaserTests();

    // 싱글 플레이 모드가 아닐 때만 알림 표시
    if (gameState.mode !== 'singlePlay') {
        alert('배치가 완료되었습니다! 이제 레이저를 발사하여 행성 위치를 추론하세요.');
    }

    // UI 업데이트
    updateGameModeUI();
}

// 솔루션 제출
function submitSolution() {
    if (gameState.phase !== 'playing') {
        alert('게임이 진행 중이 아닙니다!');
        return;
    }

    // 시도 횟수 증가
    gameState.laserCount++;
    document.getElementById('laserCount').textContent = gameState.laserCount;

    // 정답 확인
    let correct = true;

    for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 11; col++) {
            const explorer = gameState.explorerBoard[row][col];
            const questioner = gameState.questionerBoard[row][col];

            if ((explorer && !questioner) || (!explorer && questioner)) {
                correct = false;
                break;
            } else if (explorer && questioner && explorer.type !== questioner.type) {
                correct = false;
                break;
            }
        }
        if (!correct) break;
    }

    // 결과에 따라 모달 표시
    if (correct) {
        gameState.phase = 'finished';
        document.getElementById('currentPhase').textContent = '게임 종료 - 승리!';

        // 싱글 플레이 모드에서는 정답 공개
        if (gameState.mode === 'singlePlay') {
            gameState.questionerBoardHidden = false;
            renderBoard('questionerBoard');
            // 포기하기 버튼 숨기기
            document.getElementById('giveUpBtn').style.display = 'none';
        }

        // 성공 모달 표시
        openSuccessModal();
    } else {
        // 실패 모달 표시
        openFailModal();
    }
}

// 포기하기
function giveUp() {
    if (gameState.mode !== 'singlePlay' || gameState.phase !== 'playing') {
        return;
    }

    const confirmed = confirm('정말 포기하시겠습니까? 정답이 공개됩니다.');
    if (!confirmed) return;

    // 정답 공개
    gameState.questionerBoardHidden = false;
    renderBoard('questionerBoard');

    gameState.phase = 'finished';
    document.getElementById('currentPhase').textContent = '게임 종료 - 포기';

    // 포기하기 버튼 숨기기
    document.getElementById('giveUpBtn').style.display = 'none';

    // 포기 메시지 표시 (3초만)
    const resultDiv = document.createElement('div');
    resultDiv.className = 'result-popup';

    const isMobile = window.innerWidth <= 480;
    const fontSize = isMobile ? '2em' : '3em';
    const padding = isMobile ? '30px 40px' : '50px 80px';

    resultDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(231, 76, 60, 0.98);
        color: white;
        padding: ${padding};
        border-radius: 20px;
        font-size: ${fontSize};
        font-weight: bold;
        z-index: 20000;
        box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
        text-align: center;
        animation: resultPopup 0.5s ease-out;
    `;

    resultDiv.innerHTML = `
        포기했습니다<br>
        <div style="font-size: 0.5em; margin-top: 20px;">
            정답이 공개되었습니다
        </div>
    `;

    document.body.appendChild(resultDiv);

    // 3초 후 모달 제거하고 다시하기 버튼 표시
    setTimeout(() => {
        if (resultDiv && resultDiv.parentNode) {
            resultDiv.remove();
        }
        showRestartButton();
    }, 3000);
}

// 다시하기 버튼 표시 (상단 게임 시작 위치)
function showRestartButton() {
    const startSection = document.getElementById('startGameSection');
    if (startSection) {
        startSection.innerHTML = `
            <button id="restartGameBtn" class="btn btn-primary btn-large">💕 추억 탐방</button>
            <p class="start-game-desc">버튼을 눌러 새로운 문제를 시작하세요</p>
        `;
        startSection.style.display = 'block';

        // 다시하기 버튼 이벤트 리스너
        document.getElementById('restartGameBtn').addEventListener('click', startGame);
    }
}

// 게임 재시작
function restartGame() {
    // startGame 함수를 재사용
    startGame();
}

// 행성 선택
function setupPlanetSelector() {
    const planetItems = document.querySelectorAll('.planet-item');
    planetItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // 도움말 버튼 클릭 시 행성 선택되지 않도록
            if (e.target.classList.contains('help-btn')) {
                return;
            }

            planetItems.forEach(p => p.classList.remove('selected'));
            item.classList.add('selected');
            gameState.selectedPlanet = item.dataset.planet;
        });
    });

    // 도움말 버튼 이벤트 핸들러
    const helpButtons = document.querySelectorAll('.help-btn');
    helpButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // 부모 planet-item 클릭 이벤트 전파 방지

            const planetType = btn.dataset.planet;
            // 도움말 메시지 표시
            showHelpMessage(planetType);
        });
    });
}

// 행성 미리보기 회전 업데이트
function updatePlanetPreview(planetType) {
    const rotation = gameState.planetRotations[planetType];
    const previewContainer = document.getElementById(`preview-${planetType}`);

    if (previewContainer) {
        const preview = previewContainer.querySelector('.planet-preview');
        if (preview) {
            // 사다리꼴(큰 흰색)은 90도/270도 회전시 scaleY(-1) 적용
            if (planetType === 'medium-jupiter') {
                if (rotation === 90 || rotation === 270) {
                    preview.style.transform = `rotate(${rotation}deg) scaleY(-1)`;
                } else {
                    preview.style.transform = `rotate(${rotation}deg)`;
                }
            } else {
                // 큰 링 흰색은 회전만 적용
                preview.style.transform = `rotate(${rotation}deg)`;
            }
        }
    }
}

// 레이저 발사 위치 버튼 생성
function setupLaserButtons() {
    // 1-11, 12-18 숫자 버튼 생성
    const numberButtonsContainer = document.getElementById('numberButtons');
    for (let i = 1; i <= 11; i++) {
        const button = document.createElement('button');
        button.className = 'position-btn';
        button.textContent = i;
        button.addEventListener('click', () => selectPosition(i));
        numberButtonsContainer.appendChild(button);
    }
    for (let i = 12; i <= 18; i++) {
        const button = document.createElement('button');
        button.className = 'position-btn';
        button.textContent = i;
        button.addEventListener('click', () => selectPosition(i));
        numberButtonsContainer.appendChild(button);
    }

    // A-G, H-R 알파벳 버튼 생성
    const letterButtonsContainer = document.getElementById('letterButtons');
    for (let i = 0; i < 18; i++) {
        const button = document.createElement('button');
        button.className = 'position-btn';
        const letter = String.fromCharCode(65 + i); // A-R
        button.textContent = letter;
        button.addEventListener('click', () => selectPosition(letter));
        letterButtonsContainer.appendChild(button);
    }
}

// 게임 모드에 따라 UI 업데이트
function updateGameModeUI() {
    const isSinglePlay = gameState.mode === 'singlePlay';

    // 질문자 보드 제목 변경
    const questionerTitle = document.getElementById('questionerBoardTitle');
    const questionerDesc = document.getElementById('questionerBoardDesc');
    if (isSinglePlay) {
        questionerTitle.textContent = 'AI 문제';
        questionerDesc.textContent = '레이저로 행성 위치를 추론하세요';
    } else {
        questionerTitle.textContent = '질문자 보드';
        questionerDesc.textContent = '행성을 배치하세요';
    }

    // 질문자 보드 컨트롤 버튼 표시/숨김
    const questionerControls = document.getElementById('questionerControls');
    questionerControls.style.display = isSinglePlay ? 'none' : 'flex';

    // 디버그 패널 표시/숨김
    const debugPanel1 = document.getElementById('debugPanel1');
    const debugPanel2 = document.getElementById('debugPanel2');
    debugPanel1.style.display = isSinglePlay ? 'none' : 'block';
    debugPanel2.style.display = isSinglePlay ? 'none' : 'block';

    // 포기하기 버튼 표시/숨김
    const giveUpBtn = document.getElementById('giveUpBtn');
    if (isSinglePlay && gameState.phase === 'playing') {
        giveUpBtn.style.display = 'inline-block';
    } else {
        giveUpBtn.style.display = 'none';
    }

    // 싱글 플레이 모드에서 질문자 보드 숨김 상태 업데이트
    if (isSinglePlay && gameState.phase === 'playing') {
        gameState.questionerBoardHidden = true;
        renderBoard('questionerBoard');
    } else {
        gameState.questionerBoardHidden = false;
        renderBoard('questionerBoard');
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    document.getElementById('randomPlacements').addEventListener('click', randomPlacement);
    document.getElementById('clearBoard').addEventListener('click', clearBoard);
    document.getElementById('confirmSetup').addEventListener('click', confirmSetup);
    document.getElementById('submitSolution').addEventListener('click', submitSolution);
    document.getElementById('fireLaserBtn').addEventListener('click', fireLaserFromButton);
    document.getElementById('copyDebugInfo').addEventListener('click', copyDebugInfo);

    document.getElementById('gameMode').addEventListener('change', (e) => {
        gameState.mode = e.target.value;
        updateGameModeUI();

        // 싱글 플레이로 전환 시 자동 설정
        if (gameState.mode === 'singlePlay' && gameState.phase === 'setup') {
            setTimeout(() => {
                randomPlacement();
                setTimeout(() => {
                    confirmSetup();
                }, 100);
            }, 100);
        }
    });

    // 포기하기 버튼 이벤트 리스너
    document.getElementById('giveUpBtn').addEventListener('click', giveUp);

    // 게임 시작 버튼 이벤트 리스너
    document.getElementById('startGameBtn').addEventListener('click', startGame);

    setupPlanetSelector();
    setupLaserButtons();
}

// 게임 시작 (모달 표시)
function startGame() {
    openStartModal();
}

// 실제 게임 시작
function actualStartGame() {
    // 게임 시작 버튼 숨기기
    const startSection = document.getElementById('startGameSection');
    if (startSection) {
        startSection.style.display = 'none';
    }

    // 게임 상태 초기화
    gameState.phase = 'setup';
    gameState.laserCount = 0;
    gameState.explorerBoard = Array(7).fill(null).map(() => Array(11).fill(null));
    gameState.questionerBoard = Array(7).fill(null).map(() => Array(11).fill(null));
    gameState.laserHistory = [];
    gameState.selectedPlanet = null;
    gameState.selectedPosition = null;
    // 중요: 싱글 플레이 모드면 먼저 숨김 상태로 설정
    gameState.questionerBoardHidden = gameState.mode === 'singlePlay';
    gameState.planetRotations = {
        'medium-jupiter': 0,
        'large-saturn': 0
    };

    // UI 초기화
    document.getElementById('currentPhase').textContent = '행성 배치';
    document.getElementById('laserCount').textContent = '0';
    document.getElementById('laserHistory').innerHTML = '';

    // 탐험가 보드만 렌더링 (질문자 보드는 나중에)
    renderBoard('explorerBoard');

    // UI 업데이트
    updateGameModeUI();

    // 싱글 플레이 모드면 자동으로 랜덤 배치 + 배치 완료
    if (gameState.mode === 'singlePlay') {
        // 즉시 실행 - requestAnimationFrame 제거
        randomPlacement();
        confirmSetup();
    } else {
        // 연습 모드에서는 빈 질문자 보드 렌더링
        renderBoard('questionerBoard');
    }
}

// 게임 초기화
function initGame() {
    initializeBoards();
    setupEventListeners();

    // 버전 정보 업데이트
    updateGameVersion();

    // 초기 상태: 게임 대기 중
    document.getElementById('currentPhase').textContent = '게임 대기 중';

    // 게임 시작 버튼 표시
    const startSection = document.getElementById('startGameSection');
    if (startSection) {
        startSection.style.display = 'block';
    }
}

// 버전 정보 업데이트
function updateGameVersion() {
    const versionElement = document.getElementById('versionInfo');
    if (versionElement) {
        versionElement.textContent = `v${GAME_VERSION}`;
    }
}

// 페이지 로드 시 게임 시작
window.addEventListener('DOMContentLoaded', initGame);

// 화면 크기 변경 시 보드 다시 렌더링 (모바일 회전 등)
let resizeTimer;
let lastWidth = window.innerWidth;
window.addEventListener('resize', () => {
    // 디바운스: 리사이즈가 끝난 후에만 렌더링
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        const currentWidth = window.innerWidth;
        // 너비가 실제로 변경되었을 때만 렌더링 (모바일 스크롤로 인한 세로 크기 변경 무시)
        if (Math.abs(currentWidth - lastWidth) > 10) {
            lastWidth = currentWidth;
            renderBoard('explorerBoard');
            renderBoard('questionerBoard');
        }
    }, 500); // debounce 시간 증가
});

// 모달 관련 함수들
function openStartModal() {
    const modal = document.getElementById('startModal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeStartModal() {
    const modal = document.getElementById('startModal');
    if (modal) {
        modal.classList.remove('show');
    }
    // 실제 게임 시작
    actualStartGame();
}

function openSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('show');
    }
    // 싱글 플레이 모드에서는 다시하기 버튼 표시
    if (gameState.mode === 'singlePlay') {
        showRestartButton();
    }
}

function openFailModal() {
    const modal = document.getElementById('failModal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeFailModal() {
    const modal = document.getElementById('failModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// 도움말 버튼 기능
function showHelpMessage(planetType) {
    const planetNames = {
        'small-red': '첫 만남 행성',
        'small-orange': '대부도 불꽃놀이 별',
        'small-blue': '하동 녹차밭 별',
        'medium-earth': '333일 기념 별',
        'medium-jupiter': '제주도 여행 별',
        'large-saturn': '크리스마스 별'
    };

    // 모달로 표시
    const helpModal = document.createElement('div');
    helpModal.className = 'modal show';
    helpModal.innerHTML = `
        <div class="modal-content">
            <p class="modal-message">삥뽕아, 이 행성은<br>90도로 꺾이는 거야. 힘내!</p>
            <button class="modal-btn" onclick="this.closest('.modal').remove()">알겠어!</button>
        </div>
    `;
    document.body.appendChild(helpModal);
}

// 전역 함수로 노출
window.closeStartModal = closeStartModal;
window.closeSuccessModal = closeSuccessModal;
window.closeFailModal = closeFailModal;
