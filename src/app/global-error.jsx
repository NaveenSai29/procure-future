"use client";

export default function GlobalError({ error, reset }) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center p-8">
            <h1 className="text-4xl font-bold text-gray-900">Something went wrong</h1>
            <p className="text-gray-500 mt-2">Please try again</p>
            <button
              onClick={() => reset()}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}