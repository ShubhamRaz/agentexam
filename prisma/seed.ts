import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

/* ============================================================
   AgentExam seed script — run with: bun prisma/seed.ts
   ============================================================ */

type Opt = { id: string; text: string; is_correct: boolean }
type SeedQ = {
  type: 'MCQ' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'VIVA'
  text: string
  topic: string
  options?: Opt[]
  correct?: string
  explanation?: string
  marks?: number
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD'
  source?: 'PYQ' | 'MANUAL'
  year?: number
  sourceRef?: string
}

type SeedTopic = { name: string; importance: 'high' | 'medium' | 'low'; freq: number; weight: number }
type SeedUnit = { name: string; topics: SeedTopic[] }

type SeedSubject = {
  name: string
  code: string
  description: string
  units: SeedUnit[]
  questions: SeedQ[]
  experiments: { title: string; description: string; objective: string; instructions: string; expected: string; marks: number }[]
  materials: { type: string; title: string; file: string; size: number }[]
}

const mcq = (text: string, topic: string, opts: string[], correctIdx: number, explanation: string, difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM'): SeedQ => ({
  type: 'MCQ', text, topic,
  options: opts.map((t, i) => ({ id: String.fromCharCode(65 + i), text: t, is_correct: i === correctIdx })),
  correct: String.fromCharCode(65 + correctIdx),
  explanation, marks: 1, difficulty, source: 'MANUAL',
})

const short = (text: string, topic: string, marks = 5, difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM'): SeedQ => ({
  type: 'SHORT_ANSWER', text, topic, marks, difficulty, source: 'MANUAL',
})

const long = (text: string, topic: string, marks = 10, difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'HARD'): SeedQ => ({
  type: 'LONG_ANSWER', text, topic, marks, difficulty, source: 'MANUAL',
})

const viva = (text: string, topic: string, marks = 2): SeedQ => ({
  type: 'VIVA', text, topic, marks, difficulty: 'MEDIUM', source: 'MANUAL',
})

const pyq = (text: string, topic: string, year: number, marks: number, type: 'MCQ' | 'SHORT_ANSWER' | 'LONG_ANSWER', difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM', opts?: string[], correctIdx?: number): SeedQ => ({
  type, text, topic, marks, difficulty, source: 'PYQ', year,
  sourceRef: `${year} End Term Exam`,
  ...(type === 'MCQ' && opts ? {
    options: opts.map((t, i) => ({ id: String.fromCharCode(65 + i), text: t, is_correct: i === correctIdx! })),
    correct: String.fromCharCode(65 + correctIdx!),
    explanation: 'Previous year objective question.',
  } : {}),
})

/* ================= SUBJECTS ================= */

const SUBJECTS: SeedSubject[] = [
  {
    name: 'Artificial Intelligence',
    code: 'CS501',
    description: 'Introduction to intelligent agents, search strategies, knowledge representation and machine learning fundamentals.',
    units: [
      { name: 'Unit 1: Introduction to AI', topics: [
        { name: 'Intelligent Agents', importance: 'high', freq: 6, weight: 18 },
        { name: 'Problem Solving Agents', importance: 'medium', freq: 3, weight: 10 },
        { name: 'Turing Test & AI History', importance: 'low', freq: 1, weight: 5 },
        { name: 'Environment Types', importance: 'medium', freq: 2, weight: 8 },
      ]},
      { name: 'Unit 2: Search Strategies', topics: [
        { name: 'BFS & DFS', importance: 'high', freq: 7, weight: 19 },
        { name: 'A* Search & Heuristics', importance: 'high', freq: 5, weight: 16 },
        { name: 'Hill Climbing', importance: 'medium', freq: 3, weight: 9 },
        { name: 'Adversarial Search (Minimax)', importance: 'medium', freq: 2, weight: 7 },
      ]},
      { name: 'Unit 3: Knowledge Representation', topics: [
        { name: 'Propositional Logic', importance: 'high', freq: 4, weight: 12 },
        { name: 'First Order Logic', importance: 'medium', freq: 3, weight: 11 },
        { name: 'Inference Rules', importance: 'medium', freq: 2, weight: 8 },
        { name: 'Semantic Networks', importance: 'low', freq: 1, weight: 4 },
      ]},
      { name: 'Unit 4: Machine Learning Basics', topics: [
        { name: 'Supervised vs Unsupervised Learning', importance: 'high', freq: 4, weight: 13 },
        { name: 'Neural Networks', importance: 'medium', freq: 3, weight: 10 },
        { name: 'Decision Trees', importance: 'medium', freq: 2, weight: 7 },
      ]},
    ],
    questions: [
      mcq('Which search algorithm uses a FIFO queue for its frontier?', 'BFS & DFS', ['Depth-First Search', 'Breadth-First Search', 'A* Search', 'Hill Climbing'], 1, 'BFS explores the shallowest unexpanded node first, which requires a First-In-First-Out queue.', 'EASY'),
      mcq('The evaluation function of A* search is expressed as:', 'A* Search & Heuristics', ['f(n) = h(n)', 'f(n) = g(n)', 'f(n) = g(n) + h(n)', 'f(n) = g(n) × h(n)'], 2, 'A* combines the actual cost so far g(n) with the estimated cost to goal h(n).'),
      mcq('The Turing Test is designed to evaluate a machine\'s ability to:', 'Turing Test & AI History', ['Compute faster than humans', 'Exhibit intelligent behaviour indistinguishable from a human', 'Store vast amounts of knowledge', 'Understand natural language grammar'], 1, 'In the Turing Test an interrogator must distinguish machine from human through conversation alone.', 'EASY'),
      mcq('Which knowledge representation scheme represents facts as a labelled graph of nodes and edges?', 'Semantic Networks', ['Propositional logic', 'Semantic networks', 'Decision tables', 'Frames only'], 1, 'Semantic networks encode entities as nodes and relations as edges.'),
      mcq('Unsupervised learning algorithms are trained on data that is:', 'Supervised vs Unsupervised Learning', ['Labeled with correct outputs', 'Unlabeled', 'Only numeric', 'Reinforced with rewards'], 1, 'Unsupervised learning discovers structure in unlabeled data, e.g. clustering.', 'EASY'),
      mcq('The Minimax algorithm is primarily used for:', 'Adversarial Search (Minimax)', ['Optimising supply chains', 'Two-player adversarial games', 'Clustering datasets', 'Natural language parsing'], 1, 'Minimax assumes an adversary playing optimally and backs values up the game tree.'),
      mcq('Hill Climbing search can get stuck at:', 'Hill Climbing', ['The global optimum only', 'Local maxima and ridges', 'Unreachable states only', 'None of the above'], 1, 'Hill climbing never moves to a worse state, so it can be trapped at local maxima, plateaux and ridges.'),
      mcq('The propositional statement "P → Q" is logically false only when:', 'Propositional Logic', ['P is false and Q is true', 'P is true and Q is false', 'Both P and Q are false', 'Both P and Q are true'], 1),
      mcq('Which agent architecture directly maps current percepts to actions without internal state?', 'Intelligent Agents', ['Model-based reflex agent', 'Simple reflex agent', 'Goal-based agent', 'Utility-based agent'], 1, 'A simple reflex agent uses condition-action rules on the current percept only.', 'EASY'),
      mcq('In decision tree induction, entropy is used to measure:', 'Decision Trees', ['The depth of the tree', 'The impurity/uncertainty of a set of examples', 'The number of leaves', 'The pruning factor'], 1, 'ID3/C4.5 choose the attribute with highest information gain, i.e. largest entropy reduction.', 'HARD'),
      mcq('A heuristic h(n) is admissible when:', 'A* Search & Heuristics', ['It overestimates the true cost', 'It never overestimates the true cost to reach the goal', 'It is always zero', 'It equals g(n)'], 1, 'Admissibility (optimistic estimates) guarantees A* finds an optimal solution.'),
      short('Differentiate between BFS and DFS. State one advantage of each.', 'BFS & DFS', 5, 'MEDIUM'),
      short('Explain the Minimax algorithm with a small game tree example.', 'Adversarial Search (Minimax)', 5, 'HARD'),
      short('What is an admissible heuristic? Why does it matter for A*?', 'A* Search & Heuristics', 3, 'MEDIUM'),
      short('Compare supervised and unsupervised learning with one example each.', 'Supervised vs Unsupervised Learning', 5, 'EASY'),
      long('Explain the A* search algorithm in detail. Define f(n), g(n) and h(n), and prove/discuss why A* is optimal when the heuristic is admissible.', 'A* Search & Heuristics', 10, 'HARD'),
      long('Describe the architecture of an intelligent agent. Explain simple reflex, model-based, goal-based and utility-based agents with examples.', 'Intelligent Agents', 10, 'MEDIUM'),
      viva('What is the difference between strong AI and weak AI?', 'Turing Test & AI History'),
      viva('Why is A* preferred over greedy best-first search?', 'A* Search & Heuristics'),
      viva('What does an admissible heuristic guarantee in tree search?', 'A* Search & Heuristics'),
      viva('Give one real-world application of reinforcement learning.', 'Supervised vs Unsupervised Learning'),
      viva('What is the frame problem in knowledge representation?', 'Inference Rules'),
      pyq('Explain the A* search algorithm with a suitable example. Discuss optimality.', 'A* Search & Heuristics', 2025, 10, 'LONG_ANSWER'),
      pyq('Differentiate between BFS and DFS traversal strategies.', 'BFS & DFS', 2025, 5, 'SHORT_ANSWER'),
      pyq('What is an intelligent agent? Draw and explain its block diagram.', 'Intelligent Agents', 2024, 5, 'SHORT_ANSWER'),
      pyq('Which search strategy uses a FIFO queue?', 'BFS & DFS', 2024, 1, 'MCQ', 'EASY', ['DFS', 'BFS', 'A*', 'IDS'], 1),
      pyq('Explain knowledge representation techniques in AI.', 'Propositional Logic', 2023, 10, 'LONG_ANSWER'),
      pyq('Compare supervised and unsupervised learning.', 'Supervised vs Unsupervised Learning', 2023, 5, 'SHORT_ANSWER'),
      pyq('Write short notes on heuristic search.', 'A* Search & Heuristics', 2022, 10, 'LONG_ANSWER'),
      pyq('Explain hill climbing and its limitations.', 'Hill Climbing', 2022, 5, 'SHORT_ANSWER'),
    ],
    experiments: [
      { title: 'Implement BFS for Graph Search', description: 'Write a program to perform Breadth-First Search on a given graph, printing the visit order and detecting reachability between two nodes.', objective: 'Understand frontier management with a FIFO queue and level-order exploration.', instructions: '1. Represent the graph as an adjacency list.\n2. Initialise a queue with the source node.\n3. Dequeue a node, mark visited, enqueue unvisited neighbours.\n4. Repeat until the queue is empty.', expected: 'Correct level-order traversal, e.g. for the sample graph: A B C D E F', marks: 10 },
      { title: 'Solve the 8-Puzzle with A*', description: 'Implement the A* algorithm with the Manhattan-distance heuristic to solve an 8-puzzle instance and print the optimal move sequence.', objective: 'Apply informed search with an admissible heuristic.', instructions: '1. Model states as 3x3 tuples.\n2. Generate successors by sliding the blank.\n3. Use a priority queue keyed by f(n)=g(n)+h(n).\n4. Track parent pointers to reconstruct the path.', expected: 'Optimal path of 12 moves or fewer for the sample instance, with nodes expanded reported.', marks: 10 },
      { title: 'Minimax for Tic-Tac-Toe', description: 'Implement the Minimax algorithm (with optional alpha-beta pruning) so the computer plays an unbeatable game of tic-tac-toe.', objective: 'Model adversarial search with a two-player game tree.', instructions: '1. Define the game state and terminal test.\n2. Recursively maximise/minimise utility.\n3. Add alpha-beta pruning for efficiency.', expected: 'An AI player that never loses; game tree explored with pruning statistics.', marks: 10 },
    ],
    materials: [
      { type: 'SYLLABUS', title: 'AI Syllabus 2025', file: 'ai_syllabus.pdf', size: 245760 },
      { type: 'PYQ', title: 'AI PYQs 2022-2025', file: 'ai_pyq_collection.pdf', size: 1830912 },
      { type: 'NOTES', title: 'AI Unit 1-4 Notes', file: 'ai_notes_full.pdf', size: 4210688 },
    ],
  },
  {
    name: 'Database Management Systems',
    code: 'CS502',
    description: 'Relational modelling, SQL, normalization and transaction management for dependable data storage.',
    units: [
      { name: 'Unit 1: ER & Relational Model', topics: [
        { name: 'ER Diagrams', importance: 'high', freq: 5, weight: 14 },
        { name: 'Relational Algebra', importance: 'medium', freq: 3, weight: 10 },
        { name: 'Keys & Constraints', importance: 'high', freq: 4, weight: 12 },
      ]},
      { name: 'Unit 2: SQL & Queries', topics: [
        { name: 'Joins', importance: 'high', freq: 6, weight: 17 },
        { name: 'Nested Queries', importance: 'medium', freq: 4, weight: 11 },
        { name: 'Views & Indexes', importance: 'low', freq: 2, weight: 6 },
      ]},
      { name: 'Unit 3: Normalization', topics: [
        { name: 'Functional Dependencies', importance: 'high', freq: 5, weight: 15 },
        { name: 'Normal Forms (1NF-BCNF)', importance: 'high', freq: 6, weight: 18 },
        { name: 'Lossless Decomposition', importance: 'medium', freq: 2, weight: 8 },
      ]},
      { name: 'Unit 4: Transactions & Concurrency', topics: [
        { name: 'ACID Properties', importance: 'high', freq: 5, weight: 14 },
        { name: 'Concurrency Control', importance: 'medium', freq: 3, weight: 10 },
        { name: 'Deadlock Handling', importance: 'low', freq: 2, weight: 6 },
      ]},
    ],
    questions: [
      mcq('Which normal form removes transitive dependencies?', 'Normal Forms (1NF-BCNF)', ['1NF', '2NF', '3NF', 'BCNF'], 2, '3NF ensures no non-prime attribute is transitively dependent on a candidate key.', 'MEDIUM'),
      mcq('In ACID properties, the "D" stands for:', 'ACID Properties', ['Distribution', 'Durability', 'Determinism', 'Dependency'], 1, 'Durability guarantees committed transactions survive system failures.', 'EASY'),
      mcq('Which JOIN returns unmatched rows from BOTH tables?', 'Joins', ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN'], 3),
      mcq('A relation can have how many primary keys?', 'Keys & Constraints', ['Zero', 'Exactly one', 'At most two', 'Unlimited'], 1, 'A relation has exactly one primary key but may have several candidate keys.', 'EASY'),
      mcq('Which command removes the table structure along with its data?', 'Keys & Constraints', ['DELETE', 'TRUNCATE', 'DROP', 'ERASE'], 2, 'DROP is DDL and removes the entire table definition; DELETE is DML and row-wise.', 'EASY'),
      mcq('Which of the following is a DDL command?', 'Views & Indexes', ['SELECT', 'INSERT', 'ALTER', 'COMMIT'], 2),
      mcq('In an ER diagram, a diamond shape represents:', 'ER Diagrams', ['Entity', 'Attribute', 'Relationship', 'Key'], 2, 'Rectangles are entities, ellipses are attributes, diamonds are relationships.', 'EASY'),
      mcq('Two-phase locking protocol primarily ensures:', 'Concurrency Control', ['Recoverability', 'Serializability', 'Durability', 'Atomicity'], 1, 'The growing and shrinking phases of 2PL guarantee conflict-serializable schedules.', 'MEDIUM'),
      mcq('Which SQL clause filters rows AFTER grouping has been applied?', 'Nested Queries', ['WHERE', 'HAVING', 'ORDER BY', 'GROUP BY'], 1),
      mcq('A decomposition is lossless when the common attributes:', 'Lossless Decomposition', ['Are non-prime', 'Form a superkey of at least one relation', 'Are foreign keys', 'Have no dependencies'], 1, 'R1∩R2 must be a superkey of R1 or R2 for the join to restore the original relation.', 'HARD'),
      short('Explain the ACID properties of transactions with one example each.', 'ACID Properties', 5, 'EASY'),
      short('What is normalization? Why is it necessary in database design?', 'Normal Forms (1NF-BCNF)', 5, 'MEDIUM'),
      short('Compare DELETE, TRUNCATE and DROP commands.', 'Keys & Constraints', 5, 'MEDIUM'),
      long('Explain normalization from 1NF up to BCNF with a suitable example at each stage.', 'Normal Forms (1NF-BCNF)', 10, 'HARD'),
      long('Explain concurrency control using the two-phase locking protocol. Discuss deadlock handling strategies.', 'Concurrency Control', 10, 'HARD'),
      viva('What is a foreign key constraint?', 'Keys & Constraints'),
      viva('Why is BCNF stricter than 3NF?', 'Normal Forms (1NF-BCNF)'),
      viva('What is a view and when is it useful?', 'Views & Indexes'),
      viva('When would you deliberately denormalize a schema?', 'Normal Forms (1NF-BCNF)'),
      pyq('Explain various types of joins in SQL with examples.', 'Joins', 2025, 10, 'LONG_ANSWER'),
      pyq('Normalize the given relation up to BCNF.', 'Normal Forms (1NF-BCNF)', 2025, 10, 'LONG_ANSWER'),
      pyq('Explain ACID properties with examples.', 'ACID Properties', 2024, 5, 'SHORT_ANSWER'),
      pyq('Write a nested query to find employees earning above the average salary.', 'Nested Queries', 2024, 5, 'SHORT_ANSWER'),
      pyq('Draw an ER diagram for a university database.', 'ER Diagrams', 2023, 10, 'LONG_ANSWER'),
      pyq('Explain functional dependencies and their types.', 'Functional Dependencies', 2023, 5, 'SHORT_ANSWER'),
      pyq('Which normal form deals with transitive dependency?', 'Normal Forms (1NF-BCNF)', 2022, 1, 'MCQ', 'EASY', ['1NF', '2NF', '3NF', '4NF'], 2),
      pyq('What is a lossless join decomposition?', 'Lossless Decomposition', 2022, 5, 'SHORT_ANSWER'),
    ],
    experiments: [
      { title: 'ER Diagram to Normalized Schema', description: 'Design an ER diagram for a library management system, convert it to relational schema and normalize up to 3NF/BCNF.', objective: 'Practice conceptual modelling and normalization.', instructions: '1. Identify entities, attributes, relationships.\n2. Draw the ER diagram.\n3. Convert to tables with keys.\n4. Check FDs and normalize.', expected: 'A BCNF-compliant schema with all FDs documented.', marks: 10 },
      { title: 'SQL Joins & Nested Queries Lab', description: 'Write SQL queries using inner/left/full joins and nested subqueries against the sample university database.', objective: 'Master complex SQL retrieval.', instructions: '1. Load sample schema.\n2. Write 10 queries covering joins and subqueries.\n3. Verify results.', expected: '10 correct result sets with query scripts.', marks: 10 },
      { title: 'Transaction & ACID Demonstration', description: 'Demonstrate atomicity and isolation using explicit transactions with rollback scenarios.', objective: 'Understand transaction semantics in a real RDBMS.', instructions: '1. BEGIN a transaction.\n2. Apply partial updates.\n3. Simulate failure and ROLLBACK.\n4. Show isolation with two sessions.', expected: 'Rollback logs and consistent final states.', marks: 10 },
    ],
    materials: [
      { type: 'SYLLABUS', title: 'DBMS Syllabus 2025', file: 'dbms_syllabus.pdf', size: 198658 },
      { type: 'LAB_MANUAL', title: 'DBMS Lab Manual', file: 'dbms_lab_manual.pdf', size: 943718 },
      { type: 'PYQ', title: 'DBMS PYQs 2022-2024', file: 'dbms_pyq.pdf', size: 1258291 },
    ],
  },
  {
    name: 'Computer Networks',
    code: 'CS503',
    description: 'Layered network architectures, protocols, routing, transport mechanisms and networked applications.',
    units: [
      { name: 'Unit 1: Network Fundamentals', topics: [
        { name: 'OSI Model', importance: 'high', freq: 7, weight: 19 },
        { name: 'TCP/IP Model', importance: 'high', freq: 5, weight: 14 },
        { name: 'Transmission Media', importance: 'low', freq: 2, weight: 5 },
      ]},
      { name: 'Unit 2: Data Link Layer', topics: [
        { name: 'Error Detection (CRC)', importance: 'medium', freq: 4, weight: 11 },
        { name: 'Sliding Window Protocols', importance: 'high', freq: 4, weight: 12 },
        { name: 'MAC Protocols', importance: 'low', freq: 2, weight: 6 },
      ]},
      { name: 'Unit 3: Network Layer', topics: [
        { name: 'IP Addressing & Subnetting', importance: 'high', freq: 6, weight: 16 },
        { name: 'Routing Algorithms', importance: 'medium', freq: 4, weight: 12 },
        { name: 'Fragmentation', importance: 'low', freq: 1, weight: 4 },
      ]},
      { name: 'Unit 4: Transport Layer', topics: [
        { name: 'TCP vs UDP', importance: 'high', freq: 6, weight: 17 },
        { name: 'Congestion Control', importance: 'medium', freq: 3, weight: 9 },
        { name: 'Three-way Handshake', importance: 'high', freq: 3, weight: 10 },
      ]},
    ],
    questions: [
      mcq('How many layers does the OSI reference model define?', 'OSI Model', ['4', '5', '7', '9'], 2, 'Physical, Data Link, Network, Transport, Session, Presentation and Application.', 'EASY'),
      mcq('Which OSI layer is responsible for routing packets across networks?', 'Routing Algorithms', ['Data Link', 'Network', 'Transport', 'Session'], 1),
      mcq('The minimum TCP header size is:', 'TCP vs UDP', ['8 bytes', '16 bytes', '20 bytes', '32 bytes'], 2),
      mcq('Which transport protocol is connectionless?', 'TCP vs UDP', ['TCP', 'UDP', 'Both', 'Neither'], 1, 'UDP sends datagrams without handshakes, ordering or retransmission.', 'EASY'),
      mcq('Which protocol resolves an IP address to a MAC address?', 'Error Detection (CRC)', ['DNS', 'ARP', 'DHCP', 'ICMP'], 1),
      mcq('Sliding window protocols are primarily used for:', 'Sliding Window Protocols', ['Encryption', 'Flow and error control', 'Routing', 'Addressing'], 1, 'The window bounds unacknowledged data, enabling efficient reliable transfer.', 'EASY'),
      mcq('Which application layer protocol traditionally uses port 80?', 'OSI Model', ['FTP', 'SMTP', 'HTTP', 'DNS'], 2, 'HTTP uses 80 by default and HTTPS uses 443.', 'EASY'),
      mcq('CRC at the data link layer is used for:', 'Error Detection (CRC)', ['Congestion control', 'Error detection', 'Routing', 'Encryption'], 1),
      mcq('The TCP three-way handshake sequence is:', 'Three-way Handshake', ['SYN, ACK, FIN', 'SYN, SYN-ACK, ACK', 'ACK, SYN, ACK', 'SYN, ACK, SYN-ACK'], 1),
      mcq('An IPv4 address consists of how many bits?', 'IP Addressing & Subnetting', ['16', '32', '64', '128'], 1, 'IPv6 uses 128 bits.', 'EASY'),
      short('Differentiate the OSI and TCP/IP models.', 'OSI Model', 5, 'EASY'),
      short('Compare TCP and UDP with suitable applications.', 'TCP vs UDP', 5, 'MEDIUM'),
      short('Explain subnetting with a class-C example.', 'IP Addressing & Subnetting', 5, 'MEDIUM'),
      long('Explain the OSI reference model. Describe the function of each layer with its protocols.', 'OSI Model', 10, 'MEDIUM'),
      long('Explain TCP congestion control: slow start, congestion avoidance, fast retransmit and fast recovery.', 'Congestion Control', 10, 'HARD'),
      viva('What is a default gateway?', 'IP Addressing & Subnetting'),
      viva('Difference between a hub and a switch?', 'MAC Protocols'),
      viva('What does NAT accomplish?', 'IP Addressing & Subnetting'),
      viva('Why is DNS needed?', 'TCP/IP Model'),
      pyq('Explain the OSI reference model with functions of each layer.', 'OSI Model', 2025, 10, 'LONG_ANSWER'),
      pyq('Differentiate TCP and UDP.', 'TCP vs UDP', 2025, 5, 'SHORT_ANSWER'),
      pyq('Explain subnetting and supernetting with examples.', 'IP Addressing & Subnetting', 2024, 10, 'LONG_ANSWER'),
      pyq('Compare distance vector and link state routing algorithms.', 'Routing Algorithms', 2024, 5, 'SHORT_ANSWER'),
      pyq('Explain the sliding window protocol with diagrams.', 'Sliding Window Protocols', 2023, 10, 'LONG_ANSWER'),
      pyq('Differentiate TCP and UDP. When is UDP preferred?', 'TCP vs UDP', 2023, 5, 'SHORT_ANSWER'),
      pyq('Which layer does a router operate at?', 'Routing Algorithms', 2022, 1, 'MCQ', 'EASY', ['Physical', 'Data Link', 'Network', 'Transport'], 2),
      pyq('Write short notes on error detection techniques.', 'Error Detection (CRC)', 2022, 5, 'SHORT_ANSWER'),
    ],
    experiments: [
      { title: 'TCP Socket Programming — Echo Server', description: 'Implement a TCP client and echo server using sockets. The server echoes back any message received from the client.', objective: 'Understand reliable byte-stream communication.', instructions: '1. Create a listening socket.\n2. accept() connections.\n3. recv() data and send() it back.\n4. Handle multiple clients sequentially.', expected: 'Client sends "hello" and receives "hello" back; connection close handled gracefully.', marks: 10 },
      { title: 'Sliding Window Simulator', description: 'Simulate a Go-Back-N sliding window protocol with configurable window size and loss probability.', objective: 'Visualise flow control and retransmission.', instructions: '1. Model sender/receiver with timers.\n2. Drop packets randomly.\n3. Observe cumulative ACKs and retransmissions.', expected: 'Correct in-order delivery with retransmission statistics.', marks: 10 },
      { title: 'Subnet Calculator', description: 'Build a tool that computes network address, broadcast address, usable host range and mask from CIDR notation.', objective: 'Apply IP addressing theory.', instructions: '1. Parse a.b.c.d/n.\n2. Compute mask.\n3. Derive network/broadcast.\n4. Validate input.', expected: 'Correct subnet computations for sample inputs like 192.168.10.0/26.', marks: 10 },
    ],
    materials: [
      { type: 'SYLLABUS', title: 'CN Syllabus 2025', file: 'cn_syllabus.pdf', size: 210944 },
      { type: 'PYQ', title: 'CN PYQs 2022-2025', file: 'cn_pyq.pdf', size: 1081344 },
      { type: 'NOTES', title: 'CN Layer-wise Notes', file: 'cn_notes.pdf', size: 5242880 },
    ],
  },
  {
    name: 'Operating Systems',
    code: 'CS504',
    description: 'Process management, CPU scheduling, memory management, file systems and deadlock handling.',
    units: [
      { name: 'Unit 1: Introduction', topics: [
        { name: 'OS Types & Services', importance: 'medium', freq: 3, weight: 9 },
        { name: 'System Calls', importance: 'low', freq: 2, weight: 5 },
      ]},
      { name: 'Unit 2: Process Management', topics: [
        { name: 'CPU Scheduling Algorithms', importance: 'high', freq: 6, weight: 16 },
        { name: 'Threads & Multithreading', importance: 'medium', freq: 3, weight: 10 },
        { name: 'Inter-Process Communication', importance: 'low', freq: 2, weight: 6 },
      ]},
      { name: 'Unit 3: Memory Management', topics: [
        { name: 'Paging & TLB', importance: 'high', freq: 5, weight: 14 },
        { name: 'Segmentation', importance: 'medium', freq: 2, weight: 7 },
        { name: 'Page Replacement Algorithms', importance: 'high', freq: 5, weight: 15 },
      ]},
      { name: 'Unit 4: Deadlocks', topics: [
        { name: 'Deadlock Detection & Recovery', importance: 'medium', freq: 3, weight: 10 },
        { name: 'Banker\'s Algorithm', importance: 'high', freq: 4, weight: 12 },
      ]},
    ],
    questions: [
      mcq('Which CPU scheduling algorithm gives the minimum average waiting time (theoretically)?', 'CPU Scheduling Algorithms', ['FCFS', 'Round Robin', 'Shortest Job First', 'Priority'], 2, 'SJF is provably optimal for average waiting time.', 'MEDIUM'),
      mcq('Which of the following is NOT a necessary condition for deadlock?', 'Deadlock Detection & Recovery', ['Mutual exclusion', 'Hold and wait', 'Preemption', 'Circular wait'], 2, 'The fourth condition is NO preemption; preemption is a solution, not a cause.', 'MEDIUM'),
      mcq('LRU page replacement evicts the page that:', 'Page Replacement Algorithms', ['Was least frequently used', 'Has been unused for the longest time', 'Was loaded first', 'Has the largest size'], 1, 'Least Recently Used approximates optimal replacement using locality.', 'EASY'),
      mcq('Thrashing occurs when:', 'Paging & TLB', ['CPU utilization is too high', 'The system spends most time on page faults', 'Memory is fragmented', 'Disk is full'], 1, 'Over-committed memory leads to constant paging instead of useful work.', 'MEDIUM'),
      mcq('Which scheduling policy is non-preemptive?', 'CPU Scheduling Algorithms', ['Round Robin', 'SRTF', 'FCFS', 'Preemptive Priority'], 2, 'FCFS runs a process until completion or voluntary block.', 'EASY'),
      mcq('Banker\'s algorithm is used for:', 'Banker\'s Algorithm', ['Deadlock detection', 'Deadlock avoidance', 'Deadlock recovery', 'Page replacement'], 1, 'It grants requests only when a safe sequence exists.', 'MEDIUM'),
      mcq('The value of a counting semaphore can be:', 'Inter-Process Communication', ['Only 0 or 1', 'Any non-negative integer', 'Negative, zero or positive', 'Only negative'], 2, 'Negative magnitude equals the number of blocked processes.', 'HARD'),
      mcq('Paging solves which problem of contiguous memory allocation?', 'Paging & TLB', ['Internal fragmentation', 'External fragmentation', 'Thrashing', 'Belady anomaly'], 1, 'Non-contiguous physical frames eliminate external fragmentation.', 'EASY'),
      mcq('A zombie process is one that:', 'Threads & Multithreading', ['Consumes excessive CPU', 'Has terminated but whose exit status is not yet collected by its parent', 'Is stuck in a deadlock', 'Has been swapped out'], 1, 'The parent must wait() to reap the child\'s entry.', 'HARD'),
      mcq('Threads within the same process share:', 'Threads & Multithreading', ['Stack and registers only', 'Code, data and heap but not stacks', 'Nothing', 'Only the heap'], 1, 'Each thread has its own stack/registers; the rest is shared.', 'EASY'),
      short('Explain the five-state process model with a diagram.', 'CPU Scheduling Algorithms', 5, 'EASY'),
      short('What is a deadlock? State the four necessary conditions.', 'Deadlock Detection & Recovery', 5, 'MEDIUM'),
      short('What is virtual memory? How does it benefit multiprogramming?', 'Paging & TLB', 5, 'MEDIUM'),
      long('Explain paging and TLB. Derive the effective memory access time formula with a hit ratio example.', 'Paging & TLB', 10, 'HARD'),
      long('Compare FCFS, SJF, Priority and Round Robin scheduling algorithms with a worked example (Gantt chart).', 'CPU Scheduling Algorithms', 10, 'HARD'),
      viva('What happens during a context switch?', 'CPU Scheduling Algorithms'),
      viva('Differentiate kernel mode and user mode.', 'System Calls'),
      viva('What is spooling? Give an example.', 'OS Types & Services'),
      pyq('Compare CPU scheduling algorithms with examples.', 'CPU Scheduling Algorithms', 2025, 10, 'LONG_ANSWER'),
      pyq('Explain paging with a neat diagram and TLB workings.', 'Paging & TLB', 2025, 10, 'LONG_ANSWER'),
      pyq('What is a deadlock? Explain the Banker\'s algorithm.', 'Banker\'s Algorithm', 2024, 10, 'LONG_ANSWER'),
      pyq('Write short notes on semaphores.', 'Inter-Process Communication', 2024, 5, 'SHORT_ANSWER'),
      pyq('Explain page replacement algorithms.', 'Page Replacement Algorithms', 2023, 10, 'LONG_ANSWER'),
      pyq('Which is a non-preemptive scheduling algorithm?', 'CPU Scheduling Algorithms', 2023, 1, 'MCQ', 'EASY', ['Round Robin', 'SRTF', 'FCFS', 'MLFQ'], 2),
      pyq('Explain virtual memory and demand paging.', 'Paging & TLB', 2022, 10, 'LONG_ANSWER'),
      pyq('Differentiate process and thread.', 'Threads & Multithreading', 2022, 5, 'SHORT_ANSWER'),
    ],
    experiments: [
      { title: 'CPU Scheduling Simulator', description: 'Simulate FCFS, SJF and Round Robin scheduling on a process set and compute average waiting/turnaround times.', objective: 'Compare scheduling policies quantitatively.', instructions: '1. Input arrival/burst times.\n2. Apply each algorithm.\n3. Draw the Gantt chart.\n4. Compute averages.', expected: 'Gantt charts plus average WT/TAT showing SJF optimal.', marks: 10 },
      { title: 'Banker\'s Algorithm Implementation', description: 'Implement Banker\'s deadlock avoidance algorithm: compute need, check safety and grant/request resources.', objective: 'Understand safe-state computation.', instructions: '1. Read Allocation/Max matrices.\n2. Compute Need.\n3. Run the safety algorithm.\n4. Handle a resource request.', expected: 'A correct safe sequence (or unsafe verdict) for the sample matrices.', marks: 10 },
      { title: 'Page Replacement Simulator', description: 'Simulate FIFO, LRU and Optimal page replacement and count page faults for a reference string.', objective: 'Study Belady\'s anomaly and policy trade-offs.', instructions: '1. Take a reference string and frame count.\n2. Apply each algorithm.\n3. Count faults.\n4. Compare results.', expected: 'Fault counts for each policy, including a Belady anomaly case for FIFO.', marks: 10 },
    ],
    materials: [
      { type: 'SYLLABUS', title: 'OS Syllabus 2025', file: 'os_syllabus.pdf', size: 188416 },
      { type: 'NOTES', title: 'OS Complete Notes', file: 'os_notes.pdf', size: 6291456 },
    ],
  },
  {
    name: 'Data Structures & Algorithms',
    code: 'CS505',
    description: 'Core data structures — lists, stacks, queues, trees, graphs — and algorithm analysis techniques.',
    units: [
      { name: 'Unit 1: Linear Structures', topics: [
        { name: 'Arrays & Operations', importance: 'medium', freq: 2, weight: 7 },
        { name: 'Linked List Operations', importance: 'high', freq: 4, weight: 12 },
      ]},
      { name: 'Unit 2: Stacks & Queues', topics: [
        { name: 'Stack Applications', importance: 'high', freq: 5, weight: 13 },
        { name: 'Queue Implementations', importance: 'medium', freq: 3, weight: 9 },
      ]},
      { name: 'Unit 3: Trees', topics: [
        { name: 'Binary Trees & Traversals', importance: 'high', freq: 5, weight: 14 },
        { name: 'Binary Search Trees', importance: 'high', freq: 4, weight: 12 },
        { name: 'AVL Trees', importance: 'medium', freq: 3, weight: 9 },
      ]},
      { name: 'Unit 4: Graphs & Hashing', topics: [
        { name: 'Graph Representations', importance: 'medium', freq: 3, weight: 9 },
        { name: 'BFS/DFS Traversals', importance: 'high', freq: 4, weight: 11 },
        { name: 'Hashing & Collision Resolution', importance: 'medium', freq: 3, weight: 8 },
      ]},
    ],
    questions: [
      mcq('Which data structure follows the FIFO principle?', 'Queue Implementations', ['Stack', 'Queue', 'Tree', 'Graph'], 1, 'Queue: first element inserted is the first removed.', 'EASY'),
      mcq('The worst-case time complexity of binary search on a sorted array is:', 'Arrays & Operations', ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], 1),
      mcq('Which traversal of a BST yields keys in sorted order?', 'Binary Search Trees', ['Preorder', 'Inorder', 'Postorder', 'Level-order'], 1, 'Inorder: left, root, right — sorted for BSTs.', 'EASY'),
      mcq('Stacks are naturally used for:', 'Stack Applications', ['Job scheduling', 'Function calls and recursion', 'Breadth-first search', 'Level printing'], 1),
      mcq('The height of a balanced BST containing n nodes is:', 'Binary Search Trees', ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], 1),
      mcq('Which of the following is NOT a standard graph representation?', 'Graph Representations', ['Adjacency matrix', 'Adjacency list', 'Edge list', 'Hash list'], 3),
      mcq('An AVL tree performs rotation when a node\'s balance factor becomes:', 'AVL Trees', ['0', '1', 'Greater than 1 or less than -1', 'Exactly 2 only'], 2),
      mcq('The worst case of quicksort occurs when:', 'Arrays & Operations', ['The pivot is always the median', 'The array is already sorted (bad pivot choice)', 'All elements are distinct', 'The array is small'], 1, 'Already-sorted input with first/last pivot yields O(n²) recursion.', 'MEDIUM'),
      mcq('A circular queue primarily solves the problem of:', 'Queue Implementations', ['Overflow of memory', 'False overflow — unusable slots at the front', 'Slow enqueue', 'Priority inversion'], 1),
      mcq('Which of these is an open addressing collision technique?', 'Hashing & Collision Resolution', ['Separate chaining', 'Linear probing', 'Rehashing to new table', 'Buckets'], 1),
      short('Explain stack and queue applications with one example each.', 'Stack Applications', 5, 'EASY'),
      short('Describe insert and delete operations on a BST.', 'Binary Search Trees', 5, 'MEDIUM'),
      short('Compare BFS and DFS graph traversals.', 'BFS/DFS Traversals', 5, 'MEDIUM'),
      long('Explain AVL rotations (LL, RR, LR, RL) with examples.', 'AVL Trees', 10, 'HARD'),
      long('Explain hashing collision resolution techniques — chaining vs open addressing — with examples.', 'Hashing & Collision Resolution', 10, 'MEDIUM'),
      viva('What is an abstract data type?', 'Arrays & Operations'),
      viva('Why do we use asymptotic notation like Big-O?', 'Arrays & Operations'),
      viva('Which data structure does BFS use, and why?', 'BFS/DFS Traversals'),
      pyq('Explain tree traversals with examples.', 'Binary Trees & Traversals', 2025, 10, 'LONG_ANSWER'),
      pyq('Compare sorting algorithms with complexities.', 'Arrays & Operations', 2025, 10, 'LONG_ANSWER'),
      pyq('Explain AVL tree rotations.', 'AVL Trees', 2024, 10, 'LONG_ANSWER'),
      pyq('Write algorithms for linked list insertion/deletion.', 'Linked List Operations', 2024, 5, 'SHORT_ANSWER'),
      pyq('What is the complexity of binary search?', 'Arrays & Operations', 2023, 1, 'MCQ', 'EASY', ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'], 1),
      pyq('Explain Dijkstra\'s shortest path algorithm.', 'BFS/DFS Traversals', 2023, 10, 'LONG_ANSWER'),
      pyq('Differentiate BFS and DFS with applications.', 'BFS/DFS Traversals', 2022, 5, 'SHORT_ANSWER'),
    ],
    experiments: [
      { title: 'Singly Linked List Operations', description: 'Implement insertion (head/tail/position), deletion and reversal of a singly linked list.', objective: 'Master pointer manipulation.', instructions: '1. Define the node struct.\n2. Implement each operation.\n3. Print the list after every step.', expected: 'Correct list state after each operation, including reversal.', marks: 10 },
      { title: 'BST Construction & Traversals', description: 'Build a BST from input keys and print inorder, preorder and postorder traversals; implement search and delete.', objective: 'Understand ordered tree structures.', instructions: '1. Insert keys recursively.\n2. Perform all traversals.\n3. Implement delete with 3 cases.', expected: 'Sorted inorder traversal and correct deletion of a two-child node.', marks: 10 },
      { title: 'Dijkstra Shortest Path', description: 'Implement Dijkstra\'s algorithm on a weighted graph using a priority queue and print shortest paths from a source.', objective: 'Apply greedy graph algorithms.', instructions: '1. Build adjacency list with weights.\n2. Initialise dist[] to infinity.\n3. Relax edges via a min-heap.\n4. Reconstruct paths.', expected: 'Correct shortest distances and path trees for the sample graph.', marks: 10 },
    ],
    materials: [
      { type: 'SYLLABUS', title: 'DSA Syllabus 2025', file: 'dsa_syllabus.pdf', size: 175104 },
      { type: 'NOTES', title: 'DSA Handwritten Notes', file: 'dsa_notes.pdf', size: 7340032 },
    ],
  },
]

/* ================= MAIN ================= */

async function main() {
  console.log('Seeding AgentExam database...')

  // wipe existing data
  await db.studyPlan.deleteMany()
  await db.result.deleteMany()
  await db.answer.deleteMany()
  await db.mockTest.deleteMany()
  await db.material.deleteMany()
  await db.experiment.deleteMany()
  await db.question.deleteMany()
  await db.topic.deleteMany()
  await db.unit.deleteMany()
  await db.subject.deleteMany()
  await db.user.deleteMany()

  // ---- demo user ----
  const demo = await db.user.create({
    data: {
      name: 'Arjun Sharma',
      email: 'demo@agentexam.ai',
      passwordHash: hashPassword('demo123'),
      role: 'STUDENT',
      enrollmentNo: 'SU23CSE101',
      semester: '5',
      department: 'Computer Science & Engineering',
      examDate: new Date(Date.now() + 45 * 24 * 3600 * 1000),
    },
  })
  console.log('Created demo user', demo.email)

  const topicMap: Record<string, string> = {} // "subject::topic" -> topicId
  const questionIds: Record<string, string[]> = {} // subjectId -> theory question ids
  const vivaIds: Record<string, string[]> = {}
  const experimentList: { id: string; subjectId: string; title: string; marks: number }[] = []

  for (const s of SUBJECTS) {
    const subject = await db.subject.create({
      data: { name: s.name, code: s.code, description: s.description },
    })

    // units + topics
    for (let i = 0; i < s.units.length; i++) {
      const u = s.units[i]
      const unit = await db.unit.create({
        data: { subjectId: subject.id, name: u.name, chapterNo: i + 1 },
      })
      for (const t of u.topics) {
        const topic = await db.topic.create({
          data: {
            unitId: unit.id, name: t.name, importance: t.importance,
            pyqFrequency: t.freq, weightage: t.weight,
          },
        })
        topicMap[`${s.name}::${t.name}`] = topic.id
      }
    }

    // questions
    const theoryIds: string[] = []
    const vivas: string[] = []
    for (const q of s.questions) {
      const topicId = topicMap[`${s.name}::${q.topic}`] || null
      const created = await db.question.create({
        data: {
          subjectId: subject.id,
          topicId,
          questionType: q.type,
          questionText: q.text,
          options: q.options ? JSON.stringify(q.options) : null,
          correctAnswer: q.correct ?? null,
          explanation: q.explanation ?? (q.source === 'PYQ' ? 'Previous year question — practise this pattern.' : null),
          marks: q.marks ?? 1,
          difficultyLevel: q.difficulty ?? 'MEDIUM',
          source: q.source ?? 'MANUAL',
          sourceReference: q.sourceRef ?? null,
          year: q.year ?? null,
        },
      })
      if (q.type === 'VIVA') vivas.push(created.id)
      else theoryIds.push(created.id)
    }
    questionIds[subject.id] = theoryIds
    vivaIds[subject.id] = vivas

    // experiments
    for (const e of s.experiments) {
      const exp = await db.experiment.create({
        data: {
          subjectId: subject.id, title: e.title, description: e.description,
          objective: e.objective, instructions: e.instructions,
          expectedOutput: e.expected, marks: e.marks,
        },
      })
      experimentList.push({ id: exp.id, subjectId: subject.id, title: exp.title, marks: exp.marks })
    }

    // materials
    for (const m of s.materials) {
      await db.material.create({
        data: {
          subjectId: subject.id, uploadedBy: demo.id, materialType: m.type,
          title: m.title, fileName: m.file, fileType: m.file.split('.').pop() || 'pdf',
          mimeType: 'application/pdf', fileSize: m.size, processingStatus: 'PROCESSED',
        },
      })
    }
    console.log(`Seeded ${s.name}: ${theoryIds.length} theory Qs, ${vivas.length} viva Qs, ${s.experiments.length} experiments`)
  }

  // ---- demo test history: 5 theory tests, ascending performance ----
  const subjects = await db.subject.findMany()
  const byName = (n: string) => subjects.find(s => s.name.includes(n))!

  const history = [
    { subject: 'Artificial Intelligence', daysAgo: 20, pct: 48, n: 8 },
    { subject: 'Database Management', daysAgo: 15, pct: 55, n: 8 },
    { subject: 'Computer Networks', daysAgo: 10, pct: 62, n: 8 },
    { subject: 'Artificial Intelligence', daysAgo: 6, pct: 70, n: 8 },
    { subject: 'Operating Systems', daysAgo: 2, pct: 76, n: 8 },
  ]

  for (const h of history) {
    const subject = byName(h.subject)
    const qs = (questionIds[subject.id] || []).slice(0, h.n)
    if (!qs.length) continue
    const allQuestions = await db.question.findMany({ where: { id: { in: qs } } })
    const totalMarks = allQuestions.reduce((a, q) => a + q.marks, 0)
    const obtained = Math.round(totalMarks * h.pct) / 100

    const createdAt = new Date(Date.now() - h.daysAgo * 24 * 3600 * 1000)
    const test = await db.mockTest.create({
      data: {
        studentId: demo.id, subjectId: subject.id, testType: 'THEORY',
        difficultyLevel: 'MEDIUM', totalMarks, durationMinutes: 30,
        status: 'EVALUATED', questionIds: JSON.stringify(qs),
        startedAt: createdAt, expiresAt: new Date(createdAt.getTime() + 30 * 60000),
        submittedAt: new Date(createdAt.getTime() + 22 * 60000), createdAt,
      },
    })

    // answers: correct for the fraction matching pct (MCQs), partial for subjective
    const nCorrect = Math.round(qs.length * h.pct / 100)
    for (let i = 0; i < allQuestions.length; i++) {
      const q = allQuestions[i]
      const isCorrect = i < nCorrect
      let marksObtained = 0
      let feedback: string | null = null
      let selected: string | null = null
      let text: string | null = null

      if (q.questionType === 'MCQ') {
        const opts = q.options ? JSON.parse(q.options) as Opt[] : []
        const correctOpt = opts.find(o => o.is_correct)
        selected = isCorrect ? (correctOpt?.id ?? 'A') : (opts.find(o => !o.is_correct)?.id ?? 'B')
        marksObtained = isCorrect ? q.marks : 0
        feedback = isCorrect ? 'Correct answer.' : `Incorrect — the right option is (${correctOpt?.id}). ${q.explanation ?? ''}`
      } else {
        marksObtained = Math.round(q.marks * (isCorrect ? 0.8 : 0.35) * 100) / 100
        text = isCorrect
          ? `A structured answer covering the key aspects of ${q.topicId ? 'the topic' : 'the question'} with adequate examples.`
          : 'A partial answer — key definitions were missing and the example was incomplete.'
        feedback = isCorrect
          ? 'Good conceptual coverage. Add diagrams to earn full marks.'
          : 'Weak on core concepts. Revise the fundamentals of this topic before the next attempt.'
      }

      await db.answer.create({
        data: {
          questionId: q.id, studentId: demo.id, testId: test.id,
          answerText: text, selectedOptionId: selected, marksObtained, feedback,
        },
      })
    }

    const grade = h.pct >= 90 ? 'A' : h.pct >= 80 ? 'B' : h.pct >= 70 ? 'C' : h.pct >= 60 ? 'D' : 'F'
    const analytics = {
      improvement_suggestions: h.pct >= 70
        ? `Strong performance in ${subject.name}. Focus on the few incorrect areas — revise edge cases and practise one more full-length paper under timed conditions to push past ${Math.min(h.pct + 10, 95)}%.`
        : `Your accuracy in ${subject.name} is around ${h.pct}%. Prioritise the weak topics listed below: re-read unit notes, then attempt topic-wise easy questions before moving to medium difficulty. Aim to cross 60% on the next mock.`,
      weak_areas: allQuestions.slice(nCorrect).slice(0, 3).map(q => q.questionText.slice(0, 60)),
      topic_scores: Object.fromEntries(allQuestions.map((q, i) => [q.questionText.slice(0, 40), i < nCorrect ? 100 : 30])),
    }

    await db.result.create({
      data: {
        testId: test.id, studentId: demo.id, totalMarks, obtainedMarks: obtained,
        percentage: h.pct, grade, passStatus: h.pct >= 40, analytics: JSON.stringify(analytics),
        createdAt: new Date(createdAt.getTime() + 23 * 60000),
      },
    })
  }

  // ---- completed practical session ----
  const aiSubject = byName('Artificial Intelligence')
  const bfsExp = experimentList.find(e => e.title.includes('BFS'))!
  const practicalTest = await db.mockTest.create({
    data: {
      studentId: demo.id, subjectId: aiSubject.id, testType: 'PRACTICAL',
      difficultyLevel: 'MEDIUM', totalMarks: bfsExp.marks, durationMinutes: 60,
      status: 'EVALUATED', questionIds: JSON.stringify([bfsExp.id]),
      startedAt: new Date(Date.now() - 9 * 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() - 9 * 24 * 3600 * 1000 + 3600000),
      submittedAt: new Date(Date.now() - 9 * 24 * 3600 * 1000 + 2700000),
      createdAt: new Date(Date.now() - 9 * 24 * 3600 * 1000),
    },
  })
  await db.answer.create({
    data: {
      questionId: (await db.question.findFirst({ where: { subjectId: aiSubject.id } }))!.id,
      studentId: demo.id, testId: practicalTest.id,
      answerText: 'BFS implemented with queue frontier, visited set and parent tracking...',
      marksObtained: 8.5, feedback: 'Correct level-order traversal and clean queue handling. Edge cases (disconnected components) handled well.',
    },
  })
  await db.result.create({
    data: {
      testId: practicalTest.id, studentId: demo.id, totalMarks: 10, obtainedMarks: 8.5,
      percentage: 85, grade: 'A', passStatus: true,
      analytics: JSON.stringify({
        improvement_suggestions: 'Excellent implementation. To score full marks, add complexity analysis comments and unit tests for empty graph inputs.',
      }),
    },
  })

  // ---- completed viva session (DBMS) ----
  const dbmsSubject = byName('Database Management')
  const vivaQs = vivaIds[dbmsSubject.id].slice(0, 5)
  const vivaTest = await db.mockTest.create({
    data: {
      studentId: demo.id, subjectId: dbmsSubject.id, testType: 'VIVA',
      difficultyLevel: 'MEDIUM', totalMarks: 10, durationMinutes: 15,
      status: 'EVALUATED', questionIds: JSON.stringify(vivaQs),
      startedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() - 4 * 24 * 3600 * 1000 + 900000),
      submittedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000 + 720000),
      createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
    },
  })
  const vivaQuestions = await db.question.findMany({ where: { id: { in: vivaQs } } })
  for (let i = 0; i < vivaQuestions.length; i++) {
    const score = i < 3 ? 2 : 1
    await db.answer.create({
      data: {
        questionId: vivaQuestions[i].id, studentId: demo.id, testId: vivaTest.id,
        answerText: 'Student verbal answer recorded.',
        marksObtained: score,
        feedback: score === 2
          ? 'Clear, confident and technically precise.'
          : 'Partially correct — the core idea was right but the terminology needs sharpening.',
      },
    })
  }
  await db.result.create({
    data: {
      testId: vivaTest.id, studentId: demo.id, totalMarks: 10, obtainedMarks: 8,
      percentage: 80, grade: 'A', passStatus: true,
      analytics: JSON.stringify({
        improvement_suggestions: 'Strong viva performance overall. Practise articulating BCNF vs 3NF differences — that answer lacked precision.',
      }),
    },
  })

  // ---- study plan (7 days, starting yesterday) ----
  const startDate = new Date()
  startDate.setHours(0, 0, 0, 0)
  startDate.setDate(startDate.getDate() - 1)

  const taskPool = [
    { title: 'Study: A* Search & Heuristics', subject: 'Artificial Intelligence', type: 'study', priority: 'high', duration: 60 },
    { title: 'Practice: BFS & DFS problems', subject: 'Artificial Intelligence', type: 'practice', priority: 'high', duration: 45 },
    { title: 'Revise: Intelligent Agents notes', subject: 'Artificial Intelligence', type: 'revision', priority: 'medium', duration: 30 },
    { title: 'Study: Normalization (1NF-BCNF)', subject: 'Database Management Systems', type: 'study', priority: 'high', duration: 75 },
    { title: 'Practice: SQL joins worksheet', subject: 'Database Management Systems', type: 'practice', priority: 'medium', duration: 45 },
    { title: 'Study: OSI & TCP/IP Models', subject: 'Computer Networks', type: 'study', priority: 'high', duration: 60 },
    { title: 'Practice: Subnetting problems', subject: 'Computer Networks', type: 'practice', priority: 'medium', duration: 45 },
    { title: 'Study: CPU Scheduling Algorithms', subject: 'Operating Systems', type: 'study', priority: 'high', duration: 60 },
    { title: 'Practice: Banker\'s algorithm numericals', subject: 'Operating Systems', type: 'practice', priority: 'medium', duration: 45 },
    { title: 'Study: Page Replacement Algorithms', subject: 'Operating Systems', type: 'study', priority: 'medium', duration: 50 },
    { title: 'Practice: BST & AVL rotations', subject: 'Data Structures & Algorithms', type: 'practice', priority: 'high', duration: 45 },
    { title: 'Revise: Graph traversals', subject: 'Data Structures & Algorithms', type: 'revision', priority: 'low', duration: 30 },
    { title: 'Mock Test: Artificial Intelligence (medium)', subject: 'Artificial Intelligence', type: 'test', priority: 'high', duration: 30 },
    { title: 'Mock Test: DBMS (mixed)', subject: 'Database Management Systems', type: 'test', priority: 'medium', duration: 30 },
    { title: 'Revise: ACID properties + transactions', subject: 'Database Management Systems', type: 'revision', priority: 'medium', duration: 30 },
    { title: 'Study: Congestion Control in TCP', subject: 'Computer Networks', type: 'study', priority: 'low', duration: 40 },
    { title: 'Practice: Dijkstra problems', subject: 'Data Structures & Algorithms', type: 'practice', priority: 'low', duration: 40 },
    { title: 'Revise: Deadlock conditions & Banker\'s algorithm', subject: 'Operating Systems', type: 'revision', priority: 'low', duration: 30 },
    { title: 'Final revision: High-weightage topics', subject: 'Artificial Intelligence', type: 'revision', priority: 'medium', duration: 60 },
    { title: 'Mock Viva: DBMS rapid fire', subject: 'Database Management Systems', type: 'test', priority: 'low', duration: 15 },
    { title: 'Study: Hashing & collision resolution', subject: 'Data Structures & Algorithms', type: 'study', priority: 'medium', duration: 45 },
  ]

  const days: { date: string; tasks: unknown[] }[] = []
  let taskIdx = 0
  for (let d = 0; d < 7; d++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + d)
    const tasks = []
    for (let t = 0; t < 3; t++) {
      const tp = taskPool[taskIdx % taskPool.length]
      taskIdx++
      tasks.push({
        id: `task-${d * 3 + t + 1}`,
        title: tp.title,
        subject: tp.subject,
        type: tp.type,
        priority: tp.priority,
        duration: tp.duration,
        completed: d < 1 && t < 2, // a couple done on day 1
        date: date.toISOString().slice(0, 10),
      })
    }
    days.push({ date: date.toISOString().slice(0, 10), tasks })
  }

  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)
  await db.studyPlan.create({
    data: {
      studentId: demo.id, startDate, endDate,
      planJson: JSON.stringify({ days }), status: 'ACTIVE',
    },
  })

  const counts = {
    subjects: await db.subject.count(),
    units: await db.unit.count(),
    topics: await db.topic.count(),
    questions: await db.question.count(),
    experiments: await db.experiment.count(),
    materials: await db.material.count(),
    tests: await db.mockTest.count(),
    results: await db.result.count(),
  }
  console.log('Seed complete:', counts)
  console.log('Login with: demo@agentexam.ai / demo123')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
