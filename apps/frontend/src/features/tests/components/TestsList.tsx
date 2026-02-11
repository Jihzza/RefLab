import { useNavigate } from 'react-router-dom';

export default function TestsList() {
  const navigate = useNavigate();
  const tests = [
    { id: 'react-basics', title: 'React Basics', questions: 10, time: '15m' },
    { id: 'js-advanced', title: 'JavaScript Advanced', questions: 20, time: '30m' },
    { id: 'css-flexbox', title: 'CSS Flexbox', questions: 15, time: '20m' },
  ];

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold text-(--text-primary) mb-6">Tests Disponibles</h1>
      <div className="grid gap-4">
        {tests.map((test) => (
          <div key={test.id} className="bg-(--bg-surface) p-5 rounded-(--radius-card) shadow-sm border border-(--border-subtle)">
            <h3 className="font-bold text-gray-900 mb-1">{test.title}</h3>
            <p className="text-sm text-(--text-muted) mb-4">{test.questions} preguntas • {test.time}</p>
            <button 
              onClick={() => navigate(`/app/learn/test/${test.id}`)}
              className="w-full py-2 bg-(--brand-yellow) text-(--bg-primary) rounded-(--radius-button) font-medium hover:bg-(--brand-yellow-soft) transition-colors"
            >
              Comenzar Test
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
