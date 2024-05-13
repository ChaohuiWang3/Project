import React from 'react';
import {useState, useEffect, useMemo} from 'react';
import { ForceGraph2D } from 'react-force-graph';
import graph from './graph.json';   //build matrix
import graph_data from './graph_data.json';  //build graph


function App() {
  const linkLabel = link =>{ //show the information about the link
    return `link: ${link.source.id} -> ${link.target.id}, ${link.sign}`;
  }


  const [matrixData, setMatrixData] = useState([]);   //use graph to build the matrix


  useEffect(() => {
    const nodes = Object.keys(graph);  //extract all nodes in graph
    const initialMatrix = nodes.map(row => (
      nodes.map(col => {   //use 'map' to iterate, build a size[nodes] × size[nodes] matrix
        const found = graph[row]?.find(link => link[0] === col); //for graph[row], find whether there is a link(relation) with each column for example, three nodes, for graph[a], check link with each node(a,b,c). If there is a link, a has relation with that vertex, the found is recorded
        return found ? found[1] : '/'; // if there is not a link, a sign '/' is recorded 
      })
    ));
    setMatrixData(initialMatrix);  //build the matrix
  }, []);


  const handleInputChange = (event, row, col) => { //use keyboard to change the relation between any two vertices
    const value = event.target.value;
    const currentValue = matrixData[row][col];
    if (currentValue === '/') { //if '/' is chosen to be changed
      alert("'/' value can not be changed"); //alert the user
      return; 
    }
    const updatedMatrix = [...matrixData];
    updatedMatrix[row][col] = value; //update the matrix, change the selected link into new value 
    setMatrixData(updatedMatrix);
  };


  const handleSubmit = async () => { //submit the changes to balance.py
    for (let row of matrixData) { //check if there are any invalid characters
      for (let cell of row) {
        if (cell !== '+' && cell !== '-' && cell !== '/') { //only +,-,/ are allowed to exist in the matrix
          alert("Invalid entry detected. Only '+', '-', and '/' are allowed.");
          return; 
        }
      }
    }

    const updatedGraph = {}; //transfer new matrix into graph format
    Object.keys(graph).forEach((node, i) => {
      updatedGraph[node] = []; //each node of updatedGraph has its own empty array
      matrixData[i].forEach((value, j) => {
        const targetNode = Object.keys(graph)[j]; //check the relation of this node with all nodes in the matrix
        if (value !== '/') { // '/' relation is ignored
          updatedGraph[node].push([targetNode, value]); //add the link value into the node's array
        }
      });
    });

    const response = await fetch('http://127.0.0.1:5000/api/update-graph', {
      method: 'POST',
      headers: { //send a request to backend program balance.py
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ graphData: updatedGraph }) //send updatedGraph as a json file
    });

    if (response.ok) { //check the reponse
      console.log('Update successful');
      //console.get(graph_data)
    } else {
      console.error('Failed to update graph data');
    }
  };


  //color rules for balanced graphs
  const BalancedNodeColor = useMemo(() => { //depending on the isbalanced result to draw the color of nodes
    if (!graph_data.isbalanced) { //if the graph is not balanced
      return () => 'grey'; // All nodes are grey 
    }
    
    //if the graph is balanced
    const nodeColorMap = new Map(); //a Map to set the color of nodes
    const firstNodeId = graph_data.originalgraphdata.nodes[0].id;
    nodeColorMap.set(firstNodeId, 'red'); // First node is red color
  
    graph_data.originalgraphdata.links.forEach(link => {
      const sourceColor = nodeColorMap.get(link.source);
      const targetColor = link.sign === '+' ? sourceColor : (sourceColor === 'red' ? 'blue' : 'red'); //if the node is positive relation with the first node, it is red color; if it is negative relation, the node is blue color 
      nodeColorMap.set(link.target, targetColor);
    });
    return node => nodeColorMap.get(node.id); //draw the node color
  }, []);

  //render the nodes of balanced graph
  const RenderBalancedNode = (node, ctx, globalScale) => { 
    const label = `node: ${node.id}`; //the label is the name of the node(eg. A, B...)
    const fontSize = 12 / globalScale; 
    const color = BalancedNodeColor(node); //the color of the node is defined by BalancedNodeColor

    // draw the node
    ctx.beginPath();
    ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);  //the node is represented by a circle
    ctx.fillStyle = color;  //fill circle color
    ctx.fill();

    // draw the label
    ctx.font = `${fontSize}px Sans-Serif`; 
    ctx.textAlign = 'center';  
    ctx.textBaseline = 'middle';  
    ctx.fillStyle = 'black';  
    ctx.fillText(label, node.x, node.y + 10); 
  };


  //color rules for weak balanced graphs
  const WeakBalancedNodeColor = useMemo(() => { //depending on the isbalanced result to draw the color of nodes
    if (!graph_data.isweakbalanced) { //if the graph is not weak balanced
      return () => 'grey'; // All nodes are grey 
    }
  
    const nodeColorMap = new Map();
    const firstNodeId = graph_data.originalgraphdata.nodes[0].id;
    nodeColorMap.set(firstNodeId, 'red'); // First node is red color
  
    graph_data.originalgraphdata.links.forEach(link => {
      const sourceColor = nodeColorMap.get(link.source);
      if (link.sign === '+') { //if it is positive relation, the node is red color
        nodeColorMap.set(link.target, sourceColor); 
      } if(link.sign === '-' && !nodeColorMap.has(link.target)) { //if it is negative relation and the node does not have color, so the node does not belong any current subset, then the node has a random color set r,g,b, each const has a random number, use these three random constants as parameters of rgb color function
        const r = Math.floor(Math.random() * 128); 
        const g = Math.floor(Math.random() * 256); 
        const b = Math.floor(Math.random() * 512); 
        const newColor = `rgb(${r},${g},${b})`;
        nodeColorMap.set(link.target, newColor);
      }
    });
    return node => nodeColorMap.get(node.id); //draw the node color
  }, []);

  //render the nodes of weak balanced graph
  const RenderWeakBalancedNode = (node, ctx, globalScale) => {
    const label = `node: ${node.id}`;  
    const fontSize = 12 / globalScale; 
    const color = WeakBalancedNodeColor(node); //the color of the node is defined by WeakBalancedNodeColor

    //draw the node
    ctx.beginPath();
    ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);  
    ctx.fillStyle = color;  
    ctx.fill();

    //draw the label
    ctx.font = `${fontSize}px Sans-Serif`; 
    ctx.textAlign = 'center';  
    ctx.textBaseline = 'middle'; 
    ctx.fillStyle = 'black';  
    ctx.fillText(label, node.x, node.y + 10); 
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100vh' }}>
      {/*left side of the page*/ }
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div>
          <h2>Node Relation Matrix</h2>
          <table style={{fontSize: '19px'}}>
            {/* titles of matrix, include first row and first column */}
            <thead>
              <tr>
                <th>Node</th>
                {Object.keys(graph).map(node => (
                  <th key={node}>{node}</th>
                ))}
              </tr>
            </thead>

            {/* traverse the matrixData, for each[i][j], input the value */}
            <tbody>
              {matrixData.map((row, i) => (
                <tr key={i}>
                  <td>{Object.keys(graph)[i]}</td>
                  {row.map((cell, j) => (
                    <td key={j}>
                      <input
                        type="text"
                        value={cell}
                        onChange={e => handleInputChange(e, i, j)}
                        style={{ width: '100%' }}                    
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* create a button to submit the change of matrix */}
          <button onClick={handleSubmit}>Submit Changes</button>

          {/* if bool 'isbalanced' is true, then print 'true', vice versa */}
          <h2>balanced:{graph_data.isbalanced ? 'true' : 'false'}</h2>  
          <h2>weakly balanced:{graph_data.isweakbalanced ? 'true' : 'false'}</h2> 

          {/* draw the graph */}
          <ForceGraph2D  
            graphData={graph_data.originalgraphdata} 
            linkDirectionalArrowLength={5}
            linkDirectionalArrowRelPos={1}
            linkCurvature={0.25}
            nodeCanvasObject={(node, ctx, globalScale) => RenderBalancedNode(node, ctx, globalScale)}
            linkLabel={linkLabel}
          /> 
        </div>  
      </div>

      {/*right side of the page*/ }
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div>
          <h2>Node Relation Matrix</h2>
          <table style={{fontSize: '19px'}}>
            {/* titles of matrix, include first row and first column */}
            <thead>
              <tr>
                <th>Node</th>
                {Object.keys(graph).map(node => (
                  <th key={node}>{node}</th>
                ))}
              </tr>
            </thead>

            {/* traverse the matrixData, for each[i][j], input the value */}
            <tbody>
              {matrixData.map((row, i) => (
                <tr key={i}>
                  <td>{Object.keys(graph)[i]}</td>
                  {row.map((cell, j) => (
                    <td key={j}>
                      <input
                        type="text"
                        value={cell}
                        onChange={e => handleInputChange(e, i, j)}
                        style={{ width: '100%' }}                    
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* create a button to submit the change of matrix */}
          <button onClick={handleSubmit}>Submit Changes</button>

          {/* if bool 'isbalanced' is true, then print 'true', vice versa */}
          <h2>balanced:{graph_data.isbalanced ? 'true' : 'false'}</h2>  
          <h2>weakly balanced:{graph_data.isweakbalanced ? 'true' : 'false'}</h2>  

          {/* draw the graph */}
          <ForceGraph2D  
            graphData={graph_data.originalgraphdata} 
            linkDirectionalArrowLength={5}
            linkDirectionalArrowRelPos={1}
            linkCurvature={0.25}
            nodeCanvasObject={(node, ctx, globalScale) => RenderWeakBalancedNode(node, ctx, globalScale)}
            linkLabel={linkLabel}
          /> 
        </div>  
      </div>

    </div>  
  );
} 

export default App;
