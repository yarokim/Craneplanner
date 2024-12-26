from flask import Flask, render_template, request, jsonify, redirect, url_for, session
import json
import os
from datetime import datetime, timedelta
from functools import wraps
from typing import Optional

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'  # 실제 운영 환경에서는 안전한 키로 변경

# 데이터 저장 디렉토리 설정
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

# 사용자 권한 정의
USER_ROLES = {
    'admin': {
        'password': 'admin123',
        'role': 'admin',
        'permissions': ['view', 'edit', 'delete', 'manage_users']
    }
}

# 날짜 관련 상수
DATE_FORMATS = {
    'API': '%Y-%m-%d',
    'DISPLAY': '%Y.%m.%d',
    'FILE': '%Y%m%d_%H%M%S',
    'ISO': '%Y-%m-%dT%H:%M:%S.%fZ'
}

class DateError(Exception):
    """날짜 관련 예외 처리를 위한 커스텀 예외 클래스"""
    pass

def parse_date(date_str: str) -> Optional[datetime]:
    """
    다양한 형식의 날짜 문자열을 파싱하여 datetime 객체로 변환
    
    Args:
        date_str (str): 파싱할 날짜 문자열
        
    Returns:
        Optional[datetime]: 파싱된 datetime 객체 또는 None
        
    Raises:
        DateError: 날짜 파싱 실패 시
    """
    if not date_str:
        raise DateError("Date string is empty")
        
    try:
        # ISO 형식 시도
        if 'T' in date_str:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            
        # YYYY-MM-DD 형식
        if '-' in date_str:
            return datetime.strptime(date_str, DATE_FORMATS['API'])
            
        # YYYY.MM.DD 형식
        if '.' in date_str:
            return datetime.strptime(date_str, DATE_FORMATS['DISPLAY'])
            
        # YYYYMMDD 형식
        if len(date_str) == 8 and date_str.isdigit():
            return datetime.strptime(date_str, '%Y%m%d')
            
        raise DateError(f"Unsupported date format: {date_str}")
        
    except ValueError as e:
        raise DateError(f"Error parsing date: {str(e)}")

def format_date(date: datetime, format_type: str = 'API') -> str:
    """
    datetime 객체를 지정된 형식의 문자열로 변환
    
    Args:
        date (datetime): 변환할 datetime 객체
        format_type (str): 변환할 형식 ('API', 'DISPLAY', 'FILE', 'ISO')
        
    Returns:
        str: 형식화된 날짜 문자열
        
    Raises:
        DateError: 잘못된 형식이나 날짜 객체가 제공될 경우
    """
    if not isinstance(date, datetime):
        raise DateError("Invalid datetime object")
        
    try:
        return date.strftime(DATE_FORMATS[format_type])
    except KeyError:
        raise DateError(f"Unsupported format type: {format_type}")
    except ValueError as e:
        raise DateError(f"Error formatting date: {str(e)}")

def normalize_date(date_str: str) -> Optional[str]:
    """
    날짜 문자열을 API 형식(YYYY-MM-DD)으로 정규화
    
    Args:
        date_str (str): 정규화할 날짜 문자열
        
    Returns:
        Optional[str]: 정규화된 날짜 문자열 또는 None
        
    Raises:
        DateError: 날짜 정규화 실패 시
    """
    try:
        date = parse_date(date_str)
        return format_date(date, 'API')
    except DateError as e:
        app.logger.error(f"Date normalization error: {str(e)}")
        return None

def is_valid_date(date_str: str) -> bool:
    """
    날짜 문자열이 유효한지 검증
    
    Args:
        date_str (str): 검증할 날짜 문자열
        
    Returns:
        bool: 유효성 여부
    """
    try:
        parse_date(date_str)
        return True
    except DateError:
        return False

def get_today() -> str:
    """
    오늘 날짜를 API 형식(YYYY-MM-DD)으로 반환
    
    Returns:
        str: 오늘 날짜 문자열
    """
    return format_date(datetime.now(), 'API')

# 권한 체크 데코레이터
def requires_permission(permission):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'username' not in session:
                return jsonify({'error': 'Login required', 'success': False}), 401
            
            user = USER_ROLES.get(session['username'])
            if not user or permission not in user['permissions']:
                return jsonify({'error': 'Permission denied', 'success': False}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# 로그인 상태 확인
def is_logged_in():
    return 'username' in session

# 사용자 권한 확인
def get_user_permissions():
    if 'username' in session:
        return USER_ROLES.get(session['username'], {}).get('permissions', [])
    return []

# 로그인 라우트
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = USER_ROLES.get(username)
        if user and user['password'] == password:
            session['username'] = username
            session['role'] = user['role']
            return redirect(url_for('calendar'))
        
        return render_template('login.html', error='Invalid username or password')
    
    return render_template('login.html')

# 로그아웃 라우트
@app.route('/logout')
def logout():
    session.pop('username', None)
    session.pop('role', None)
    return redirect(url_for('calendar'))

# 데이터 정리 함수
def cleanup_old_data():
    """2주 이상 된 데이터 정리"""
    two_weeks_ago = datetime.now() - timedelta(weeks=2)
    
    for filename in os.listdir(DATA_DIR):
        if not filename.endswith('_integrated_plan.json'):
            continue
            
        file_path = os.path.join(DATA_DIR, filename)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                created_at = datetime.fromisoformat(data['metadata']['created_at'])
                if created_at < two_weeks_ago:
                    os.remove(file_path)
        except (json.JSONDecodeError, ValueError, OSError, KeyError):
            continue

# 홈 경로: 달력 페이지 렌더링
@app.route('/')
def calendar():
    if not is_logged_in():
        return redirect(url_for('login'))
    return render_template('calendar.html', 
                         is_logged_in=is_logged_in(),
                         can_edit='edit' in get_user_permissions(),
                         session=session)

# choose_crane 페이지에서 통합 plan 페이지로 리다이렉트
@app.route('/choose_crane/<date>')
def choose_crane(date):
    return redirect(url_for('integrated_plan', date=date))

# 통합 계획 페이지
@app.route('/plan/<date>')
def integrated_plan(date):
    if not is_valid_date(date):
        return redirect(url_for('calendar'))
    
    return render_template('integrated_plan.html',
                         selected_date=date,
                         is_logged_in=is_logged_in(),
                         can_edit='edit' in get_user_permissions(),
                         session=session)

# API 엔드포인트들
@app.route('/api/save-maintenance-plan', methods=['POST'])
def save_maintenance_plan():
    if not is_logged_in() or 'edit' not in get_user_permissions():
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        data = request.get_json()
        date_str = data.get('date', get_today())
        equipment_type = data.get('equipment_type')
        plan = data.get('plan', [])
        
        if not equipment_type:
            return jsonify({'error': 'Equipment type is required'}), 400
            
        # 통합 파일명 설정 (날짜별 단일 파일)
        filename = f"{date_str}_integrated_plan.json"
        filepath = os.path.join(DATA_DIR, filename)
        
        # 기존 데이터 로드 또는 새로운 구조 생성
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
        else:
            existing_data = {
                'metadata': {
                    'created_at': datetime.now().isoformat(),
                    'last_modified': datetime.now().isoformat(),
                    'version': '1.0'
                },
                'plans': {
                    'ship': [],
                    'qc': [],
                    'armgc': [],
                    'mobile': [],
                    'facility': []
                },
                'final_maintenance': {
                    'qc': None,
                    'armgc': None
                },
                'operation_notes': ''
            }
        
        # 데이터 업데이트
        existing_data['plans'][equipment_type] = plan
        existing_data['metadata']['last_modified'] = datetime.now().isoformat()
        
        # 데이터 저장
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(existing_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({'message': 'Success', 'plan': plan})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/get-maintenance-plan', methods=['GET'])
def get_maintenance_plan():
    try:
        date_str = request.args.get('date', get_today())
        equipment_type = request.args.get('equipment_type')
        
        if not equipment_type:
            return jsonify({'error': 'Equipment type is required'}), 400
            
        filename = f"{date_str}_integrated_plan.json"
        filepath = os.path.join(DATA_DIR, filename)
        
        if not os.path.exists(filepath):
            return jsonify({'plan': []})
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        plan = data.get('plans', {}).get(equipment_type, [])
        return jsonify({'plan': plan})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/save-ship-plan', methods=['POST'])
def save_ship_plan():
    if not is_logged_in() or 'edit' not in get_user_permissions():
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        data = request.get_json()
        ship_plan = data.get('shipPlan', [])
        date_str = request.args.get('date', get_today())
        
        # 통합 파일명 설정 (날짜별 단일 파일)
        filename = f"{date_str}_integrated_plan.json"
        filepath = os.path.join(DATA_DIR, filename)
        
        # 기존 데이터 로드 또는 새로운 구조 생성
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
        else:
            existing_data = {
                'metadata': {
                    'created_at': datetime.now().isoformat(),
                    'last_modified': datetime.now().isoformat(),
                    'version': '1.0'
                },
                'plans': {
                    'ship': [],
                    'qc': [],
                    'armgc': [],
                    'mobile': [],
                    'facility': []
                },
                'final_maintenance': {
                    'qc': None,
                    'armgc': None
                },
                'operation_notes': ''
            }
        
        # 데이터 업데이트
        existing_data['plans']['ship'] = ship_plan
        existing_data['metadata']['last_modified'] = datetime.now().isoformat()
        
        # 데이터 저장
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(existing_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({'message': 'Success', 'plans': ship_plan})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/get-ship-plan', methods=['GET'])
def get_ship_plan():
    try:
        date_str = request.args.get('date', get_today())
        
        filename = f"{date_str}_integrated_plan.json"
        filepath = os.path.join(DATA_DIR, filename)
        
        if not os.path.exists(filepath):
            return jsonify([])
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # ship plan 데이터만 반환
        plans = data.get('plans', {}).get('ship', [])
        return jsonify(plans)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/save_final_maintenance', methods=['POST'])
def save_final_maintenance():
    if not is_logged_in() or 'edit' not in get_user_permissions():
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        data = request.get_json()
        count = data.get('count')
        date_str = data.get('date', get_today())
        crane_type = data.get('crane_type', 'qc')  # 'qc' 또는 'armgc'
        
        if count is None:
            return jsonify({'error': 'Count is required'}), 400
            
        # 통합 파일명 설정 (날짜별 단일 파일)
        filename = f"{date_str}_integrated_plan.json"
        filepath = os.path.join(DATA_DIR, filename)
        
        # 기존 데이터 로드 또는 새로운 구조 생성
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
        else:
            existing_data = {
                'metadata': {
                    'created_at': datetime.now().isoformat(),
                    'last_modified': datetime.now().isoformat(),
                    'version': '1.0'
                },
                'plans': {
                    'ship': [],
                    'qc': [],
                    'armgc': [],
                    'mobile': [],
                    'facility': []
                },
                'final_maintenance': {
                    'qc': None,
                    'armgc': None
                },
                'operation_notes': ''
            }
        
        # 데이터 업데이트
        existing_data['final_maintenance'][crane_type] = count
        existing_data['metadata']['last_modified'] = datetime.now().isoformat()
        
        # 데이터 저장
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(existing_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({'message': 'Success', 'count': count})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/get_final_maintenance', methods=['GET'])
def get_final_maintenance():
    try:
        date_str = request.args.get('date', get_today())
        crane_type = request.args.get('crane_type', 'qc')
        
        filename = f"{date_str}_integrated_plan.json"
        filepath = os.path.join(DATA_DIR, filename)
        
        if not os.path.exists(filepath):
            return jsonify({'count': None})
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        count = data.get('final_maintenance', {}).get(crane_type)
        return jsonify({'count': count})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/save_operation_notes', methods=['POST'])
def save_operation_notes():
    if not is_logged_in() or 'edit' not in get_user_permissions():
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        data = request.get_json()
        notes = data.get('notes', '')
        date_str = data.get('date', get_today())
        
        # 통합 파일명 설정 (날짜별 단일 파일)
        filename = f"{date_str}_integrated_plan.json"
        filepath = os.path.join(DATA_DIR, filename)
        
        # 기존 데이터 로드 또는 새로운 구조 생성
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
        else:
            existing_data = {
                'metadata': {
                    'created_at': datetime.now().isoformat(),
                    'last_modified': datetime.now().isoformat(),
                    'version': '1.0'
                },
                'plans': {
                    'ship': [],
                    'qc': [],
                    'armgc': [],
                    'mobile': [],
                    'facility': []
                },
                'final_maintenance': {
                    'qc': None,
                    'armgc': None
                },
                'operation_notes': ''
            }
        
        # 데이터 업데이트
        existing_data['operation_notes'] = notes
        existing_data['metadata']['last_modified'] = datetime.now().isoformat()
        
        # 데이터 저장
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(existing_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({'message': 'Success', 'notes': notes})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/get_operation_notes', methods=['GET'])
def get_operation_notes():
    try:
        date_str = request.args.get('date', get_today())
        
        filename = f"{date_str}_integrated_plan.json"
        filepath = os.path.join(DATA_DIR, filename)
        
        if not os.path.exists(filepath):
            return jsonify({'notes': ''})
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        notes = data.get('operation_notes', '')
        return jsonify({'notes': notes})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 서버 시작 시 데이터 디렉토리 확인 및 생성
if __name__ == '__main__':
    os.makedirs(DATA_DIR, exist_ok=True)
    # 서버 시작 시 오래된 데이터 정리
    cleanup_old_data()
    
    # Get IP address
    import socket
    hostname = socket.gethostname()
    ip_address = socket.gethostbyname(hostname)
    
    # Only start if it's the correct IP range
    if ip_address.startswith('10.200.'):
        app.run(host=ip_address, port=5000, debug=True)
    else:
        print("Error: This application must be run on the correct network (10.200.x.x)")
