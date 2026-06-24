export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">About SafeRoute</h1>
      
      <div className="space-y-8">
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">What is SafeRoute?</h2>
          <p className="text-gray-600">
            SafeRoute is a route optimization tool designed for university security shuttles. 
            Instead of dropping students off in the order they boarded (FIFO), SafeRoute calculates 
            a more efficient route that minimizes total travel distance and time.
          </p>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">How It Works</h2>
          <div className="space-y-4 text-gray-600">
            <p>
              SafeRoute uses a <strong>nearest-neighbor heuristic</strong> to optimize routes:
            </p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Start at the origin (university)</li>
              <li>Find the unvisited stop closest to the current position</li>
              <li>Travel to that stop and mark it as visited</li>
              <li>Repeat until all stops have been visited</li>
            </ol>
            <p className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
              <strong>Note:</strong> This is a heuristic algorithm that finds good solutions quickly, 
              but it does not guarantee the absolute optimal route. In practice, it typically 
              reduces distance by 15-35% compared to FIFO ordering.
            </p>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Privacy Notice</h2>
          <div className="space-y-4 text-gray-600">
            <p><strong>SafeRoute does not store your trip data:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Passenger addresses are held in browser memory only</li>
              <li>Addresses are cleared when you close the browser tab</li>
              <li>No addresses are saved to your device or our servers</li>
            </ul>
            <p className="mt-4"><strong>However, addresses ARE sent to third-party services:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Mapbox Geocoding API (to convert addresses to coordinates)</li>
              <li>Mapbox Directions API (to calculate driving routes)</li>
            </ul>
            <p className="text-sm text-gray-500 mt-4">
              These services have their own privacy policies. Do not enter addresses for real 
              students in a production context.
            </p>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Disclaimer</h2>
          <p className="text-gray-600">
            This is a student portfolio project and proof-of-concept only. SafeRoute is not 
            affiliated with Monash University or its security services. Do not use this 
            application for actual student transport operations.
          </p>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Tech Stack</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700">Frontend</p>
              <p className="text-gray-500">Next.js, TypeScript, Tailwind CSS</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Maps</p>
              <p className="text-gray-500">Mapbox GL JS</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Algorithms</p>
              <p className="text-gray-500">Nearest-neighbor heuristic</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Deployment</p>
              <p className="text-gray-500">Vercel</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
