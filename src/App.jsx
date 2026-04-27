import NotebookList from "./components/NotebookList";
import CreateNotebook from "./components/CreateNotebook";

function App() {
  return (
    <div>
      <h1>Dream Notes</h1>

      <CreateNotebook />

      <NotebookList />
    </div>
  );
}

export default App;