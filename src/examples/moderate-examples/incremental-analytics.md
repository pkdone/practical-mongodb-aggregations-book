# Incremental Analytics

__Minimum MongoDB Version:__ 4.2


## Scenario

A user wants to TODO.

In this example, TODO.


## Sample Data Population

Drop the old version of the database (if it exists) and then TODO:

```javascript
use incremental-analytics;
db.dropDatabase();

// Create index for a daily_orders_summary collection
db.daily_orders_summary.createIndex({'day': 1}, {'unique': true});

// Create index for a orders collection
db.orders.createIndex({'orderdate': 1});

// Insert 9 records into the orders collection
// (5 orders for 1st Feb, 4 orders for 2nd Feb)
db.orders.insertMany([
  {
    'orderdate': ISODate('2021-02-01T08:35:52Z'),
    'value': NumberDecimal('231.43'),
  },
  {
    'orderdate': ISODate('2021-02-01T09:32:07Z'),
    'value': NumberDecimal('99.99'),
  },
  {
    'orderdate': ISODate('2021-02-01T08:25:37Z'),
    'value': NumberDecimal('63.13'),
  },
  {
    'orderdate': ISODate('2021-02-01T19:13:32Z'),
    'value': NumberDecimal('2.01'),
  },  
  {
    'orderdate': ISODate('2021-02-01T22:56:53Z'),
    'value': NumberDecimal('187.99'),
  },
  {
    'orderdate': ISODate('2021-02-02T23:04:48Z'),
    'value': NumberDecimal('4.59'),
  },
  {
    'orderdate': ISODate('2021-02-02T08:55:46Z'),
    'value': NumberDecimal('48.50'),
  },
  {
    'orderdate': ISODate('2021-02-02T07:49:32Z'),
    'value': NumberDecimal('1024.89'),
  },
  {
    'orderdate': ISODate('2021-02-02T13:49:44Z'),
    'value': NumberDecimal('102.24'),
  },
]);

```


## Aggregation Pipeline(s)

Define a single pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Match orders for one day only
  {'$match': {
    'orderdate': {
      '$gte': 'START',
      '$lt': 'END',
    }
  }},
  
  // Group all orders together into one summary record for the day
  {'$group': {
    '_id': null,
    'date_parts': {'$first': {'$dateToParts': {'date': '$orderdate'}}},
    'total_value': {'$sum': '$value'},
    'total_orders': {'$sum': 1},
  }},
    
  // Get the date parts from one of the order's date (want year, month and day specifically, for UTC)
  {'$set': {
    'day': {'$dateFromParts': {'year' : '$date_parts.year', 'month' : '$date_parts.month', 'day': '$date_parts.day'}},
  }},
      
  // Omit unwanted field
  {'$unset': [
    '_id',
    'date_parts',
  ]},
  
  // Add day summary to existing summary collection (overwriting existing one if it exists)
  {'$merge': {'into': 'daily_orders_summary', 'on': 'day',  'whenMatched': 'replace', 'whenNotMatched': 'insert'}},   
];
```

## Execution

Execute the aggregation using the defined pipeline and also view its explain plan:

```javascript
pipeline[0]['$match']['orderdate']['$gte'] = ISODate('2021-02-01T00:00:00Z');
pipeline[0]['$match']['orderdate']['$lt'] = ISODate('2021-02-02T00:00:00Z');

db.orders.aggregate(pipeline);

db.daily_orders_summary.find()

pipeline[0]['$match']['orderdate']['$gte'] = ISODate('2021-02-02T00:00:00Z');
pipeline[0]['$match']['orderdate']['$lt'] = ISODate('2021-02-03T00:00:00Z');

db.orders.aggregate(pipeline);

db.daily_orders_summary.find()

db.orders.insertOne(
  {
    'orderdate': ISODate('2021-02-01T09:32:07Z'),
    'value': NumberDecimal('11111.11'),
  },
)


pipeline[0]['$match']['orderdate']['$gte'] = ISODate('2021-02-01T00:00:00Z');
pipeline[0]['$match']['orderdate']['$lt'] = ISODate('2021-02-02T00:00:00Z');

db.orders.aggregate(pipeline);

db.daily_orders_summary.find()
```

```javascript
db.products.explain('executionStats').aggregate(pipeline);
```


## Expected Results

A TODO, as shown below:

```javascript
```


## Observations & Comments

 * __Todo.__ Todo.

 * __Todo.__ Todo.

 * __Todo.__ Todo.

