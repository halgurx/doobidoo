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

    const CENTER_X = canvas.width / 2;
    const CENTER_Y = canvas.height / 2;
    const RADIUS = canvas.width / 2;

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
            
            // 타이머 작동 시엔 네온 핑크 컬러 유지
            let currentColor = document.body.classList.contains('light-theme') ? '#e74c3c' : '#d936c5';
            floatingTimerBtn.style.color = currentColor; 
            
            if (totalSeconds <= 0) {
                clearInterval(timerInterval);
                bigTimeDisplay.textContent = formatTime(0); 
                floatingTimerBtn.textContent = '⏱ 타이머 설정'; 
                floatingTimerBtn.style.color = '';
                setTimeout(()=>{alert("설정된 시간이 모두 종료되었습니다!"); resetTimerUI();},300);
            }
        }, 1000);
    });

    btnStopTimer.addEventListener('click', () => { clearInterval(timerInterval); floatingTimerBtn.textContent = '⏱ 타이머 설정'; floatingTimerBtn.style.color = ''; resetTimerUI(); });
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

    // --- 룰렛 그리기 ---
    function drawWheel() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (segments.length === 0) return;
        let totalWeight = segments.reduce((sum, seg) => sum + seg.weight, 0);
        let startAngle = 0;

        let fontSize = 48;
        
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
            
            if (sliceAngle > 0.03 || segments.length <= 120) {
                ctx.save(); 
                ctx.translate(CENTER_X, CENTER_Y); 
                ctx.rotate(startAngle + sliceAngle / 2); 
                ctx.textAlign = "right"; 
                ctx.textBaseline = "middle"; 
                ctx.fillStyle = "#ffffff"; 
                ctx.font = `${fontSize}px 'Noto Sans KR'`;
                // 다크/라이트 무관하게 캔버스 텍스트는 그림자가 있어야 잘 보임
                ctx.shadowColor = "rgba(0,0,0,1)"; 
                ctx.shadowBlur = segments.length > 50 ? 3 : 10;
                ctx.shadowOffsetX = 1; 
                ctx.shadowOffsetY = 1; 
                ctx.fillText(seg.name, RADIUS * 0.85, 0); 
                ctx.restore();
            }
            
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
            const row = document.createElement('div'); row.className = 'item-row';
            
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
        attachInputEvents(); drawWheel();
    }

    function attachInputEvents() {
        document.querySelectorAll('.input-name').forEach(input => { input.addEventListener('input', (e) => { segments[e.target.getAttribute('data-index')].name = e.target.value; drawWheel(); }); });
        document.querySelectorAll('.input-weight').forEach(input => { input.addEventListener('input', (e) => { let val = Number(e.target.value); if(val < 1) val = 1; segments[e.target.getAttribute('data-index')].weight = val; renderInputs(); }); });
        document.querySelectorAll('.btn-delete').forEach(btn => { btn.addEventListener('click', (e) => { saveSnapshot(); segments.splice(e.target.getAttribute('data-index'), 1); renderInputs(); }); });
    }

    addBtn.addEventListener('click', () => {
        const newName = newItemNameInput.value.trim(); const newWeight = Number(newItemWeightInput.value) || 1;
        if (!newName) { alert('항목 이름을 입력해주세요.'); return; }
        saveSnapshot(); 
        const existingItem = segments.find(seg => seg.name === newName);
        if (existingItem) { existingItem.weight += newWeight; } else { segments.push({ id: nextId++, name: newName, weight: newWeight, color: colors[nextId % colors.length] }); }
        newItemNameInput.value = ''; newItemWeightInput.value = '1'; renderInputs();
        setTimeout(() => { itemsListContainer.scrollTop = itemsListContainer.scrollHeight; }, 10);
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
            if (activeSlotIndex === idx) { slot.innerHTML = `<div class="slot-info"><span class="slot-num">#${idx + 1}</span><span>추첨 중... 🎲</span></div>`; } 
            else if (res) { slot.innerHTML = `<div class="slot-info"><span class="slot-num">#${idx + 1}</span><span>${res.name} <span style="font-size:0.7em; opacity: 0.7;">(${res.weight}개)</span></span></div><button class="btn-reload" data-index="${idx}" title="이 칸만 다시 돌리기">🔄</button>`; } 
            else { slot.innerHTML = `<div class="slot-info"><span class="slot-num">#${idx + 1}</span><span>대기 중</span></div>`; }
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
            
            // 4. 감속(마찰력) 계수를 높여 훨씬 천천히 멈추도록 변경 (0.994 ~ 0.997)
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

    // 초기 실행
    updateLimitDisplays();
    renderInputs();
    renderSlots();
