/*
 * 이 프로젝트는 GNU General Public License v3.0을 따릅니다.
 * 자세한 라이선스 내용은 LICENSE 파일을 참조하세요.
 */
let remainingAddSlots = 3;
    let remainingRespins = 3;

    const colors = ['#ff5c8a', '#2ce0c1', '#f0c735', '#b84dff', '#3b82f6', '#ff704d', '#2de856', '#d936c5', '#4dc3ff', '#f59e0b'];

    let segments = [
        { id: 1, name: '두비두', weight: 1, color: colors[0] },
    ];
    let nextId = 5;
    let currentAngle = 0; 
    let isSpinning = false;
    let isStopping = false; 
    let animationFrame;

    let resultSlots = [null, null, null];
    let activeSlotIndex = -1;
    let globalHistory = [];
    
    let highlightedSegmentId = null;
    let pendingWinner = null;
    let pendingWinnerIndex = -1;

    // 수동 선택 모달용 타겟 슬롯 인덱스
    let targetManualSlotIdx = -1;
    // 최근 도네이션으로 추가/수정된 항목 하이라이트용 ID
    let lastFlashedId = null;

    const canvas = document.getElementById('wheelCanvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    const spinBtn = document.getElementById('spinBtn');
    const itemsListContainer = document.getElementById('items-list');
    const addBtn = document.getElementById('addBtn');
    const newItemNameInput = document.getElementById('newItemName');
    const newItemWeightInput = document.getElementById('newItemWeight');
    const resultSlotsContainer = document.getElementById('result-slots');
    
    const exportBtn = document.getElementById('exportBtn');
    const addSlotBtn = document.getElementById('addSlotBtn');
    const addCountDisplay = document.getElementById('addCount');
    const respinCountDisplay = document.getElementById('respinCount');
    const historyList = document.getElementById('history-list');
    
    const historyWrapper = document.getElementById('historyWrapper');
    const historyToggle = document.getElementById('historyToggle');
    const historyArrow = document.getElementById('historyArrow');
    const historyContent = document.getElementById('historyContent');

    const winnerOverlay = document.getElementById('winnerOverlay');
    const winnerPopup = document.getElementById('winnerPopup');
    const wheelPointer = document.getElementById('wheelPointer'); 
    const currentSegmentText = document.getElementById('currentSegmentText');
    
    const undoStorage = document.getElementById('undoStorage');
    const undoBtn = document.getElementById('undoBtn');

    // 타이머 및 신규 버튼 DOM
    const floatingTimerBtn = document.getElementById('floatingTimerBtn');
    const timerOverlay = document.getElementById('timerOverlay');
    const tMin = document.getElementById('tMin');
    const tSec = document.getElementById('tSec');
    const timerInputWrap = document.getElementById('timerInputWrap');
    const bigTimeDisplay = document.getElementById('bigTimeDisplay');
    const btnStartTimer = document.getElementById('btnStartTimer');
    const btnStopTimer = document.getElementById('btnStopTimer');
    const btnCloseTimer = document.getElementById('btnCloseTimer');

    const btnMinusAdd = document.getElementById('btnMinusAdd');
    const btnPlusAdd = document.getElementById('btnPlusAdd');
    const btnMinusRespin = document.getElementById('btnMinusRespin');
    const btnPlusRespin = document.getElementById('btnPlusRespin');
    const copyResultBtn = document.getElementById('copyResultBtn');

    // 테마 및 메모장 DOM
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const memoOpenBtn = document.getElementById('memoOpenBtn');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const memoPanel = document.getElementById('memoPanel');

    // 항목 수동 선택 모달 DOM
    const selectItemOverlay = document.getElementById('selectItemOverlay');
    const selectItemList = document.getElementById('selectItemList');
    const btnCloseSelect = document.getElementById('btnCloseSelect');

    // 치지직 연동 DOM (토글 버튼 포함)
    const chzzkBar = document.getElementById('chzzkBar');
    const chzzkToggleBtn = document.getElementById('chzzkToggleBtn');
    const chzzkCloseBarBtn = document.getElementById('chzzkCloseBarBtn');
    const floatingChzzkDot = document.getElementById('floatingChzzkDot');
    const chzzkUrlInput = document.getElementById('chzzkUrlInput');
    const chzzkConnectBtn = document.getElementById('chzzkConnectBtn');
    const chzzkStatus = document.getElementById('chzzkStatus');
    const chzzkTestBtn = document.getElementById('chzzkTestBtn');
    const toastContainer = document.getElementById('toastContainer');

    const CENTER_X = canvas.width / 2;
    const CENTER_Y = canvas.height / 2;
    const RADIUS = canvas.width / 2;

    // --- 0. 치지직 상단 바 토글 스위치 ---
    chzzkToggleBtn.addEventListener('click', () => {
        chzzkBar.classList.toggle('open');
        if (chzzkBar.classList.contains('open')) {
            setTimeout(() => chzzkUrlInput.focus(), 100);
        }
    });
    chzzkCloseBarBtn.addEventListener('click', () => {
        chzzkBar.classList.remove('open');
    });

    // --- 1. 테마 토글 스위치 ---
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        if(document.body.classList.contains('light-theme')) {
            themeToggleBtn.textContent = '🌙 다크 모드';
        } else {
            themeToggleBtn.textContent = '☀️ 화이트 모드';
        }
    });

    // --- 2. 슬라이드 메모장 스위치 ---
    memoOpenBtn.addEventListener('click', () => {
        memoPanel.classList.add('open');
    });
    closeDrawerBtn.addEventListener('click', () => {
        memoPanel.classList.remove('open');
    });

    // --- 3. 수동 항목 선택 모달 이벤트 ---
    btnCloseSelect.addEventListener('click', () => {
        selectItemOverlay.classList.remove('show');
        targetManualSlotIdx = -1;
    });
    selectItemOverlay.addEventListener('click', (e) => {
        if (e.target === selectItemOverlay) {
            selectItemOverlay.classList.remove('show');
            targetManualSlotIdx = -1;
        }
    });

    function openSelectModal(slotIdx) {
        if (isSpinning || pendingWinner) return;
        if (segments.length === 0) {
            alert("현재 룰렛에 선택할 수 있는 항목이 없습니다.");
            return;
        }
        targetManualSlotIdx = slotIdx;
        selectItemList.innerHTML = '';

        segments.forEach((seg, index) => {
            const itemRow = document.createElement('div');
            itemRow.className = 'select-item-row';
            itemRow.innerHTML = `
                <div class="select-item-info">
                    <span class="select-item-badge" style="background: ${seg.color};"></span>
                    <span>${seg.name}</span>
                </div>
                <span style="color: var(--neon-green); font-size: 15px;">${seg.weight}개</span>
            `;
            itemRow.addEventListener('click', () => {
                saveSnapshot();
                resultSlots[targetManualSlotIdx] = {
                    name: seg.name,
                    weight: seg.weight,
                    color: seg.color
                };
                segments.splice(index, 1);
                
                renderSlots();
                renderInputs();
                
                selectItemOverlay.classList.remove('show');
                targetManualSlotIdx = -1;
            });
            selectItemList.appendChild(itemRow);
        });

        selectItemOverlay.classList.add('show');
    }

    // --- 기존 UI / 이벤트 로직 ---
    historyToggle.addEventListener('click', () => {
        historyWrapper.classList.toggle('expanded');
        historyArrow.textContent = historyWrapper.classList.contains('expanded') ? '▲' : '▼';
    });

    function saveSnapshot() {
        const state = {
            segments: JSON.parse(JSON.stringify(segments)),
            resultSlots: JSON.parse(JSON.stringify(resultSlots)),
            globalHistory: JSON.parse(JSON.stringify(globalHistory)),
            remainingAddSlots, remainingRespins, nextId
        };
        let stack = JSON.parse(undoStorage.value || "[]");
        stack.push(state);
        if(stack.length > 10) stack.shift(); 
        undoStorage.value = JSON.stringify(stack);
        undoBtn.disabled = false; 
    }

    undoBtn.addEventListener('click', () => {
        if (isSpinning || pendingWinner) return; 
        let stack = JSON.parse(undoStorage.value || "[]");
        if (stack.length === 0) return;
        const prevState = stack.pop();
        undoStorage.value = JSON.stringify(stack);
        if (stack.length === 0) undoBtn.disabled = true;

        segments = prevState.segments; resultSlots = prevState.resultSlots; globalHistory = prevState.globalHistory;
        remainingAddSlots = prevState.remainingAddSlots; remainingRespins = prevState.remainingRespins; nextId = prevState.nextId;
        activeSlotIndex = -1; highlightedSegmentId = null;

        updateLimitDisplays(); renderInputs(); renderSlots(); renderHistory();
    });

    btnMinusAdd.addEventListener('click', () => { if(remainingAddSlots > 0) { saveSnapshot(); remainingAddSlots--; updateLimitDisplays(); } });
    btnPlusAdd.addEventListener('click', () => { saveSnapshot(); remainingAddSlots++; updateLimitDisplays(); });
    btnMinusRespin.addEventListener('click', () => { if(remainingRespins > 0) { saveSnapshot(); remainingRespins--; updateLimitDisplays(); } });
    btnPlusRespin.addEventListener('click', () => { saveSnapshot(); remainingRespins++; updateLimitDisplays(); });

    copyResultBtn.addEventListener('click', () => {
        let currentWinners = resultSlots.filter(r => r !== null).map(r => r.name);
        let currentStr = currentWinners.length > 0 ? currentWinners.join(', ') : '없음';
        let respinWinners = globalHistory.map(h => h.name);
        let respinStr = respinWinners.length > 0 ? respinWinners.join(', ') : '없음';
        let copyText = `재료: ${currentStr} / 예비재료: ${respinStr}`;

        navigator.clipboard.writeText(copyText).then(() => {
            alert("결과가 클립보드에 복사되었습니다!\n\n" + copyText);
        }).catch(err => { alert("복사 실패: " + err); });
    });

    // --- 스톱워치 로직 ---
    let timerInterval = null;
    let totalSeconds = 0;
    function formatTime(sec) { 
        const m = Math.floor(sec / 60); 
        const s = sec % 60; 
        return `${String(m).padStart(2, '0')} : ${String(s).padStart(2, '0')}`; 
    }
    
    floatingTimerBtn.addEventListener('click', () => { timerOverlay.classList.add('show'); });
    btnCloseTimer.addEventListener('click', () => { timerOverlay.classList.remove('show'); });

    btnStartTimer.addEventListener('click', () => {
        const m = parseInt(tMin.value) || 0; const s = parseInt(tSec.value) || 0; totalSeconds = (m * 60) + s;
        if (totalSeconds <= 0) { alert("시간을 설정해 주세요."); return; }
        timerInputWrap.style.display = 'none'; bigTimeDisplay.style.display = 'block'; btnStartTimer.style.display = 'none'; btnStopTimer.style.display = 'block';
        bigTimeDisplay.textContent = formatTime(totalSeconds); 
        floatingTimerBtn.textContent = `⏱ ${formatTime(totalSeconds)}`;

        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            totalSeconds--; 
            bigTimeDisplay.textContent = formatTime(totalSeconds); 
            floatingTimerBtn.textContent = `⏱ ${formatTime(totalSeconds)}`;
            
            let currentColor = document.body.classList.contains('light-theme') ? '#e74c3c' : '#d936c5';
            floatingTimerBtn.style.color = currentColor; 
            
            if (totalSeconds <= 0) {
                clearInterval(timerInterval);
                bigTimeDisplay.textContent = formatTime(0); 
                floatingTimerBtn.textContent = '⏱ 타이머'; 
                floatingTimerBtn.style.color = '';
                setTimeout(()=>{alert("설정된 시간이 모두 종료되었습니다!"); resetTimerUI();},300);
            }
        }, 1000);
    });

    btnStopTimer.addEventListener('click', () => { clearInterval(timerInterval); floatingTimerBtn.textContent = '⏱ 타이머'; floatingTimerBtn.style.color = ''; resetTimerUI(); });
    function resetTimerUI() { timerInputWrap.style.display = 'flex'; bigTimeDisplay.style.display = 'none'; btnStartTimer.style.display = 'block'; btnStopTimer.style.display = 'none'; }

    // --- 오디오 재생 ---
    
    function playWinSound() {
        try {
            const randomNum = Math.floor(Math.random() * 12) + 1;
            const audio = new Audio(`sound/${randomNum}.mp3`);
            audio.play().catch(error => { console.warn(`효과음 재생 실패:`, error); });
            audio.addEventListener('ended', function() { this.src = ''; this.remove(); });
        } catch (e) { console.error("오디오 시스템 에러:", e); }
    }

    function updateLimitDisplays() {
        addCountDisplay.textContent = remainingAddSlots; respinCountDisplay.textContent = remainingRespins;
        addSlotBtn.style.background = remainingAddSlots <= 0 ? 'var(--btn-base)' : '';
        addSlotBtn.style.color = remainingAddSlots <= 0 ? '#777' : '';
        addSlotBtn.style.borderColor = remainingAddSlots <= 0 ? '#555' : '';
    }

    // --- ★ '돌려돌려 돌림판' 스타일 2단계 분리 렌더링 (글자 무조건 표시 & 겹침 허용) ★ ---
    function drawWheel() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (segments.length === 0) return;
        let totalWeight = segments.reduce((sum, seg) => sum + seg.weight, 0);
        
        // [1단계] 모든 부채꼴 배경 조각과 테두리 선 그리기
        let startAngle = 0;
        segments.forEach((seg) => {
            let sliceAngle = (seg.weight / totalWeight) * 2 * Math.PI;
            ctx.globalAlpha = (highlightedSegmentId && seg.id !== highlightedSegmentId) ? 0.2 : 1.0;

            ctx.beginPath(); 
            ctx.moveTo(CENTER_X, CENTER_Y); 
            ctx.arc(CENTER_X, CENTER_Y, RADIUS, startAngle, startAngle + sliceAngle); 
            ctx.fillStyle = seg.color; 
            ctx.fill(); 
            
            ctx.lineWidth = segments.length > 150 ? 0.5 : 2; 
            ctx.strokeStyle = '#000'; 
            ctx.stroke();
            
            startAngle += sliceAngle;
        });

        // [2단계] 텍스트를 안쪽(중심부 근처)에서 바깥쪽 방향으로 뻗어 나가게 그리기
        startAngle = 0;
        let fontSize = 40; 
        // 중심(SPIN 버튼 반경 55px) 바로 바깥쪽인 반지름의 22% 지점부터 글자 시작
        const innerStartOffset = RADIUS * 0.22; 
        
        segments.forEach((seg) => {
            let sliceAngle = (seg.weight / totalWeight) * 2 * Math.PI;
            ctx.globalAlpha = (highlightedSegmentId && seg.id !== highlightedSegmentId) ? 0.15 : 1.0;

            ctx.save(); 
            ctx.translate(CENTER_X, CENTER_Y); 
            ctx.rotate(startAngle + sliceAngle / 2); 
            
            // ★ 핵심: 좌측 정렬(left)로 설정하여 글자가 길어질수록 오른쪽(원판 바깥쪽)으로 뻗어 나가게 함
            ctx.textAlign = "left"; 
            ctx.textBaseline = "middle"; 
            ctx.font = `900 ${fontSize}px 'Noto Sans KR'`;
            
            
            const displayText = `${seg.name}`; 

            // 두꺼운 검은색 외곽선 먼저 그리기
            ctx.lineWidth = 6;
            ctx.strokeStyle = "#000000";
            ctx.lineJoin = "round";
            ctx.strokeText(displayText, innerStartOffset, 0);

            // 흰색 글씨 덮어쓰기
            ctx.fillStyle = "#ffffff"; 
            ctx.fillText(displayText, innerStartOffset, 0); 
            ctx.restore();
            
            startAngle += sliceAngle;
        });

        ctx.globalAlpha = 1.0;
        canvas.style.transform = `rotate(${currentAngle}rad)`;
    }

    function renderInputs() {
        itemsListContainer.innerHTML = '';
        let totalWeight = segments.reduce((sum, seg) => sum + seg.weight, 0);
        segments.forEach((seg, index) => {
            let percent = totalWeight > 0 ? ((seg.weight / totalWeight) * 100).toFixed(1) : 0;
            const row = document.createElement('div'); 
            row.className = 'item-row';
            if (seg.id === lastFlashedId) {
                row.classList.add('flash');
            }
            
            row.innerHTML = `
                <div class="badge-container">
                    <div class="item-badge" style="background: ${seg.color};">#${index + 1}</div>
                    <button class="btn-delete" data-index="${index}" title="삭제">X</button>
                </div>
                <input type="text" value="${seg.name}" data-index="${index}" class="input-name"> 
                <input type="number" value="${seg.weight}" data-index="${index}" class="input-weight" min="1"> 
                <div class="item-percent">${percent}%</div>
            `;
            itemsListContainer.appendChild(row);
        });
        lastFlashedId = null;
        attachInputEvents(); drawWheel();
    }

    function attachInputEvents() {
        document.querySelectorAll('.input-name').forEach(input => { 
            input.addEventListener('input', (e) => { 
                const cleanedValue = e.target.value.replace(/\s+/g, '');
                if (e.target.value !== cleanedValue) {
                    e.target.value = cleanedValue;
                }
                segments[e.target.getAttribute('data-index')].name = cleanedValue; 
                drawWheel(); 
            }); 
        });
        document.querySelectorAll('.input-weight').forEach(input => { input.addEventListener('input', (e) => { let val = Number(e.target.value); if(val < 1) val = 1; segments[e.target.getAttribute('data-index')].weight = val; renderInputs(); }); });
        document.querySelectorAll('.btn-delete').forEach(btn => { btn.addEventListener('click', (e) => { saveSnapshot(); segments.splice(e.target.getAttribute('data-index'), 1); renderInputs(); }); });
    }

    function addOrUpdateSegment(rawName, weightToAdd, isFromDonation = false) {
        const cleanName = rawName.replace(/\s+/g, '');
        if (!cleanName || weightToAdd < 1) return null;

        saveSnapshot();
        const existingItem = segments.find(seg => seg.name === cleanName);
        let targetId;

        if (existingItem) {
            existingItem.weight += weightToAdd;
            targetId = existingItem.id;
        } else {
            targetId = nextId++;
            segments.push({ 
                id: targetId, 
                name: cleanName, 
                weight: weightToAdd, 
                color: colors[targetId % colors.length] 
            });
        }

        if (isFromDonation) {
            lastFlashedId = targetId;
        }

        renderInputs();
        setTimeout(() => { itemsListContainer.scrollTop = itemsListContainer.scrollHeight; }, 10);
        return cleanName;
    }

    addBtn.addEventListener('click', () => {
        const newName = newItemNameInput.value;
        const newWeight = Number(newItemWeightInput.value) || 1;
        if (!newName.replace(/\s+/g, '')) { alert('항목 이름을 입력해주세요.'); return; }
        
        addOrUpdateSegment(newName, newWeight, false);
        newItemNameInput.value = ''; 
        newItemWeightInput.value = '1'; 
    });
    newItemNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addBtn.click(); });

    exportBtn.addEventListener('click', () => {
        if (segments.length === 0) { alert("저장할 항목이 없습니다."); return; }
        const sortedSegments = [...segments].sort((a, b) => b.weight - a.weight);
        let txtContent = "순위 ) 항목명 항목갯수\n=====================\n";
        sortedSegments.forEach((seg, index) => { txtContent += `${index + 1} ) ${seg.name} ${seg.weight}\n`; });
        const blob = new Blob(['\uFEFF' + txtContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'roulette_ranking.txt'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    });

    function renderSlots() {
        resultSlotsContainer.innerHTML = '';
        resultSlots.forEach((res, idx) => {
            const slot = document.createElement('div');
            let stateClass = activeSlotIndex === idx ? 'active' : (res ? 'filled' : 'empty');
            slot.className = `result-slot ${stateClass}`;
            
            if (activeSlotIndex === idx) { 
                slot.innerHTML = `<div class="slot-info"><span class="slot-num">#${idx + 1}</span><span>추첨 중... 🎲</span></div>`; 
            } 
            else if (res) { 
                slot.innerHTML = `<div class="slot-info"><span class="slot-num">#${idx + 1}</span><span>${res.name} <span style="font-size:0.7em; opacity: 0.7;">(${res.weight}개)</span></span></div><button class="btn-reload" data-index="${idx}" title="이 칸만 다시 돌리기">🔄</button>`; 
            } 
            else { 
                slot.innerHTML = `<div class="slot-info"><span class="slot-num">#${idx + 1}</span><span>대기 중 <span style="font-size:0.75em; opacity:0.6; font-weight:normal;">(클릭하여 직접 선택)</span></span></div>`; 
                slot.addEventListener('click', () => openSelectModal(idx));
            }
            resultSlotsContainer.appendChild(slot);
        });
        document.querySelectorAll('.btn-reload').forEach(btn => { btn.addEventListener('click', (e) => { respinSlot(parseInt(e.currentTarget.getAttribute('data-index'))); }); });
    }

    function renderHistory() {
        if (globalHistory.length === 0) { historyList.innerHTML = `<li style="color: var(--text-sub); font-style: italic;">아직 기록이 없습니다.</li>`; return; }
        historyList.innerHTML = globalHistory.map(item => `<li><span class="history-badge">슬롯 #${item.slotIdx}</span> <s>${item.name} (${item.weight}개)</s> 룰렛 복구됨</li>`).join('');
        
        if(historyWrapper.classList.contains('expanded')){
            setTimeout(() => { historyContent.scrollTop = historyContent.scrollHeight; }, 10);
        }
    }

    addSlotBtn.addEventListener('click', () => {
        if (remainingAddSlots <= 0) { alert("칸 추가 횟수를 모두 소진하였습니다."); return; }
        saveSnapshot(); remainingAddSlots--; updateLimitDisplays(); resultSlots.push(null); renderSlots();
        setTimeout(() => { resultSlotsContainer.scrollTop = resultSlotsContainer.scrollHeight; }, 10);
    });

    // --- 수동 스톱 이벤트 ---
    spinBtn.addEventListener('click', () => {
        if (isSpinning) {
            if (!isStopping) {
                isStopping = true; 
                spinBtn.disabled = true; 
                spinBtn.textContent = 'WAIT';
                spinBtn.style.color = 'var(--neon-yellow)';
                spinBtn.style.borderColor = 'var(--neon-yellow)';
            }
            return;
        }

        if (segments.length === 0) { alert("룰렛 항목이 없습니다. 항목을 먼저 추가해주세요."); return; }
        const emptySlotIdx = resultSlots.findIndex(r => r === null);
        if (emptySlotIdx === -1) { alert('모든 당첨 칸이 채워졌습니다.\n"칸 추가" 버튼이나 🔄 버튼을 이용해주세요.'); return; }
        saveSnapshot(); triggerSpin(emptySlotIdx);
    });

    function respinSlot(idx) {
        if (isSpinning) return;
        if (remainingRespins <= 0) { alert("재추첨 기회를 모두 소진하였습니다."); return; }
        saveSnapshot(); remainingRespins--; updateLimitDisplays();
        const previousResult = resultSlots[idx];
        if (previousResult) {
            globalHistory.push({ slotIdx: idx + 1, name: previousResult.name, weight: previousResult.weight }); renderHistory();
            const existingItem = segments.find(seg => seg.name === previousResult.name);
            if (existingItem) { existingItem.weight += previousResult.weight; } 
            else { segments.push({ id: nextId++, name: previousResult.name, weight: previousResult.weight, color: previousResult.color }); }
            renderInputs(); 
        }
        resultSlots[idx] = null; triggerSpin(idx);
    }

    function triggerSpin(targetSlotIdx) {
        if (isSpinning) return;
        isSpinning = true; isStopping = false;
        
        spinBtn.textContent = 'STOP';
        spinBtn.style.color = 'var(--neon-pink)';
        spinBtn.style.borderColor = 'var(--neon-pink)';
        
        undoBtn.disabled = true;
        activeSlotIndex = targetSlotIdx; renderSlots();
        currentSegmentText.classList.add('show'); 

        let spinSpeed = 0.45; 
        let friction = 0;
        let lastSegIndex = -1; 

        function animate() {
            currentAngle += spinSpeed; 
            
            if (isStopping) {
                if (friction === 0) {
                    friction = Math.random() * 0.003 + 0.994; 
                }
                spinSpeed *= friction; 
            }
            
            canvas.style.transform = `rotate(${currentAngle}rad)`;
            
            let normalizedAngle = currentAngle % (2 * Math.PI);
            let pointerAngle = (3 * Math.PI / 2 - normalizedAngle) % (2 * Math.PI);
            if (pointerAngle < 0) pointerAngle += 2 * Math.PI;
            
            let totalW = segments.reduce((sum, seg) => sum + seg.weight, 0);
            let cAngle = 0; let cIndex = -1;
            for (let i = 0; i < segments.length; i++) {
                let sAngle = (segments[i].weight / totalW) * 2 * Math.PI;
                if (pointerAngle >= cAngle && pointerAngle < cAngle + sAngle) { cIndex = i; break; }
                cAngle += sAngle;
            }

            if (lastSegIndex !== cIndex && cIndex !== -1) {
                wheelPointer.classList.remove('bounce');
                void wheelPointer.offsetWidth; 
                wheelPointer.classList.add('bounce');
                lastSegIndex = cIndex;
                
                currentSegmentText.textContent = segments[cIndex].name;
                currentSegmentText.style.color = segments[cIndex].color;
            }

            if (!isStopping || spinSpeed > 0.002) { 
                animationFrame = requestAnimationFrame(animate); 
            } 
            else { 
                isSpinning = false; isStopping = false; spinBtn.disabled = false; 
                
                spinBtn.textContent = 'SPIN';
                spinBtn.style.color = ''; spinBtn.style.borderColor = '';
                
                undoBtn.disabled = false; 
                cancelAnimationFrame(animationFrame); calculateResult(); 
            }
        }
        animate();
    }

    function calculateResult() {
        let totalWeight = segments.reduce((sum, seg) => sum + seg.weight, 0);
        let normalizedAngle = currentAngle % (2 * Math.PI);
        let pointerAngle = (3 * Math.PI / 2 - normalizedAngle) % (2 * Math.PI);
        if (pointerAngle < 0) pointerAngle += 2 * Math.PI;

        let cumulativeAngle = 0; let winner = null; let winnerIndex = -1;
        for (let i = 0; i < segments.length; i++) {
            let sliceAngle = (segments[i].weight / totalWeight) * 2 * Math.PI;
            if (pointerAngle >= cumulativeAngle && pointerAngle < cumulativeAngle + sliceAngle) { winner = segments[i]; winnerIndex = i; break; }
            cumulativeAngle += sliceAngle;
        }

        if (winner) {
            pendingWinner = winner; pendingWinnerIndex = winnerIndex;
            highlightedSegmentId = winner.id; drawWheel(); 
            
            confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 }, zIndex: 10000, colors: ['#ff00ff', '#10ff44', '#ffff00'] });
            
            winnerPopup.innerHTML = `🎉 ${winner.name} <span style="font-size:0.5em; opacity: 0.9;"></span> 🎉`;
            winnerOverlay.classList.add('show');
            playWinSound();
        }
    }

    winnerOverlay.addEventListener('click', (e) => {
        if (!winnerOverlay.classList.contains('show')) return;
        if(e.target === winnerOverlay || e.target === winnerPopup || e.target.closest('.popup-hint')) {
            winnerOverlay.classList.remove('show');
            currentSegmentText.classList.remove('show'); 
            
            if (pendingWinner) {
                resultSlots[activeSlotIndex] = { name: pendingWinner.name, weight: pendingWinner.weight, color: pendingWinner.color };
                activeSlotIndex = -1;
                
                if (pendingWinnerIndex !== -1) { segments.splice(pendingWinnerIndex, 1); }
                
                highlightedSegmentId = null; pendingWinner = null; pendingWinnerIndex = -1;
                renderSlots(); renderInputs(); undoBtn.disabled = false; 
            }
        }
    });

    // =========================================================================
    // ★ 치지직(Chzzk) 실시간 도네이션 웹소켓 연동 로직 ★
    // =========================================================================
    let chzzkSocket = null;
    let pingInterval = null;
    let isChzzkConnected = false;

    function showToast(title, message) {
        const toast = document.createElement('div');
        toast.className = 'toast-msg';
        toast.innerHTML = `<span class="toast-title">${title}</span><span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    function extractChannelId(input) {
        const cleaned = input.trim();
        const match = cleaned.match(/([a-f0-9]{32})/i);
        return match ? match[1] : null;
    }

    // 로컬 PowerShell 중계기 1순위 호출
    async function fetchChzzkApi(targetUrl) {
        try {
            const proxyUrl = `http://localhost:8089/?url=${encodeURIComponent(targetUrl)}`;
            const proxyRes = await fetch(proxyUrl, { cache: 'no-store' });
            if (proxyRes.ok) {
                const data = await proxyRes.json();
                if (data && data.content) return data;
            }
        } catch (e) {}

        try {
            const directRes = await fetch(targetUrl, { cache: 'no-store' });
            if (directRes.ok) {
                const data = await directRes.json();
                if (data && data.content) return data;
            }
        } catch (e) {}

        throw new Error("치지직 API 연결 실패! (중계기_실행.bat 창이 켜져 있는지 확인해주세요)");
    }

    // 상단 바 상태 및 우측 상단 토글 버튼 LED 동시 업데이트
    function updateChzzkStatus(state, text) {
        chzzkStatus.className = `chzzk-status ${state}`;
        chzzkStatus.innerHTML = `<span class="status-dot"></span>${text}`;
        floatingChzzkDot.className = `status-dot ${state}`;
    }

    // --- ★ 2. 특수문자 내부 텍스트만 추출하는 도네이션 함수 (handleDonation 함수 교체) ★ ---
    function handleDonation(donorName, payAmount, rawMsg) {
        if (isSpinning || pendingWinner) {
            console.log("[도네이션 무시] 현재 룰렛 추첨이 진행 중입니다.");
            return;
        }

        const count = Math.floor(Number(payAmount) / 1000);
        if (count < 1) return;

        let targetText = rawMsg || '';

        // [2번-경우A] 메시지 안에 [항목], {항목}, <항목>, 【항목】 같은 특수문자 괄호가 있다면 그 안의 글자만 쏙 추출!
        // 예: "오늘도 화이팅하세요 [황금올리브] 추천합니다" -> "황금올리브" 만 추출됨
        const bracketMatch = targetText.match(/\[(.*?)\]|\{(.*?)\}|\<(.*?)\>|【(.*?)】/);
        if (bracketMatch) {
            // 매칭된 그룹 중 실제 텍스트가 들어있는 값 선택
            targetText = bracketMatch[1] || bracketMatch[2] || bracketMatch[3] || bracketMatch[4];
        } else {
            // 만약 "특수문자 안의 텍스트가 없으면 아예 도네이션을 룰렛에 넣지 않는다(무시)"를 원하시면 
            // 아래 주석(//)을 해제하시면 됩니다!
            return; 
        }
        
        const cleanMsg = targetText.replace(/\s+/g, '');
        if (!cleanMsg) return;

        const addedName = addOrUpdateSegment(cleanMsg, count, true);
        if (addedName) {
            showToast(`🧀 ${donorName}님 ${Number(payAmount).toLocaleString()}치즈 후원!`, `'${addedName}' 항목 +${count}개 추가됨!`);
        }
    }

    async function connectChzzk() {
        const channelId = extractChannelId(chzzkUrlInput.value);
        if (!channelId) {
            alert("올바른 치지직 방송 주소나 32자리 채널 ID를 입력해주세요.\n예: https://chzzk.naver.com/live/...");
            return;
        }

        try {
            updateChzzkStatus('connecting', '채팅방 정보 조회 중...');
            chzzkConnectBtn.disabled = true;

            const statusUrl = `https://api.chzzk.naver.com/polling/v2/channels/${channelId}/live-status`;
            const statusData = await fetchChzzkApi(statusUrl);
            const chatChannelId = statusData?.content?.chatChannelId;

            if (!chatChannelId) {
                throw new Error("현재 진행 중인 생방송(채팅방)을 찾을 수 없습니다.");
            }

            const tokenUrl = `https://comm-api.game.naver.com/nng_main/v1/chats/access-token?channelId=${chatChannelId}&chatType=STREAMING`;
            const tokenData = await fetchChzzkApi(tokenUrl);
            const accessToken = tokenData?.content?.accessToken;

            if (!accessToken) {
                throw new Error("채팅 서버 접속 토큰을 가져오지 못했습니다.");
            }

            const serverIdx = Math.floor(Math.random() * 5) + 1;
            chzzkSocket = new WebSocket(`wss://kr-ss${serverIdx}.chat.naver.com/chat`);

            chzzkSocket.onopen = () => {
                const connectPacket = {
                    ver: "2",
                    cmd: 100,
                    svcid: "game",
                    cid: chatChannelId,
                    bdy: {
                        uid: null,
                        devType: 2001,
                        accTkn: accessToken,
                        auth: "READ"
                    },
                    tid: 1
                };
                chzzkSocket.send(JSON.stringify(connectPacket));

                isChzzkConnected = true;
                chzzkConnectBtn.disabled = false;
                chzzkConnectBtn.textContent = "중지";
                chzzkConnectBtn.classList.replace('connect', 'stop');
                chzzkUrlInput.disabled = true;
                updateChzzkStatus('connected', '실시간 연동 중');
                showToast("⚡ 치지직 연결 성공", "실시간 문자 도네이션 감지를 시작합니다.");

                // ★ 접속 성공 시 0.8초 뒤 상단 바를 자동으로 스르륵 닫아 화면을 깔끔하게 만듦
                setTimeout(() => {
                    chzzkBar.classList.remove('open');
                }, 800);

                pingInterval = setInterval(() => {
                    if (chzzkSocket && chzzkSocket.readyState === WebSocket.OPEN) {
                        chzzkSocket.send(JSON.stringify({ ver: "2", cmd: 0 }));
                    }
                }, 20000);
            };

            chzzkSocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.cmd === 0) {
                        chzzkSocket.send(JSON.stringify({ ver: "2", cmd: 10000 }));
                        return;
                    }

                    if (data.cmd === 93102 && Array.isArray(data.bdy)) {
                        data.bdy.forEach(item => {
                            const extrasStr = item.extras || item.extra;
                            if (!extrasStr) return;

                            const extras = typeof extrasStr === 'string' ? JSON.parse(extrasStr) : extrasStr;
                            const payAmount = extras.payAmount || 0;
                            const msg = item.msg || '';
                            
                            let nickname = '익명 후원자';
                            if (item.profile && extras.donationType === 'CHAT') {
                                const profileObj = typeof item.profile === 'string' ? JSON.parse(item.profile) : item.profile;
                                if (profileObj && profileObj.nickname) nickname = profileObj.nickname;
                            } else if (extras.isAnonymous) {
                                nickname = '익명의 후원자';
                            }

                            handleDonation(nickname, payAmount, msg);
                        });
                    }
                } catch (err) {
                    console.error("패킷 파싱 에러:", err);
                }
            };

            chzzkSocket.onerror = (err) => {
                console.error("웹소켓 에러:", err);
                disconnectChzzk("연결 오류 발생");
            };

            chzzkSocket.onclose = () => {
                if (isChzzkConnected) {
                    disconnectChzzk("연결이 종료되었습니다");
                }
            };

        } catch (error) {
            console.error(error);
            alert(error.message);
            chzzkConnectBtn.disabled = false;
            disconnectChzzk("연결 실패");
        }
    }

    function disconnectChzzk(statusText = "대기 중") {
        isChzzkConnected = false;
        if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
        }
        if (chzzkSocket) {
            chzzkSocket.close();
            chzzkSocket = null;
        }
        chzzkConnectBtn.disabled = false;
        chzzkConnectBtn.textContent = "접속";
        chzzkConnectBtn.classList.replace('stop', 'connect');
        chzzkUrlInput.disabled = false;
        updateChzzkStatus(statusText.includes("실패") || statusText.includes("오류") ? 'error' : '', statusText);
    }

    chzzkConnectBtn.addEventListener('click', () => {
        if (isChzzkConnected) {
            disconnectChzzk("연동 중지됨");
            showToast("🛑 연동 중지", "치지직 도네이션 연동을 중지했습니다.");
        } else {
            connectChzzk();
        }
    });

    chzzkUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isChzzkConnected) connectChzzk();
    });

    chzzkTestBtn.addEventListener('click', () => {
        const sampleItems = [
            '오늘도 방송 화이팅! [마라탕]', 
            '이건 꼭 드셔야 합니다 {황금올리브치킨}', 
            '<삼겹살> 가즈아ㅏㅏ', 
            '【초밥세트】 추천합니다', 
            '[떡볶이] 맛있겠다', 
            '단무지 대신 [피자]'
        ];
        const randomItem = sampleItems[Math.floor(Math.random() * sampleItems.length)];
        const randomAmount = (Math.floor(Math.random() * 15) + 1) * 1000 + (Math.random() > 0.5 ? 500 : 0);
        
        handleDonation('테스트시청자', randomAmount, randomItem);
    });

    // 초기 실행
    updateLimitDisplays();
    renderInputs();
    renderSlots();