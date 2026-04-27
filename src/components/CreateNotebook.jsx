import { useState } from "react";
import { createNotebook } from "../services/notebookService";

function CreateNotebook({ onCreated }) {
  const [name, setName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createNotebook(name.trim());
      setName("");
      onCreated?.();
    } catch (error) {
      console.error("Error creating notebook:", error);
    }
  };

  return (
    <div>
      <h2 className="text-base font-bold text-gray-800 mb-4 uppercase tracking-wide">
        + New Notebook
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Enter notebook name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors duration-150 shadow-sm"
        >
          Create Notebook
        </button>
      </form>
    </div>
  );
}

export default CreateNotebook;
