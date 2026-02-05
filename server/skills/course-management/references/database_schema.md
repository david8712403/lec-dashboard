# 資料庫結構說明

## 表格總覽

1. **students** - 學員基本資料
2. **schedules** - 固定課程安排
3. **attendance_records** - 上課記錄
4. **assessment_records** - 檢測記錄
5. **leave_records** - 請假記錄
6. **class_notes** - 課程備註

---

## 1. students (學員基本資料表)

| 欄位 | 類型 | 說明 | 限制 |
|------|------|------|------|
| id | INTEGER | 主鍵，自動遞增 | PRIMARY KEY |
| name | TEXT | 學員姓名 | NOT NULL |
| birthdate | DATE | 出生日期 | NOT NULL |
| type | TEXT | 學員類型 | a超前/b一般/c特殊 |
| status | TEXT | 學員狀態 | 檢測中/進行中/成案/離室 |
| created_at | TIMESTAMP | 建立時間 | 自動 |
| updated_at | TIMESTAMP | 更新時間 | 自動 |

---

## 2. schedules (課程安排表)

| 欄位 | 類型 | 說明 | 限制 |
|------|------|------|------|
| id | INTEGER | 主鍵 | PRIMARY KEY |
| student_id | INTEGER | 學員ID | FOREIGN KEY |
| weekday | INTEGER | 星期 | 0-6 (0=週一, 6=週日) |
| start_time | TEXT | 開始時間 | HH:MM 格式 |
| end_time | TEXT | 結束時間 | HH:MM 格式 |
| is_active | BOOLEAN | 是否啟用 | 預設 1 |
| created_at | TIMESTAMP | 建立時間 | 自動 |

**標準時段參考：**
- 09:00-10:40 (早上1)
- 10:40-12:20 (早上2)
- 12:00-13:00 (午休)
- 13:00-15:00 (下午1)
- 15:00-17:00 (下午2)
- 17:00-19:00 (晚上1)
- 19:00-21:00 (晚上2)

---

## 3. attendance_records (上課記錄表)

| 欄位 | 類型 | 說明 | 限制 |
|------|------|------|------|
| id | INTEGER | 主鍵 | PRIMARY KEY |
| student_id | INTEGER | 學員ID | FOREIGN KEY |
| class_date | DATE | 上課日期 | NOT NULL |
| start_time | TEXT | 開始時間 | NOT NULL |
| end_time | TEXT | 結束時間 | NOT NULL |
| attendance_status | TEXT | 出席狀態 | 出席/請假/缺席 |
| visual_content | TEXT | 視覺課程內容 | 可選 |
| auditory_content | TEXT | 聽覺課程內容 | 可選 |
| motor_content | TEXT | 運動課程內容 | 可選 |
| notes | TEXT | 其他備註 | 可選 |
| created_at | TIMESTAMP | 建立時間 | 自動 |

---

## 4. assessment_records (檢測記錄表)

| 欄位 | 類型 | 說明 | 限制 |
|------|------|------|------|
| id | INTEGER | 主鍵 | PRIMARY KEY |
| student_id | INTEGER | 學員ID | FOREIGN KEY |
| assessment_date | DATE | 檢測日期 | NOT NULL |
| assessment_type | TEXT | 檢測類型 | 初測/複測/追蹤 |
| visual_age_year | INTEGER | 視覺年齡-年 | |
| visual_age_month | INTEGER | 視覺年齡-月 | 0-12 |
| auditory_age_year | INTEGER | 聽覺年齡-年 | |
| auditory_age_month | INTEGER | 聽覺年齡-月 | 0-12 |
| motor_age_year | INTEGER | 運動年齡-年 | |
| motor_age_month | INTEGER | 運動年齡-月 | 0-12 |
| visual_ratio | INTEGER | 視覺課程比例 | 0-100% |
| auditory_ratio | INTEGER | 聽覺課程比例 | 0-100% |
| motor_ratio | INTEGER | 運動課程比例 | 0-100% |
| academic_ratio | INTEGER | 學科課程比例 | 0-100% |
| notes | TEXT | 檢測備註 | |
| created_at | TIMESTAMP | 建立時間 | 自動 |

**約束：** visual_ratio + auditory_ratio + motor_ratio + academic_ratio = 100

**年齡格式範例：** "2-6" 代表 2歲6個月
- visual_age_year = 2
- visual_age_month = 6

---

## 5. leave_records (請假記錄表)

| 欄位 | 類型 | 說明 | 限制 |
|------|------|------|------|
| id | INTEGER | 主鍵 | PRIMARY KEY |
| student_id | INTEGER | 學員ID | FOREIGN KEY |
| leave_date | DATE | 請假日期 | NOT NULL |
| reason | TEXT | 請假原因 | 可選 |
| created_at | TIMESTAMP | 建立時間 | 自動 |

---

## 6. class_notes (課程備註表)

| 欄位 | 類型 | 說明 | 限制 |
|------|------|------|------|
| id | INTEGER | 主鍵 | PRIMARY KEY |
| student_id | INTEGER | 學員ID | FOREIGN KEY |
| note_date | DATE | 備註日期 | NOT NULL |
| note_type | TEXT | 備註類型 | 視覺加強/聽覺加強/運動加強/一般備註 |
| content | TEXT | 備註內容 | NOT NULL |
| is_completed | BOOLEAN | 是否完成 | 預設 0 |
| created_at | TIMESTAMP | 建立時間 | 自動 |

---

## 索引

- `idx_students_name` - 學員姓名索引
- `idx_schedules_student` - 課程表學員索引
- `idx_attendance_student_date` - 上課記錄複合索引
- `idx_assessment_student` - 檢測記錄索引
- `idx_leave_student_date` - 請假記錄複合索引
