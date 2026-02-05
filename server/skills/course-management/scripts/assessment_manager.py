#!/usr/bin/env python3
"""
檢測記錄管理功能
"""
import sqlite3
from datetime import datetime
import json

class AssessmentManager:
    def __init__(self, db_path='course_management.db'):
        self.db_path = db_path
    
    def _get_connection(self):
        return sqlite3.connect(self.db_path)
    
    def _parse_age(self, age_str):
        """
        解析年齡格式
        
        Args:
            age_str: 年齡字串，格式如 "2-6" 或 "2-06" (代表2歲6個月)
        
        Returns:
            (年, 月) tuple
        """
        if '-' not in age_str:
            raise ValueError(f"年齡格式錯誤，應為 '年-月': {age_str}")
        
        parts = age_str.split('-')
        year = int(parts[0])
        month = int(parts[1])
        
        if month > 12:
            raise ValueError(f"月份不能超過12: {age_str}")
        
        return year, month
    
    def _parse_date(self, date_str):
        """轉換日期格式"""
        if '/' in date_str:
            date_str = date_str.replace('/', '-')
        
        # 處理只有月/日的情況
        parts = date_str.split('-')
        if len(parts) == 2:
            year = datetime.now().year
            date_str = f"{year}-{date_str}"
        
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    
    def add_assessment(self, student_id, assessment_date, assessment_type,
                      visual_age, auditory_age, motor_age,
                      visual_ratio=None, auditory_ratio=None, 
                      motor_ratio=None, academic_ratio=None, notes=None):
        """
        新增檢測記錄
        
        Args:
            student_id: 學員ID或姓名
            assessment_date: 檢測日期
            assessment_type: 檢測類型 (初測/複測/追蹤)
            visual_age: 視覺年齡 (格式: "2-6" 代表2歲6個月)
            auditory_age: 聽覺年齡
            motor_age: 運動年齡
            visual_ratio: 視覺課程比例 (0-100)
            auditory_ratio: 聽覺課程比例 (0-100)
            motor_ratio: 運動課程比例 (0-100)
            academic_ratio: 學科課程比例 (0-100)
            notes: 備註
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
        if isinstance(assessment_date, str):
            assessment_date = self._parse_date(assessment_date)
        
        # 解析年齡
        visual_year, visual_month = self._parse_age(visual_age)
        auditory_year, auditory_month = self._parse_age(auditory_age)
        motor_year, motor_month = self._parse_age(motor_age)
        
        # 驗證比例總和
        if all([visual_ratio is not None, auditory_ratio is not None, 
                motor_ratio is not None, academic_ratio is not None]):
            total = visual_ratio + auditory_ratio + motor_ratio + academic_ratio
            if total != 100:
                raise ValueError(f"課程比例總和必須為100%，目前為{total}%")
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO assessment_records
            (student_id, assessment_date, assessment_type,
             visual_age_year, visual_age_month,
             auditory_age_year, auditory_age_month,
             motor_age_year, motor_age_month,
             visual_ratio, auditory_ratio, motor_ratio, academic_ratio, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (student_id, assessment_date, assessment_type,
              visual_year, visual_month,
              auditory_year, auditory_month,
              motor_year, motor_month,
              visual_ratio, auditory_ratio, motor_ratio, academic_ratio, notes))
        
        assessment_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return assessment_id
    
    def get_student_assessments(self, student_id):
        """
        查詢學員的所有檢測記錄
        
        Args:
            student_id: 學員ID或姓名
        
        Returns:
            檢測記錄列表，按日期降序排列
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
        
        cursor.execute('''
            SELECT ar.id, ar.assessment_date, ar.assessment_type,
                   ar.visual_age_year, ar.visual_age_month,
                   ar.auditory_age_year, ar.auditory_age_month,
                   ar.motor_age_year, ar.motor_age_month,
                   ar.visual_ratio, ar.auditory_ratio, 
                   ar.motor_ratio, ar.academic_ratio,
                   ar.notes, st.name
            FROM assessment_records ar
            JOIN students st ON ar.student_id = st.id
            WHERE ar.student_id = ?
            ORDER BY ar.assessment_date DESC
        ''', (student_id,))
        
        results = cursor.fetchall()
        conn.close()
        
        assessments = []
        for row in results:
            assessments.append({
                'id': row[0],
                'date': row[1],
                'type': row[2],
                'visual_age': f"{row[3]}-{row[4]:02d}",
                'auditory_age': f"{row[5]}-{row[6]:02d}",
                'motor_age': f"{row[7]}-{row[8]:02d}",
                'ratios': {
                    'visual': row[9],
                    'auditory': row[10],
                    'motor': row[11],
                    'academic': row[12]
                },
                'notes': row[13],
                'student_name': row[14]
            })
        
        return assessments
    
    def get_latest_assessment(self, student_id):
        """取得學員最新的檢測記錄"""
        assessments = self.get_student_assessments(student_id)
        return assessments[0] if assessments else None
    
    def compare_assessments(self, student_id):
        """
        比較學員的檢測進展
        
        Returns:
            包含初測、最新複測及進展比較的字典
        """
        assessments = self.get_student_assessments(student_id)
        
        if len(assessments) < 2:
            return {
                'message': '需要至少兩次檢測記錄才能比較',
                'assessments': assessments
            }
        
        initial = assessments[-1]  # 最早的檢測
        latest = assessments[0]    # 最新的檢測
        
        # 計算進展（月份）
        def age_to_months(age_str):
            year, month = map(int, age_str.split('-'))
            return year * 12 + month
        
        visual_progress = age_to_months(latest['visual_age']) - age_to_months(initial['visual_age'])
        auditory_progress = age_to_months(latest['auditory_age']) - age_to_months(initial['auditory_age'])
        motor_progress = age_to_months(latest['motor_age']) - age_to_months(initial['motor_age'])
        
        return {
            'initial': initial,
            'latest': latest,
            'progress': {
                'visual_months': visual_progress,
                'auditory_months': auditory_progress,
                'motor_months': motor_progress
            }
        }


def main():
    """命令列介面"""
    import sys
    
    if len(sys.argv) < 2:
        print("用法:")
        print("  新增檢測: python assessment_manager.py add <學員名> <日期> <類型> <視覺年齡> <聽覺年齡> <運動年齡>")
        print("           [視覺比例] [聽覺比例] [運動比例] [學科比例]")
        print("  查檢測記錄: python assessment_manager.py get <學員名>")
        print("  比較進展: python assessment_manager.py compare <學員名>")
        print("\n範例:")
        print("  python assessment_manager.py add 個案A 2024/8/2 初測 2-4 3-1 4-1 40 30 0 30")
        return
    
    manager = AssessmentManager()
    action = sys.argv[1]
    
    if action == 'add':
        student = sys.argv[2]
        date = sys.argv[3]
        type_ = sys.argv[4]
        visual = sys.argv[5]
        auditory = sys.argv[6]
        motor = sys.argv[7]
        
        ratios = {}
        if len(sys.argv) > 8:
            ratios['visual_ratio'] = int(sys.argv[8])
        if len(sys.argv) > 9:
            ratios['auditory_ratio'] = int(sys.argv[9])
        if len(sys.argv) > 10:
            ratios['motor_ratio'] = int(sys.argv[10])
        if len(sys.argv) > 11:
            ratios['academic_ratio'] = int(sys.argv[11])
        
        assessment_id = manager.add_assessment(
            student, date, type_, visual, auditory, motor, **ratios
        )
        print(f"✅ 檢測記錄新增成功！ID: {assessment_id}")
        
    elif action == 'get':
        student = sys.argv[2]
        assessments = manager.get_student_assessments(student)
        print(json.dumps(assessments, ensure_ascii=False, indent=2))
        
    elif action == 'compare':
        student = sys.argv[2]
        comparison = manager.compare_assessments(student)
        print(json.dumps(comparison, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
