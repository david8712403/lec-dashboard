---
name: course-management
description: Comprehensive course and student management system for educational institutions. Use this skill when managing student records, course scheduling, attendance tracking, assessment records, and leave management. Triggers include requests to add/update students, schedule classes, record attendance, track assessments (visual/auditory/motor development), handle leave requests, or generate student reports. Also use for queries about student progress, class schedules, or attendance history.
---

# Course Management System

課程管理系統技能，提供完整的學員管理、課程安排、上課記錄、檢測記錄等功能。

## 快速開始

### 初始化資料庫

首次使用前，必須先初始化資料庫：

```bash
python scripts/init_database.py
```

這會在當前目錄建立 `course_management.db` 檔案。

## 核心功能

### 1. 學員管理

使用 `scripts/student_manager.py` 管理學員基本資料。

**支援的學員類型：**
- a超前
- b一般
- c特殊

**學員狀態：**
- 檢測中
- 進行中
- 成案
- 離室

**常用操作：**
```python
from student_manager import StudentManager
sm = StudentManager('course_management.db')

# 新增學員
student_id = sm.add_student('個案A', '2020/04/03', 'b一般', '檢測中')

# 查詢學員
students = sm.get_student_by_name('個案A')

# 更新學員狀態
sm.update_student(student_id, status='進行中')

# 計算年齡
age_years, age_months = sm.calculate_age('2020/04/03')
```

### 2. 課程安排

使用 `scripts/schedule_manager.py` 管理固定課程時段。

**標準時段：**
- 09:00-10:40 (早上1)
- 10:40-12:20 (早上2)
- 12:00-13:00 (午休)
- 13:00-15:00 (下午1)
- 15:00-17:00 (下午2)
- 17:00-19:00 (晚上1)
- 19:00-21:00 (晚上2)

**常用操作：**
```python
from schedule_manager import ScheduleManager
sch = ScheduleManager('course_management.db')

# 新增固定課程（支援多種星期格式）
schedule_id = sch.add_schedule('個案A', '三', '13:00')  # 週三13:00
schedule_id = sch.add_schedule('個案A', '週二', '0900')  # 週二09:00

# 查詢學員課表
schedules = sch.get_student_schedules('個案A')

# 查詢週課表
monday_classes = sch.get_weekly_schedule('一')  # 週一的所有課程
all_classes = sch.get_weekly_schedule()  # 整週課表
```

### 3. 上課記錄與請假

使用 `scripts/attendance_manager.py` 管理出席記錄和請假。

**出席狀態：**
- 出席
- 請假
- 缺席

**課程內容記錄：**
- visual_content：視覺課程內容
- auditory_content：聽覺課程內容
- motor_content：運動課程內容

**日期格式支援：**
- 相對日期：'今天'、'明天'、'昨天'
- 週次：'下週二'、'上週三'
- 具體日期：'2/7'、'2024/2/7'

**常用操作：**
```python
from attendance_manager import AttendanceManager
am = AttendanceManager('course_management.db')

# 新增請假（支援靈活的日期格式）
leave_id = am.add_leave('個案A', '下週二')
leave_id = am.add_leave('個案A', '2/7')

# 記錄上課內容
record_id = am.add_attendance(
    student_id='個案A',
    class_date='今天',
    start_time='13:00',
    end_time='15:00',
    status='出席',
    visual='顏色辨識練習',
    auditory='節奏訓練',
    motor='平衡練習'
)

# 新增課程備註
note_id = am.add_class_note('個案A', '下週二', '視覺加強', '多加強視覺練習')

# 查詢出席記錄
records = am.get_student_attendance('個案A')
```

### 4. 檢測記錄

使用 `scripts/assessment_manager.py` 管理視聽動發展檢測記錄。

**檢測類型：**
- 初測
- 複測
- 追蹤

**年齡格式：** "2-6" 表示2歲6個月

**課程比例：** 視覺、聽覺、運動、學科四項總和必須為100%

**常用操作：**
```python
from assessment_manager import AssessmentManager
am = AssessmentManager('course_management.db')

# 新增檢測記錄
assessment_id = am.add_assessment(
    student_id='個案B',
    assessment_date='2024/8/2',
    assessment_type='初測',
    visual_age='2-4',      # 2歲4個月
    auditory_age='3-1',    # 3歲1個月
    motor_age='4-1',       # 4歲1個月
    visual_ratio=40,       # 視覺40%
    auditory_ratio=30,     # 聽覺30%
    motor_ratio=0,         # 運動0%
    academic_ratio=30      # 學科30%
)

# 查詢檢測記錄
assessments = am.get_student_assessments('個案B')

# 取得最新檢測
latest = am.get_latest_assessment('個案B')

# 比較進展
comparison = am.compare_assessments('個案B')
```

## 工作流程

### 典型的學員管理流程

1. **新增學員** → 使用 `student_manager.py`
2. **安排固定課程** → 使用 `schedule_manager.py`
3. **記錄第一次檢測** → 使用 `assessment_manager.py`
4. **每週記錄出席** → 使用 `attendance_manager.py`
5. **定期複測追蹤** → 使用 `assessment_manager.py`
6. **必要時更新狀態** → 使用 `student_manager.py`

## 參考資料

- **資料庫結構：** 詳見 `references/database_schema.md`
- **使用範例：** 詳見 `references/usage_examples.md`

## 重要提醒

1. **資料庫路徑：** 所有腳本預設使用 `course_management.db`，可透過參數指定其他路徑
2. **年齡格式：** 檢測記錄中的年齡一律使用 "年-月" 格式，如 "2-6"
3. **比例驗證：** 檢測記錄的課程比例總和必須等於100%
4. **靈活查詢：** 學員查詢支援模糊比對，可用部分姓名查詢
5. **日期靈活性：** 大部分日期輸入支援多種格式，包括相對日期
