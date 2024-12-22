document.addEventListener('DOMContentLoaded', function () {
    const calendarContainer = document.getElementById('calendar');
    const monthYearDisplay = document.getElementById('month-year');
    const prevMonthButton = document.getElementById('prev-month');
    const nextMonthButton = document.getElementById('next-month');
    let currentDate = new Date();

    /** 달력 렌더링 */
    function renderCalendar(date) {
        // 달력 초기화
        calendarContainer.innerHTML = '';
        
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();

        // 월/년 표시 업데이트
        monthYearDisplay.textContent = `${date.toLocaleString('default', { month: 'long' })} ${year}`;

        // 요일 헤더 추가
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        weekdays.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.classList.add('weekday-header');
            dayHeader.textContent = day;
            calendarContainer.appendChild(dayHeader);
        });

        // 첫 주의 빈 날짜 추가
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.classList.add('calendar-day', 'empty');
            calendarContainer.appendChild(emptyDay);
        }

        // 날짜 추가
        const today = new Date();
        for (let i = 1; i <= lastDate; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('calendar-day');
            dayDiv.textContent = i;

            const dateToCheck = new Date(year, month, i);
            
            // 오늘 날짜 표시
            if (dateToCheck.toDateString() === today.toDateString()) {
                dayDiv.classList.add('today');
            }

            // 과거 날짜 비활성화
            if (dateToCheck < new Date(today.setHours(0, 0, 0, 0))) {
                dayDiv.classList.add('disabled');
            } else {
                dayDiv.addEventListener('click', () => {
                    const selectedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                    window.location.href = `/qc_schedule/${selectedDate}`;
                });
            }

            calendarContainer.appendChild(dayDiv);
        }
    }

    // 이전/다음 달 버튼 이벤트
    prevMonthButton.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar(currentDate);
    });

    nextMonthButton.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar(currentDate);
    });

    // 초기 달력 렌더링
    renderCalendar(currentDate);
});
