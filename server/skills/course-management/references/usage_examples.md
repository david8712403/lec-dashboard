# 使用範例

本文件提供常見操作的完整範例。

## 學員管理範例

### 範例 1: 建立新學員
**使用者請求：** "建立一個個案A，生日是2020/04/03"

**處理步驟：**
1. 使用 `student_manager.py` 的 `add_student()` 函數
2. 參數：name='個案A', birthdate='2020/04/03', type='b一般', status='檢測中'

**執行方式：**
```python
from student_manager import StudentManager
sm = StudentManager('course_management.db')
student_id = sm.add_student('個案A', '2020/04/03')
```

---

### 範例 2: 查詢學員資料
**使用者請求：** "查詢個案A的資料"

**執行方式：**
```python
from student_manager import StudentManager
sm = StudentManager('course_management.db')
students = sm.get_student_by_name('個案A')
```

---

## 課程安排範例

### 範例 3: 設定固定課程
**使用者請求：** "個案A固定週三13:00來上課"

**處理步驟：**
1. 使用 `schedule_manager.py` 的 `add_schedule()` 函數
2. 星期三 = 2 (0是週一)
3. 時間 13:00，預設結束時間為 14:40

**執行方式：**
```python
from schedule_manager import ScheduleManager
sch = ScheduleManager('course_management.db')
schedule_id = sch.add_schedule('個案A', '三', '13:00')
```

---

### 範例 4: 查詢週課表
**使用者請求：** "查詢週三的課表"

**執行方式：**
```python
from schedule_manager import ScheduleManager
sch = ScheduleManager('course_management.db')
schedules = sch.get_weekly_schedule('三')
```

---

## 請假與備註範例

### 範例 5: 新增請假記錄
**使用者請求：** "個案A下週二請假"

**處理步驟：**
1. 使用 `attendance_manager.py` 的 `add_leave()` 函數
2. 自動計算下週二的日期

**執行方式：**
```python
from attendance_manager import AttendanceManager
am = AttendanceManager('course_management.db')
leave_id = am.add_leave('個案A', '下週二')
```

---

### 範例 6: 特定日期請假
**使用者請求：** "個案A 2/7請假"

**執行方式：**
```python
from attendance_manager import AttendanceManager
am = AttendanceManager('course_management.db')
leave_id = am.add_leave('個案A', '2/7')
```

---

### 範例 7: 新增課程備註
**使用者請求：** "個案A下週要多加強視覺練習"

**處理步驟：**
1. 使用 `attendance_manager.py` 的 `add_class_note()` 函數
2. 計算下週的日期範圍

**執行方式：**
```python
from attendance_manager import AttendanceManager
from datetime import datetime, timedelta

am = AttendanceManager('course_management.db')
next_week = datetime.now() + timedelta(days=7)
note_id = am.add_class_note('個案A', next_week, '視覺加強', '多加強視覺練習')
```

---

## 檢測記錄範例

### 範例 8: 第一次檢測
**使用者請求：** "個案B 上週第一次檢測，視聽動個別是 2-4、3-1、4-1，課程比例分成視聽動+學科 40/30/0/30"

**處理步驟：**
1. 使用 `assessment_manager.py` 的 `add_assessment()` 函數
2. 年齡格式："2-4" 表示 2歲4個月
3. 比例總和必須為 100%

**執行方式：**
```python
from assessment_manager import AssessmentManager
from datetime import datetime, timedelta

am = AssessmentManager('course_management.db')
last_week = datetime.now() - timedelta(days=7)

assessment_id = am.add_assessment(
    student_id='個案B',
    assessment_date=last_week,
    assessment_type='初測',
    visual_age='2-4',
    auditory_age='3-1',
    motor_age='4-1',
    visual_ratio=40,
    auditory_ratio=30,
    motor_ratio=0,
    academic_ratio=30
)
```

---

### 範例 9: 複測記錄
**使用者請求：** "個案B 2024/8/2的複測結果，視聽動個別是 2-4、3-1、4-1，課程比例分成視聽動+學科 40/30/0/30"

**執行方式：**
```python
from assessment_manager import AssessmentManager

am = AssessmentManager('course_management.db')

assessment_id = am.add_assessment(
    student_id='個案B',
    assessment_date='2024/8/2',
    assessment_type='複測',
    visual_age='2-4',
    auditory_age='3-1',
    motor_age='4-1',
    visual_ratio=40,
    auditory_ratio=30,
    motor_ratio=0,
    academic_ratio=30
)
```

---

### 範例 10: 查詢檢測記錄
**使用者請求：** "查詢個案B的檢測記錄"

**執行方式：**
```python
from assessment_manager import AssessmentManager

am = AssessmentManager('course_management.db')
assessments = am.get_student_assessments('個案B')
```

---

### 範例 11: 比較檢測進展
**使用者請求：** "比較個案B的進步情況"

**執行方式：**
```python
from assessment_manager import AssessmentManager

am = AssessmentManager('course_management.db')
comparison = am.compare_assessments('個案B')
```

---

## 上課記錄範例

### 範例 12: 記錄出席與課程內容
**使用者請求：** "記錄個案A今天13:00-15:00的課，視覺練習了顏色辨識，聽覺練習了節奏"

**執行方式：**
```python
from attendance_manager import AttendanceManager

am = AttendanceManager('course_management.db')

record_id = am.add_attendance(
    student_id='個案A',
    class_date='今天',
    start_time='13:00',
    end_time='15:00',
    status='出席',
    visual='顏色辨識練習',
    auditory='節奏練習',
    motor=None
)
```

---

## 綜合查詢範例

### 範例 13: 查詢學員完整資訊
**使用者請求：** "顯示個案A的完整資料，包括課表、最近出席記錄和檢測結果"

**執行方式：**
```python
from student_manager import StudentManager
from schedule_manager import ScheduleManager
from attendance_manager import AttendanceManager
from assessment_manager import AssessmentManager

# 基本資料
sm = StudentManager('course_management.db')
student = sm.get_student_by_name('個案A')[0]

# 課表
sch = ScheduleManager('course_management.db')
schedules = sch.get_student_schedules(student['id'])

# 出席記錄（最近10筆）
am = AttendanceManager('course_management.db')
attendance = am.get_student_attendance(student['id'])[:10]

# 檢測記錄
asmt = AssessmentManager('course_management.db')
assessments = asmt.get_student_assessments(student['id'])

# 整合結果
result = {
    'student': student,
    'schedules': schedules,
    'recent_attendance': attendance,
    'assessments': assessments
}
```
