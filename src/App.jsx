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
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm px-8 py-5 shrink-0">
        <h1 className="text-4xl font-bold text-blue-600">Dream Notes 🚀</h1>
        <p className="text-gray-500 mt-1">Organize your notebooks and notes beautifully</p>
      </header>

      {/* Main Layout */}
      <div className="flex-1 overflow-hidden px-6 py-8">
        <div className="max-w-7xl mx-auto h-full grid grid-cols-12 gap-6">

          {/* Left Sidebar */}
          <div className="col-span-4 min-w-0 flex flex-col gap-6 overflow-hidden">
            <div className="bg-white rounded-2xl shadow-md p-6 shrink-0">
              <CreateNotebook onCreated={() => setRefreshKey((k) => k + 1)} />
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6 flex-1 overflow-y-auto">
              <NotebookList
                key={refreshKey}
                selectedId={selectedNotebook?.id}
                onSelect={setSelectedNotebook}
                onRefresh={refresh}
              />
            </div>
          </div>

          {/* Right Main Section */}
          <div className="col-span-8 min-w-0 overflow-hidden">
            <div className="bg-white rounded-2xl shadow-md h-full flex flex-col overflow-hidden min-h-0">
              {selectedNotebook ? (
                <NotePanel notebook={selectedNotebook} />
              ) : (
                <div className="flex items-center justify-center flex-1">
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
    </div>
  );
}

export default App;
