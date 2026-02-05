#!/usr/bin/env python3
"""
學員管理功能
"""
import sqlite3
from datetime import datetime, date
import json

class StudentManager:
    def __init__(self, db_path='course_management.db'):
        self.db_path = db_path
    
    def _get_connection(self):
        return sqlite3.connect(self.db_path)
    
    def add_student(self, name, birthdate, student_type='b一般', status='檢測中'):
        """
        新增學員
        
        Args:
            name: 學員姓名
            birthdate: 生日 (格式: YYYY/MM/DD 或 YYYY-MM-DD)
            student_type: 類型 (a超前, b一般, c特殊)
            status: 狀態 (檢測中, 進行中, 成案, 離室)
        
        Returns:
            新建學員的ID
        """
        # 轉換日期格式
        if '/' in birthdate:
            birthdate = birthdate.replace('/', '-')
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO students (name, birthdate, type, status)
            VALUES (?, ?, ?, ?)
        ''', (name, birthdate, student_type, status))
        
        student_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return student_id
    
    def get_student_by_name(self, name):
        """根據姓名查詢學員（支援模糊查詢）"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, name, birthdate, type, status, created_at
            FROM students
            WHERE name LIKE ?
            ORDER BY created_at DESC
        ''', (f'%{name}%',))
        
        results = cursor.fetchall()
        conn.close()
        
        students = []
        for row in results:
            students.append({
                'id': row[0],
                'name': row[1],
                'birthdate': row[2],
                'type': row[3],
                'status': row[4],
                'created_at': row[5]
            })
        
        return students
    
    def get_student_by_id(self, student_id):
        """根據ID查詢學員"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, name, birthdate, type, status, created_at
            FROM students
            WHERE id = ?
        ''', (student_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                'id': row[0],
                'name': row[1],
                'birthdate': row[2],
                'type': row[3],
                'status': row[4],
                'created_at': row[5]
            }
        return None
    
    def update_student(self, student_id, **kwargs):
        """
        更新學員資料
        
        可更新欄位: name, birthdate, type, status
        """
        allowed_fields = ['name', 'birthdate', 'type', 'status']
        updates = []
        values = []
        
        for field, value in kwargs.items():
            if field in allowed_fields:
                updates.append(f'{field} = ?')
                if field == 'birthdate' and '/' in value:
                    value = value.replace('/', '-')
                values.append(value)
        
        if not updates:
            return False
        
        values.append(datetime.now())
        values.append(student_id)
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        query = f'''
            UPDATE students
            SET {', '.join(updates)}, updated_at = ?
            WHERE id = ?
        '''
        
        cursor.execute(query, values)
        conn.commit()
        success = cursor.rowcount > 0
        conn.close()
        
        return success
    
    def list_all_students(self, status=None):
        """
        列出所有學員
        
        Args:
            status: 可選，篩選特定狀態的學員
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        if status:
            cursor.execute('''
                SELECT id, name, birthdate, type, status
                FROM students
                WHERE status = ?
                ORDER BY name
            ''', (status,))
        else:
            cursor.execute('''
                SELECT id, name, birthdate, type, status
                FROM students
                ORDER BY name
            ''')
        
        results = cursor.fetchall()
        conn.close()
        
        students = []
        for row in results:
            students.append({
                'id': row[0],
                'name': row[1],
                'birthdate': row[2],
                'type': row[3],
                'status': row[4]
            })
        
        return students
    
    def calculate_age(self, birthdate_str, reference_date=None):
        """
        計算年齡
        
        Args:
            birthdate_str: 生日字串
            reference_date: 參考日期，預設為今天
        """
        if '/' in birthdate_str:
            birthdate_str = birthdate_str.replace('/', '-')
        
        birthdate = datetime.strptime(birthdate_str, '%Y-%m-%d').date()
        
        if reference_date is None:
            reference_date = date.today()
        elif isinstance(reference_date, str):
            if '/' in reference_date:
                reference_date = reference_date.replace('/', '-')
            reference_date = datetime.strptime(reference_date, '%Y-%m-%d').date()
        
        years = reference_date.year - birthdate.year
        months = reference_date.month - birthdate.month
        
        if months < 0:
            years -= 1
            months += 12
        
        return years, months


def main():
    """命令列介面"""
    import sys
    
    if len(sys.argv) < 2:
        print("用法:")
        print("  新增學員: python student_manager.py add <姓名> <生日YYYY/MM/DD> [類型] [狀態]")
        print("  查詢學員: python student_manager.py get <姓名>")
        print("  列出所有: python student_manager.py list [狀態]")
        return
    
    manager = StudentManager()
    action = sys.argv[1]
    
    if action == 'add':
        name = sys.argv[2]
        birthdate = sys.argv[3]
        student_type = sys.argv[4] if len(sys.argv) > 4 else 'b一般'
        status = sys.argv[5] if len(sys.argv) > 5 else '檢測中'
        
        student_id = manager.add_student(name, birthdate, student_type, status)
        print(f"✅ 學員新增成功！ID: {student_id}")
        
    elif action == 'get':
        name = sys.argv[2]
        students = manager.get_student_by_name(name)
        print(json.dumps(students, ensure_ascii=False, indent=2))
        
    elif action == 'list':
        status = sys.argv[2] if len(sys.argv) > 2 else None
        students = manager.list_all_students(status)
        print(json.dumps(students, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
