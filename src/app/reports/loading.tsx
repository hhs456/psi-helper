export default function Loading() {
  return (
    <div>
      <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border rounded-lg p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse" />
            <div className="space-y-2">
              <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-12 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
      <div className="border rounded-lg p-6">
        <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-2 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
