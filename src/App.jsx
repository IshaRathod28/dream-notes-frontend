import { useState, useEffect, useRef } from "react";
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const isResizing = useRef(false);
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

  const startResize = (e) => {
    if (e.button !== 0) return;
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const onMove = (me) => {
      if (!isResizing.current) return;
      const newWidth = Math.min(520, Math.max(200, startWidth + (me.clientX - startX)));
      setSidebarWidth(newWidth);
    };
    const onUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const refresh = () => {
    setRefreshKey((k) => k + 1);
    setSelectedNotebook(null);
  };

  if (!isLoggedIn) return <AuthPage />;

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-black overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-gray-950 shadow-sm px-6 py-3 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-blue-600">Dream Notes 🚀</h1>
          <span className="text-gray-300 dark:text-gray-700 text-sm hidden sm:inline">|</span>
          <p className="text-gray-400 dark:text-gray-500 text-xs hidden sm:inline">Organize your notebooks and notes beautifully</p>
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
        <div className="max-w-7xl mx-auto h-full flex gap-4 items-stretch">

          {/* Left Sidebar */}
          {sidebarOpen && (
            <div className="shrink-0 flex flex-col gap-6 overflow-hidden" style={{ width: sidebarWidth }}>
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
          )}

          {/* Divider — drag to resize, click arrow to toggle */}
          <div
            className="flex items-center shrink-0 group cursor-col-resize"
            onMouseDown={sidebarOpen ? startResize : undefined}
          >
            <div className="relative flex items-center justify-center w-3 h-full">
              <div className="w-px h-full bg-gray-200 dark:bg-gray-800 group-hover:bg-blue-300 dark:group-hover:bg-blue-700 transition" />
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setSidebarOpen((v) => !v)}
                className="absolute h-10 w-5 flex items-center justify-center bg-gray-200 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition text-sm font-bold cursor-pointer"
                title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              >
                {sidebarOpen ? "‹" : "›"}
              </button>
            </div>
          </div>

          {/* Right Main Section */}
          <div className="flex-1 min-w-0 overflow-hidden">
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
