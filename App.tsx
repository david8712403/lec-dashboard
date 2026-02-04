import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { AgentFab } from './components/AgentFab';
import { StudentList } from './pages/StudentList';
import { StudentDetail } from './pages/StudentDetail';
import { ScheduleView } from './pages/ScheduleView';
import { PaymentList } from './pages/PaymentList';
import { ViewState } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('students');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const handleStudentSelect = (id: string) => {
    setSelectedStudentId(id);
    setCurrentView('student-detail');
  };

  const handleViewChange = (view: ViewState) => {
    setCurrentView(view);
    if (view !== 'student-detail') {
      setSelectedStudentId(null);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'students':
        return <StudentList onSelectStudent={handleStudentSelect} />;
      case 'student-detail':
        return selectedStudentId ? (
          <StudentDetail 
            studentId={selectedStudentId} 
            onBack={() => setCurrentView('students')} 
          />
        ) : <StudentList onSelectStudent={handleStudentSelect} />;
      case 'schedule':
        return <ScheduleView />;
      case 'payments':
        return <PaymentList />;
      case 'assessments':
        return (
            <div className="flex items-center justify-center h-full text-slate-400">
                <p>請從「個案列表」進入個別學生的檢測紀錄詳細頁面。</p>
            </div>
        );
      default:
        return <StudentList onSelectStudent={handleStudentSelect} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar currentView={currentView} onChangeView={handleViewChange} />
      <main className="flex-1 overflow-x-hidden">
        {renderContent()}
      </main>
      <AgentFab />
    </div>
  );
};

export default App;
