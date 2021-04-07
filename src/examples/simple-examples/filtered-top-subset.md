# Filtered Top Subset

__Minimum MongoDB Version:__ 4.2


## Scenario

You want to query a collection of _persons_ for people born in 1970 or later, sorted by the youngest person first and limited to only the two youngest people.

This example is the only one in the book that you can also achieve entirely using MQL and serves as a helpful comparison between MQL and Aggregation Pipelines.


## Sample Data Population

Drop the old version of the database (if it exists) and then populate a new `persons` collection with 5 person documents, where each person has a different date of birth:

```javascript
use book-filtered-top-subset;
db.dropDatabase();

// Create an index for a persons collection
db.persons.createIndex({"dateofbirth": -1});

// Insert 5 records into the persons collection
db.persons.insertMany([
  {
    "person_id": "6392529400",
    "firstname": "Elise",
    "lastname": "Smith",
    "dateofbirth": ISODate("1972-01-13T09:32:07Z"),
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
    "address": {
        "number": 5,
        "street": "Innings Close",
        "city": "Basilbridge",
    },
  },
]);
```


## Aggregation Pipeline

Define a single pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Match people born in 1970 or later only
  {"$match": {
    "dateofbirth": {"$gte": ISODate("1970-01-01T00:00:00Z")},
  }},
    
  // Exclude 2 unnecessary fields from each person record
  {"$unset": [
    "_id",
    "address",
  ]},    
    
  // Sort by youngest person first
  {"$sort": {
    "dateofbirth": -1,
  }},      
    
  // Only include the first 2 records (the 2 youngest people)
  {"$limit": 2},  
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

Only two documents should be returned, representing the two youngest people born on or after 1970 (ordered by youngest first), omitting the `_id` or `address` attributes of each person, as shown below:

```javascript
[
  {
    person_id: '8732762874',
    firstname: 'Toni',
    lastname: 'Jones',
    dateofbirth: 1991-11-23T16:53:56.000Z
  },
  {
    person_id: '1723338115',
    firstname: 'Olive',
    lastname: 'Ranieri',
    dateofbirth: 1985-05-12T23:14:30.000Z,
    gender: 'FEMALE'
  }
]
```


## Observations & Comments

 * __Index Use.__ A basic aggregation pipeline, where if many records belong to the collection, an index for `dateofbirth` must exist to enable the database to optimise the execution of the `$match` stage.
 
 * __Unset Use.__ An `$unset` stage is used rather than a `$project` stage. This enables the pipeline to avoid being verbose. More importantly, it means the pipeline does not have to be modified if a new field appears in future added documents (for example, see the `gender` field that appears in only _Olive's_ record).
 
 * __MQL Similarity.__ For reference, the MQL equivalent for you to achieve the same result is below (you can try this in the _Shell_):
  
```javascript
db.persons.find(
    {"dateofbirth": {"$gte": ISODate("1970-01-01T00:00:00Z")}},
    {"_id": 0, "address": 0}
  ).sort(
    {"dateofbirth": -1}
  ).limit(2);
```


