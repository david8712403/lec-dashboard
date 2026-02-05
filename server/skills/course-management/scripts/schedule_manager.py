#!/usr/bin/env python3
"""
課程安排管理功能
"""
import sqlite3
from datetime import datetime, timedelta
import json

class ScheduleManager:
    def __init__(self, db_path='course_management.db'):
        self.db_path = db_path
        
        # 星期對照
        self.weekday_map = {
            '一': 0, '二': 1, '三': 2, '四': 3, '五': 4, '六': 5, '日': 6,
            '星期一': 0, '星期二': 1, '星期三': 2, '星期四': 3, 
            '星期五': 4, '星期六': 5, '星期日': 6,
            '週一': 0, '週二': 1, '週三': 2, '週四': 3, 
            '週五': 4, '週六': 5, '週日': 6,
        }
        
        # 標準時段定義
        self.time_slots = {
            '早上1': ('09:00', '10:40'),
            '早上2': ('10:40', '12:20'),
            '午休': ('12:00', '13:00'),
            '下午1': ('13:00', '15:00'),
            '下午2': ('15:00', '17:00'),
            '晚上1': ('17:00', '19:00'),
            '晚上2': ('19:00', '21:00'),
        }
    
    def _get_connection(self):
        return sqlite3.connect(self.db_path)
    
    def _parse_weekday(self, weekday_str):
        """轉換星期字串為數字"""
        return self.weekday_map.get(weekday_str, weekday_str)
    
    def add_schedule(self, student_id, weekday, start_time, end_time=None):
        """
        新增固定課程時段
        
        Args:
            student_id: 學員ID或姓名
            weekday: 星期 (可用: 一/二/三/四/五/六/日 或 0-6)
            start_time: 開始時間 (格式: HH:MM 或 HHMM)
            end_time: 結束時間 (可選，會自動推算)
        """
        # 如果 student_id 是字串，嘗試查詢學員
        if isinstance(student_id, str):
            from student_manager import StudentManager
            sm = StudentManager(self.db_path)
            students = sm.get_student_by_name(student_id)
            if not students:
                raise ValueError(f"找不到學員: {student_id}")
            student_id = students[0]['id']
        
        # 轉換星期
        if isinstance(weekday, str):
            weekday = self._parse_weekday(weekday)
        
        # 格式化時間
        if ':' not in start_time:
            # 將 1300 轉換為 13:00
            start_time = f"{start_time[:2]}:{start_time[2:]}"
        
        # 如果沒有提供結束時間，根據開始時間推算（預設1小時40分鐘）
        if end_time is None:
            hour, minute = map(int, start_time.split(':'))
            end_hour = hour + 1
            end_minute = minute + 40
            if end_minute >= 60:
                end_hour += 1
                end_minute -= 60
            end_time = f"{end_hour:02d}:{end_minute:02d}"
        elif ':' not in end_time:
            end_time = f"{end_time[:2]}:{end_time[2:]}"
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO schedules (student_id, weekday, start_time, end_time)
            VALUES (?, ?, ?, ?)
        ''', (student_id, weekday, start_time, end_time))
        
        schedule_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return schedule_id
    
    def get_student_schedules(self, student_id):
        """查詢學員的所有固定課程"""
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
            SELECT s.id, s.weekday, s.start_time, s.end_time, st.name
            FROM schedules s
            JOIN students st ON s.student_id = st.id
            WHERE s.student_id = ? AND s.is_active = 1
            ORDER BY s.weekday, s.start_time
        ''', (student_id,))
        
        results = cursor.fetchall()
        conn.close()
        
        weekday_names = ['週一', '週二', '週三', '週四', '週五', '週六', '週日']
        
        schedules = []
        for row in results:
            schedules.append({
                'id': row[0],
                'weekday': row[1],
                'weekday_name': weekday_names[row[1]],
                'start_time': row[2],
                'end_time': row[3],
                'student_name': row[4]
            })
        
        return schedules
    
    def get_weekly_schedule(self, weekday=None):
        """
        查詢週課表
        
        Args:
            weekday: 可選，指定星期
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        if weekday is not None:
            if isinstance(weekday, str):
                weekday = self._parse_weekday(weekday)
            
            cursor.execute('''
                SELECT s.id, s.weekday, s.start_time, s.end_time, 
                       st.name, st.type
                FROM schedules s
                JOIN students st ON s.student_id = st.id
                WHERE s.weekday = ? AND s.is_active = 1
                ORDER BY s.start_time
            ''', (weekday,))
        else:
            cursor.execute('''
                SELECT s.id, s.weekday, s.start_time, s.end_time, 
                       st.name, st.type
                FROM schedules s
                JOIN students st ON s.student_id = st.id
                WHERE s.is_active = 1
                ORDER BY s.weekday, s.start_time
            ''')
        
        results = cursor.fetchall()
        conn.close()
        
        weekday_names = ['週一', '週二', '週三', '週四', '週五', '週六', '週日']
        
        schedules = []
        for row in results:
            schedules.append({
                'id': row[0],
                'weekday': row[1],
                'weekday_name': weekday_names[row[1]],
                'start_time': row[2],
                'end_time': row[3],
                'student_name': row[4],
                'student_type': row[5]
            })
        
        return schedules
    
    def delete_schedule(self, schedule_id):
        """刪除（停用）固定課程"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE schedules
            SET is_active = 0
            WHERE id = ?
        ''', (schedule_id,))
        
        conn.commit()
        success = cursor.rowcount > 0
        conn.close()
        
        return success


def main():
    """命令列介面"""
    import sys
    
    if len(sys.argv) < 2:
        print("用法:")
        print("  新增課程: python schedule_manager.py add <學員名> <星期> <開始時間>")
        print("  查學員課表: python schedule_manager.py get <學員名>")
        print("  查週課表: python schedule_manager.py week [星期]")
        return
    
    manager = ScheduleManager()
    action = sys.argv[1]
    
    if action == 'add':
        student = sys.argv[2]
        weekday = sys.argv[3]
        start_time = sys.argv[4]
        
        schedule_id = manager.add_schedule(student, weekday, start_time)
        print(f"✅ 課程新增成功！ID: {schedule_id}")
        
    elif action == 'get':
        student = sys.argv[2]
        schedules = manager.get_student_schedules(student)
        print(json.dumps(schedules, ensure_ascii=False, indent=2))
        
    elif action == 'week':
        weekday = sys.argv[2] if len(sys.argv) > 2 else None
        schedules = manager.get_weekly_schedule(weekday)
        print(json.dumps(schedules, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
