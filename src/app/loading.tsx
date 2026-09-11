export default function Loading() {
  return (
    <div>
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
      <div className="mb-4">
        <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex border rounded-lg overflow-hidden">
            <div className="w-24 h-24 bg-gray-200 animate-pulse flex-shrink-0" />
            <div className="flex-1 p-4 space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3" />
              <div className="flex gap-1.5 mt-2">
                <div className="h-5 w-12 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-12 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
