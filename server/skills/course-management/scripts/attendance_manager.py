#!/usr/bin/env python3
"""
上課記錄與請假管理功能
"""
import sqlite3
from datetime import datetime, timedelta
import json

class AttendanceManager:
    def __init__(self, db_path='course_management.db'):
        self.db_path = db_path
    
    def _get_connection(self):
        return sqlite3.connect(self.db_path)
    
    def _parse_date(self, date_str):
        """轉換日期格式"""
        if date_str in ['今天', 'today']:
            return datetime.now().date()
        elif date_str in ['明天', 'tomorrow']:
            return (datetime.now() + timedelta(days=1)).date()
        elif date_str in ['昨天', 'yesterday']:
            return (datetime.now() - timedelta(days=1)).date()
        elif '下週' in date_str:
            # 處理 "下週二" 這類
            weekday_map = {'一': 0, '二': 1, '三': 2, '四': 3, '五': 4, '六': 5, '日': 6}
            for name, day in weekday_map.items():
                if name in date_str:
                    today = datetime.now()
                    days_ahead = day - today.weekday()
                    if days_ahead <= 0:
                        days_ahead += 7
                    days_ahead += 7  # 下週
                    return (today + timedelta(days=days_ahead)).date()
        elif '上週' in date_str:
            weekday_map = {'一': 0, '二': 1, '三': 2, '四': 3, '五': 4, '六': 5, '日': 6}
            for name, day in weekday_map.items():
                if name in date_str:
                    today = datetime.now()
                    days_back = today.weekday() - day
                    if days_back <= 0:
                        days_back += 7
                    days_back += 7  # 上週
                    return (today - timedelta(days=days_back)).date()
        
        # 一般日期格式
        if '/' in date_str:
            date_str = date_str.replace('/', '-')
        
        # 處理只有月/日的情況（假設是今年）
        parts = date_str.split('-')
        if len(parts) == 2:
            year = datetime.now().year
            date_str = f"{year}-{date_str}"
        
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    
    def add_attendance(self, student_id, class_date, start_time, end_time, 
                      status='出席', visual=None, auditory=None, motor=None, notes=None):
        """
        新增上課記錄
        
        Args:
            student_id: 學員ID或姓名
            class_date: 上課日期
            start_time: 開始時間
            end_time: 結束時間
            status: 出席狀態 (出席/請假/缺席)
            visual: 視覺課程內容
            auditory: 聽覺課程內容
            motor: 運動課程內容
            notes: 其他備註
        """
        # 如果是姓名，轉換為ID
        if isinstance(student_id, str):
            from student_manager import StudentManager
            sm = StudentManager(self.db_path)
            students = sm.get_student_by_name(student_id)
            if not students:
                raise ValueError(f"找不到學員: {student_id}")
            student_id = students[0]['id']
        
        # 轉換日期
        if isinstance(class_date, str):
            class_date = self._parse_date(class_date)
        
        # 格式化時間
        if isinstance(start_time, str) and ':' not in start_time:
            start_time = f"{start_time[:2]}:{start_time[2:]}"
        if isinstance(end_time, str) and ':' not in end_time:
            end_time = f"{end_time[:2]}:{end_time[2:]}"
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO attendance_records 
            (student_id, class_date, start_time, end_time, attendance_status,
             visual_content, auditory_content, motor_content, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (student_id, class_date, start_time, end_time, status,
              visual, auditory, motor, notes))
        
        record_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return record_id
    
    def add_leave(self, student_id, leave_date, reason=None):
        """
        新增請假記錄
        
        Args:
            student_id: 學員ID或姓名
            leave_date: 請假日期（支援"下週二"、"2/7"等格式）
            reason: 請假原因
        """
        # 如果是姓名，轉換為ID
        if isinstance(student_id, str):
            from student_manager import StudentManager
            sm = StudentManager(self.db_path)
            students = sm.get_student_by_name(student_id)
            if not students:
                raise ValueError(f"找不到學員: {student_id}")
            student_id = students[0]['id']
        
        # 轉換日期
        if isinstance(leave_date, str):
            leave_date = self._parse_date(leave_date)
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO leave_records (student_id, leave_date, reason)
            VALUES (?, ?, ?)
        ''', (student_id, leave_date, reason))
        
        leave_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return leave_id
    
    def get_student_attendance(self, student_id, start_date=None, end_date=None):
        """
        查詢學員的上課記錄
        
        Args:
            student_id: 學員ID或姓名
            start_date: 開始日期（可選）
            end_date: 結束日期（可選）
        """
        # 如果是姓名，轉換為ID
        if isinstance(student_id, str):
            from student_manager import StudentManager
            sm = StudentManager(self.db_path)
            students = sm.get_student_by_name(student_id)
            if not students:
                return []
            student_id = students[0]['id']
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        query = '''
            SELECT ar.id, ar.class_date, ar.start_time, ar.end_time,
                   ar.attendance_status, ar.visual_content, ar.auditory_content,
                   ar.motor_content, ar.notes, st.name
            FROM attendance_records ar
            JOIN students st ON ar.student_id = st.id
            WHERE ar.student_id = ?
        '''
        params = [student_id]
        
        if start_date:
            query += ' AND ar.class_date >= ?'
            params.append(start_date)
        
        if end_date:
            query += ' AND ar.class_date <= ?'
            params.append(end_date)
        
        query += ' ORDER BY ar.class_date DESC, ar.start_time'
        
        cursor.execute(query, params)
        results = cursor.fetchall()
        conn.close()
        
        records = []
        for row in results:
            records.append({
                'id': row[0],
                'date': row[1],
                'start_time': row[2],
                'end_time': row[3],
                'status': row[4],
                'visual': row[5],
                'auditory': row[6],
                'motor': row[7],
                'notes': row[8],
                'student_name': row[9]
            })
        
        return records
    
    def get_student_leaves(self, student_id):
        """查詢學員的請假記錄"""
        # 如果是姓名，轉換為ID
        if isinstance(student_id, str):
            from student_manager import StudentManager
            sm = StudentManager(self.db_path)
            students = sm.get_student_by_name(student_id)
            if not students:
                return []
            student_id = students[0]['id']
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT lr.id, lr.leave_date, lr.reason, st.name
            FROM leave_records lr
            JOIN students st ON lr.student_id = st.id
            WHERE lr.student_id = ?
            ORDER BY lr.leave_date DESC
        ''', (student_id,))
        
        results = cursor.fetchall()
        conn.close()
        
        leaves = []
        for row in results:
            leaves.append({
                'id': row[0],
                'leave_date': row[1],
                'reason': row[2],
                'student_name': row[3]
            })
        
        return leaves
    
    def add_class_note(self, student_id, note_date, note_type, content):
        """
        新增課程備註（如"下週要多加強視覺練習"）
        
        Args:
            student_id: 學員ID或姓名
            note_date: 備註日期
            note_type: 備註類型 (視覺加強/聽覺加強/運動加強/一般備註)
            content: 備註內容
        """
        # 如果是姓名，轉換為ID
        if isinstance(student_id, str):
            from student_manager import StudentManager
            sm = StudentManager(self.db_path)
            students = sm.get_student_by_name(student_id)
            if not students:
                raise ValueError(f"找不到學員: {student_id}")
            student_id = students[0]['id']
        
        # 轉換日期
        if isinstance(note_date, str):
            note_date = self._parse_date(note_date)
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO class_notes (student_id, note_date, note_type, content)
            VALUES (?, ?, ?, ?)
        ''', (student_id, note_date, note_type, content))
        
        note_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return note_id


def main():
    """命令列介面"""
    import sys
    
    if len(sys.argv) < 2:
        print("用法:")
        print("  新增請假: python attendance_manager.py leave <學員名> <日期>")
        print("  查出席記錄: python attendance_manager.py attendance <學員名>")
        print("  新增備註: python attendance_manager.py note <學員名> <日期> <類型> <內容>")
        return
    
    manager = AttendanceManager()
    action = sys.argv[1]
    
    if action == 'leave':
        student = sys.argv[2]
        leave_date = sys.argv[3]
        
        leave_id = manager.add_leave(student, leave_date)
        print(f"✅ 請假記錄新增成功！ID: {leave_id}")
        
    elif action == 'attendance':
        student = sys.argv[2]
        records = manager.get_student_attendance(student)
        print(json.dumps(records, ensure_ascii=False, indent=2))
        
    elif action == 'note':
        student = sys.argv[2]
        note_date = sys.argv[3]
        note_type = sys.argv[4]
        content = sys.argv[5]
        
        note_id = manager.add_class_note(student, note_date, note_type, content)
        print(f"✅ 課程備註新增成功！ID: {note_id}")

if __name__ == '__main__':
    main()
