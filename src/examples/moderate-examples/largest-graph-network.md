# Largest Graph Network

__Minimum MongoDB Version:__ 4.2


## Scenario

Your organisation wants to know the best targets for a new marketing campaign based on a social network database similar to _Twitter_. You want to search the collection of social network users, each holding a user's name and the names of other people who follow them. You will execute an aggregation pipeline that walks each user record's `followed_by` array to determine which user has the largest _network reach_.

Note this example uses a simple data model for brevity. However, this is unlikely to be an optimum data model for using `$graphLookup` at scale for social network users with many followers or running in a sharded environment. For more guidance on such matters, see this reference application: [Socialite](https://github.com/mongodb-labs/socialite)


## Sample Data Population

Drop any old version of the database (if it exists) and then populate a new `users` collection with 10 social network users documents, plus an index to help optimise the _graph traversal_:

```javascript
use book-largest-graph-network;
db.dropDatabase();

// Create index on field which for each graph traversal hop will connect to
db.users.createIndex({"name": 1})

// Insert 2 records into the users collection
db.users.insertMany([
  {"name": "Paul", "followed_by": []},
  {"name": "Toni", "followed_by": ["Paul"]},
  {"name": "Janet", "followed_by": ["Paul", "Toni"]},
  {"name": "David", "followed_by": ["Janet", "Paul", "Toni"]},
  {"name": "Fiona", "followed_by": ["David", "Paul"]},
  {"name": "Bob", "followed_by": ["Janet"]},
  {"name": "Carl", "followed_by": ["Fiona"]},
  {"name": "Sarah", "followed_by": ["Carl", "Paul"]},
  {"name": "Carol", "followed_by": ["Helen", "Sarah"]},
  {"name": "Helen", "followed_by": ["Paul"]},
]);
```


## Aggregation Pipeline

Define a single pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // For each social network user, graph traverse their 'followed_by' list of people
  {"$graphLookup": {
    "from": "users",
    "startWith": "$followed_by",
    "connectFromField": "followed_by",
    "connectToField": "name",
    "depthField": "depth",
    "as": "extended_network",
  }},

  // Add new accumulating fields
  {"$set": {
    // Count the extended connection reach
    "network_reach": {
      "$size": "$extended_network"
    },

    // Gather the list of the extended connections" names
    "extended_connections": {
      "$map": {
        "input": "$extended_network",
        "as": "connection",
        "in": "$$connection.name",
      }
    },    
  }},
    
  // Omit unwanted fields
  {"$unset": [
    "_id",
    "followed_by",
    "extended_network",
  ]},   
  
  // Sort by person with greatest network reach first, in descending order
  {"$sort": {
    "network_reach": -1,
  }},   
];
```


## Execution

Execute the aggregation using the defined pipeline and also view its explain plan:

```javascript
db.users.aggregate(pipeline);
```

```javascript
db.users.explain("executionStats").aggregate(pipeline);
```


## Expected Results

Ten documents should be returned, corresponding to the original ten source social network users, with each one including a count of the user's _network reach_, and the names of their _extended connections_, sorted by the user with the most extensive network reach first, as shown below:

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

 * __Following Graphs.__ The `$graphLookup` stage helps you traverse relationships between records, looking for patterns that aren't necessarily evident from looking at each record in isolation. In this example, by looking at _Paul's_ record in isolation, it is evident that _Paul_ has no _friends_ and thus has the lowest network reach. However, it is not obvious that _Carol_ has the greatest network reach just by looking at the number of people _Carol_ is directly followed by, which is two. _David_, for example, is followed by three people (one more than _Carol_). However, the executed aggregation pipeline can deduce that _Carol_ has the most extensive network reach.
 
 * __Index Use.__ The `$graphLookup` stage can leverage the index on the field `name` for each of its `connectToField` hops.

