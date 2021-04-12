# Filtered Top Subset

__Minimum MongoDB Version:__ 4.2


## Scenario

You want to query a collection of people to find the three youngest people who have a job in engineering, sorted by the youngest person first.

This example is the only one in the book that you can also achieve entirely using MQL and serves as a helpful comparison between MQL and Aggregation Pipelines.


## Sample Data Population

Drop any old version of the database (if it exists) and then populate a new `persons` collection with 5 person documents, where each person has a different date of birth:

```javascript
use book-filtered-top-subset;
db.dropDatabase();

// Create an index for a persons collection
db.persons.createIndex({"vocation": 1, "dateofbirth": -1});

// Insert 5 records into the persons collection
db.persons.insertMany([
  {
    "person_id": "6392529400",
    "firstname": "Elise",
    "lastname": "Smith",
    "dateofbirth": ISODate("1972-01-13T09:32:07Z"),
    "vocation": "ENGINEER",
    "address": { 
        "number": 5625,
        "street": "Tipa Circle",
        "city": "Wojzinmoj",
    },
  },
  {
    "person_id": "1723338115",
    "firstname": "Olive",
    "lastname": "Ranieri",
    "dateofbirth": ISODate("1985-05-12T23:14:30Z"),    
    "gender": "FEMALE",
    "vocation": "ENGINEER",
    "address": {
        "number": 9303,
        "street": "Mele Circle",
        "city": "Tobihbo",
    },
  },
  {
    "person_id": "8732762874",
    "firstname": "Toni",
    "lastname": "Jones",
    "dateofbirth": ISODate("1991-11-23T16:53:56Z"),    
    "vocation": "POLITICIAN",
    "address": {
        "number": 1,
        "street": "High Street",
        "city": "Upper Abbeywoodington",
    },
  },
  {
    "person_id": "7363629563",
    "firstname": "Bert",
    "lastname": "Gooding",
    "dateofbirth": ISODate("1941-04-07T22:11:52Z"),    
    "vocation": "FLORIST",
    "address": {
        "number": 13,
        "street": "Upper Bold Road",
        "city": "Redringtonville",
    },
  },
  {
    "person_id": "1029648329",
    "firstname": "Sophie",
    "lastname": "Celements",
    "dateofbirth": ISODate("1959-07-06T17:35:45Z"),    
    "vocation": "ENGINEER",
    "address": {
        "number": 5,
        "street": "Innings Close",
        "city": "Basilbridge",
    },
  },
  {
    "person_id": "7363626383",
    "firstname": "Carl",
    "lastname": "Simmons",
    "dateofbirth": ISODate("1998-12-26T13:13:55Z"),    
    "vocation": "ENGINEER",
    "address": {
        "number": 187,
        "street": "Hillside Road",
        "city": "Kenningford",
    },
  },
]);
```


## Aggregation Pipeline

Define a single pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Match engineers only
  {"$match": {
    "vocation": "ENGINEER",
  }},
    
  // Sort by youngest person first
  {"$sort": {
    "dateofbirth": -1,
  }},      
    
  // Only include the first 3 youngest people
  {"$limit": 3},  

  // Exclude 2 unrequired fields from each person record
  {"$unset": [
    "_id",
    "address",
  ]},    
];
```


## Execution

Execute the aggregation using the defined pipeline and also view its explain plan:

```javascript
db.persons.aggregate(pipeline);
```

```javascript
db.persons.explain("executionStats").aggregate(pipeline);
```


## Expected Results

Three documents should be returned, representing the three youngest people who are engineers (ordered by youngest first), omitting the `_id` or `address` attributes of each person, as shown below:

```javascript
[
  {
    person_id: '7363626383',
    firstname: 'Carl',
    lastname: 'Simmons',
    dateofbirth: 1998-12-26T13:13:55.000Z,
    vocation: 'ENGINEER'
  },
  {
    person_id: '1723338115',
    firstname: 'Olive',
    lastname: 'Ranieri',
    dateofbirth: 1985-05-12T23:14:30.000Z,
    gender: 'FEMALE',
    vocation: 'ENGINEER'
  },
  {
    person_id: '6392529400',
    firstname: 'Elise',
    lastname: 'Smith',
    dateofbirth: 1972-01-13T09:32:07.000Z,
    vocation: 'ENGINEER'
  }
]
```


## Observations & Comments

 * __Index Use.__ A basic aggregation pipeline, where if many records belong to the collection, a compound index for `vocation + dateofbirth` should exist to enable the database to fully optimise the execution of the pipeline combining the filter of the `$match` stage with the sort from the `sort` stage and the limit of the `limit` stage.
 
 * __Unset Use.__ An `$unset` stage is used rather than a `$project` stage. This enables the pipeline to avoid being verbose. More importantly, it means the pipeline does not have to be modified if a new field appears in documents added in the future (for example, see the `gender` field that appears in only _Olive's_ record).
 
 * __MQL Similarity.__ For reference, the MQL equivalent for you to achieve the same result is shown below (you can try this in the _Shell_):
   
```javascript
db.persons.find(
    {"vocation": "ENGINEER"},
    {"_id": 0, "address": 0}
  ).sort(
    {"dateofbirth": -1}
  ).limit(3);
```

