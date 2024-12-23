document.addEventListener('DOMContentLoaded', function () {
    const maintenanceBody = document.getElementById('maintenance-body');
    const rowTemplate = document.getElementById('row-template');
    const addRowButton = document.getElementById('add-row-button');
    const saveButton = document.getElementById('save-maintenance');
    const backButton = document.getElementById('back-button');
    const qcUsageRate = document.getElementById('qc-usage-rate');
    const qcUsageProgress = document.getElementById('qc-usage-progress');
    const finalCraneCount = document.getElementById('final-crane-count');
    const saveFinalMaintenance = document.getElementById('save-final-maintenance');
    const operationNotesInput = document.getElementById('operation-notes-input');
    const selectedDateElement = document.getElementById('selected-date');

    // 유효성 검사 메시지
    const VALIDATION_MESSAGES = {
        required: '이 필드는 필수입니다.',
        invalidTime: '종료 시간은 시작 시간보다 늦어야 합니다.',
        duplicateCrane: '이미 선택된 크레인입니다.'
    };

    // 날짜 포맷 유틸리티
    const dateUtils = {
        formatDateForAPI: function(date) {
            if (typeof date === 'string') {
                return date;
            }
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    };

    // 토스트 메시지 표시
    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast ' + type;
        
        // Show the toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        // Hide the toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // 입력 필드 유효성 검사
    function validateField(input, validationMessage) {
        if (!input) return false;  // 입력 필드가 없으면 false 반환
        
        let messageElement = input.parentElement.querySelector('.validation-message');
        
        // validation-message 요소가 없으면 생성
        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.className = 'validation-message';
            input.parentElement.appendChild(messageElement);
        }

        if (!input.value || !input.value.trim()) {
            input.classList.add('invalid');
            messageElement.textContent = validationMessage || '이 필드는 필수입니다.';
            return false;
        }
        
        input.classList.remove('invalid');
        messageElement.textContent = '';
        return true;
    }

    // 시간 유효성 검사
    function validateTimeRange(startSelect, endSelect) {
        if (!startSelect || !endSelect) return true;  // 둘 중 하나라도 없으면 검증 통과

        const startTime = startSelect.value;
        const endTime = endSelect.value;

        if (!startTime || !endTime) return true;  // 둘 중 하나라도 값이 없으면 검증 통과

        if (startTime >= endTime) {
            showToast('종료 시간은 시작 시간보다 늦어야 합니다.', 'error');
            endSelect.value = '';
            return false;
        }

        return true;
    }

    // 크레인 중복 검사
    function validateCraneSelection(select) {
        if (!select) return true;  // select가 null이면 검증 통과

        const row = select.closest('.maintenance-row');
        if (!row) return true;  // row를 찾을 수 없으면 검증 통과

        const value = select.value;
        if (!value) return true;  // 값이 없으면 검증 통과

        const otherSelects = document.querySelectorAll('.maintenance-row .crane-select');
        let isValid = true;

        otherSelects.forEach(otherSelect => {
            if (otherSelect !== select && otherSelect.value === value) {
                isValid = false;
            }
        });

        if (!isValid) {
            showToast('이미 선택된 크레인입니다.', 'error');
            select.value = '';
        }

        return isValid;
    }

    // 전체 유효성 검사
    function validateAll() {
        const rows = document.querySelectorAll('.maintenance-row');
        let isValid = true;

        rows.forEach(row => {
            const craneSelect = row.querySelector('.crane-select');
            const taskInput = row.querySelector('.task-input');
            const startTime = row.querySelector('.start-time');
            const endTime = row.querySelector('.end-time');

            if (!validateField(craneSelect, '크레인을 선택해주세요.')) isValid = false;
            if (!validateField(taskInput, '작업 내용을 입력해주세요.')) isValid = false;
            if (!validateTimeRange(startTime, endTime)) isValid = false;
        });

        return isValid;
    }

    // 행 삭제
    function deleteRow(event) {
        const row = event.target.closest('tr');
        if (row && maintenanceBody.children.length > 1) {
            row.remove();
        } else {
            showToast('최소 한 개의 행은 유지해야 합니다.', 'warning');
        }
    }

    // 새 행 추가
    function addNewRow() {
        const row = createMaintenanceRow();
        
        // 이벤트 리스너 추가
        setupRowEventListeners(row);
        maintenanceBody.appendChild(row);
    }

    // 행 이벤트 리스너 설정
    function setupRowEventListeners(row) {
        if (!row) return;  // row가 null이면 리턴

        const taskInput = row.querySelector('.task-input');
        const startTimeSelect = row.querySelector('.start-time-select');
        const endTimeSelect = row.querySelector('.end-time-select');
        const craneSelect = row.querySelector('.crane-select');
        const notesInput = row.querySelector('.notes-input');
        const deleteButton = row.querySelector('.delete-button');

        if (taskInput) {
            taskInput.addEventListener('input', () => validateField(taskInput, VALIDATION_MESSAGES.required));
        }

        if (startTimeSelect && endTimeSelect) {
            startTimeSelect.addEventListener('change', () => validateTimeRange(startTimeSelect, endTimeSelect));
            endTimeSelect.addEventListener('change', () => validateTimeRange(startTimeSelect, endTimeSelect));
        }

        if (craneSelect) {
            craneSelect.addEventListener('change', () => validateCraneSelection(craneSelect));
        }

        if (deleteButton) {
            deleteButton.addEventListener('click', deleteRow);
        }
    }

    // 데이터 저장
    async function savePlan() {
        if (!validateAll()) {
            return;
        }

        try {
            // URL 경로에서 날짜 추출
            const pathParts = window.location.pathname.split('/');
            const date = pathParts[2];  // /armgc_maintenance/DATE 형식에서 DATE 부분

            const rows = document.querySelectorAll('.maintenance-row');
            const plans = [];

            rows.forEach(row => {
                plans.push({
                    crane: row.querySelector('.crane-select').value,
                    task: row.querySelector('.task-input').value,
                    start_time: row.querySelector('.start-time').value,
                    end_time: row.querySelector('.end-time').value,
                    notes: row.querySelector('.notes-input').value
                });
            });

            const response = await fetch('/api/save-maintenance-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    date: date,
                    plans: plans
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showToast('유지보수 계획이 성공적으로 저장되었습니다.', 'success');
                loadPlan();  // 저장 후 데이터 다시 로드
            } else {
                showToast('저장 중 오류가 발생했습니다: ' + (result.message || '알 수 없는 오류'), 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('저장 중 오류가 발생했습니다.', 'error');
        }
    }

    // 데이터 로드
    async function loadPlan() {
        try {
            // URL 경로에서 날짜 추출
            const pathParts = window.location.pathname.split('/');
            const date = pathParts[2];  // /armgc_maintenance/DATE 형식에서 DATE 부분

            const response = await fetch(`/api/get-maintenance-plans?date=${date}`);
            if (!response.ok) {
                throw new Error('Failed to load maintenance plans');
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || '데이터 로드에 실패했습니다.');
            }

            // 기존 행 모두 제거
            maintenanceBody.innerHTML = '';

            // 데이터가 없으면 빈 행 하나 추가
            if (!data.plans || data.plans.length === 0) {
                addNewRow();
                return;
            }

            // 계획으로 테이블 채우기
            data.plans.forEach(item => {
                const newRow = createMaintenanceRow();
                
                newRow.querySelector('.crane-select').value = item.crane;
                newRow.querySelector('.task-input').value = item.task;
                newRow.querySelector('.start-time').value = item.start_time;
                newRow.querySelector('.end-time').value = item.end_time;
                newRow.querySelector('.notes-input').value = item.notes || '';

                setupRowEventListeners(newRow);
                maintenanceBody.appendChild(newRow);
            });

            showToast('데이터가 성공적으로 로드되었습니다.', 'success');
        } catch (error) {
            console.error('Error:', error);
            showToast('데이터 로드 중 오류가 발생했습니다.', 'error');
            // 오류 발생 시 빈 행 하나로 초기화
            maintenanceBody.innerHTML = '';
            addNewRow();
        }
    }

    // Final PMS/RMS 저장
    function saveFinalMaintenanceCount() {
        if (!window.userPermissions.isLoggedIn) {
            showToast('Please login to save changes', 'error');
            return;
        }

        const count = finalCraneCount.value;
        const selectedDate = getSelectedDate();
        
        if (!selectedDate) {
            showToast('날짜를 선택해주세요.', 'error');
            return;
        }

        fetch('/api/save-final-maintenance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                date: dateUtils.formatDateForAPI(selectedDate),
                count: parseInt(count)
            })
        })
        .then(handleApiResponse)
        .then(data => {
            showToast('Final PMS/RMS가 저장되었습니다.', 'success');
        })
        .catch(error => {
            console.error('Error saving final maintenance count:', error);
            showToast('저장에 실패했습니다.', 'error');
        });
    }

    // Final PMS/RMS 로드
    function loadFinalMaintenanceCount() {
        const selectedDate = getSelectedDate();
        
        if (!selectedDate) {
            console.error('No date selected');
            return;
        }

        fetch(`/api/get-final-maintenance?date=${dateUtils.formatDateForAPI(selectedDate)}`)
            .then(handleApiResponse)
            .then(data => {
                finalCraneCount.value = data.count;
            })
            .catch(error => {
                console.error('Error loading final maintenance count:', error);
                finalCraneCount.value = 0;
            });
    }

    // QC 사용률에 따른 권장 크레인 수 계산
    function calculateRecommendedCranes(percentage) {
        if (percentage >= 90) {
            return 1;  // 매우 높은 사용률 (90% 이상): 1대
        } else if (percentage >= 80) {
            return 2;  // 높은 사용률 (80-90%): 2대
        } else if (percentage >= 20) {
            return 3;  // 중간 사용률 (20-80%): 3대
        } else {
            return 4;  // 낮은 사용률 (20% 미만): 4대
        }
    }

    // 선택된 날짜 가져오기
    function getSelectedDate() {
        const pathParts = window.location.pathname.split('/');
        const date = pathParts[pathParts.length - 1];  // URL의 마지막 부분이 날짜
        console.log('URL path:', window.location.pathname);
        console.log('Path parts:', pathParts);
        console.log('Selected date:', date);
        return date;
    }

    // 선택된 날짜 표시
    function displaySelectedDate() {
        const selectedDate = getSelectedDate();
        console.log('Displaying date:', selectedDate);
        if (selectedDateElement && selectedDate) {
            selectedDateElement.textContent = selectedDate;
        }
    }

    // QC 사용률 로드
    async function loadQCUsage() {
        const date = getSelectedDate();
        if (!date) {
            console.error('No date available');
            return;
        }

        const apiUrl = `/api/get-qc-usage/${date}`;
        console.log('Fetching QC usage from:', apiUrl);

        try {
            const response = await fetch(apiUrl);
            console.log('API Response status:', response.status);
            
            const data = await response.json();
            console.log('API Response data:', data);
            
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load QC usage');
            }

            const percentage = data.usage || 0;
            console.log('QC Usage percentage:', percentage);
            
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
            
            // 권장 크레인 수 계산 및 표시
            const recommendedCranes = calculateRecommendedCranes(percentage);
            const recommendElement = document.getElementById('recommend-crane-count');
            if (recommendElement) {
                recommendElement.textContent = `${recommendedCranes} crane${recommendedCranes > 1 ? 's' : ''}`;
            }
        } catch (error) {
            console.error('Error loading QC usage:', error);
            showToast('QC 사용률을 불러오는데 실패했습니다.', 'error');
        }
    }

    // 새 행 생성
    function createMaintenanceRow() {
        const row = document.createElement('tr');
        row.className = 'maintenance-row';

        // Create crane select
        const craneSelect = document.createElement('select');
        craneSelect.className = 'form-control crane-select';
        craneSelect.required = true;

        const craneNumbers = [
            211, 212, 213, 214, 215, 216,
            221, 222, 223, 224, 225, 226,
            231, 232, 233, 234, 235, 236,
            241, 242, 243, 244, 245, 246,
            251, 252, 253, 254, 255, 256,
            261, 262, 263, 264, 265, 266,
            271, 272
        ];

        craneNumbers.forEach(number => {
            const option = document.createElement('option');
            option.value = number;
            option.textContent = number;
            craneSelect.appendChild(option);
        });

        // Create task input
        const taskInput = document.createElement('input');
        taskInput.type = 'text';
        taskInput.className = 'form-control task-input';
        taskInput.placeholder = '';
        taskInput.required = true;

        // Create time container
        const timeContainer = document.createElement('div');
        timeContainer.className = 'time-input-container';

        // Create start time select
        const startTime = document.createElement('select');
        startTime.className = 'form-control time-select start-time';
        startTime.required = true;

        // Create end time select
        const endTime = document.createElement('select');
        endTime.className = 'form-control time-select end-time';
        endTime.required = true;

        // Add time options
        for (let i = 0; i < 24; i++) {
            const hour = i.toString().padStart(2, '0');
            
            const startOption = document.createElement('option');
            startOption.value = `${hour}:00`;
            startOption.textContent = `${hour}:00`;
            startTime.appendChild(startOption);

            const endOption = document.createElement('option');
            endOption.value = `${hour}:00`;
            endOption.textContent = `${hour}:00`;
            endTime.appendChild(endOption);
        }

        // Add separator
        const separator = document.createElement('span');
        separator.className = 'time-separator';
        separator.textContent = '~';

        timeContainer.appendChild(startTime);
        timeContainer.appendChild(separator);
        timeContainer.appendChild(endTime);

        // Create notes input
        const notesInput = document.createElement('textarea');
        notesInput.className = 'form-control notes-input';
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

        // Create delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-danger delete-row';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i> Delete';
        deleteButton.onclick = deleteRow;

        // Append all cells
        row.appendChild(createTableCell(craneSelect));
        row.appendChild(createTableCell(taskInput));
        row.appendChild(createTableCell(timeContainer));
        row.appendChild(createTableCell(notesInput));
        row.appendChild(createTableCell(deleteButton));

        return row;
    }

    // Helper function to create table cell
    function createTableCell(element) {
        const cell = document.createElement('td');
        cell.appendChild(element);
        return cell;
    }

    // Operation Notes 자동 저장
    let notesTimeout;
    operationNotesInput.addEventListener('input', function() {
        if (window.isLoggedIn) {
            clearTimeout(notesTimeout);
            notesTimeout = setTimeout(() => {
                saveOperationNotes();
            }, 1000);
        }
    });

    // Operation Notes 저장
    function saveOperationNotes() {
        const notes = operationNotesInput.value;
        const selectedDate = getSelectedDate();
        
        fetch('/save_operation_notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                notes: notes,
                date: dateUtils.formatDateForAPI(selectedDate)
            })
        })
        .then(handleApiResponse)
        .then(data => {
            if (data.success) {
                showToast('Notes saved successfully');
            }
        })
        .catch(error => {
            console.error('Error saving notes:', error);
            showToast('Failed to save notes');
        });
    }

    // Operation Notes 불러오기
    function loadOperationNotes() {
        const selectedDate = getSelectedDate();
        
        fetch(`/get_operation_notes?date=${dateUtils.formatDateForAPI(selectedDate)}`)
            .then(handleApiResponse)
            .then(data => {
                if (data.notes) {
                    operationNotesInput.value = data.notes;
                }
            })
            .catch(error => {
                console.error('Error loading notes:', error);
            });
    }

    // API 호출 시 에러 처리
    async function handleApiResponse(response) {
        if (!response.ok) {
            const data = await response.json();
            if (response.status === 401) {
                showToast('Please login to perform this action', 'error');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                throw new Error(data.message || 'An error occurred');
            }
        }
        return response.json();
    }

    // 이벤트 리스너 설정
    if (addRowButton) {
        addRowButton.addEventListener('click', addNewRow);
    }

    if (saveButton) {
        saveButton.addEventListener('click', savePlan);
    }

    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.href = '/';
        });
    }

    const saveFinalMaintenanceButton = document.getElementById('save-final-maintenance');
    if (saveFinalMaintenanceButton) {
        saveFinalMaintenanceButton.addEventListener('click', saveFinalMaintenanceCount);
    }

    // Operation Notes 저장 버튼 이벤트 리스너
    const saveOperationNotesButton = document.getElementById('save-operation-notes');
    if (saveOperationNotesButton) {
        saveOperationNotesButton.addEventListener('click', saveOperationNotes);
    }

    // 페이지 로드 시 초기화
    displaySelectedDate();
    loadQCUsage();
    loadPlan();
    loadOperationNotes();
    loadFinalMaintenanceCount();
});
