document.addEventListener('DOMContentLoaded', function() {
    // 요소 선택
    const ships = document.querySelectorAll('.ship');
    const gridSlots = document.querySelectorAll('.grid-slot');
    const clearAllButton = document.getElementById('clear-all');
    const qcUsePercentage = document.getElementById('qc-use-percentage');
    const saveShipPlanButton = document.getElementById('save-ship-plan');

    // 드래그 앤 드롭 초기화
    function initializeDragAndDrop() {
        ships.forEach(ship => {
            ship.addEventListener('dragstart', handleDragStart);
        });

        gridSlots.forEach(slot => {
            slot.addEventListener('dragover', handleDragOver);
            slot.addEventListener('drop', handleDrop);
        });
    }

    // 드래그 시작
    function handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.id);
        e.dataTransfer.effectAllowed = 'move';
    }

    // 드래그 오버
    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    // 드롭
    function handleDrop(e) {
        e.preventDefault();
        const shipId = e.dataTransfer.getData('text/plain');
        const shipElement = document.getElementById(shipId);
        const dropTarget = e.target.closest('.grid-slot');

        if (!dropTarget || dropTarget.classList.contains('occupied')) {
            return;
        }

        // Ship 복제 및 설정
        const clone = shipElement.cloneNode(true);
        clone.id = `${shipId}-${Date.now()}`;
        clone.classList.remove('ship');
        clone.classList.add('assigned-ship');
        clone.draggable = false;

        // 삭제 이벤트 추가
        clone.addEventListener('click', function(event) {
            if (event.target === this || event.target.closest('.assigned-ship')) {
                dropTarget.classList.remove('occupied');
                dropTarget.removeChild(this);
                saveGridState();
                calculateQcUse();
            }
        });

        // Grid에 Ship 추가
        dropTarget.classList.add('occupied');
        dropTarget.appendChild(clone);
        saveGridState();
        calculateQcUse();
    }

    // Grid 상태 저장
    function saveGridState() {
        const gridState = Array.from(gridSlots).map(slot => ({
            crane: slot.dataset.crane,
            time: slot.dataset.time,
            occupied: slot.classList.contains('occupied'),
            shipClass: slot.firstElementChild ? slot.firstElementChild.className : null
        }));
        localStorage.setItem('gridState', JSON.stringify(gridState));
    }

    // Grid 상태 로드
    function loadGridState() {
        const savedState = localStorage.getItem('gridState');
        if (!savedState) return;

        const gridState = JSON.parse(savedState);
        gridState.forEach((state, index) => {
            if (state.occupied && state.shipClass) {
                const slot = gridSlots[index];
                const ship = document.createElement('div');
                ship.className = state.shipClass;
                ship.draggable = false;

                // 삭제 이벤트 추가
                ship.addEventListener('click', function(event) {
                    if (event.target === this || event.target.closest('.assigned-ship')) {
                        slot.classList.remove('occupied');
                        slot.removeChild(this);
                        saveGridState();
                        calculateQcUse();
                    }
                });

                slot.classList.add('occupied');
                slot.appendChild(ship);
            }
        });
        calculateQcUse();
    }

    // QC 사용률 계산
    function calculateQcUse() {
        const occupiedCount = document.querySelectorAll('.grid-slot.occupied').length;
        const totalSlots = gridSlots.length;
        const percentage = (occupiedCount / totalSlots) * 100;
        qcUsePercentage.textContent = `QC 사용률: ${percentage.toFixed(2)}%`;
    }

    // Clear All 버튼
    if (clearAllButton) {
        clearAllButton.addEventListener('click', function() {
            gridSlots.forEach(slot => {
                slot.classList.remove('occupied');
                while (slot.firstChild) {
                    slot.removeChild(slot.firstChild);
                }
            });
            localStorage.removeItem('gridState');
            calculateQcUse();
            showToast('모든 배정이 삭제되었습니다.');
        });
    }

    // Save 버튼
    if (saveShipPlanButton) {
        saveShipPlanButton.addEventListener('click', function() {
            saveGridState();
            showToast('Ship Plan이 저장되었습니다.');
        });
    }

    // 토스트 메시지 표시
    function showToast(message) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.style.display = 'block';
            setTimeout(() => {
                toast.style.display = 'none';
            }, 3000);
        }
    }

    // 초기화
    initializeDragAndDrop();
    loadGridState();
    calculateQcUse();
});
