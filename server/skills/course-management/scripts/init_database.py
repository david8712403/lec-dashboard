#!/usr/bin/env python3
"""
初始化課程管理系統資料庫
"""
import sqlite3
from datetime import datetime
import os

def init_database(db_path='course_management.db'):
    """初始化資料庫，建立所有必要的表格"""
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. 個案（學員）基本資料表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            birthdate DATE NOT NULL,
            type TEXT CHECK(type IN ('a超前', 'b一般', 'c特殊')),
            status TEXT CHECK(status IN ('檢測中', '進行中', '成案', '離室')) DEFAULT '檢測中',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 2. 課程安排表（固定時段）
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            weekday INTEGER CHECK(weekday >= 0 AND weekday <= 6),
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id)
        )
    ''')
    
    # 3. 上課記錄表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attendance_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            class_date DATE NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            attendance_status TEXT CHECK(attendance_status IN ('出席', '請假', '缺席')) DEFAULT '出席',
            visual_content TEXT,
            auditory_content TEXT,
            motor_content TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id)
        )
    ''')
    
    # 4. 檢測記錄表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS assessment_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            assessment_date DATE NOT NULL,
            assessment_type TEXT CHECK(assessment_type IN ('初測', '複測', '追蹤')) DEFAULT '初測',
            visual_age_year INTEGER,
            visual_age_month INTEGER,
            auditory_age_year INTEGER,
            auditory_age_month INTEGER,
            motor_age_year INTEGER,
            motor_age_month INTEGER,
            visual_ratio INTEGER CHECK(visual_ratio >= 0 AND visual_ratio <= 100),
            auditory_ratio INTEGER CHECK(auditory_ratio >= 0 AND auditory_ratio <= 100),
            motor_ratio INTEGER CHECK(motor_ratio >= 0 AND motor_ratio <= 100),
            academic_ratio INTEGER CHECK(academic_ratio >= 0 AND academic_ratio <= 100),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id),
            CHECK ((visual_ratio + auditory_ratio + motor_ratio + academic_ratio) = 100 OR 
                   (visual_ratio IS NULL AND auditory_ratio IS NULL AND motor_ratio IS NULL AND academic_ratio IS NULL))
        )
    ''')
    
    # 5. 請假記錄表（用於追蹤特定日期的請假）
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS leave_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            leave_date DATE NOT NULL,
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id)
        )
    ''')
    
    # 6. 課程備註表（用於記錄特定日期的課程調整，如"下週要多加強視覺練習"）
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS class_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            note_date DATE NOT NULL,
            note_type TEXT CHECK(note_type IN ('視覺加強', '聽覺加強', '運動加強', '一般備註')),
            content TEXT NOT NULL,
            is_completed BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id)
        )
    ''')
    
    # 建立索引以提升查詢效能
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_students_name ON students(name)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_schedules_student ON schedules(student_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance_records(student_id, class_date)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_assessment_student ON assessment_records(student_id, assessment_date)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_leave_student_date ON leave_records(student_id, leave_date)')
    
    conn.commit()
    conn.close()
    
    print(f"✅ 資料庫初始化完成: {db_path}")
    return db_path

if __name__ == '__main__':
    init_database()
