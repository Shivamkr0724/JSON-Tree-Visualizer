import { useState } from 'react'
import '@xyflow/react/dist/style.css';
import { ReactFlow} from '@xyflow/react';




function buildTreeFromJson(parsedData) {
  let idCounter = 0;
  const makeId = (prefix = "n") => `${prefix}${++idCounter}`;

  const typeColors = {
    object: "#06b6d4", 
    array: "#22c55e", 
    string: "#f59e0b", 
    number: "#f97316", 
    boolean: "#3b82f6",
    null: "#a1a1aa",   
  };

  function buildNodeForObject(obj) {
    if (obj === null) return [];
    if (Array.isArray(obj)) {
      return obj.map((val, idx) => buildKeyEntry(String(idx), val));
    } else {
      return Object.entries(obj).map(([k, v]) => buildKeyEntry(k, v));
    }
  }

  function buildKeyEntry(keyLabel, value) {
    const keyId = makeId("k"); 
    const node = {
      id: keyId,
      label: keyLabel,
      type: Array.isArray(value) ? "array" : value === null ? "null" : typeof value,
      children: [],      
      isKey: true,
    };

    if (value === null || typeof value !== "object") {
      const valId = makeId("v");
      const valNode = {
        id: valId,
        label: String(value),
        type: value === null ? "null" : typeof value,
        children: [],
        isValue: true,
      };
      node.children.push(valNode);
    } else {
      node.children = buildNodeForObject(value);
    }

    return node;
  }

  const rootId = makeId("r");
  const root = {
    id: rootId,
    label: "root",
    type: "object",
    children: buildNodeForObject(parsedData),
    isRoot: true,
  };

  const levelGap = 110;    
  const siblingGap = 140;  

  let nextLeafX = 0;

  const logicalNodes = [];

  function assignPositions(node, depth = 0) {
    logicalNodes.push(node);
    node.depth = depth;

    if (!node.children || node.children.length === 0) {
      node.x = nextLeafX * siblingGap;
      node.y = depth * levelGap;
      nextLeafX++;
    } else {
      const first = node.children[0];
      const last = node.children[node.children.length - 1];
      for (const child of node.children) {
        assignPositions(child, depth + 1);
      }
      const minX = node.children[0].x;
      const maxX = node.children[node.children.length - 1].x;
      node.x = (minX + maxX) / 2;
      node.y = depth * levelGap;
    }
  }

  assignPositions(root, 0);

  const nodes = [];
  const edges = [];

  function pushNode(logicalNode) {
    const isValue = !!logicalNode.isValue;
    const isKey = !!logicalNode.isKey || logicalNode.isRoot;

    const background = isValue
      ? (typeColors[logicalNode.type] || "#94a3b8")
      : "#2dd4bf"; 

    const color = isValue ? "#fff" : "#111";

    nodes.push({
      id: logicalNode.id,
      data: { label: logicalNode.label },
      position: { x: logicalNode.x, y: logicalNode.y },
      style: {
        background,
        color,
        padding: isValue ? 8 : 6,
        borderRadius: isValue ? 8 : 6,
        minWidth: isValue ? 80 : 60,
        textAlign: "center",
        fontSize: 12,
        boxShadow: "0 4px 8px rgba(0,0,0,0.06)",
      },
    });

    if (logicalNode.children && logicalNode.children.length > 0) {
      for (const child of logicalNode.children) {
        edges.push({
          id: `e-${logicalNode.id}-${child.id}`,
          source: logicalNode.id,
          target: child.id,
          animated: false,
        });
      }
    }
  }

  for (const ln of logicalNodes) pushNode(ln);

  const rootNodeId = root.id;
  const filteredNodes = nodes.filter((n) => n.id !== rootNodeId);
  const filteredEdges = edges.filter((e) => e.source !== rootNodeId && e.target !== rootNodeId);
  const topShift = levelGap * 0; 
  filteredNodes.forEach((n) => {
    n.position = { x: n.position.x, y: n.position.y + topShift };
  });

  return { nodes: filteredNodes, edges: filteredEdges };
}



const App = () => {

  const [theme, setTheme] = useState("light"); 

   const [jsonInput, setJsonInput] = useState("")

   const [jsonData, setJsonData] = useState(null);

   const [error, setError] = useState("");

   const [nodes, setNodes] = useState([]);
   const [edges, setEdges] = useState([]);

   const [searchQuery, setSearchQuery] = useState("");
   const [searchResult, setSearchResult] = useState("");
   const [rfInstance, setRfInstance] = useState(null);



  const handleInputChange = (e) =>{
        setJsonInput(e.target.value)
  }

  const handleInputPaste = (e) =>{
         e.preventDefault();
        const pasted = e.clipboardData.getData("text");
        setJsonInput(pasted);
  }

   const handleSubmit = (e) => {
    e.preventDefault();
    
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonData(parsed);
      setError("");
     
       const { nodes, edges } = buildTreeFromJson(parsed);
        setNodes(nodes);
        setEdges(edges);
      
    } catch (e) {
      console.error("JSON Parse Error:", e);
      setError("Invalid JSON data, please check your format");
      setJsonData(null);
       setNodes([]);
        setEdges([]);
    }
   }

     const handleSearchChange = (e) => {
       setSearchQuery(e.target.value);
     };

     const handleSearchSubmit = (e) => {
  e.preventDefault();

  if (!searchQuery.trim()) {
    setSearchResult("Please enter a key or path to search.");
    return;
  }

  let matchFound = false;
  let firstMatch = null;

  const getFullPath = (nodeId, nodesMap, parentPath = "") => {
    const node = nodesMap[nodeId];
    if (!node) return parentPath;
    const parentEdge = edges.find((e) => e.target === nodeId);
    if (!parentEdge)
      return parentPath ? `${parentPath}.${node.data.label}` : node.data.label;
    const parentId = parentEdge.source;
    const parentPathNew = getFullPath(parentId, nodesMap, parentPath);
    return parentPathNew
      ? `${parentPathNew}.${node.data.label}`
      : node.data.label;
  };

  const nodesMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const updatedNodes = nodes.map((node) => {
    const fullPath = getFullPath(node.id, nodesMap, "").toLowerCase();
    const isMatch = fullPath.includes(searchQuery.toLowerCase());

    if (isMatch) {
      matchFound = true;
      if (!firstMatch) firstMatch = node; 
    }

    const originalBg = node.style.background.startsWith("#fde68a")
      ? "#2dd4bf"
      : node.style.background;

    return {
      ...node,
      style: {
        ...node.style,
        background: isMatch ? "#fde68a" : originalBg,
        border: isMatch ? "2px solid #facc15" : "none",
      },
    };
  });

  setNodes(updatedNodes);
  setSearchResult(matchFound ? "" : "❌ No match found");

  if (matchFound && firstMatch) {
    const zoomLevel = 1.8; 
        setTimeout(() => {
  if (!rfInstance || !firstMatch) return;

  const zoomLevel = 1.8;
  const duration = 800; 

  rfInstance.setCenter(
    firstMatch.position.x,
    firstMatch.position.y,
    {
      zoom: zoomLevel,
      duration,
      easing: (t) => 1 - Math.pow(1 - t, 3), 
    }
  );
}, 150);

  }
};

 
  return (
      <div
  className={`${
    theme === "dark"
      ? "dark bg-gray-900 text-gray-100"
      : "bg-gray-50 text-gray-900"
  } flex flex-col md:flex-row gap-10 min-h-screen transition-colors duration-500 p-4`}
>
  {/* LEFT SECTION — JSON INPUT */}
  <div className="flex flex-col items-center w-full md:w-1/2 relative">
    <div className="text-3xl font-medium mt-6 md:mt-10 text-center md:text-left">
      JSON Tree Visualizer
    </div>

    {/* 🌙 Theme Toggle — Mobile Version (Icon Only) */}
    <div className="mt-2 md:hidden">
      <button
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        className="p-2 rounded-full bg-gray-800 text-white hover:bg-gray-700 cursor-pointer 
                   dark:bg-gray-100 dark:text-black dark:hover:bg-gray-200 transition duration-300"
      >
        {theme === "light" ? "🌙" : "☀️"}
      </button>
    </div>

    <form
      onSubmit={handleSubmit}
      className="flex flex-col items-center md:items-start w-full"
    >
      {error && <p className="text-red-500 mt-2 md:ml-10">{error}</p>}

      <textarea
        className={`w-full sm:w-[90%] md:w-[500px] h-[300px] sm:h-[400px] md:h-[500px] p-3 border rounded-md resize-none mt-4 md:ml-10
          transition-colors duration-300
          ${
            theme === "dark"
              ? "bg-gray-800 text-gray-100 border-gray-600"
              : "bg-white text-gray-900 border-gray-400"
          }`}
        placeholder="Paste your JSON here..."
        value={jsonInput}
        onChange={handleInputChange}
        onPaste={handleInputPaste}
      ></textarea>

      <button
        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-md
                   transition duration-300 w-full sm:w-40 md:ml-10 cursor-pointer"
      >
        Generate Tree
      </button>
    </form>
  </div>

  <div className="flex flex-col items-center w-full md:w-1/2">
    <div className="hidden md:block self-end mb-4">
      <button
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        className="px-4 py-2 rounded-md font-medium transition duration-300
                   bg-gray-800 text-white hover:bg-gray-700 cursor-pointer
                   dark:bg-gray-100 dark:text-black dark:hover:bg-gray-200"
      >
        {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
      </button>
    </div>

    <form
      onSubmit={handleSearchSubmit}
      className="flex flex-col sm:flex-row items-center gap-3 mt-4 w-full justify-center lg:relative lg:right-25 lg:bottom-12"
    >
      <input
        type="text"
        placeholder="Search by JSON path (e.g. $.user.name)"
        value={searchQuery}
        onChange={handleSearchChange}
        className={`w-full sm:w-[400px] px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500
          transition-colors duration-300
          ${
            theme === "dark"
              ? "bg-gray-800 text-gray-100 border-gray-600 placeholder-gray-400"
              : "bg-white text-gray-900 border-gray-400 placeholder-gray-500"
          }`}
      />

      <button
        type="submit"
        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-md transition duration-300 cursor-pointer"
      >
        Search
      </button>
    </form>

    {searchResult && (
      <p className="text-red-500 text-sm text-center mt-2">{searchResult}</p>
    )}

    <div
      className="w-full sm:w-[90%] md:w-[750px] h-[300px] sm:h-[400px] md:h-[500px] border mt-6 md:mt-10 rounded-md flex items-center justify-center dark:border-gray-700 transition-all duration-300
      lg:relative lg:right-10 lg:bottom-10"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={(instance) => setRfInstance(instance)}
        style={{
          background: theme === "dark" ? "#0f172a" : "#f9fafb",
          transition: "background 0.5s ease",
        }}
      />
    </div>
  </div>
</div>

        
   
  )
}

export default App