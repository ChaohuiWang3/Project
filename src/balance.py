import json
import random
from collections import deque
from flask import Flask, request, jsonify
from flask_cors import CORS


def generate_random_graph(num_nodes):
    # Generate a random signed graph with certain number of nodes
    graph = {}
    for i in range(num_nodes): #i represents each node in the graph
        neighbors = [] #list to store neighbor nodes of this node and their relations
        for j in range(i+1, num_nodes):
                sign = random.choice(['+', '-'])  # Randomly choose '+' or '-' sign as relation
                neighbors.append((chr(65 + j), sign)) #add node j and its sign(relation with i) as a tuple into neighbors list, chr transfers j node into its corresponding captial letter
        graph[chr(65 + i)] = neighbors #assign neighbors list to this i node
    return 


num_nodes = 4  #number of nodes in the graph
graph = generate_random_graph(num_nodes)    #generate a random graph


def spanning_tree(graph, start):
    visited = {v: None for v in graph} #all the nodes in graph is recorded as None
    visited[start] = '+'   #symbol of first node is recorded as +
    queue = deque([start]) #the first node is added to a queue
    tree_links = []

    while queue:
        node = queue.popleft() #choose one node from the queue
        for adjacent, sign in graph[node]:   #for all the adjacent nodes for this node
            if visited[adjacent] is None: #the adjacent node is not visited
                visited[adjacent] = '+' if visited[node] == sign else '-' #if symbol of this node is same as sign between this node and its adjacent, the symbol of adjacent is +, else is -
                queue.append(adjacent) #add adjacent node to the queue
                tree_links.append((node, adjacent, sign)) #tree_link add this tuple

    return visited, tree_links 


# Check non-tree links
def is_graph_balanced(graph):
    start_node = next(iter(graph)) #start node is the first node of the graph 
    marked_nodes, spanning_tree_links = spanning_tree(graph, start_node) #symbols of all the nodes in the graph, the tuple of first node with its adjacents and signs between them               
    for u in graph:
        for v, sign in graph[u]:
            if (u, v, sign) not in spanning_tree_links and (v, u, sign) not in spanning_tree_links: #the relations of first node is tested by spanning tree, so test all the remaining relations in the graph                                                                                               
                if marked_nodes[u] == marked_nodes[v] and sign == '-': #if sign is - and symbols of two nodes are the same
                    return False
                elif marked_nodes[u] != marked_nodes[v] and sign == '+': #if sign is + and symbols of two nodes are not same
                    return False
    return True


def is_graph_weakbalanced(graph):
    for u in graph:
        for v, uv_sign in graph[u]:
            for r, vr_sign in graph[v]:
                if r == u:
                    continue
                ur_sign = next((sign for node, sign in graph[u] if node == r), None) #use graph[u] find sign between u and r 
                if not ur_sign:
                    continue
                #if there are two + signs and one - sign, it is not weak balannced
                if uv_sign == '+' and vr_sign == '+' and ur_sign != '+': 
                    return False
                if (uv_sign == '-' and vr_sign == '+' and ur_sign != '-') or \
                   (uv_sign == '+' and vr_sign == '-' and ur_sign != '-'):
                    return False
    return True


def convert_to_force_graph_format(graph):  #convert generated graph into force graph format so the system can be drawed
    nodes = [{'id': node} for node in graph]
    links = []
    for node, neighbors in graph.items():
        for neighbor, sign in neighbors:
            links.append({
                'source': node,
                'target': neighbor,
                'sign': sign
            })
    return {'nodes': nodes, 'links': links}


def graph_all_information(force_graph, balanced_result, weakbalanced_result):    #combine force graph and balance result in one function
    graph_data = {
    "originalgraphdata": force_graph,
    "isbalanced": balanced_result,
    "isweakbalanced": weakbalanced_result
    }
    return graph_data


def create_graph(graph): #store graph as a json file
    with open('graph.json', 'w') as file:   
        json.dump(graph, file, indent=4)


def create_force_graph(graph): #store graph_data including force graph and balance property as a json file
    force_graph = convert_to_force_graph_format(graph)     #convert the random graph to force graph format

    balanced_result = is_graph_balanced(graph)   #calculate the balance property of graph

    weakbalanced_result = is_graph_weakbalanced(graph)

    graph_data = graph_all_information(force_graph, balanced_result, weakbalanced_result) 
    print(graph_data)
    with open('graph_data.json', 'w') as file:  
        json.dump(graph_data, file, indent=4)


create_graph(graph)
create_force_graph(graph)
print(graph)
print(convert_to_force_graph_format(graph))
#print(create_force_graph(graph))

app = Flask(__name__)
CORS(app)

@app.route('/api/update-graph', methods=['POST']) 
def update_graph():  #receive update graph from App.js
    data = request.get_json()
    new_graph = data['graphData']   #get new graph
    create_graph(new_graph)
    create_force_graph(new_graph)
    return jsonify({"message": "Update successful"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)