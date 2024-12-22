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
        date = parse_date(date_str)
        # 현실적인 날짜 범위 검사 (2000년 ~ 2100년)
        return 2000 <= date.year <= 2100
    except (DateError, AttributeError):
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
        if filename.endswith('.json'):
            file_path = os.path.join(DATA_DIR, filename)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    created_at = datetime.fromisoformat(data.get('created_at', ''))
                    if created_at < two_weeks_ago:
                        os.remove(file_path)
            except (json.JSONDecodeError, ValueError, OSError):
                continue

# 홈 경로: 달력 페이지 렌더링
@app.route('/')
def calendar():
    permissions = get_user_permissions()
    return render_template('calendar.html', 
                         is_logged_in=is_logged_in(),
                         can_edit='edit' in permissions,
                         can_delete='delete' in permissions,
                         can_manage='manage_users' in permissions)

# QC 스케줄 선택 페이지
@app.route('/qc_schedule/<date>')
def qc_schedule(date):
    try:
        # 날짜 형식 검증
        datetime.strptime(date, '%Y-%m-%d')
        return render_template('qc_schedule.html', 
                             date=date,
                             is_logged_in=is_logged_in(),
                             can_edit='edit' in get_user_permissions(),
                             can_delete='delete' in get_user_permissions())
    except ValueError:
        return redirect(url_for('calendar'))

# 계획 페이지 (QC 또는 ARMGC에 따라 다름)
@app.route('/plan/<date>/<crane_type>')
def plan(date, crane_type):
    try:
        # 날짜 형식 검증
        datetime.strptime(date, '%Y-%m-%d')
        if crane_type.upper() not in ['QC', 'ARMGC']:
            return redirect(url_for('calendar'))
            
        return render_template('plan.html', 
                             date=date,
                             crane_type=crane_type.upper(),
                             is_logged_in=is_logged_in(),
                             can_edit='edit' in get_user_permissions(),
                             can_delete='delete' in get_user_permissions())
    except ValueError:
        return redirect(url_for('calendar'))

# ARMGC 유지보수 계획 페이지
@app.route('/armgc_maintenance')
@app.route('/armgc_maintenance/<date>')
def armgc_maintenance(date=None):
    try:
        if date:
            datetime.strptime(date, '%Y-%m-%d')
        else:
            date = datetime.now().strftime('%Y-%m-%d')
    except ValueError:
        date = datetime.now().strftime('%Y-%m-%d')
        
    permissions = get_user_permissions()
    return render_template('armgc_maintenance_plan.html',
                         date=date,
                         is_logged_in=is_logged_in(),
                         can_edit='edit' in permissions,
                         can_delete='delete' in permissions)

# 데이터 저장 함수
def save_plan_to_json(data):
    """데이터를 JSON 파일로 저장"""
    try:
        # 날짜 형식 변환 (YYYY-MM-DD -> YYYYMMDD_HHMMSS)
        date_str = data.get('date')
        if not date_str:
            raise ValueError("Date is required")
            
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        file_date = date_obj.strftime('%Y%m%d_%H%M%S')
        
        # 파일명 생성
        filename = f"ship_plan_{file_date}.json"
        filepath = os.path.join(DATA_DIR, filename)
        
        # 저장 시간 추가
        data['created_at'] = datetime.now().isoformat()
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        return {
            'success': True,
            'message': '저장되었습니다.',
            'filename': filename,
            'saved_at': data['created_at']
        }
    except Exception as e:
        return {
            'success': False,
            'message': str(e)
        }

# API 엔드포인트들
@app.route('/api/save-ship-plan', methods=['POST'])
@requires_permission('edit')
def save_ship_plan():
    try:
        data = request.get_json()
        
        # 날짜 형식 검증
        date_str = data.get('date')
        try:
            datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            return jsonify({
                'success': False,
                'message': '잘못된 날짜 형식입니다. YYYY-MM-DD 형식을 사용해주세요.'
            }), 400
            
        result = save_plan_to_json(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/save-maintenance-plan', methods=['POST'])
@requires_permission('edit')
def save_maintenance_plan():
    try:
        data = request.get_json()
        date = data.get('date')
        plans = data.get('plans', [])
        
        if not date:
            return jsonify({'success': False, 'message': 'Date is required'}), 400
            
        if not is_valid_date(date):
            return jsonify({'success': False, 'message': 'Invalid date format or value'}), 400
            
        normalized_date = normalize_date(date)
        if not normalized_date:
            return jsonify({'success': False, 'message': 'Failed to normalize date'}), 400
            
        # 파일명 생성
        filename = f'maintenance_plan_{normalized_date}.json'
        file_path = os.path.join(DATA_DIR, filename)
        
        # 새로운 데이터로 완전히 대체
        save_data = {
            'date': normalized_date,
            'created_at': datetime.now().isoformat(),
            'plans': plans
        }
        
        # 데이터 저장
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(save_data, f, indent=2, ensure_ascii=False)
            
        return jsonify({'success': True, 'message': 'Maintenance plan saved successfully'}), 200
        
    except Exception as e:
        app.logger.error(f"Error saving maintenance plan: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/delete-maintenance-plan/<plan_id>', methods=['DELETE'])
@requires_permission('delete')
def delete_maintenance_plan(plan_id):
    try:
        file_path = os.path.join(DATA_DIR, f"maintenance_plan_{plan_id}.json")
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({'success': True, 'message': 'Plan deleted successfully'})
        return jsonify({'success': False, 'message': 'Plan not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/api/get-plans/<plan_type>', methods=['GET'])
def get_plans(plan_type):
    try:
        plans = []
        prefix = 'ship_plan_' if plan_type == 'ship' else 'maintenance_plan_'
        requested_date = request.args.get('date')
        
        for filename in os.listdir(DATA_DIR):
            if filename.startswith(prefix) and filename.endswith('.json'):
                file_path = os.path.join(DATA_DIR, filename)
                with open(file_path, 'r', encoding='utf-8') as f:
                    plan_data = json.load(f)
                    # 날짜가 지정된 경우 해당 날짜의 계획만 반환
                    if requested_date and plan_data.get('date') != requested_date:
                        continue
                    plans.append(plan_data)
        
        # 생성일자 기준으로 정렬
        plans.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return jsonify({'success': True, 'plans': plans})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/api/get-maintenance-plans', methods=['GET'])
def get_maintenance_plans():
    try:
        date = request.args.get('date')
        app.logger.info(f"Fetching maintenance plans for date: {date}")
        
        if not date:
            app.logger.error("Date parameter is missing")
            return jsonify({'success': False, 'message': 'Date parameter is required'}), 400
            
        if not is_valid_date(date):
            app.logger.error(f"Invalid date format: {date}")
            return jsonify({'success': False, 'message': 'Invalid date format or value'}), 400
            
        normalized_date = normalize_date(date)
        if not normalized_date:
            app.logger.error(f"Failed to normalize date: {date}")
            return jsonify({'success': False, 'message': 'Failed to normalize date'}), 400

        app.logger.info(f"Normalized date: {normalized_date}")

        # 해당 날짜의 모든 계획 데이터 로드
        plans = []
        prefix = 'maintenance_plan_'
        
        app.logger.info(f"Searching for files in {DATA_DIR}")
        for filename in os.listdir(DATA_DIR):
            if filename.startswith(prefix) and filename.endswith('.json'):
                file_path = os.path.join(DATA_DIR, filename)
                app.logger.info(f"Found file: {filename}")
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        plan_data = json.load(f)
                        plan_date = normalize_date(plan_data.get('date'))
                        app.logger.info(f"File date: {plan_date}, Looking for date: {normalized_date}")
                        if plan_date == normalized_date:
                            app.logger.info(f"Found matching plans: {plan_data.get('plans', [])}")
                            plans.extend(plan_data.get('plans', []))
                except Exception as e:
                    app.logger.error(f"Error reading file {filename}: {str(e)}")
                    continue
        
        app.logger.info(f"Returning {len(plans)} plans")
        return jsonify({'success': True, 'plans': plans}), 200
        
    except Exception as e:
        app.logger.error(f"Error getting maintenance plans: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/get-qc-usage')
def get_qc_usage():
    try:
        with open(os.path.join(DATA_DIR, 'ship_plan.json'), 'r') as f:
            data = json.load(f)
            qc_usage = data.get('qcUsage', 0)
            return jsonify({'qcUsage': qc_usage})
    except FileNotFoundError:
        return jsonify({'qcUsage': 0})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/get-ship-plans', methods=['GET'])
def get_ship_plans():
    try:
        date = request.args.get('date')
        if not date:
            return jsonify({'success': False, 'message': 'Date parameter is required'}), 400
            
        if not is_valid_date(date):
            return jsonify({'success': False, 'message': 'Invalid date format or value'}), 400
            
        normalized_date = normalize_date(date)
        if not normalized_date:
            return jsonify({'success': False, 'message': 'Failed to normalize date'}), 400

        # 해당 날짜의 모든 계획 데이터 로드
        plans = []
        prefix = 'ship_plan_'
        
        for filename in os.listdir(DATA_DIR):
            if filename.startswith(prefix) and filename.endswith('.json'):
                file_path = os.path.join(DATA_DIR, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        plan_data = json.load(f)
                        plan_date = normalize_date(plan_data.get('date'))
                        if plan_date == normalized_date:
                            plans.append(plan_data)
                except Exception as e:
                    app.logger.error(f"Error reading file {filename}: {str(e)}")
                    continue
        
        if not plans:
            return jsonify({'success': True, 'ships': []}), 200
            
        latest_plan = max(plans, key=lambda x: x.get('created_at', ''))
        return jsonify({'success': True, 'ships': latest_plan.get('ships', [])}), 200
        
    except Exception as e:
        app.logger.error(f"Error getting ship plans: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/save-qc-usage', methods=['POST'])
def save_qc_usage():
    try:
        data = request.get_json()
        date = data.get('date')
        usage = data.get('usage')
        
        if not date or usage is None:
            return jsonify({'success': False, 'message': 'Date and usage are required'}), 400
            
        if not is_valid_date(date):
            return jsonify({'success': False, 'message': 'Invalid date format or value'}), 400
            
        normalized_date = normalize_date(date)
        if not normalized_date:
            return jsonify({'success': False, 'message': 'Failed to normalize date'}), 400
            
        qc_usage_data[normalized_date] = usage
        
        # 파일에 저장
        save_qc_usage_data()
        
        return jsonify({'success': True, 'message': 'QC usage saved successfully'})
    except Exception as e:
        app.logger.error(f"Error saving QC usage: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/get-qc-usage/<date>')
def get_qc_usage_by_date(date):
    try:
        if not is_valid_date(date):
            return jsonify({'success': False, 'message': 'Invalid date format or value'}), 400
            
        normalized_date = normalize_date(date)
        if not normalized_date:
            return jsonify({'success': False, 'message': 'Failed to normalize date'}), 400
            
        usage = qc_usage_data.get(normalized_date, 0)
        return jsonify({'success': True, 'usage': usage})
    except Exception as e:
        app.logger.error(f"Error getting QC usage: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# Notes 저장을 위한 전역 변수
operation_notes = {}

@app.route('/save_operation_notes', methods=['POST'])
@requires_permission('edit')
def save_operation_notes():
    global operation_notes
    data = request.get_json()
    date = data.get('date', '')
    notes = data.get('notes', '')
    operation_notes[date] = notes
    return jsonify({'success': True})

@app.route('/get_operation_notes', methods=['GET'])
def get_operation_notes():
    date = request.args.get('date', '')
    notes = operation_notes.get(date, '')
    return jsonify({'notes': notes})

# QC 사용률을 저장할 전역 변수와 파일 경로
qc_usage_data = {}
QC_USAGE_FILE = os.path.join(DATA_DIR, 'qc_usage.json')

# QC 사용률 데이터 로드
def load_qc_usage_data():
    global qc_usage_data
    try:
        if os.path.exists(QC_USAGE_FILE):
            with open(QC_USAGE_FILE, 'r') as f:
                qc_usage_data = json.load(f)
    except Exception as e:
        app.logger.error(f"Error loading QC usage data: {str(e)}")

# QC 사용률 데이터 저장
def save_qc_usage_data():
    try:
        with open(QC_USAGE_FILE, 'w') as f:
            json.dump(qc_usage_data, f, indent=2)
    except Exception as e:
        app.logger.error(f"Error saving QC usage data: {str(e)}")

# 서버 시작 시 QC 사용률 데이터 로드
load_qc_usage_data()

@app.route('/choose_crane/<date>')
def choose_crane(date):
    try:
        if not is_valid_date(date):
            return redirect(url_for('calendar'))
            
        normalized_date = normalize_date(date)
        if not normalized_date:
            return redirect(url_for('calendar'))
            
        return render_template('choose_crane.html',
                             selected_date=normalized_date,
                             is_logged_in=is_logged_in(),
                             can_edit='edit' in get_user_permissions())
    except Exception as e:
        app.logger.error(f"Error in choose_crane route: {str(e)}")
        return redirect(url_for('calendar'))

if __name__ == '__main__':
    # 서버 시작 시 데이터 디렉토리 확인 및 생성
    os.makedirs(DATA_DIR, exist_ok=True)
    # 서버 시작 시 오래된 데이터 정리
    cleanup_old_data()
    app.run(debug=True)
