import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssessmentHelperService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get current course type for a student from their latest assessment
   */
  async getCurrentCourseType(studentId: string): Promise<string | null> {
    const latest = await this.prisma.assessment.findFirst({
      where: { student_id: studentId },
      orderBy: { assessed_at: 'desc' },
    });

    const metrics = latest?.metrics as any;
    return metrics?.course_type || null;
  }

  /**
   * Calculate sessions_count from course_type
   * 半1 -> 4 sessions, 百2 -> 8 sessions, 百3 -> 12 sessions
   */
  getSessionsCount(courseType: string | null): number | null {
    if (!courseType) return null;

    const map: Record<string, number> = {
      '半1': 4,
      '百2': 8,
      '百3': 12,
    };

    return map[courseType] || null;
  }

  /**
   * Get sessions count for a student from their latest assessment's course type
   */
  async getSessionsCountForStudent(studentId: string): Promise<number | null> {
    const courseType = await this.getCurrentCourseType(studentId);
    return this.getSessionsCount(courseType);
  }
}
