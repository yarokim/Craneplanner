// 전역 변수
let selectedShip = null;
let currentCraneType = 'qc';

// Toast 메시지 표시 함수
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.error('Toast element not found');
        return;
    }
    
    toast.className = 'toast';
    void toast.offsetWidth;
    
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 크레인 타입 전환 함수
function switchCraneType(type) {
    currentCraneType = type;
    const qcContent = document.getElementById('qc-content');
    const armgcContent = document.getElementById('armgc-content');
    const tabs = document.querySelectorAll('.crane-tab');
    
    tabs.forEach(tab => {
        if (tab.dataset.type === type) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    if (type === 'qc') {
        qcContent.style.display = 'block';
        armgcContent.style.display = 'none';
        loadQCData();
    } else {
        qcContent.style.display = 'none';
        armgcContent.style.display = 'block';
        loadARMGCData();
    }
}

// Maintenance Row 관련 함수들
function addMaintenanceRow(data = {}, isARMGC = false) {
    const maintenanceBody = document.getElementById(isARMGC ? 'armgc-maintenance-body' : 'maintenance-body');
    const row = document.createElement('tr');
    row.classList.add('maintenance-row');
    
    if (data.id) {
        row.setAttribute('data-plan-id', data.id);
    }

    // 크레인 선택 셀
    const craneCell = document.createElement('td');
    const craneSelect = document.createElement('select');
    craneSelect.classList.add('crane-select', 'form-control');
    
    for (let i = 1; i <= 12; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Crane ${i + (isARMGC ? 200 : 100)}`;
        craneSelect.appendChild(option);
    }
    
    if (data.crane_number) {
        craneSelect.value = data.crane_number;
    }
    
    craneCell.appendChild(craneSelect);

    // Task 셀
    const taskCell = document.createElement('td');
    const taskInput = document.createElement('input');
    taskInput.type = 'text';
    taskInput.classList.add('task-input', 'form-control');
    taskInput.placeholder = 'Enter task description';
    if (data.task) {
        taskInput.value = data.task;
    }
    taskCell.appendChild(taskInput);

    // Time 셀
    const timeCell = document.createElement('td');
    const timeContainer = document.createElement('div');
    timeContainer.classList.add('time-input-container');
    
    const startTimeSelect = document.createElement('select');
    startTimeSelect.classList.add('time-select', 'form-control');
    
    const endTimeSelect = document.createElement('select');
    endTimeSelect.classList.add('time-select', 'form-control');
    
    const times = [];
    for (let hour = 8; hour <= 18; hour++) {
        times.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    
    times.forEach(time => {
        const startOption = document.createElement('option');
        startOption.value = time;
        startOption.textContent = time;
        startTimeSelect.appendChild(startOption);
        
        const endOption = document.createElement('option');
        endOption.value = time;
        endOption.textContent = time;
        endTimeSelect.appendChild(endOption);
    });
    
    if (data.start_time) {
        startTimeSelect.value = data.start_time;
    }
    if (data.end_time) {
        endTimeSelect.value = data.end_time;
    }
    
    timeContainer.appendChild(startTimeSelect);
    timeContainer.appendChild(document.createTextNode(' - '));
    timeContainer.appendChild(endTimeSelect);
    timeCell.appendChild(timeContainer);

    // Actions 셀
    const actionsCell = document.createElement('td');
    if (window.userPermissions.isLoggedIn) {
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('btn', 'btn-danger', 'delete-maintenance');
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => {
            if (confirm('Are you sure you want to delete this maintenance plan?')) {
                row.remove();
                if (data.id) {
                    deleteMaintenancePlan(data.id, isARMGC);
                }
            }
        };
        actionsCell.appendChild(deleteBtn);
    }

    row.appendChild(craneCell);
    row.appendChild(taskCell);
    row.appendChild(timeCell);
    row.appendChild(actionsCell);
    maintenanceBody.appendChild(row);
}

// Save Maintenance Plan
async function saveMaintenancePlan(isARMGC = false) {
    const maintenanceBody = document.getElementById(isARMGC ? 'armgc-maintenance-body' : 'maintenance-body');
    const plans = [];
    
    maintenanceBody.querySelectorAll('.maintenance-row').forEach(row => {
        const craneSelect = row.querySelector('.crane-select');
        const taskInput = row.querySelector('.task-input');
        const timeSelects = row.querySelectorAll('.time-select');
        
        plans.push({
            id: row.getAttribute('data-plan-id'),
            crane_number: parseInt(craneSelect.value),
            task: taskInput.value,
            start_time: timeSelects[0].value,
            end_time: timeSelects[1].value
        });
    });
    
    try {
        const response = await fetch('/api/save_maintenance_plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                plans: plans,
                crane_type: isARMGC ? 'armgc' : 'qc'
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save maintenance plan');
        }
        
        const result = await response.json();
        showToast('Maintenance plan saved successfully');
        return result;
    } catch (error) {
        console.error('Error saving maintenance plan:', error);
        showToast('Failed to save maintenance plan', 'error');
    }
}

// Load Maintenance Plan
async function loadMaintenancePlan(isARMGC = false) {
    try {
        const response = await fetch(`/api/get_maintenance_plans?crane_type=${isARMGC ? 'armgc' : 'qc'}`);
        if (!response.ok) {
            throw new Error('Failed to load maintenance plans');
        }
        
        const plans = await response.json();
        const maintenanceBody = document.getElementById(isARMGC ? 'armgc-maintenance-body' : 'maintenance-body');
        maintenanceBody.innerHTML = '';
        
        plans.forEach(plan => {
            addMaintenanceRow(plan, isARMGC);
        });
    } catch (error) {
        console.error('Error loading maintenance plans:', error);
        showToast('Failed to load maintenance plans', 'error');
    }
}

// Delete Maintenance Plan
async function deleteMaintenancePlan(planId, isARMGC = false) {
    try {
        const response = await fetch(`/api/delete_maintenance_plan/${planId}?crane_type=${isARMGC ? 'armgc' : 'qc'}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete maintenance plan');
        }
        
        showToast('Maintenance plan deleted successfully');
    } catch (error) {
        console.error('Error deleting maintenance plan:', error);
        showToast('Failed to delete maintenance plan', 'error');
    }
}

// QC 사용률 관련 함수들
async function updateQCUsagePercentage() {
    const selectedDate = document.getElementById('selected-date').dataset.date;
    try {
        const response = await fetch(`/api/get_qc_usage_by_date/${selectedDate}`);
        if (!response.ok) {
            throw new Error('Failed to get QC usage');
        }
        
        const data = await response.json();
        const progressBar = document.getElementById('qc-usage-progress');
        const percentageText = document.getElementById('qc-usage-rate');
        
        if (progressBar && percentageText) {
            progressBar.value = data.percentage;
            percentageText.textContent = `${data.percentage}%`;
        }
        
        // Update recommended maintenance count
        const recommendCount = document.getElementById('recommend-crane-count');
        if (recommendCount) {
            const count = Math.floor(data.percentage / 20); // 예시: 20% 당 1대
            recommendCount.textContent = `${count} crane${count !== 1 ? 's' : ''}`;
        }
    } catch (error) {
        console.error('Error updating QC usage:', error);
    }
}

// Final Maintenance 관련 함수들
async function saveFinalMaintenance() {
    const finalCount = document.getElementById('final-crane-count').value;
    try {
        const response = await fetch('/api/save_final_maintenance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                count: parseInt(finalCount),
                date: document.getElementById('selected-date').dataset.date
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save final maintenance count');
        }
        
        showToast('Final maintenance count saved successfully');
    } catch (error) {
        console.error('Error saving final maintenance:', error);
        showToast('Failed to save final maintenance count', 'error');
    }
}

// Notes 관련 함수들
async function saveOperationNotes() {
    const notes = document.getElementById('operation-notes').value;
    try {
        const response = await fetch('/api/save_operation_notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                notes: notes,
                date: document.getElementById('selected-date').dataset.date
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save operation notes');
        }
        
        showToast('Operation notes saved successfully');
    } catch (error) {
        console.error('Error saving operation notes:', error);
        showToast('Failed to save operation notes', 'error');
    }
}

async function loadOperationNotes() {
    try {
        const response = await fetch('/api/get_operation_notes');
        if (!response.ok) {
            throw new Error('Failed to load operation notes');
        }
        
        const data = await response.json();
        const notesTextarea = document.getElementById('operation-notes');
        if (notesTextarea && data.notes) {
            notesTextarea.value = data.notes;
        }
    } catch (error) {
        console.error('Error loading operation notes:', error);
    }
}

// 데이터 로드 함수들
async function loadQCData() {
    await Promise.all([
        loadMaintenancePlan(false),
        updateQCUsagePercentage(),
        loadOperationNotes()
    ]);
}

async function loadARMGCData() {
    await Promise.all([
        loadMaintenancePlan(true),
        loadOperationNotes()
    ]);
}

// Ship Plan 관련 함수들
function setupShipPlanGrid() {
    const timeColumn = document.querySelector('.time-column');
    const craneGrid = document.querySelector('.crane-grid');

    if (!timeColumn || !craneGrid) return;

    // 시간 슬롯 (오전/오후)
    timeColumn.innerHTML = `
        <div class="time-header">Time</div>
        <div class="time-slot">08:00 - 12:00</div>
        <div class="time-slot">13:00 - 18:00</div>
    `;

    // 크레인 컬럼 추가 (112부터 101까지 역순)
    craneGrid.innerHTML = '';
    for (let i = 12; i >= 1; i--) {
        const craneColumn = document.createElement('div');
        craneColumn.className = 'crane-column';

        // 크레인 헤더
        const craneHeader = document.createElement('div');
        craneHeader.className = 'crane-header';
        craneHeader.textContent = `Crane ${i + 100}`;
        craneColumn.appendChild(craneHeader);

        // 오전 슬롯
        const morningSlot = document.createElement('div');
        morningSlot.className = 'grid-slot';
        morningSlot.setAttribute('data-crane', i);
        morningSlot.setAttribute('data-time', 'morning');
        if (!window.userPermissions.canEdit) {
            morningSlot.setAttribute('disabled', '');
        }
        morningSlot.addEventListener('dragover', handleDragOver);
        morningSlot.addEventListener('dragleave', handleDragLeave);
        morningSlot.addEventListener('drop', handleDrop);
        craneColumn.appendChild(morningSlot);

        // 오후 슬롯
        const afternoonSlot = document.createElement('div');
        afternoonSlot.className = 'grid-slot';
        afternoonSlot.setAttribute('data-crane', i);
        afternoonSlot.setAttribute('data-time', 'afternoon');
        if (!window.userPermissions.canEdit) {
            afternoonSlot.setAttribute('disabled', '');
        }
        afternoonSlot.addEventListener('dragover', handleDragOver);
        afternoonSlot.addEventListener('dragleave', handleDragLeave);
        afternoonSlot.addEventListener('drop', handleDrop);
        craneColumn.appendChild(afternoonSlot);

        craneGrid.appendChild(craneColumn);
    }
}

function setupShipDragAndDrop() {
    const ships = document.querySelectorAll('.ship');
    ships.forEach(ship => {
        ship.addEventListener('dragstart', handleDragStart);
        ship.addEventListener('dragend', handleDragEnd);
    });
}

function handleDragStart(e) {
    selectedShip = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', '');
}

function handleDragEnd(e) {
    selectedShip = null;
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    if (e.target.classList.contains('grid-slot')) {
        e.target.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    e.target.classList.remove('drag-over');
}

function placeShipInSlot(slot, shipTemplate) {
    // 기존 Ship이 있다면 제거
    const existingShip = slot.querySelector('.ship');
    if (existingShip) {
        existingShip.remove();
        updateQCUsagePercentage();
        return;
    }

    // 새로운 Ship 생성
    const newShip = document.createElement('div');
    const shipNumber = shipTemplate.getAttribute('data-ship');
    newShip.className = `ship ship-${shipNumber}`;  // Ship 번호에 따른 클래스 추가
    newShip.setAttribute('data-ship', shipNumber);
    newShip.textContent = `S${shipNumber}`;  // Ship 번호 표시

    // Delete 버튼 추가
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-ship';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.onclick = function(e) {
        e.stopPropagation();
        newShip.remove();
        updateQCUsagePercentage();
    };
    
    newShip.appendChild(deleteBtn);
    slot.appendChild(newShip);
    updateQCUsagePercentage();
}

function handleDrop(e) {
    e.preventDefault();
    const slot = e.target.closest('.grid-slot');
    if (!slot || !selectedShip || !window.userPermissions.canEdit) return;

    slot.classList.remove('drag-over');

    // 이미 배치된 선박이 있는지 확인
    if (slot.querySelector('.ship')) {
        showToast('A ship is already placed in this slot', 'warning');
        return;
    }

    // 현재 슬롯의 위치 정보 가져오기
    const craneNumber = parseInt(slot.getAttribute('data-crane'));
    const timeSlot = slot.getAttribute('data-time');
    const shipNumber = selectedShip.getAttribute('data-ship');

    // 같은 시간대의 슬롯들 찾기
    const slots = Array.from(document.querySelectorAll('.grid-slot'))
        .filter(s => s.getAttribute('data-time') === timeSlot)
        .sort((a, b) => parseInt(b.getAttribute('data-crane')) - parseInt(a.getAttribute('data-crane')));

    // 같은 Ship이 배치된 다른 크레인 찾기
    const sameShipSlots = slots.filter(s => {
        const ship = s.querySelector('.ship');
        return ship && ship.getAttribute('data-ship') === shipNumber;
    });

    // 현재 드롭한 위치에 Ship 배치
    placeShipInSlot(slot, selectedShip);

    // 같은 Ship이 있는 경우, 그 사이의 빈 슬롯을 채우기
    if (sameShipSlots.length > 0) {
        const droppedCraneNumber = craneNumber;
        
        sameShipSlots.forEach(existingSlot => {
            const existingCraneNumber = parseInt(existingSlot.getAttribute('data-crane'));
            
            // 현재 드롭한 위치와 기존 Ship 위치 사이의 모든 슬롯 찾기
            const minCrane = Math.min(droppedCraneNumber, existingCraneNumber);
            const maxCrane = Math.max(droppedCraneNumber, existingCraneNumber);
            
            // 그 사이의 빈 슬롯 채우기
            slots.forEach(middleSlot => {
                const middleCraneNumber = parseInt(middleSlot.getAttribute('data-crane'));
                if (middleCraneNumber > minCrane && 
                    middleCraneNumber < maxCrane && 
                    !middleSlot.querySelector('.ship')) {
                    placeShipInSlot(middleSlot, selectedShip);
                }
            });
        });
    }

    updateQCUsagePercentage();
}

function updateQCUsagePercentage() {
    const totalSlots = document.querySelectorAll('.grid-slot').length;
    const usedSlots = document.querySelectorAll('.grid-slot .ship').length;
    const percentage = (usedSlots / totalSlots) * 100;
    
    const progressBar = document.getElementById('qc-usage-progress');
    const percentageText = document.getElementById('qc-usage-rate');
    
    if (progressBar && percentageText) {
        progressBar.value = percentage;
        percentageText.textContent = `${Math.round(percentage)}%`;
    }
}

function clearAllSlots() {
    const slots = document.querySelectorAll('.grid-slot');
    slots.forEach(slot => {
        const ship = slot.querySelector('.ship');
        const deleteBtn = slot.querySelector('.delete-ship');
        if (ship) ship.remove();
        if (deleteBtn) deleteBtn.remove();
    });
    updateQCUsagePercentage();
}

async function saveShipPlan() {
    if (!window.userPermissions.canEdit) {
        showToast('You do not have permission to save the ship plan', 'error');
        return;
    }

    const slots = document.querySelectorAll('.grid-slot');
    const shipPlan = [];

    slots.forEach(slot => {
        const ship = slot.querySelector('.ship');
        if (ship) {
            shipPlan.push({
                ship_name: ship.textContent,
                crane_number: parseInt(slot.getAttribute('data-crane')),
                time: slot.getAttribute('data-time')
            });
        }
    });

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const date = urlParams.get('date');

        const response = await fetch('/api/save-ship-plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                date: date,
                plan: shipPlan
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save ship plan');
        }

        showToast('Ship plan saved successfully');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function loadShipPlan() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const date = urlParams.get('date');

        const response = await fetch(`/api/get-ship-plan?date=${date}`);
        if (!response.ok) {
            throw new Error('Failed to load ship plan');
        }

        const data = await response.json();
        
        // 모든 슬롯 초기화
        clearAllSlots();

        // 선박 배치
        data.plan.forEach(item => {
            const slot = document.querySelector(`.grid-slot[data-crane="${item.crane_number}"][data-time="${item.time}"]`);
            if (slot) {
                const shipClass = item.ship_name.toLowerCase().replace(/\s+/g, '-');
                const shipTemplate = document.createElement('div');
                shipTemplate.className = `ship ${shipClass}`;
                shipTemplate.textContent = item.ship_name;
                shipTemplate.draggable = false;

                // 삭제 버튼 추가
                if (window.userPermissions.canEdit) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'delete-btn';
                    deleteBtn.innerHTML = '×';
                    deleteBtn.onclick = function(e) {
                        e.stopPropagation();
                        shipTemplate.remove();
                        deleteBtn.remove();
                        updateQCUsagePercentage();
                    };
                    slot.appendChild(deleteBtn);
                }

                slot.appendChild(shipTemplate);
            }
        });

        updateQCUsagePercentage();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function updateDisplayDate() {
    const urlParams = new URLSearchParams(window.location.search);
    const date = urlParams.get('date');
    const dateInfo = document.querySelector('.date-info');
    if (dateInfo && date) {
        const formattedDate = new Date(date).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
        dateInfo.textContent = formattedDate;
    }
}

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', function() {
    // 크레인 타입 전환 탭 이벤트
    document.querySelectorAll('.crane-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchCraneType(tab.dataset.type);
        });
    });

    // Add Maintenance 버튼 이벤트
    const addMaintenanceBtn = document.getElementById('add-maintenance');
    if (addMaintenanceBtn) {
        addMaintenanceBtn.addEventListener('click', () => addMaintenanceRow({}, false));
    }

    const addARMGCMaintenanceBtn = document.getElementById('add-armgc-maintenance');
    if (addARMGCMaintenanceBtn) {
        addARMGCMaintenanceBtn.addEventListener('click', () => addMaintenanceRow({}, true));
    }

    // Save Final Maintenance 버튼 이벤트
    const saveFinalMaintenanceBtn = document.getElementById('save-final-maintenance');
    if (saveFinalMaintenanceBtn) {
        saveFinalMaintenanceBtn.addEventListener('click', saveFinalMaintenance);
    }

    // Save Notes 버튼 이벤트
    const saveNotesBtn = document.getElementById('save-operation-notes');
    if (saveNotesBtn) {
        saveNotesBtn.addEventListener('click', saveOperationNotes);
    }

    // Ship Plan 초기화
    setupShipPlanGrid();
    setupShipDragAndDrop();
    updateDisplayDate();

    // Save Ship Plan 버튼 이벤트
    const saveShipPlanBtn = document.getElementById('save-ship-plan');
    if (saveShipPlanBtn) {
        saveShipPlanBtn.addEventListener('click', saveShipPlan);
    }

    // Clear All 버튼 이벤트
    const clearShipPlanBtn = document.getElementById('clear-ship-plan');
    if (clearShipPlanBtn) {
        clearShipPlanBtn.addEventListener('click', clearAllSlots);
    }

    // 초기 데이터 로드
    loadQCData();
    loadShipPlan();
});
