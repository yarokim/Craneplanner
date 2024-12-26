// 전역 변수
let selectedShip = null;
let currentEquipmentType = 'qc';

// Toast 메시지 표시 함수
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast position-fixed bottom-0 end-0 m-3 bg-${type === 'success' ? 'success' : 'danger'} text-white`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="toast-body">
            ${message}
        </div>
    `;
    document.body.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        document.body.removeChild(toast);
    });
}

// Maintenance Row 관련 함수들
function addMaintenanceRow(equipmentType, data = {}) {
    const tbody = document.getElementById(`${equipmentType}-maintenance-body`);
    const row = document.createElement('tr');
    
    // 공통 필드
    const timeFields = `
        <td>
            <select class="form-control form-control-sm" name="start-time" required>
                <option value="">Select Start Time</option>
                ${createTimeOptions(data.startTime)}
            </select>
        </td>
        <td>
            <select class="form-control form-control-sm" name="end-time" required>
                <option value="">Select End Time</option>
                ${createTimeOptions(data.endTime)}
            </select>
        </td>
        <td>
            <textarea class="form-control form-control-sm" name="notes" rows="2" placeholder="Enter notes...">${data.notes || ''}</textarea>
        </td>
    `;
    
    const actionButtons = `
        <td>
            <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-danger" onclick="this.closest('tr').remove()">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;

    // 장비 유형별 특화 필드
    let specificFields = '';
    switch (equipmentType) {
        case 'qc':
        case 'armgc':
            specificFields = `
                <td>
                    <select class="form-control form-control-sm" name="crane-number" required>
                        <option value="">Select Crane</option>
                        ${createCraneOptions(equipmentType, data.craneNumber)}
                    </select>
                </td>
                <td>
                    <select class="form-control form-control-sm" name="maintenance-type">
                        <option value="PMS" ${data.maintenanceType === 'PMS' ? 'selected' : ''}>PMS</option>
                        <option value="RMS" ${data.maintenanceType === 'RMS' ? 'selected' : ''}>RMS</option>
                    </select>
                </td>
            `;
            break;
        case 'mobile':
            specificFields = `
                <td>
                    <input type="text" class="form-control form-control-sm" name="equipment-number" value="${data.equipmentNumber || ''}" required>
                </td>
                <td>
                    <select class="form-control form-control-sm" name="equipment-type">
                        <option value="YT" ${data.equipmentType === 'YT' ? 'selected' : ''}>Yard Tractor</option>
                        <option value="FL" ${data.equipmentType === 'FL' ? 'selected' : ''}>Forklift</option>
                        <option value="RS" ${data.equipmentType === 'RS' ? 'selected' : ''}>Reach Stacker</option>
                    </select>
                </td>
                <td>
                    <select class="form-control form-control-sm" name="maintenance-type">
                        <option value="PMS" ${data.maintenanceType === 'PMS' ? 'selected' : ''}>PMS</option>
                        <option value="RMS" ${data.maintenanceType === 'RMS' ? 'selected' : ''}>RMS</option>
                    </select>
                </td>
            `;
            break;
        case 'facility':
            specificFields = `
                <td>
                    <input type="text" class="form-control form-control-sm" name="facility-name" value="${data.facilityName || ''}" required>
                </td>
                <td>
                    <select class="form-control form-control-sm" name="maintenance-type">
                        <option value="PMS" ${data.maintenanceType === 'PMS' ? 'selected' : ''}>PMS</option>
                        <option value="RMS" ${data.maintenanceType === 'RMS' ? 'selected' : ''}>RMS</option>
                    </select>
                </td>
            `;
            break;
    }

    row.innerHTML = specificFields + timeFields + actionButtons;
    tbody.appendChild(row);
    
    // Add time validation listeners
    const startTimeSelect = row.querySelector('select[name="start-time"]');
    const endTimeSelect = row.querySelector('select[name="end-time"]');
    
    startTimeSelect.addEventListener('change', () => validateTimeSelection(row));
    endTimeSelect.addEventListener('change', () => validateTimeSelection(row));
}

// Create time options (00:00 to 23:00)
function createTimeOptions(selectedTime = '') {
    let options = [];
    for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        const timeValue = `${hour}:00`;
        options.push(`<option value="${timeValue}" ${selectedTime === timeValue ? 'selected' : ''}>${timeValue}</option>`);
    }
    return options.join('');
}

// Time validation function
function validateTimeSelection(row) {
    const startTime = row.querySelector('select[name="start-time"]').value;
    const endTime = row.querySelector('select[name="end-time"]').value;
    
    if (startTime && endTime) {
        if (endTime <= startTime) {
            showToast('End time must be after start time', 'error');
            row.querySelector('select[name="end-time"]').value = '';
            return false;
        }
    }
    return true;
}

// Crane numbers configuration
const CRANE_NUMBERS = {
    qc: Array.from({length: 12}, (_, i) => 101 + i),
    armgc: [
        // Block A
        211, 212, 213, 214, 215, 216,
        // Block B
        221, 222, 223, 224, 225, 226,
        // Block C
        231, 232, 233, 234, 235, 236,
        // Block D
        241, 242, 243, 244, 245, 246,
        // Block E
        251, 252, 253, 254, 255, 256,
        // Block F
        261, 262, 263, 264, 265, 266,
        // Block G
        271, 272
    ]
};

// Block name mapping
const BLOCK_NAMES = {
    210: 'A',
    220: 'B',
    230: 'C',
    240: 'D',
    250: 'E',
    260: 'F',
    270: 'G'
};

// Create crane number select options
function createCraneOptions(craneType, selectedValue = '') {
    if (craneType === 'qc') {
        return CRANE_NUMBERS.qc.map(num => 
            `<option value="${num}" ${selectedValue == num ? 'selected' : ''}>QC ${num}</option>`
        ).join('');
    } else if (craneType === 'armgc') {
        let options = [];
        let currentBlock = Math.floor(CRANE_NUMBERS.armgc[0] / 10) * 10;
        
        options.push(`<optgroup label="Block ${BLOCK_NAMES[currentBlock]}">`);
        CRANE_NUMBERS.armgc.forEach(num => {
            const block = Math.floor(num / 10) * 10;
            if (block !== currentBlock) {
                options.push('</optgroup>');
                options.push(`<optgroup label="Block ${BLOCK_NAMES[block]}">`);
                currentBlock = block;
            }
            options.push(`<option value="${num}" ${selectedValue == num ? 'selected' : ''}>ARMGC ${num}</option>`);
        });
        options.push('</optgroup>');
        
        return options.join('');
    }
    return '';
}

async function saveMaintenancePlan(equipmentType) {
    const maintenanceData = [];
    const tbody = document.getElementById(`${equipmentType}-maintenance-body`);
    const rows = tbody.getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const data = {
            startTime: row.querySelector('select[name="start-time"]').value,
            endTime: row.querySelector('select[name="end-time"]').value,
            notes: row.querySelector('textarea[name="notes"]').value
        };

        if (equipmentType === 'mobile') {
            data.equipmentNumber = row.querySelector('input[name="equipment-number"]').value;
            data.equipmentType = row.querySelector('select[name="equipment-type"]').value;
            data.maintenanceType = row.querySelector('select[name="maintenance-type"]').value;
        } else if (equipmentType === 'facility') {
            data.facilityName = row.querySelector('input[name="facility-name"]').value;
            data.maintenanceType = row.querySelector('select[name="maintenance-type"]').value;
        } else {
            data.craneNumber = row.querySelector('select[name="crane-number"]').value;
            data.maintenanceType = row.querySelector('select[name="maintenance-type"]').value;
        }
        
        // Validate required fields
        if (!data.startTime || !data.endTime) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        
        maintenanceData.push(data);
    }

    try {
        const response = await fetch('/api/save-maintenance-plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                equipmentType: equipmentType,
                maintenanceData: maintenanceData
            })
        });

        if (response.ok) {
            showToast('Maintenance plan saved successfully', 'success');
        } else {
            showToast('Failed to save maintenance plan', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error saving maintenance plan', 'error');
    }
}

async function loadMaintenancePlan(equipmentType) {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const date = urlParams.get('date');

        const response = await fetch(`/api/get-maintenance-plan?date=${date}&equipment_type=${equipmentType}`);
        if (!response.ok) {
            throw new Error('Failed to load maintenance plan');
        }

        const data = await response.json();
        const tbody = document.getElementById(`${equipmentType}-maintenance-body`);
        tbody.innerHTML = '';

        data.plan.forEach(plan => {
            addMaintenanceRow(equipmentType, plan);
        });
    } catch (error) {
        console.error('Error loading maintenance plan:', error);
        showToast('Failed to load maintenance plan', 'error');
    }
}

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', function() {
    // 각 장비 유형별 초기 데이터 로드
    loadMaintenancePlan('qc');
    loadMaintenancePlan('armgc');
    loadMaintenancePlan('mobile');
    loadMaintenancePlan('facility');

    // 탭 변경 이벤트
    document.querySelectorAll('.nav-link').forEach(tab => {
        tab.addEventListener('click', function() {
            const equipmentType = this.id.replace('-tab', '');
            loadMaintenancePlan(equipmentType);
        });
    });

    // 유지보수 추가 버튼 이벤트
    document.querySelectorAll('[id$="-maintenance"] button').forEach(button => {
        button.addEventListener('click', () => {
            const equipmentType = button.closest('.tab-pane').id.replace('-content', '');
            addMaintenanceRow(equipmentType);
        });
    });

    // 기존 이벤트 리스너 유지
    setupShipPlanGrid();
    setupShipDragAndDrop();
    updateDisplayDate();
    loadQCData();
    loadShipPlan();
});

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
                'Content-Type': 'application/json',
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
        showToast('Maintenance plan saved successfully', 'success');
        return result;
    } catch (error) {
        console.error('Error saving maintenance plan:', error);
        showToast('Failed to save maintenance plan', 'error');
    }
}

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

async function deleteMaintenancePlan(planId, isARMGC = false) {
    try {
        const response = await fetch(`/api/delete_maintenance_plan/${planId}?crane_type=${isARMGC ? 'armgc' : 'qc'}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete maintenance plan');
        }
        
        showToast('Maintenance plan deleted successfully', 'success');
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
    if (!window.userPermissions.canEdit) {
        showToast('You do not have permission to save the final maintenance', 'error');
        return;
    }

    const finalCount = document.getElementById('final-crane-count').value;
    const urlParams = new URLSearchParams(window.location.search);
    const date = urlParams.get('date');
    const craneType = currentEquipmentType; // 'qc' 또는 'armgc'

    try {
        const response = await fetch(`/api/save_final_maintenance?date=${date}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                count: parseInt(finalCount),
                crane_type: craneType
            })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to save final maintenance count');
        }
        
        showToast('Final maintenance count saved successfully', 'success');
    } catch (error) {
        console.error('Error saving final maintenance:', error);
        showToast('Failed to save final maintenance', 'error');
    }
}

async function loadFinalMaintenance() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const date = urlParams.get('date');
        const craneType = currentEquipmentType;

        const response = await fetch(`/api/get_final_maintenance?date=${date}&crane_type=${craneType}`);
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to load final maintenance count');
        }
        
        const data = await response.json();
        const finalCountInput = document.getElementById('final-crane-count');
        if (finalCountInput && data.count !== null) {
            finalCountInput.value = data.count;
        }
    } catch (error) {
        console.error('Error loading final maintenance:', error);
        showToast(error.message, 'error');
    }
}

// Notes 관련 함수들
async function saveOperationNotes() {
    if (!window.userPermissions.canEdit) {
        showToast('You do not have permission to save operation notes', 'error');
        return;
    }

    const notes = document.getElementById('operation-notes').value;
    const urlParams = new URLSearchParams(window.location.search);
    const date = urlParams.get('date');

    try {
        const response = await fetch(`/api/save_operation_notes?date=${date}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                notes: notes
            })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to save operation notes');
        }
        
        showToast('Operation notes saved successfully', 'success');
    } catch (error) {
        console.error('Error saving operation notes:', error);
        showToast(error.message, 'error');
    }
}

async function loadOperationNotes() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const date = urlParams.get('date');

        const response = await fetch(`/api/get_operation_notes?date=${date}`);
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to load operation notes');
        }
        
        const data = await response.json();
        const notesTextarea = document.getElementById('operation-notes');
        if (notesTextarea) {
            notesTextarea.value = data.notes || '';
        }
    } catch (error) {
        console.error('Error loading operation notes:', error);
        showToast(error.message, 'error');
    }
}

// 데이터 로드 함수들
async function loadQCData() {
    await Promise.all([
        loadMaintenancePlan('qc'),
        updateQCUsagePercentage(),
        loadOperationNotes(),
        loadFinalMaintenance()
    ]);
}

async function loadARMGCData() {
    await Promise.all([
        loadMaintenancePlan('armgc'),
        loadOperationNotes(),
        loadFinalMaintenance()
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
                shipName: ship.textContent,
                craneNumber: parseInt(slot.getAttribute('data-crane')),
                time: slot.getAttribute('data-time')
            });
        }
    });

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const date = urlParams.get('date');

        const response = await fetch(`/api/save-ship-plan?date=${date}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                shipPlan: shipPlan
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to save ship plan');
        }

        showToast('Ship plan saved successfully', 'success');
    } catch (error) {
        console.error('Error saving ship plan:', error);
        showToast(error.message, 'error');
    }
}

async function loadShipPlan() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const date = urlParams.get('date');

        const response = await fetch(`/api/get-ship-plan?date=${date}`);
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to load ship plan');
        }

        const plans = await response.json();
        
        // 먼저 모든 슬롯 초기화
        clearAllSlots();
        
        // 각 계획을 슬롯에 배치
        plans.forEach(plan => {
            const slot = document.querySelector(`.grid-slot[data-crane="${plan.craneNumber}"][data-time="${plan.time}"]`);
            if (slot) {
                const shipTemplate = document.createElement('div');
                shipTemplate.className = 'ship';
                shipTemplate.textContent = plan.shipName;
                shipTemplate.draggable = true;
                placeShipInSlot(slot, shipTemplate);
            }
        });
        
        updateQCUsagePercentage();
    } catch (error) {
        console.error('Error loading ship plan:', error);
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
