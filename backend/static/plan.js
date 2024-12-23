// 전역 변수
let selectedShip = null;

// Toast 메시지 표시 함수
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.error('Toast element not found');
        return;
    }
    
    // 이전 토스트 메시지가 있다면 제거
    toast.className = 'toast';
    void toast.offsetWidth; // reflow 트리거
    
    // 새로운 메시지 설정 및 표시
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    // 3초 후 토스트 메시지 숨기기
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Maintenance Row 관련 함수들
function addMaintenanceRow(data = {}) {
    const maintenanceBody = document.getElementById('maintenance-body');
    const row = document.createElement('tr');
    row.classList.add('maintenance-row');
    
    // plan_id가 있으면 설정
    if (data.id) {
        row.setAttribute('data-plan-id', data.id);
    }

    // 크레인 선택 셀
    const craneCell = document.createElement('td');
    const craneSelect = document.createElement('select');
    craneSelect.classList.add('crane-select', 'form-control');
    
    // 크레인 옵션 추가 (1-12)
    for (let i = 1; i <= 12; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Crane ${i + 100}`;
        craneSelect.appendChild(option);
    }
    
    // 저장된 크레인 번호 설정
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
    
    // 시간 옵션 추가 (1시간 간격)
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
    
    // 저장된 시간 설정
    if (data.start_time) {
        startTimeSelect.value = data.start_time;
    }
    if (data.end_time) {
        endTimeSelect.value = data.end_time;
    }
    
    timeContainer.appendChild(startTimeSelect);
    const separator = document.createElement('span');
    separator.textContent = ' ~ ';
    separator.classList.add('time-separator');
    timeContainer.appendChild(separator);
    timeContainer.appendChild(endTimeSelect);
    timeCell.appendChild(timeContainer);

    // Notes 셀
    const notesCell = document.createElement('td');
    const notesInput = document.createElement('textarea');
    notesInput.classList.add('notes-input', 'form-control');
    notesInput.placeholder = 'Enter notes';
    notesInput.style.height = '36px';
    notesInput.style.minHeight = '36px';
    notesInput.style.maxHeight = '72px';
    notesInput.style.resize = 'vertical';
    notesInput.style.overflowY = 'auto';
    notesInput.style.whiteSpace = 'pre-wrap';
    notesInput.style.wordWrap = 'break-word';
    notesInput.style.padding = '8px';
    notesInput.style.lineHeight = '1.2';
    notesInput.style.fontSize = '14px';
    if (data.notes) {
        notesInput.value = data.notes;
    }
    notesCell.appendChild(notesInput);

    // 행에 셀 추가 (올바른 순서로)
    row.appendChild(craneCell);
    row.appendChild(taskCell);
    row.appendChild(timeCell);
    row.appendChild(notesCell);

    // Actions 셀 (if user has delete permission)
    if (window.userPermissions.canDelete) {
        const actionsCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.classList.add('btn', 'btn-danger');
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = function() {
            if (confirm('Are you sure you want to delete this maintenance plan?')) {
                row.remove();
            }
        };
        actionsCell.appendChild(deleteButton);
        row.appendChild(actionsCell);
    }

    // 테이블에 행 추가
    maintenanceBody.appendChild(row);
}

// Save Maintenance Plan
async function saveMaintenancePlan() {
    const maintenanceRows = document.querySelectorAll('.maintenance-row');
    const plans = [];

    maintenanceRows.forEach(row => {
        const timeContainer = row.querySelector('.time-input-container');
        const plan = {
            crane_number: row.querySelector('.crane-select').value,
            task: row.querySelector('.task-input').value,
            start_time: timeContainer.querySelector('.time-select:first-child').value,
            end_time: timeContainer.querySelector('.time-select:last-child').value,
            notes: row.querySelector('.notes-input').value
        };

        if (row.hasAttribute('data-plan-id')) {
            plan.id = row.getAttribute('data-plan-id');
        }

        plans.push(plan);
    });

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const date = urlParams.get('date') || document.querySelector('.date-info').textContent.split(': ')[1];

        if (!date) {
            throw new Error('Date is required');
        }

        const response = await fetch('/api/save-maintenance-plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                date: date,
                plans: plans
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to save maintenance plan');
        }

        const result = await response.json();
        showToast('Maintenance plan saved successfully', 'success');
        
        // Reload the maintenance plan to get updated data
        loadMaintenancePlan();
    } catch (error) {
        console.error('Error saving maintenance plan:', error);
        showToast(error.message || 'Failed to save maintenance plan', 'error');
    }
}

// Load Maintenance Plan
async function loadMaintenancePlan() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const date = urlParams.get('date') || document.querySelector('.date-info').textContent.split(': ')[1];

        if (!date) {
            throw new Error('Date is required');
        }

        const response = await fetch(`/api/get-maintenance-plans?date=${date}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to load maintenance plan');
        }

        const data = await response.json();
        
        // Clear existing rows
        const maintenanceBody = document.getElementById('maintenance-body');
        maintenanceBody.innerHTML = '';

        // Add rows for each plan
        if (data.plans && Array.isArray(data.plans)) {
            data.plans.forEach(plan => {
                addMaintenanceRow(plan);
            });
        }
    } catch (error) {
        console.error('Error loading maintenance plan:', error);
        showToast(error.message || 'Failed to load maintenance plan', 'error');
    }
}

// DOM이 로드되면 초기화
document.addEventListener('DOMContentLoaded', function() {
    // Back to Main 버튼 이벤트 리스너
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', function() {
            window.location.href = '/';
        });
    }

    // Ship Plan 관련 버튼 이벤트 리스너
    const clearAllButton = document.getElementById('clear-all-button');
    const saveShipPlanButton = document.getElementById('save-ship-plan-button');

    if (clearAllButton) {
        clearAllButton.addEventListener('click', function() {
            clearAllSlots();
        });
    }

    if (saveShipPlanButton) {
        saveShipPlanButton.addEventListener('click', function() {
            saveShipPlan();
        });
    }

    // Maintenance Plan 관련 버튼 이벤트 리스너
    const addRowButton = document.getElementById('add-row-button');
    const saveMaintenanceButton = document.getElementById('save-maintenance');

    if (addRowButton) {
        addRowButton.addEventListener('click', function() {
            addMaintenanceRow();
        });
    }

    if (saveMaintenanceButton) {
        saveMaintenanceButton.addEventListener('click', function() {
            saveMaintenancePlan();
        });
    }

    // Ship drag and drop 이벤트 리스너 설정
    setupShipDragAndDrop();

    // 초기 데이터 로드
    loadMaintenancePlan();
    loadShipPlan();
    updateDisplayDate();
    updateQCUsagePercentage();
});

// 날짜 표시 업데이트
function updateDisplayDate() {
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    if (dateParam) {
        const date = parseDate(dateParam);
        if (date) {
            const selectedDateElement = document.getElementById('selected-date');
            selectedDateElement.textContent = formatDateForDisplay(date);
        }
    }
}

// Ship drag and drop 관련 함수들
function setupShipDragAndDrop() {
    // 드래그 가능한 ship 요소들에 대한 이벤트 리스너 설정
    document.querySelectorAll('.ship').forEach(ship => {
        ship.addEventListener('dragstart', handleDragStart);
        ship.addEventListener('dragend', handleDragEnd);
    });

    // 드롭 대상이 되는 grid-slot 요소들에 대한 이벤트 리스너 설정
    document.querySelectorAll('.grid-slot').forEach(slot => {
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('dragleave', handleDragLeave);
        slot.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    if (!window.userPermissions.canEdit || e.target.hasAttribute('disabled')) {
        e.preventDefault();
        return;
    }
    selectedShip = e.target;
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    selectedShip = null;
}

function handleDragOver(e) {
    if (e.target.hasAttribute('disabled') || !selectedShip) {
        return;
    }
    e.preventDefault();
    e.target.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.target.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    const slot = e.target;
    slot.classList.remove('drag-over');

    if (slot.hasAttribute('disabled') || !selectedShip || !window.userPermissions.canEdit) {
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

// Ship을 슬롯에 배치하는 헬퍼 함수
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

// QC 사용률 업데이트
async function updateQCUsagePercentage() {
    const totalSlots = document.querySelectorAll('.grid-slot').length;
    const usedSlots = document.querySelectorAll('.grid-slot .ship').length;
    const percentage = (usedSlots / totalSlots) * 100;

    // QC 사용률 표시 업데이트
    const qcUsageRateElement = document.getElementById('qc-usage-rate');
    if (qcUsageRateElement) {
        qcUsageRateElement.textContent = `${percentage.toFixed(1)}%`;
    }
    
    // 프로그레스 바 업데이트
    const progressBar = document.getElementById('qc-usage-progress');
    if (progressBar) {
        progressBar.value = percentage;
    }

    // URL 경로에서 날짜 추출 (/plan/YYYY-MM-DD/...)
    const pathParts = window.location.pathname.split('/');
    const date = pathParts[2];  // /plan/DATE/TYPE 형식에서 DATE 부분

    // 서버에 QC 사용률 저장
    try {
        const response = await fetch('/api/save-qc-usage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                date: date,
                usage: percentage
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save QC usage');
        }
        
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to save QC usage');
        }
    } catch (error) {
        console.error('Error saving QC usage:', error);
        showToast('QC 사용률 저장에 실패했습니다.', 'error');
    }
}

// 모든 슬롯 초기화
function clearAllSlots() {
    if (!window.userPermissions.canEdit) {
        showToast('You do not have permission to clear slots', 'error');
        return;
    }

    document.querySelectorAll('.grid-slot .ship').forEach(ship => {
        ship.remove();
    });
    updateQCUsagePercentage();
}

// Ship Plan 저장
async function saveShipPlan() {
    try {
        // 선박 데이터 수집
        const ships = [];
        document.querySelectorAll('.grid-slot').forEach((slot) => {
            const ship = slot.querySelector('.ship');
            if (ship) {
                ships.push({
                    crane: slot.getAttribute('data-crane'),
                    time: slot.getAttribute('data-time'),
                    ship_number: ship.getAttribute('data-ship')
                });
            }
        });

        // URL 경로에서 날짜 추출 (/plan/YYYY-MM-DD/...)
        const pathParts = window.location.pathname.split('/');
        const date = pathParts[2];  // /plan/DATE/TYPE 형식에서 DATE 부분
        
        // API 호출
        const response = await fetch('/api/save-ship-plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                date: date,
                ships: ships
            })
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            showToast('일정이 성공적으로 저장되었습니다.', 'success');
            updateQCUsagePercentage();  // 저장 후 QC 사용률 업데이트
        } else {
            showToast('저장 중 오류가 발생했습니다: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('저장 중 오류가 발생했습니다.', 'error');
    }
}

// Ship Plan 로드
async function loadShipPlan() {
    try {
        // URL 경로에서 날짜 추출 (/plan/YYYY-MM-DD/...)
        const pathParts = window.location.pathname.split('/');
        const date = pathParts[2];  // /plan/DATE/TYPE 형식에서 DATE 부분

        const response = await fetch(`/api/get-ship-plans?date=${date}`);
        if (!response.ok) {
            throw new Error('Failed to load ship plans');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to load ship plans');
        }

        // 기존 ship들 제거
        document.querySelectorAll('.grid-slot .ship').forEach(ship => ship.remove());

        // 저장된 ship 계획 불러오기
        if (data.ships && Array.isArray(data.ships)) {
            data.ships.forEach(plan => {
                const slot = document.querySelector(`.grid-slot[data-crane="${plan.crane}"][data-time="${plan.time}"]`);
                if (slot) {
                    const shipTemplate = document.querySelector(`.ship-list .ship[data-ship="${plan.ship_number}"]`);
                    if (shipTemplate) {
                        placeShipInSlot(slot, shipTemplate);
                    }
                }
            });
        }

        // 계획 로드 후 QC 사용률 업데이트
        updateQCUsagePercentage();
        showToast('Ship Plan이 로드되었습니다.', 'success');
    } catch (error) {
        console.error('Error loading ship plan:', error);
        showToast('Ship Plan 로드에 실패했습니다.', 'error');
    }
}
