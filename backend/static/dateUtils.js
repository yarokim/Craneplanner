// 날짜 형식 상수
const DATE_FORMATS = {
    API: 'YYYY-MM-DD',       // API 통신용 (ISO 형식)
    DISPLAY: 'YYYY.MM.DD',   // 화면 표시용
    FILE: 'YYYYMMDD_HHmmss', // 파일명용
    ISO: 'YYYY-MM-DDTHH:mm:ssZ' // ISO 8601 형식
};

// Date 객체를 API 형식(YYYY-MM-DD)으로 변환
function formatDateForAPI(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        console.error('Invalid date object provided to formatDateForAPI');
        return null;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Date 객체를 화면 표시용 형식(YYYY.MM.DD)으로 변환
function formatDateForDisplay(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        console.error('Invalid date object provided to formatDateForDisplay');
        return null;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

// Date 객체를 파일명용 형식(YYYYMMDD_HHmmss)으로 변환
function formatDateForFile(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        console.error('Invalid date object provided to formatDateForFile');
        return null;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

// Date 객체를 ISO 8601 형식으로 변환
function formatDateToISO(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        console.error('Invalid date object provided to formatDateToISO');
        return null;
    }
    return date.toISOString();
}

// 문자열을 Date 객체로 변환 (여러 형식 지원)
function parseDate(dateStr) {
    if (!dateStr) {
        console.error('Empty date string provided to parseDate');
        return null;
    }
    
    try {
        // ISO 8601 형식 시도
        if (dateStr.includes('T')) {
            const date = new Date(dateStr);
            if (!isNaN(date)) return date;
        }
        
        // YYYY-MM-DD 형식
        if (dateStr.includes('-')) {
            const [year, month, day] = dateStr.split('-').map(Number);
            return new Date(year, month - 1, day);
        }
        
        // YYYY.MM.DD 형식
        if (dateStr.includes('.')) {
            const [year, month, day] = dateStr.split('.').map(Number);
            return new Date(year, month - 1, day);
        }
        
        // YYYYMMDD 형식
        if (dateStr.length === 8) {
            const year = parseInt(dateStr.substring(0, 4));
            const month = parseInt(dateStr.substring(4, 6)) - 1;
            const day = parseInt(dateStr.substring(6, 8));
            return new Date(year, month, day);
        }
        
        console.error(`Unsupported date format: ${dateStr}`);
        return null;
    } catch (error) {
        console.error(`Error parsing date: ${error.message}`);
        return null;
    }
}

// 날짜가 유효한지 검증
function isValidDate(dateStr) {
    if (!dateStr) {
        console.error('Empty date string provided to isValidDate');
        return false;
    }
    
    const date = parseDate(dateStr);
    if (!date) return false;
    
    // 날짜가 현실적인 범위 내에 있는지 확인
    const year = date.getFullYear();
    if (year < 2000 || year > 2100) {
        console.error(`Year ${year} is out of reasonable range`);
        return false;
    }
    
    return true;
}

// 날짜 비교 함수
function compareDates(date1, date2) {
    const d1 = parseDate(date1);
    const d2 = parseDate(date2);
    
    if (!d1 || !d2) {
        console.error('Invalid date provided to compareDates');
        return null;
    }
    
    // 시간을 제외하고 날짜만 비교
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    
    return d1.getTime() - d2.getTime();
}

// 날짜 차이 계산 (일 단위)
function getDaysDifference(date1, date2) {
    const diffMs = compareDates(date1, date2);
    if (diffMs === null) return null;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// 오늘 날짜 가져오기 (YYYY-MM-DD 형식)
function getTodayDate() {
    return formatDateForAPI(new Date());
}

// 날짜가 주말인지 확인
function isWeekend(date) {
    const d = parseDate(date);
    if (!d) return null;
    const day = d.getDay();
    return day === 0 || day === 6;
}

// 날짜 형식 변환 (한 형식에서 다른 형식으로)
function convertDateFormat(dateStr, fromFormat, toFormat) {
    const date = parseDate(dateStr);
    if (!date) return null;
    
    switch (toFormat) {
        case DATE_FORMATS.API:
            return formatDateForAPI(date);
        case DATE_FORMATS.DISPLAY:
            return formatDateForDisplay(date);
        case DATE_FORMATS.FILE:
            return formatDateForFile(date);
        case DATE_FORMATS.ISO:
            return formatDateToISO(date);
        default:
            console.error(`Unsupported target format: ${toFormat}`);
            return null;
    }
}

// 모듈 내보내기
export {
    DATE_FORMATS,
    formatDateForAPI,
    formatDateForDisplay,
    formatDateForFile,
    formatDateToISO,
    parseDate,
    isValidDate,
    compareDates,
    getDaysDifference,
    getTodayDate,
    isWeekend,
    convertDateFormat
};
