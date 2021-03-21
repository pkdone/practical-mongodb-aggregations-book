# Largest Graph Network

__Minimum MongoDB Version:__ 4.2


## Scenario

A user wants to query a network of connections across a collection of records where each record may link to zero or more other records, which in turn may link to zero or more other records and so on. The user wants to analyse which specific records have the most extended graph of connections.

In this example, a social network database will be simulated (think _Twitter_) where each record is a social network user holding their name and the names of other people who follow them. An aggregation pipeline will be executed, which walks each record's `followed_by` array of links to determine which person has the largest _network reach_. This information might be useful for a marketing organisation to know who best to target a new marketing campaign at, for example.


## Sample Data Population

Drop the old version of the database (if it exists) and then populate a new `users` collection with 10 social network users documents, plus an index to help optimise the _graph traversal_:

```javascript
use largest-graph-network;
db.dropDatabase();

// Create index on field which for each graph traversal hop will connect to
db.users.createIndex({name: 1})

// Insert 2 records into the users collection
db.users.insertMany([
  {'name': 'Paul', 'followed_by': []},
  {'name': 'Toni', 'followed_by': ['Paul']},
  {'name': 'Janet', 'followed_by': ['Paul', 'Toni']},
  {'name': 'David', 'followed_by': ['Janet', 'Paul', 'Toni']},
  {'name': 'Fiona', 'followed_by': ['David', 'Paul']},
  {'name': 'Bob', 'followed_by': ['Janet']},
  {'name': 'Carl', 'followed_by': ['Fiona']},
  {'name': 'Sarah', 'followed_by': ['Carl', 'Paul']},
  {'name': 'Carol', 'followed_by': ['Helen', 'Sarah']},
  {'name': 'Helen', 'followed_by': ['Paul']},
]);
```


## Aggregation Pipeline(s)

Define a single pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // For each social network user, graph traverse their 'followed_by' list of people
  {'$graphLookup': {
    'from': 'users',
    'startWith': '$followed_by',
    'connectFromField': 'followed_by',
    'connectToField': 'name',
    'depthField': 'depth',
    'as': 'extended_network',
  }},

  // Add new accumulating fields
  {'$set': {
    // Count the extended connection reach
    'network_reach': {
      '$size': '$extended_network'
    },

    // Gather the list of the extended connections' names
    'extended_connections': {
      '$map': {
        'input': '$extended_network',
        'as': 'connection',
        'in': '$$connection.name',
      }
    },    
  }},
    
  // Omit unwanted fields
  {'$unset': [
    '_id',
    'followed_by',
    'extended_network',
  ]},   
  
  // Sort by person with greatest network reach first, in descending order
  {'$sort': {
    'network_reach': -1,
  }},   
];
```


## Execution

Execute the aggregation using the defined pipeline and also view its explain plan:

```javascript
db.users.aggregate(pipeline);
```

```javascript
db.users.explain('executionStats').aggregate(pipeline);
```


## Expected Results

Ten documents should be returned, corresponding to the original ten source social network users, with each one including a count of the user's _network reach_ and the names of their _extended connections_, ordered by the user with the largest network reach first, as shown below:

```javascript
[
  {
    name: 'Carol',
    network_reach: 8,
    extended_connections: [ 'David', 'Toni', 'Fiona', 'Sarah', 'Helen', 'Carl', 'Paul',  'Janet' ]
  },
  {
    name: 'Sarah',
    network_reach: 6,
    extended_connections: [ 'David', 'Toni', 'Fiona', 'Carl', 'Paul', 'Janet' ]
  },
  {
    name: 'Carl',
    network_reach: 5,
    extended_connections: [ 'David', 'Toni', 'Fiona', 'Paul', 'Janet' ]
  },
  {
    name: 'Fiona',
    network_reach: 4,
    extended_connections: [ 'David', 'Toni', 'Paul', 'Janet' ]
  },
  {
    name: 'David',
    network_reach: 3,
    extended_connections: [ 'Toni', 'Paul', 'Janet' ]
  },
  {
    name: 'Bob',
    network_reach: 3,
    extended_connections: [ 'Toni', 'Paul', 'Janet' ]
  },
  {
    name: 'Janet',
    network_reach: 2,
    extended_connections: [ 'Toni', 'Paul' ]
  },
  {
    name: 'Toni',
    network_reach: 1, 
    extended_connections: [ 'Paul']
  },
  { 
    name: 'Helen',
    network_reach: 1, 
    extended_connections: [ 'Paul' ] 
  },
  { name: 'Paul', 
    network_reach: 0, 
    extended_connections: [] 
  }
]
```


## Observations & Comments

 * __Following Graphs.__ Such a pipeline, using a `$graphLookup` stage, is useful to be able to traverse relationships between records, looking for patterns for each specific record, where these patterns aren't necessarily evident from just looking at each record in isolation. In this example, it is actually obvious that _Paul_ has no _friends_ and thus the lowest network reach just by looking at _Paul's_ record in isolation. However, it is not obvious that _Carol_ has the largest network reach just by looking at the number of people _Carol_ is directly followed by, which is 2. _David_, for example, is followed by 3 people, which is more than _Carol_. However, the executed aggregation pipeline was able to deduce that _Carol_ actually has the largest network reach.
 
 * __Index Use.__ The `$graphLookup` stage is able to leverage the index on the field `name` for each of its `connectToField` hops.
 
 * __Larger Data-Sets.__ The real insights from using `$graphLookup` comes from analysing far more records than just ten of course, but only a few sample records were used here to enable the example to be easy to follow and reproduce, without first having to source a large data set from somewhere. 
 
