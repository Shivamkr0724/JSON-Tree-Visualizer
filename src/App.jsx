import { useState } from 'react'
import '@xyflow/react/dist/style.css';
import {  ReactFlow } from '@xyflow/react';



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


   const [jsonInput, setJsonInput] = useState("")

   const [jsonData, setJsonData] = useState(null);

   const [error, setError] = useState("");

   //using reactflow
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

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

        console.log("Nodes:", nodes);
        console.log("Edges:", edges);
      
    } catch (e) {
      console.error("JSON Parse Error:", e);
      setError("Invalid JSON data, please check your format");
      setJsonData(null);
       setNodes([]);
        setEdges([]);
    }
   }

  

  
  return (
    <div className='flex gap-10 h-screen bg-gray-50'>
       <div>
         <div className='text-3xl font-medium ml-10 mt-10'>JSON Tree Visualizer</div>
          <form onSubmit={handleSubmit} action="" className='flex flex-col'>
         
         <div className='ml-20 mt-2'>
              {error && <p className="text-red-500 mt-4">{error}</p>}
         </div>
          
                <textarea className="w-[500px] h-[500px] p-3 border border-gray-400 rounded-md resize-none ml-20 mt-2"
                 placeholder="Paste your JSON here..."
                 value={jsonInput} onChange={handleInputChange}
                 onPaste={handleInputPaste}></textarea>
          
               <button className="mt-4 bg-blue-600 hover:bg-blue-700     text-white font-semibold py-2 px-6 rounded-md transition duration-300 w-50 ml-20 cursor-pointer">
                 Generate Tree
               </button>
          </form>
        </div>
       
       <div>
           <form className="flex items-center gap-3 mt-6 ml-20">
            <input
              type="text"
              placeholder="Search by JSON path (e.g. $.user.name)"
              className="w-[400px] px-4 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-md transition duration-300"
            >
              Search
            </button>
          </form>

           <div className="w-[750px] h-[500px]  border mt-10 border-gray-400 rounded-md flex items-center justify-center">
            <ReactFlow
             nodes={nodes}
             edges={edges}
             fitView
             style={{ background: '#f9fafb' }}
            />
           </div>
      </div>
    </div>
         
   
  )
}

export default App