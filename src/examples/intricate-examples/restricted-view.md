# Restricted View

__Minimum MongoDB Version:__ 4.2


## Scenario

Users with different roles will need to query the same data-set, but one of the roles specifically should have a read-only view of a subset of data only. This restricted view should only allow accessing a filtered subset of records in a collection and only a subset of fields in each of record of the collection. Essentially, this is an illustration of 'record-level' Role Based Access Control (RBAC).

In this example, a collection of _persons_, each containing personal information, will have a read-only _adults_ view created for it. The view will be based on an aggregation pipeline which restricts the _persons_ data that can be queried, in two ways:
 1. Only return records for people who are aged 18 and over (by checking each person's `dateofbirth` field)
 2. For each record in the results, exclude the `dateofbirth` field because this information is sensitive

In a real deployment, MongoDB's [Role-Based Access Control](https://docs.mongodb.com/manual/core/authorization/) rules would then be configured to enforce that the restricted user is only able to access the `adults` view and is not able to access the underlying `persons` collection.


## Sample Data Population

Drop the old version of the database (if it exists), create an index and populate the new `persons` collections with 5 records:

```javascript
use restricted-view;
db.dropDatabase();

// Create 2 indexes for a persons collection
db.persons.createIndex({'gender': 1});
db.persons.createIndex({'dateofbirth': -1});

// Insert 5 records into the persons collection
db.persons.insertMany([
  {
    'person_id': '6392529400',
    'firstname': 'Elise',
    'lastname': 'Smith',
    'dateofbirth': ISODate('1972-01-13T09:32:07Z'),
    'gender': 'FEMALE',
    'email': 'elise_smith@myemail.com',
    'address': { 
        'number': 5625,
        'street': 'Tipa Circle',
        'city': 'Wojzinmoj',
    },
  },
  {
    'person_id': '1723338115',
    'firstname': 'Olive',
    'lastname': 'Ranieri',
    'dateofbirth': ISODate('1985-05-12T23:14:30Z'),    
    'gender': 'FEMALE',
    'email': 'oranieri@warmmail.com',
    'address': {
        'number': 9303,
        'street': 'Mele Circle',
        'city': 'Tobihbo',
    },
  },
  {
    'person_id': '8732762874',
    'firstname': 'Toni',
    'lastname': 'Jones',
    'dateofbirth': ISODate('2014-11-23T16:53:56Z'),    
    'gender': 'FEMALE',
    'email': 'tj@wheresmyemail.com',
    'address': {
        'number': 1,
        'street': 'High Street',
        'city': 'Upper Abbeywoodington',
    },
  },
  {
    'person_id': '7363629563',
    'firstname': 'Bert',
    'lastname': 'Gooding',
    'dateofbirth': ISODate('1941-04-07T22:11:52Z'),    
    'gender': 'MALE',
    'email': 'bgooding@tepidmail.com',
    'address': {
        'number': 13,
        'street': 'Upper Bold Road',
        'city': 'Redringtonville',
    },
  },
  {
    'person_id': '1029648329',
    'firstname': 'Sophie',
    'lastname': 'Celements',
    'dateofbirth': ISODate('2013-07-06T17:35:45Z'),    
    'gender': 'FEMALE',
    'email': 'sophe@celements.net',
    'address': {
        'number': 5,
        'street': 'Innings Close',
        'city': 'Basilbridge',
    },
  },
]);
```


## Aggregation Pipeline(s)

Define a single pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Filter out any persons aged under 18 ($expr required to reference '$$NOW'
  {'$match':
    {'$expr':{
      '$lt': ['$dateofbirth', {'$subtract': ['$$NOW', 18*365.25*24*60*60*1000]}]
    }},
  },

  // Exclude fields to be filtered out by the view
  {'$unset': [
    '_id',
    'dateofbirth',
  ]},    
];
```

## Execution

Firstly, to test the defined aggregation pipeline (before using it to define a view), execute the aggregation for the pipeline and also observe its explain plan:

```javascript
db.persons.aggregate(pipeline);
```

```javascript
db.persons.explain('executionStats').aggregate(pipeline);
```

Now create the new _adults_ view which will automatically apply the pipeline whenever the view is subsequently queried: 

```javascript
db.createView('adults', 'persons', pipeline);
```

Execute a normal MQL query against the view, without any filter criteria, and also observe its explain plan:

```javascript
db.adults.find();
```

```javascript
db.adults.explain('executionStats').find();
```

Execute a normal MQL query against the view, but this time with a filter to return only adults who are female, and again observe its explain plan to see how the `gender` filter affects the plan:

```javascript
db.adults.find({'gender': 'FEMALE'});
```

```javascript
db.adults.explain('executionStats').find({'gender': 'FEMALE'});
```

## Expected Results

The result for both the `aggregate()` command and the `find()` executed on the _view_ should be exactly the same, with three documents returned, representing the three persons who are over 18 but not showing their actual dates of birth, as shown below:

```javascript
[
  {
    person_id: '6392529400',
    firstname: 'Elise',
    lastname: 'Smith',
    gender: 'FEMALE',
    email: 'elise_smith@myemail.com',
    address: { number: 5625, street: 'Tipa Circle', city: 'Wojzinmoj' }
  },
  {
    person_id: '1723338115',
    firstname: 'Olive',
    lastname: 'Ranieri',
    gender: 'FEMALE',
    email: 'oranieri@warmmail.com',
    address: { number: 9303, street: 'Mele Circle', city: 'Tobihbo' }
  },
  {
    person_id: '7363629563',
    firstname: 'Bert',
    lastname: 'Gooding',
    gender: 'MALE',
    email: 'bgooding@tepidmail.com',
    address: { number: 13, street: 'Upper Bold Road', city: 'Redringtonville' }
  }
]
```

The result of running the `find()` against the _view_ with the filter `'gender': 'FEMALE'` should result in only two females' records being return because the male record has been excluded, as shown below:

```javascript
[
  {
    person_id: '1723338115',
    firstname: 'Olive',
    lastname: 'Ranieri',
    gender: 'FEMALE',
    email: 'oranieri@warmmail.com',
    address: { number: 9303, street: 'Mele Circle', city: 'Tobihbo' }
  },
  {
    person_id: '6392529400',
    firstname: 'Elise',
    lastname: 'Smith',
    gender: 'FEMALE',
    email: 'elise_smith@myemail.com',
    address: { number: 5625, street: 'Tipa Circle', city: 'Wojzinmoj' }
  }
]
```


## Observations & Comments

 * __Expr & Indexes.__ The [NOW system variable](https://docs.mongodb.com/manual/reference/aggregation-variables/), which returns the current system date-time, has been used but this can only be accessed via an [aggregation expression](https://docs.mongodb.com/manual/meta/aggregation-quick-reference/#expressions) and not directly via the normal MongoDB query syntax used by both MQL and `$match`. Therefore, the use of the `$$NOW` variable has to be wrapped in an `$expr` operator. The [$expr query operator](https://docs.mongodb.com/manual/reference/operator/query/expr/) allows the use of aggregation expressions from within MongoDB's query language, which is otherwise not normally possible. Consequently, as you can inspect in the explain plan for the pipeline, the executed aggregation cannot leverage the defined `dateofbirth` index meaning that a _full collection scan_ is performed rather than an _index scan_. For clarity, the following is a direct quote from the [MongoDB Manual for $match](https://docs.mongodb.com/manual/reference/operator/aggregation/match/#definition) which details the restriction:
   - "_$match takes a document that specifies the query conditions. The query syntax is identical to the read operation query syntax; i.e. $match does not accept raw aggregation expressions. Instead, use a $expr query expression to include aggregation expression in $match_"
   
 * __View Finds & Indexes.__ If you view the explain plan for running the `find()` against the _view_ with the `'gender'` filter, you will notice that an index has actually been used (the index defined on the `'gender'` field). This is because, just as the database engine performs [aggregation pipeline optimisations](https://docs.mongodb.com/manual/core/aggregation-pipeline-optimization/) for regular aggregations, including attempting to move _match_ filters to the top of the pipeline, if possible, it can apply these same optimisations on a view. At runtime a view is essentially just an aggregation pipeline that was defined 'ahead of time'. So when `db.adults.find({'gender': 'FEMALE'})` is executed, the database engine adds a new dynamically generated `$match` stage to the end of the pipeline and then the database engine is able to optimise the pipeline and move the new `$match` stage up to the start of the pipeline, merged, in this case, in with the existing `$match` (`$expr`) stage. At runtime the query engine can then target the `gender` index. Two excerpts from the explain plan are shown below showing how the filter on `gender` and the filter on `dateofbirth` have been combined at runtime and then how the existing index for `gender` is leveraged, resulting in the benefit of the optimised aggregation performing just a 'partial table scan' rather than a 'full table scan'.
```javascript  
"$cursor" : {
  "queryPlanner" : {
		"parsedQuery" : {
			"$and" : [
				{
					"gender" : {
						"$eq" : "FEMALE"
					}
				},
				{
					"$expr" : {
						"$lt" : [
							"$dateofbirth",
							{
								"$subtract" : [
									"$$NOW",
```
```javascript  
"inputStage" : {
	"stage" : "IXSCAN",
	"keyPattern" : {
		"gender" : 1
	},
	"indexName" : "gender_1",
	"direction" : "forward",
	"indexBounds" : {
		"gender" : [
			"[\"FEMALE\", \"FEMALE\"]"
		]
	}
}
```

 * __Further Reading.__ This ability for query (`find()`) operations on a view to automatically have filters pushed into the view's aggregation pipeline as a new `$match` stage, at runtime, and where possible then be moved to the top of the pipeline by the database engine's optimiser, is described further in the blog post: [Is Querying A MongoDB View Optimised?](https://pauldone.blogspot.com/2020/11/mongdb-views-optimisations.html)

