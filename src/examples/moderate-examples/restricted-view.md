# Restricted View

__Minimum MongoDB Version:__ 4.2


## Scenario

You have a _persons_ collection, where a particular client application shouldn't be allowed to see sensitive information. Consequently, you will provide a read-only view of a filtered subset of peoples' data only. In a real-world situation, you would also use MongoDB's Role-Based Access Control (RBAC) to limit the client application to only be able to access the view and not the original collection. You will use the view (named _adults_) to restrict the personal data for the client application in two ways:

 1. Only show people aged 18 and over (by checking each person's `dateofbirth` field)
 2. Exclude each person's `social_security_num` field from results

Essentially, this is an illustration of achieving 'record-level' access control in MongoDB.


## Sample Data Population

Drop any old version of the database (if it exists), create an index and populate the new `persons` collections with 5 records:

```javascript
use book-restricted-view;
db.dropDatabase();

// Create 2 indexes for a persons collection
db.persons.createIndex({"gender": 1});
db.persons.createIndex({"dateofbirth": -1});

// Insert 5 records into the persons collection
db.persons.insertMany([
  {
    "person_id": "6392529400",
    "firstname": "Elise",
    "lastname": "Smith",
    "dateofbirth": ISODate("1972-01-13T09:32:07Z"),
    "gender": "FEMALE",
    "email": "elise_smith@myemail.com",
    "social_security_num": "507-28-9805",
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
    "email": "oranieri@warmmail.com",
    "social_security_num": "618-71-2912",
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
    "dateofbirth": ISODate("2014-11-23T16:53:56Z"),    
    "gender": "FEMALE",
    "email": "tj@wheresmyemail.com",
    "social_security_num": "001-10-3488",
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
    "gender": "MALE",
    "email": "bgooding@tepidmail.com",
    "social_security_num": "230-43-7633",
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
    "dateofbirth": ISODate("2013-07-06T17:35:45Z"),    
    "gender": "FEMALE",
    "email": "sophe@celements.net",
    "social_security_num": "377-30-5364",
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
  // Filter out any persons aged under 18 ($expr required to reference '$$NOW'
  {"$match":
    {"$expr":{
      "$lt": ["$dateofbirth", {"$subtract": ["$$NOW", 18*365.25*24*60*60*1000]}]
    }},
  },

  // Exclude fields to be filtered out by the view
  {"$unset": [
    "_id",
    "social_security_num",
  ]},    
];
```

## Execution

Firstly, to test the defined aggregation pipeline (before using it to create a view), execute the aggregation for the pipeline and also observe its explain plan:

```javascript
db.persons.aggregate(pipeline);
```

```javascript
db.persons.explain("executionStats").aggregate(pipeline);
```

Now create the new _adults_ view, which will automatically apply the aggregation pipeline whenever anyone queries the view: 

```javascript
db.createView("adults", "persons", pipeline);
```

Execute a regular MQL query against the view, without any filter criteria, and also observe its explain plan:

```javascript
db.adults.find();
```

```javascript
db.adults.explain("executionStats").find();
```

Execute a MQL query against the view, but this time with a filter to return only adults who are female, and again observe its explain plan to see how the `gender` filter affects the plan:

```javascript
db.adults.find({"gender": "FEMALE"});
```

```javascript
db.adults.explain("executionStats").find({"gender": "FEMALE"});
```

## Expected Results

The result for both the `aggregate()` command and the `find()` executed on the _view_ should be the same, with three documents returned, representing the three persons who are over 18 but not showing their actual dates of birth, as shown below:

```javascript
[
  {
    person_id: '6392529400',
    firstname: 'Elise',
    lastname: 'Smith',
    dateofbirth: ISODate("1972-01-13T09:32:07.000Z"),
    gender: 'FEMALE',
    email: 'elise_smith@myemail.com',
    address: { number: 5625, street: 'Tipa Circle', city: 'Wojzinmoj' }
  },
  {
    person_id: '1723338115',
    firstname: 'Olive',
    lastname: 'Ranieri',
    dateofbirth: ISODate("1985-05-12T23:14:30.000Z"),
    gender: 'FEMALE',
    email: 'oranieri@warmmail.com',
    address: { number: 9303, street: 'Mele Circle', city: 'Tobihbo' }
  },
  {
    person_id: '7363629563',
    firstname: 'Bert',
    lastname: 'Gooding',
    dateofbirth: ISODate("1941-04-07T22:11:52.000Z"),
    gender: 'MALE',
    email: 'bgooding@tepidmail.com',
    address: { number: 13, street: 'Upper Bold Road', city: 'Redringtonville' }
  }
]
```

The result of running the `find()` against the _view_ with the filter `"gender": "FEMALE"` should be two females records only because the male record has been excluded, as shown below:

```javascript
[
  {
    person_id: '6392529400',
    firstname: 'Elise',
    lastname: 'Smith',
    dateofbirth: ISODate("1972-01-13T09:32:07.000Z"),
    gender: 'FEMALE',
    email: 'elise_smith@myemail.com',
    address: { number: 5625, street: 'Tipa Circle', city: 'Wojzinmoj' }
  },
  {
    person_id: '1723338115',
    firstname: 'Olive',
    lastname: 'Ranieri',
    dateofbirth: ISODate("1985-05-12T23:14:30.000Z"),
    gender: 'FEMALE',
    email: 'oranieri@warmmail.com',
    address: { number: 9303, street: 'Mele Circle', city: 'Tobihbo' }
  }
]
```


## Observations & Comments

 * __Expr & Indexes.__ The ['NOW' system variable](https://docs.mongodb.com/manual/reference/aggregation-variables/) used here returns the current system date-time. However, you can only access this system variable via an [aggregation expression](https://docs.mongodb.com/manual/meta/aggregation-quick-reference/#expressions) and not directly via the normal MongoDB query syntax used by MQL and `$match`. You must wrap an expression using `$$NOW` inside an `$expr` operator. As described in the chapter [Can Expressions Be Used Everywhere?](../../guides/expressions.md), if you use an [$expr query operator](https://docs.mongodb.com/manual/reference/operator/query/expr/) to perform a range comparison, you can't make use of an index (which is the case for `dateofbirth` here). For a view, because the pipeline is 'statically' defined when creating the view, you cannot obtain the current date-time at runtime by other means.
   
 * __View Finds & Indexes.__ The explain plan for the _gender query_ run against the _view_ shows an index has been used (the index defined for the `gender` field). At runtime, a view is essentially just an aggregation pipeline defined 'ahead of time'. When `db.adults.find({"gender": "FEMALE"})` is executed, the database engine dynamically appends a new `$match` stage to the end of the pipeline for the gender match. It then optimises the pipeline by moving the new `$match` stage to the pipeline's start. Finally, it adds the filter extracted from the new `$match` stage to the aggregation's initial query and hence the `gender` index is leveraged. The following two excerpts from the explain plan illustrate how the filter on `gender` and the filter on `dateofbirth` combine at runtime and how the index for `gender` is used to avoid a full collection scan:
 
```javascript  
'$cursor': {
  queryPlanner: {
    plannerVersion: 1,
    namespace: 'book-restricted-view.persons',
    indexFilterSet: false,
    parsedQuery: {
      '$and': [
        { gender: { '$eq': 'FEMALE' } },
        {
          '$expr': {
            '$lt': [
              '$dateofbirth',
              {
                '$subtract': [ '$$NOW', { '$const': 568036800000 } ]
```
```javascript  
inputStage: {
  stage: 'IXSCAN',
  keyPattern: { gender: 1 },
  indexName: 'gender_1',
  direction: 'forward',
  indexBounds: { gender: [ '["FEMALE", "FEMALE"]' ] }
}
```

 * __Further Reading.__ The ability for _find_ operations on a view to automatically push filters into the view's aggregation pipeline, and then be further optimised, is described in the blog post: [Is Querying A MongoDB View Optimised?](https://pauldone.blogspot.com/2020/11/mongdb-views-optimisations.html)
 
