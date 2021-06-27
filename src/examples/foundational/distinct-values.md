# Distinct List Of Values

__Minimum MongoDB Version:__ 4.2


## Scenario

You want to query a collection of persons where each document contains data on one or more languages spoken by the person. The query result should be an alphabetically sorted list of unique languages that a developer can use to populate a list of values in a user interface's "drop-down" widget.

This example is the equivalent of a _select distinct_ statement in [SQL](https://en.wikipedia.org/wiki/SQL).


## Sample Data Population

Drop any old version of the database (if it exists) and then populate a new `persons` collection with 9 documents:

```javascript
use book-distinct-values;
db.dropDatabase();

// Insert records into the persons collection
db.persons.insertMany([
  {
    "firstname": "Elise",
    "lastname": "Smith",
    "vocation": "ENGINEER",
    "language": "English",
  },
  {
    "firstname": "Olive",
    "lastname": "Ranieri",
    "vocation": "ENGINEER",
    "language": ["Italian", "English"],
  },
  {
    "firstname": "Toni",
    "lastname": "Jones",
    "vocation": "POLITICIAN",
    "language": ["English", "Welsh"],
  },
  {
    "firstname": "Bert",
    "lastname": "Gooding",
    "vocation": "FLORIST",
    "language": "English",
  },
  {
    "firstname": "Sophie",
    "lastname": "Celements",
    "vocation": "ENGINEER",
    "language": ["Gaelic", "English"],
  },
  {
    "firstname": "Carl",
    "lastname": "Simmons",
    "vocation": "ENGINEER",
    "language": "English",
  },
  {
    "firstname": "Diego",
    "lastname": "Lopez",
    "vocation": "CHEF",
    "language": "Spanish",
  },
  {
    "firstname": "Helmut",
    "lastname": "Schneider",
    "vocation": "NURSE",
    "language": "German",
  },
  {
    "firstname": "Valerie",
    "lastname": "Dubois",
    "vocation": "SCIENTIST",
    "language": "French",
  },
]);  
```


## Aggregation Pipeline

Define a single pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Unpack each language field which may be an array or a single value
  {"$unwind": {
    "path": "$language",
  }},
  
  // Group by language
  {"$group": {
    "_id": "$language",
  }},
  
  // Sort languages alphabetically
  {"$sort": {
    "_id": 1,
  }}, 
  
  // Change _id field's name to 'language'
  {"$set": {
    "language": "$_id",
    "_id": "$$REMOVE",     
  }},
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

Nine unique language names should be returned sorted in alphabetical order, as shown below:

```javascript
[
  { language: 'English' },
  { language: 'French' },
  { language: 'Gaelic' },
  { language: 'German' },
  { language: 'Italian' },
  { language: 'Spanish' },
  { language: 'Welsh' }
]
```


## Observations

 * __Todo.__ TODO. unwind on non array fields - some fields simple, some list

 * __Todo.__ TODO. group stage finds distinct

 * __Unset Alternative.__ If this example was consistent with some of the earlier examples in this book, the pipeline would include an additional `$unset` stage to exclude the `_id` field. However, in this case, chiefly to show there is another way, the pipeline marks the `_id` field for exclusion in the `$set` stage by being assigned the `$$REMOVE` variable.

