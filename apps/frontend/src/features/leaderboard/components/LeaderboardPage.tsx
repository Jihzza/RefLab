export default function LeaderboardPage() {
  const users = [
    { rank: 1, name: 'Alex', score: 2400 },
    { rank: 2, name: 'Sam', score: 2150 },
    { rank: 3, name: 'Jordan', score: 1900 },
    { rank: 4, name: 'Casey', score: 1850 },
    { rank: 5, name: 'Taylor', score: 1700 },
  ];

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold text-(--text-primary) mb-6">Clasificación</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {users.map((user, index) => (
          <div key={user.rank} className="flex items-center p-4 border-b border-(--border-subtle) last:border-0">
            <span className={`w-8 text-center font-bold ${index < 3 ? 'text-yellow-500' : 'text-gray-400'}`}>
              {user.rank}
            </span>
            <div className="flex-1 ml-4">
              <p className="font-medium text-(--text-primary)">{user.name}</p>
            </div>
            <span className="font-bold text-(--info)">{user.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
