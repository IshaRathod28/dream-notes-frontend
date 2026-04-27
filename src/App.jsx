import { useState } from "react";
import NotebookList from "./components/NotebookList";
import CreateNotebook from "./components/CreateNotebook";
import NotePanel from "./components/NotePanel";

function App() {
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => {
    setRefreshKey((k) => k + 1);
    setSelectedNotebook(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm px-8 py-5">
        <h1 className="text-4xl font-bold text-blue-600">Dream Notes 🚀</h1>
        <p className="text-gray-500 mt-1">Organize your notebooks and notes beautifully</p>
      </header>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-6">

        {/* Left Sidebar */}
        <div className="col-span-4">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <CreateNotebook onCreated={() => setRefreshKey((k) => k + 1)} />
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 mt-6">
            <NotebookList
              key={refreshKey}
              selectedId={selectedNotebook?.id}
              onSelect={setSelectedNotebook}
              onRefresh={refresh}
            />
          </div>
        </div>

        {/* Right Main Section */}
        <div className="col-span-8">
          <div className="bg-white rounded-2xl shadow-md p-8 min-h-[500px]">
            {selectedNotebook ? (
              <NotePanel notebook={selectedNotebook} />
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                  <p className="text-5xl mb-4">📒</p>
                  <h2 className="text-2xl font-semibold text-gray-700">Select a Notebook</h2>
                  <p className="text-gray-400 mt-2 text-sm">
                    Choose a notebook from the left to manage your notes
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
