import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import NotebookList from "./components/NotebookList";
import CreateNotebook from "./components/CreateNotebook";
import NotePanel from "./components/NotePanel";

function AppInner() {
  const { isLoggedIn, user, logout, updateTheme } = useAuth();
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [notePanelResetSignal, setNotePanelResetSignal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dark, setDark] = useState(() => {
    const savedUser = JSON.parse(localStorage.getItem("user") || "null");
    return (savedUser?.theme ?? localStorage.getItem("theme") ?? "dark") === "dark";
  });

  useEffect(() => {
    if (user?.theme) setDark(user.theme === "dark");
  }, [user?.theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const toggleTheme = async () => {
    const newDark = !dark;
    setDark(newDark);
    if (isLoggedIn) await updateTheme(newDark ? "dark" : "light");
  };

  const handleSelectNotebook = (notebook) => {
    if (selectedNotebook?.id === notebook.id) {
      setNotePanelResetSignal((s) => s + 1);
    } else {
      setSelectedNotebook(notebook);
    }
  };

  const refresh = () => {
    setRefreshKey((k) => k + 1);
    setSelectedNotebook(null);
  };

  if (!isLoggedIn) return <AuthPage />;

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-black overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-gray-950 shadow-sm px-8 py-5 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-blue-600">Dream Notes 🚀</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Organize your notebooks and notes beautifully</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</span>
          <button
            onClick={logout}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl hover:border-red-300 dark:hover:border-red-700 transition"
          >
            Logout
          </button>
          <button
            onClick={toggleTheme}
            className="text-2xl p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            title="Toggle theme"
          >
            {dark ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 overflow-hidden px-6 py-8">
        <div className="max-w-7xl mx-auto h-full grid grid-cols-12 gap-6">

          {/* Left Sidebar */}
          <div className="col-span-4 min-w-0 flex flex-col gap-6 overflow-hidden">
            <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-md p-6 shrink-0">
              <CreateNotebook onCreated={() => setRefreshKey((k) => k + 1)} />
            </div>

            <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-md p-6 flex-1 overflow-y-auto">
              <NotebookList
                key={refreshKey}
                selectedId={selectedNotebook?.id}
                onSelect={handleSelectNotebook}
                onRefresh={refresh}
              />
            </div>
          </div>

          {/* Right Main Section */}
          <div className="col-span-8 min-w-0 overflow-hidden">
            <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-md h-full flex flex-col overflow-hidden min-h-0">
              {selectedNotebook ? (
                <NotePanel notebook={selectedNotebook} resetSignal={notePanelResetSignal} />
              ) : (
                <div className="flex items-center justify-center flex-1">
                  <div className="text-center">
                    <p className="text-5xl mb-4">📒</p>
                    <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">Select a Notebook</h2>
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

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

export default App;
