#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
SCRIPTS_DIR = BASE_DIR / 'scripts'

sys.path.insert(0, str(SCRIPTS_DIR))

from student_manager import StudentManager
from schedule_manager import ScheduleManager
from attendance_manager import AttendanceManager
from assessment_manager import AssessmentManager


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--db', dest='db_path', default=str(BASE_DIR / 'course_management.db'))
    args = parser.parse_args()

    try:
        raw = sys.stdin.read().strip()
        payload = json.loads(raw) if raw else {}
        action = payload.get('action')
        params = payload.get('args', {})

        if not action:
            raise ValueError('Missing action')

        result = run_action(action, params, args.db_path)
        print(json.dumps({'ok': True, 'result': result}, ensure_ascii=False))
    except Exception as exc:
        print(json.dumps({'ok': False, 'error': str(exc)}, ensure_ascii=False))
        sys.exit(1)


def run_action(action, params, db_path):
    if action == 'add_student':
        sm = StudentManager(db_path)
        student_id = sm.add_student(
            params['name'],
            params['birthdate'],
            params.get('type', 'b一般'),
            params.get('status', '檢測中'),
        )
        return {'student_id': student_id}

    if action == 'get_student':
        sm = StudentManager(db_path)
        return sm.get_student_by_name(params['name'])

    if action == 'list_students':
        sm = StudentManager(db_path)
        return sm.list_all_students(params.get('status'))

    if action == 'update_student':
        sm = StudentManager(db_path)
        student_id = params['student_id']
        updates = {k: v for k, v in params.items() if k != 'student_id'}
        success = sm.update_student(student_id, **updates)
        return {'updated': success}

    if action == 'add_schedule':
        sch = ScheduleManager(db_path)
        schedule_id = sch.add_schedule(
            params['student'],
            params['weekday'],
            params['start_time'],
            params.get('end_time'),
        )
        return {'schedule_id': schedule_id}

    if action == 'get_student_schedules':
        sch = ScheduleManager(db_path)
        return sch.get_student_schedules(params['student'])

    if action == 'get_weekly_schedule':
        sch = ScheduleManager(db_path)
        return sch.get_weekly_schedule(params.get('weekday'))

    if action == 'delete_schedule':
        sch = ScheduleManager(db_path)
        success = sch.delete_schedule(params['schedule_id'])
        return {'deleted': success}

    if action == 'add_attendance':
        am = AttendanceManager(db_path)
        record_id = am.add_attendance(
            student_id=params['student'],
            class_date=params['class_date'],
            start_time=params['start_time'],
            end_time=params['end_time'],
            status=params.get('status', '出席'),
            visual=params.get('visual'),
            auditory=params.get('auditory'),
            motor=params.get('motor'),
            notes=params.get('notes'),
        )
        return {'attendance_id': record_id}

    if action == 'add_leave':
        am = AttendanceManager(db_path)
        leave_id = am.add_leave(
            params['student'],
            params['leave_date'],
            params.get('reason'),
        )
        return {'leave_id': leave_id}

    if action == 'get_attendance':
        am = AttendanceManager(db_path)
        return am.get_student_attendance(
            params['student'],
            params.get('start_date'),
            params.get('end_date'),
        )

    if action == 'get_leaves':
        am = AttendanceManager(db_path)
        return am.get_student_leaves(params['student'])

    if action == 'add_class_note':
        am = AttendanceManager(db_path)
        note_id = am.add_class_note(
            params['student'],
            params['note_date'],
            params['note_type'],
            params['content'],
        )
        return {'note_id': note_id}

    if action == 'add_assessment':
        asm = AssessmentManager(db_path)
        assessment_id = asm.add_assessment(
            student_id=params['student'],
            assessment_date=params['assessment_date'],
            assessment_type=params['assessment_type'],
            visual_age=params['visual_age'],
            auditory_age=params['auditory_age'],
            motor_age=params['motor_age'],
            visual_ratio=params.get('visual_ratio'),
            auditory_ratio=params.get('auditory_ratio'),
            motor_ratio=params.get('motor_ratio'),
            academic_ratio=params.get('academic_ratio'),
            notes=params.get('notes'),
        )
        return {'assessment_id': assessment_id}

    if action == 'get_assessments':
        asm = AssessmentManager(db_path)
        return asm.get_student_assessments(params['student'])

    if action == 'get_latest_assessment':
        asm = AssessmentManager(db_path)
        return asm.get_latest_assessment(params['student'])

    if action == 'compare_assessments':
        asm = AssessmentManager(db_path)
        return asm.compare_assessments(params['student'])

    raise ValueError(f'Unknown action: {action}')


if __name__ == '__main__':
    main()
